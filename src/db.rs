use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{Error as RusqliteError, params};
use std::path::Path;

use crate::models::{Skill, SkillMetadata};

pub type DbPool = Pool<SqliteConnectionManager>;

/// Maximum number of results a single search call may return.
/// Prevents large-allocation attacks from an unbounded `limit` parameter.
pub const MAX_SEARCH_LIMIT: u32 = 200;

/// Maximum byte size of any single string field accepted for upsert.
/// Prevents storing arbitrarily large payloads via the MCP interface.
pub const MAX_FIELD_BYTES: usize = 1_024 * 1_024; // 1 MiB

/// Maximum byte length of a skill `id`.
pub const MAX_ID_LEN: usize = 256;

/// A unified error type covering pool acquisition, SQLite operations, and validation.
#[derive(Debug)]
pub enum DbError {
    Pool(r2d2::Error),
    Sqlite(RusqliteError),
    Validation(String),
}

impl std::fmt::Display for DbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DbError::Pool(e) => write!(f, "Connection pool error: {}", e),
            DbError::Sqlite(e) => write!(f, "SQLite error: {}", e),
            DbError::Validation(msg) => write!(f, "Validation error: {}", msg),
        }
    }
}

impl std::error::Error for DbError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            DbError::Pool(e) => Some(e),
            DbError::Sqlite(e) => Some(e),
            DbError::Validation(_) => None,
        }
    }
}

impl From<r2d2::Error> for DbError {
    fn from(e: r2d2::Error) -> Self {
        DbError::Pool(e)
    }
}

impl From<RusqliteError> for DbError {
    fn from(e: RusqliteError) -> Self {
        DbError::Sqlite(e)
    }
}

pub type DbResult<T> = std::result::Result<T, DbError>;

pub fn init_pool(db_path: &Path) -> DbResult<DbPool> {
    let manager = SqliteConnectionManager::file(db_path);
    let pool = Pool::builder().build(manager)?;

    let conn = pool.get()?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS skills (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT NOT NULL,
            content     TEXT NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
            id UNINDEXED,
            name,
            description,
            content,
            content='skills',
            content_rowid='rowid'
        )",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS skills_ai AFTER INSERT ON skills BEGIN
            INSERT INTO skills_fts(rowid, name, description, content) VALUES (new.rowid, new.name, new.description, new.content);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS skills_ad AFTER DELETE ON skills BEGIN
            INSERT INTO skills_fts(skills_fts, rowid, name, description, content) VALUES('delete', old.rowid, old.name, old.description, old.content);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS skills_au AFTER UPDATE ON skills BEGIN
            INSERT INTO skills_fts(skills_fts, rowid, name, description, content) VALUES('delete', old.rowid, old.name, old.description, old.content);
            INSERT INTO skills_fts(rowid, name, description, content) VALUES (new.rowid, new.name, new.description, new.content);
        END",
        [],
    )?;

    Ok(pool)
}

/// Returns true only if `id` is a safe, non-path-traversal identifier.
/// Allowed: ASCII alphanumeric, hyphen, underscore; 1–256 characters.
pub fn id_is_safe(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID_LEN
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// Returns true if the string is within the accepted size limit.
pub fn field_size_ok(s: &str) -> bool {
    s.len() <= MAX_FIELD_BYTES
}

/// Validates all fields of a skill before writing to the database.
pub fn validate_skill(skill: &Skill) -> DbResult<()> {
    if !id_is_safe(&skill.id) {
        return Err(DbError::Validation(format!(
            "Invalid skill id '{}': must be 1–{} ASCII alphanumeric/hyphen/underscore characters",
            skill.id, MAX_ID_LEN
        )));
    }
    for (field, value) in [
        ("name", &skill.name),
        ("description", &skill.description),
        ("content", &skill.content),
    ] {
        if !field_size_ok(value) {
            return Err(DbError::Validation(format!(
                "Field '{}' exceeds maximum allowed size of {} bytes",
                field, MAX_FIELD_BYTES
            )));
        }
    }
    Ok(())
}

pub fn skills_upsert(pool: &DbPool, skill: &Skill) -> DbResult<()> {
    validate_skill(skill)?;
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO skills (id, name, description, content)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET
            name        = excluded.name,
            description = excluded.description,
            content     = excluded.content,
            updated_at  = CURRENT_TIMESTAMP",
        params![skill.id, skill.name, skill.description, skill.content],
    )?;
    Ok(())
}

