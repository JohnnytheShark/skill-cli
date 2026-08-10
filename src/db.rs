use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{Error as RusqliteError, params};
use std::path::Path;

use crate::models::{Item, ItemMetadata, ItemType};

pub type DbPool = Pool<SqliteConnectionManager>;

pub const MAX_SEARCH_LIMIT: u32 = 200;
pub const MAX_FIELD_BYTES: usize = 1_024 * 1_024; // 1 MiB
pub const MAX_ID_LEN: usize = 256;

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
        "CREATE TABLE IF NOT EXISTS items (
            id          TEXT NOT NULL,
            item_type   TEXT NOT NULL,
            name        TEXT NOT NULL,
            description TEXT NOT NULL,
            content     TEXT NOT NULL,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, item_type)
        )",
        [],
    )?;

    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
            id UNINDEXED,
            item_type UNINDEXED,
            name,
            description,
            content,
            content='items',
            content_rowid='rowid'
        )",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
            INSERT INTO items_fts(rowid, id, item_type, name, description, content) 
            VALUES (new.rowid, new.id, new.item_type, new.name, new.description, new.content);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
            INSERT INTO items_fts(items_fts, rowid, id, item_type, name, description, content) 
            VALUES('delete', old.rowid, old.id, old.item_type, old.name, old.description, old.content);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
            INSERT INTO items_fts(items_fts, rowid, id, item_type, name, description, content) 
            VALUES('delete', old.rowid, old.id, old.item_type, old.name, old.description, old.content);
            INSERT INTO items_fts(rowid, id, item_type, name, description, content) 
            VALUES (new.rowid, new.id, new.item_type, new.name, new.description, new.content);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT NOT NULL,
            item_type TEXT NOT NULL,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // MIGRATION: Move old skills table into items table
    let mut stmt =
        conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skills'")?;
    if stmt.exists([])? {
        conn.execute("INSERT OR IGNORE INTO items (id, item_type, name, description, content, created_at, updated_at) 
                      SELECT id, 'skill', name, description, content, created_at, updated_at FROM skills", [])?;
        conn.execute("DROP TABLE skills", [])?;
        conn.execute("DROP TABLE IF EXISTS skills_fts", [])?;
    }

    // MIGRATION: Move old agents table into items table
    let mut stmt =
        conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")?;
    if stmt.exists([])? {
        conn.execute("INSERT OR IGNORE INTO items (id, item_type, name, description, content, created_at, updated_at) 
                      SELECT id, 'agent', name, description, content, created_at, updated_at FROM agents", [])?;
        conn.execute("DROP TABLE agents", [])?;
        conn.execute("DROP TABLE IF EXISTS agents_fts", [])?;
    }

    Ok(pool)
}

pub fn id_is_safe(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= MAX_ID_LEN
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn field_size_ok(s: &str) -> bool {
    s.len() <= MAX_FIELD_BYTES
}

pub fn validate_item(item: &Item) -> DbResult<()> {
    if !id_is_safe(&item.id) {
        return Err(DbError::Validation(format!(
            "Invalid id '{}': must be 1–{} ASCII alphanumeric/hyphen/underscore characters",
            item.id, MAX_ID_LEN
        )));
    }
    for (field, value) in [
        ("name", &item.name),
        ("description", &item.description),
        ("content", &item.content),
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

pub fn item_upsert(pool: &DbPool, item: &Item, item_type: ItemType) -> DbResult<()> {
    validate_item(item)?;
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO items (id, item_type, name, description, content)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id, item_type) DO UPDATE SET
            name        = excluded.name,
            description = excluded.description,
            content     = excluded.content,
            updated_at  = CURRENT_TIMESTAMP",
        params![
            item.id,
            item_type.to_string(),
            item.name,
            item.description,
            item.content
        ],
    )?;
    Ok(())
}

pub fn item_fetch(pool: &DbPool, id: &str, item_type: ItemType) -> DbResult<Option<String>> {
    if !id_is_safe(id) {
        return Ok(None);
    }
    let conn = pool.get()?;
    let mut stmt = conn.prepare("SELECT content FROM items WHERE id = ?1 AND item_type = ?2")?;
    let mut rows = stmt.query(params![id, item_type.to_string()])?;
    if let Some(row) = rows.next()? {
        let content: String = row.get(0)?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

pub fn item_search(
    pool: &DbPool,
    query: &str,
    item_type: ItemType,
    limit: u32,
) -> DbResult<Vec<ItemMetadata>> {
    let limit = limit.min(MAX_SEARCH_LIMIT);
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT i.id, i.name, i.description
         FROM items i
         JOIN items_fts f ON i.rowid = f.rowid
         WHERE i.item_type = ?1 AND items_fts MATCH ?2
         ORDER BY rank
         LIMIT ?3",
    )?;
    let item_iter = stmt.query_map(params![item_type.to_string(), query, limit], |row| {
        Ok(ItemMetadata {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
        })
    })?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item?);
    }
    Ok(items)
}

pub fn list_items(pool: &DbPool, item_type: ItemType) -> DbResult<Vec<ItemMetadata>> {
    let conn = pool.get()?;
    let mut stmt =
        conn.prepare("SELECT id, name, description FROM items WHERE item_type = ?1 ORDER BY id")?;
    let item_iter = stmt.query_map(params![item_type.to_string()], |row| {
        Ok(ItemMetadata {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
        })
    })?;

    let mut items = Vec::new();
    for item in item_iter {
        items.push(item?);
    }
    Ok(items)
}

pub fn item_fetch_all(pool: &DbPool, item_type: ItemType) -> DbResult<Vec<Item>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT id, name, description, content FROM items WHERE item_type = ?1 ORDER BY id",
    )?;
    let item_iter = stmt.query_map(params![item_type.to_string()], |row| {
        Ok(Item {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            content: row.get(3)?,
        })
    })?;
    let mut items = Vec::new();
    for item in item_iter {
        items.push(item?);
    }
    Ok(items)
}

