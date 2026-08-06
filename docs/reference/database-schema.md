# Reference: Database Schema

> **Type:** Reference — *Information-oriented*
>
> Precise definition of the SQLite schema created and managed by `skill-cli`.

---

## Database Location

| Platform | Default Path |
|---|---|
| Linux / macOS | `~/.config/skills/skills.db` |
| Windows | `%APPDATA%\skills\skills.db` |

The directory is created automatically on first run.

---

## Table: `skills`

The primary storage table.

```sql
CREATE TABLE IF NOT EXISTS skills (
    id          TEXT      PRIMARY KEY,
    name        TEXT      NOT NULL,
    description TEXT      NOT NULL,
    content     TEXT      NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique skill identifier (file stem or user-supplied) |
| `name` | TEXT | NOT NULL | Human-readable display name |
| `description` | TEXT | NOT NULL | One-sentence summary used in FTS and CLI output |
| `content` | TEXT | NOT NULL | Full Markdown body |
| `created_at` | TIMESTAMP | DEFAULT NOW | Row creation time (UTC) |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Last update time (UTC) |

---

## Virtual Table: `skills_fts`

An FTS5 virtual table that mirrors `skills` for full-text search.

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
    id UNINDEXED,
    name,
    description,
    content,
    content='skills',
    content_rowid='rowid'
);
```

| Option | Value | Purpose |
|---|---|---|
| `id UNINDEXED` | — | Stored but not indexed; used to join back to `skills` |
| `name` | indexed | Searched by FTS5 |
| `description` | indexed | Searched by FTS5 |
| `content` | indexed | Full Markdown body searched by FTS5 |
| `content='skills'` | — | Content table reference (for triggers) |
| `content_rowid='rowid'` | — | Links FTS rows to the `skills` table rowid |

---

## Triggers

Three triggers keep the `skills_fts` index in sync with `skills` automatically.

### `skills_ai` — After Insert

```sql
CREATE TRIGGER IF NOT EXISTS skills_ai AFTER INSERT ON skills BEGIN
    INSERT INTO skills_fts(rowid, name, description, content)
    VALUES (new.rowid, new.name, new.description, new.content);
END;
```

### `skills_ad` — After Delete

```sql
CREATE TRIGGER IF NOT EXISTS skills_ad AFTER DELETE ON skills BEGIN
    INSERT INTO skills_fts(skills_fts, rowid, name, description, content)
    VALUES ('delete', old.rowid, old.name, old.description, old.content);
END;
```

### `skills_au` — After Update

```sql
CREATE TRIGGER IF NOT EXISTS skills_au AFTER UPDATE ON skills BEGIN
    INSERT INTO skills_fts(skills_fts, rowid, name, description, content)
    VALUES ('delete', old.rowid, old.name, old.description, old.content);
    INSERT INTO skills_fts(rowid, name, description, content)
    VALUES (new.rowid, new.name, new.description, new.content);
END;
```

---

## Upsert Query

The `skills_upsert` function uses SQLite's `ON CONFLICT` clause:

```sql
INSERT INTO skills (id, name, description, content)
VALUES (?1, ?2, ?3, ?4)
ON CONFLICT(id) DO UPDATE SET
    name        = excluded.name,
    description = excluded.description,
    content     = excluded.content,
    updated_at  = CURRENT_TIMESTAMP;
```

This is the canonical "upsert" pattern — a single statement that inserts on new IDs and updates on conflicts.

---

## Search Query

```sql
SELECT s.id, s.name, s.description
FROM skills s
JOIN skills_fts f ON s.rowid = f.rowid
WHERE skills_fts MATCH ?1
ORDER BY rank
LIMIT ?2;
```

Results are ordered by FTS5's internal `rank` column, which is the BM25 relevance score (lower = more relevant).