pub fn skills_fetch(pool: &DbPool, id: &str) -> DbResult<Option<String>> {
    // Return not-found rather than leaking validation details to callers
    if !id_is_safe(id) {
        return Ok(None);
    }
    let conn = pool.get()?;
    let mut stmt = conn.prepare("SELECT content FROM skills WHERE id = ?1")?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        let content: String = row.get(0)?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

pub fn skills_search(pool: &DbPool, query: &str, limit: u32) -> DbResult<Vec<SkillMetadata>> {
    let limit = limit.min(MAX_SEARCH_LIMIT);
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.description
         FROM skills s
         JOIN skills_fts f ON s.rowid = f.rowid
         WHERE skills_fts MATCH ?1
         ORDER BY rank
         LIMIT ?2",
    )?;
    let skill_iter = stmt.query_map(params![query, limit], |row| {
        Ok(SkillMetadata {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
        })
    })?;

    let mut skills = Vec::new();
    for skill in skill_iter {
        skills.push(skill?);
    }
    Ok(skills)
}

pub fn list_skills(pool: &DbPool) -> DbResult<Vec<SkillMetadata>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare("SELECT id, name, description FROM skills ORDER BY id")?;
    let skill_iter = stmt.query_map([], |row| {
        Ok(SkillMetadata {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
        })
    })?;

    let mut skills = Vec::new();
    for skill in skill_iter {
        skills.push(skill?);
    }
    Ok(skills)
}

/// Fetch a single skill with its full content (used for export and direct callers).
#[allow(dead_code)]
pub fn skills_fetch_full(pool: &DbPool, id: &str) -> DbResult<Option<Skill>> {
    if !id_is_safe(id) {
        return Ok(None);
    }
    let conn = pool.get()?;
    let mut stmt =
        conn.prepare("SELECT id, name, description, content FROM skills WHERE id = ?1")?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(Skill {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            content: row.get(3)?,
        }))
    } else {
        Ok(None)
    }
}

/// Fetch ALL skills with full content (used for full export).
pub fn skills_fetch_all(pool: &DbPool) -> DbResult<Vec<Skill>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare("SELECT id, name, description, content FROM skills ORDER BY id")?;
    let skill_iter = stmt.query_map([], |row| {
        Ok(Skill {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            content: row.get(3)?,
        })
    })?;
    let mut skills = Vec::new();
    for skill in skill_iter {
        skills.push(skill?);
    }
    Ok(skills)
}

/// Fetch a specific set of skills by ID with full content (used for selective export).
/// Skills not found are silently skipped. Invalid IDs return an error.
pub fn skills_fetch_by_ids(pool: &DbPool, ids: &[&str]) -> DbResult<Vec<Skill>> {
    for id in ids {
        if !id_is_safe(id) {
            return Err(DbError::Validation(format!("Invalid skill id '{}'", id)));
        }
    }
    let conn = pool.get()?;
    let mut skills = Vec::new();
    for id in ids {
        let mut stmt =
            conn.prepare("SELECT id, name, description, content FROM skills WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            skills.push(Skill {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                content: row.get(3)?,
            });
        }
    }
    Ok(skills)
}