pub fn item_fetch_by_ids(pool: &DbPool, ids: &[&str], item_type: ItemType) -> DbResult<Vec<Item>> {
    for id in ids {
        if !id_is_safe(id) {
            return Err(DbError::Validation(format!("Invalid id '{}'", id)));
        }
    }
    let conn = pool.get()?;
    let mut items = Vec::new();
    let type_str = item_type.to_string();
    for id in ids {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, content FROM items WHERE id = ?1 AND item_type = ?2",
        )?;
        let mut rows = stmt.query(params![id, type_str])?;
        if let Some(row) = rows.next()? {
            items.push(Item {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                content: row.get(3)?,
            });
        }
    }
    Ok(items)
}

pub fn item_search_full(
    pool: &DbPool,
    query: &str,
    item_type: ItemType,
    limit: u32,
) -> DbResult<Vec<Item>> {
    let limit = limit.min(MAX_SEARCH_LIMIT);
    let conn = pool.get()?;
    let mut stmt = conn.prepare(
        "SELECT i.id, i.name, i.description, i.content
         FROM items i
         JOIN items_fts f ON i.rowid = f.rowid
         WHERE i.item_type = ?1 AND items_fts MATCH ?2
         ORDER BY rank
         LIMIT ?3",
    )?;
    let item_iter = stmt.query_map(params![item_type.to_string(), query, limit], |row| {
        Ok(Item {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            content: row.get(3)?,
        })
    })?;
    let mut items = Vec::new();
    for item in item_iter {
        items.push(item?);
    }
    Ok(items)
}

pub fn item_delete(pool: &DbPool, id: &str, item_type: ItemType) -> DbResult<bool> {
    if !id_is_safe(id) {
        return Err(DbError::Validation(format!("Invalid id '{}'", id)));
    }
    let conn = pool.get()?;
    let rows = conn.execute(
        "DELETE FROM items WHERE id = ?1 AND item_type = ?2",
        params![id, item_type.to_string()],
    )?;
    Ok(rows > 0)
}

pub fn item_delete_bulk(pool: &DbPool, ids: &[&str], item_type: ItemType) -> DbResult<usize> {
    for id in ids {
        if !id_is_safe(id) {
            return Err(DbError::Validation(format!("Invalid id '{}'", id)));
        }
    }
    let conn = pool.get()?;
    let mut deleted = 0usize;
    let type_str = item_type.to_string();
    for id in ids {
        deleted += conn.execute(
            "DELETE FROM items WHERE id = ?1 AND item_type = ?2",
            params![id, type_str],
        )?;
    }
    Ok(deleted)
}