/// Fetch all skills matching an FTS5 query with full content (used for query-filtered export).
pub fn skills_search_full(pool: &DbPool, query: &str, limit: u32) -> DbResult<Vec<Skill>> {
    let limit = limit.min(MAX_SEARCH_LIMIT);
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT s.id, s.name, s.description, s.content
         FROM skills s
         JOIN skills_fts f ON s.rowid = f.rowid
         WHERE skills_fts MATCH ?1
         ORDER BY rank
         LIMIT ?2",
    )?;
    let skill_iter = stmt.query_map(params![query, limit], |row| {
        Ok(Skill {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            content: row.get(3)?,
        })
    })?;
    let mut skills = Vec::new();
    for skill in skill_iter {
        skills.push(skill?);
    }
    Ok(skills)
}

/// Delete a single skill by ID.
/// Returns `true` if a row was deleted, `false` if the ID was not found.
pub fn skills_delete(pool: &DbPool, id: &str) -> DbResult<bool> {
    if !id_is_safe(id) {
        return Err(DbError::Validation(format!("Invalid skill id '{}'", id)));
    }
    let conn = pool.get()?;
    let rows = conn.execute("DELETE FROM skills WHERE id = ?1", params![id])?;
    Ok(rows > 0)
}

/// Delete a batch of skill IDs in a single loop.
/// Returns the count of rows actually deleted (skips IDs not found).
/// Returns an error immediately if any ID fails the safety check.
pub fn skills_delete_bulk(pool: &DbPool, ids: &[&str]) -> DbResult<usize> {
    for id in ids {
        if !id_is_safe(id) {
            return Err(DbError::Validation(format!("Invalid skill id '{}'", id)));
        }
    }
    let conn = pool.get()?;
    let mut deleted = 0usize;
    for id in ids {
        deleted += conn.execute("DELETE FROM skills WHERE id = ?1", params![id])?;
    }
    Ok(deleted)
}

/// Delete every skill in the database and rebuild the FTS index cleanly.
/// Returns the count of deleted rows.
pub fn skills_purge(pool: &DbPool) -> DbResult<usize> {
    let conn = pool.get()?;
    let deleted = conn.execute("DELETE FROM skills", [])?;
    // Rebuild FTS shadow tables so rank statistics stay accurate
    conn.execute("INSERT INTO skills_fts(skills_fts) VALUES('rebuild')", [])?;
    Ok(deleted)
}

/// Return the set of all skill IDs currently in the database.
/// Used by `sync --prune` to detect stale entries.
pub fn all_skill_ids(pool: &DbPool) -> DbResult<std::collections::HashSet<String>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare("SELECT id FROM skills")?;
    let ids = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut set = std::collections::HashSet::new();
    for id in ids {
        set.insert(id?);
    }
    Ok(set)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skills_upsert_and_search() {
        let pool = init_pool(Path::new(":memory:")).unwrap();

        let s1 = Skill {
            id: "skill1".to_string(),
            name: "Rust Developer".to_string(),
            description: "An expert in Rust".to_string(),
            content: "Rust is a fast and safe language.".to_string(),
        };
        let s2 = Skill {
            id: "skill2".to_string(),
            name: "Python Developer".to_string(),
            description: "An expert in Python".to_string(),
            content: "Python is great for data science but Rust is faster.".to_string(),
        };

        skills_upsert(&pool, &s1).unwrap();
        skills_upsert(&pool, &s2).unwrap();

        let results = skills_search(&pool, "Rust", 5).unwrap();
        assert_eq!(results.len(), 2);
        let ids: Vec<String> = results.into_iter().map(|s| s.id).collect();
        assert!(ids.contains(&"skill1".to_string()));
        assert!(ids.contains(&"skill2".to_string()));

        let results2 = skills_search(&pool, "Python", 5).unwrap();
        assert_eq!(results2.len(), 1);
        assert_eq!(results2[0].id, "skill2");
    }

    #[test]
    fn test_id_validation() {
        assert!(id_is_safe("valid-id_123"));
        assert!(id_is_safe("a"));
        assert!(!id_is_safe(""));
        assert!(!id_is_safe("../../etc/passwd"));
        assert!(!id_is_safe("id with spaces"));
        assert!(!id_is_safe("id\x00null"));
        assert!(!id_is_safe("id/slash"));
        assert!(!id_is_safe(&"a".repeat(MAX_ID_LEN + 1)));
    }

    #[test]
    fn test_limit_clamping() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        // Must not panic or error even with a huge limit
        let result = skills_search(&pool, "anything", u32::MAX);
        assert!(result.is_ok());
    }

    #[test]
    fn test_upsert_rejects_unsafe_id() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        let bad = Skill {
            id: "../../bad".to_string(),
            name: "Bad".to_string(),
            description: "Bad".to_string(),
            content: "Bad".to_string(),
        };
        assert!(skills_upsert(&pool, &bad).is_err());
    }

    fn make_skill(id: &str) -> Skill {
        Skill {
            id: id.to_string(),
            name: id.to_string(),
            description: id.to_string(),
            content: id.to_string(),
        }
    }

    #[test]
    fn test_skills_delete_single() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        skills_upsert(&pool, &make_skill("alpha")).unwrap();
        skills_upsert(&pool, &make_skill("beta")).unwrap();

        // Delete an existing skill
        assert!(skills_delete(&pool, "alpha").unwrap());
        // Verify it is gone from search
        let remaining = list_skills(&pool).unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, "beta");

        // Deleting a non-existent ID returns false (no panic)
        assert!(!skills_delete(&pool, "alpha").unwrap());
    }

    #[test]
    fn test_skills_delete_unsafe_id() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        assert!(skills_delete(&pool, "../../etc/passwd").is_err());
    }

    #[test]
    fn test_skills_delete_bulk() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        for id in ["s1", "s2", "s3", "s4"] {
            skills_upsert(&pool, &make_skill(id)).unwrap();
        }
        let ids = vec!["s1", "s3"];
        let deleted = skills_delete_bulk(&pool, &ids).unwrap();
        assert_eq!(deleted, 2);

        let remaining: Vec<String> = list_skills(&pool)
            .unwrap()
            .into_iter()
            .map(|s| s.id)
            .collect();
        assert!(remaining.contains(&"s2".to_string()));
        assert!(remaining.contains(&"s4".to_string()));
        assert!(!remaining.contains(&"s1".to_string()));
    }

    #[test]
    fn test_skills_purge() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        for id in ["x1", "x2", "x3"] {
            skills_upsert(&pool, &make_skill(id)).unwrap();
        }
        let deleted = skills_purge(&pool).unwrap();
        assert_eq!(deleted, 3);
        assert!(list_skills(&pool).unwrap().is_empty());
        // Search on empty database must not error
        let results = skills_search(&pool, "x1", 5).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_all_skill_ids() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        for id in ["a", "b", "c"] {
            skills_upsert(&pool, &make_skill(id)).unwrap();
        }
        let ids = all_skill_ids(&pool).unwrap();
        assert_eq!(ids.len(), 3);
        assert!(ids.contains("a") && ids.contains("b") && ids.contains("c"));
    }

    #[test]
    fn test_skills_fetch_full_and_search_full() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        let s = Skill {
            id: "tokio-guide".to_string(),
            name: "Tokio Async Guide".to_string(),
            description: "Guide on Tokio".to_string(),
            content: "Async rust with tokio runtime.".to_string(),
        };
        skills_upsert(&pool, &s).unwrap();

        let fetched = skills_fetch_full(&pool, "tokio-guide").unwrap().unwrap();
        assert_eq!(fetched.id, "tokio-guide");
        assert_eq!(fetched.content, "Async rust with tokio runtime.");

        let search_full = skills_search_full(&pool, "tokio", 5).unwrap();
        assert_eq!(search_full.len(), 1);
        assert_eq!(search_full[0].id, "tokio-guide");
        assert_eq!(search_full[0].name, "Tokio Async Guide");

        let by_ids = skills_fetch_by_ids(&pool, &["tokio-guide"]).unwrap();
        assert_eq!(by_ids.len(), 1);
        assert_eq!(by_ids[0].id, "tokio-guide");
    }
}