pub fn item_purge(pool: &DbPool, item_type: ItemType) -> DbResult<usize> {
    let conn = pool.get()?;
    let deleted = conn.execute(
        "DELETE FROM items WHERE item_type = ?1",
        params![item_type.to_string()],
    )?;
    conn.execute("INSERT INTO items_fts(items_fts) VALUES('rebuild')", [])?;
    Ok(deleted)
}

pub fn all_item_ids(
    pool: &DbPool,
    item_type: ItemType,
) -> DbResult<std::collections::HashSet<String>> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare("SELECT id FROM items WHERE item_type = ?1")?;
    let ids = stmt.query_map(params![item_type.to_string()], |row| {
        row.get::<_, String>(0)
    })?;
    let mut set = std::collections::HashSet::new();
    for id in ids {
        set.insert(id?);
    }
    Ok(set)
}

// ----------------- METRICS FUNCTIONS -----------------

pub fn log_usage(pool: &DbPool, item_id: &str, item_type: ItemType) -> DbResult<()> {
    if !id_is_safe(item_id) {
        return Err(DbError::Validation(format!(
            "Invalid item id '{}'",
            item_id
        )));
    }
    let conn = pool.get()?;
    conn.execute(
        "INSERT INTO usage_logs (item_id, item_type) VALUES (?1, ?2)",
        params![item_id, item_type.to_string()],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_item(id: &str) -> Item {
        Item {
            id: id.to_string(),
            name: id.to_string(),
            description: id.to_string(),
            content: id.to_string(),
        }
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
        let result = item_search(&pool, "anything", ItemType::Skill, u32::MAX);
        assert!(result.is_ok());
    }

    #[test]
    fn test_upsert_rejects_unsafe_id() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        let bad = Item {
            id: "../../bad".to_string(),
            name: "Bad".to_string(),
            description: "Bad".to_string(),
            content: "Bad".to_string(),
        };
        assert!(item_upsert(&pool, &bad, ItemType::Skill).is_err());
    }

    #[test]
    fn test_item_isolation() {
        let pool = init_pool(Path::new(":memory:")).unwrap();

        let s = Item {
            id: "target".to_string(),
            name: "Skill Target".to_string(),
            description: "A skill about Rust".to_string(),
            content: "Rust is fast.".to_string(),
        };
        let a = Item {
            id: "target".to_string(),
            name: "Agent Target".to_string(),
            description: "An agent about Rust".to_string(),
            content: "Rust is fast.".to_string(),
        };

        item_upsert(&pool, &s, ItemType::Skill).unwrap();
        item_upsert(&pool, &a, ItemType::Agent).unwrap();

        let skills = item_search(&pool, "Rust", ItemType::Skill, 5).unwrap();
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].name, "Skill Target");

        let agents = item_search(&pool, "Rust", ItemType::Agent, 5).unwrap();
        assert_eq!(agents.len(), 1);
        assert_eq!(agents[0].name, "Agent Target");
    }

    #[test]
    fn test_log_usage() {
        let pool = init_pool(Path::new(":memory:")).unwrap();

        assert!(log_usage(&pool, "target", ItemType::Skill).is_ok());

        let conn = pool.get().unwrap();
        let mut stmt = conn
            .prepare("SELECT item_id, item_type FROM usage_logs")
            .unwrap();
        let mut rows = stmt.query([]).unwrap();
        let row = rows.next().unwrap().unwrap();
        let item_id: String = row.get(0).unwrap();
        let item_type: String = row.get(1).unwrap();

        assert_eq!(item_id, "target");
        assert_eq!(item_type, "skill");
    }

    #[test]
    fn test_item_delete_bulk() {
        let pool = init_pool(Path::new(":memory:")).unwrap();
        for id in ["s1", "s2", "s3", "s4"] {
            item_upsert(&pool, &make_item(id), ItemType::Skill).unwrap();
        }
        let ids = vec!["s1", "s3"];
        let deleted = item_delete_bulk(&pool, &ids, ItemType::Skill).unwrap();
        assert_eq!(deleted, 2);

        let remaining: Vec<String> = list_items(&pool, ItemType::Skill)
            .unwrap()
            .into_iter()
            .map(|s| s.id)
            .collect();
        assert!(remaining.contains(&"s2".to_string()));
        assert!(remaining.contains(&"s4".to_string()));
        assert!(!remaining.contains(&"s1".to_string()));
    }
}
