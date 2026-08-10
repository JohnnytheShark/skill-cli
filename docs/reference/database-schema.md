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

## Table: `items`

The primary unified storage table for all items (skills, agents).

```sql
CREATE TABLE IF NOT EXISTS items (
    id          TEXT NOT NULL,
    item_type   TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, item_type)
);
```

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique item identifier (file stem or user-supplied) |
| `item_type` | TEXT | PRIMARY KEY | Identifies the type of item (`skill` or `agent`) |
| `name` | TEXT | NOT NULL | Human-readable display name |
| `description` | TEXT | NOT NULL | One-sentence summary used in FTS and CLI output |
| `content` | TEXT | NOT NULL | Full Markdown body |
| `created_at` | TIMESTAMP | DEFAULT NOW | Row creation time (UTC) |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Last update time (UTC) |

---

## Virtual Table: `items_fts`

An FTS5 virtual table that mirrors `items` for full-text search.

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    id UNINDEXED,
    item_type UNINDEXED,
    name,
    description,
    content,
    content='items',
    content_rowid='rowid'
);
```

| Option | Value | Purpose |
|---|---|---|
| `id UNINDEXED` | — | Stored but not indexed; used to join back to `items` |
| `item_type UNINDEXED` | — | Stored but not indexed; used for type filtering |
| `name` | indexed | Searched by FTS5 |
| `description` | indexed | Searched by FTS5 |
| `content` | indexed | Full Markdown body searched by FTS5 |
| `content='items'` | — | Content table reference (for triggers) |
| `content_rowid='rowid'` | — | Links FTS rows to the `items` table rowid |

---

## Triggers

Three triggers keep the `items_fts` index in sync with `items` automatically.

### `items_ai` — After Insert

```sql
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, id, item_type, name, description, content) 
    VALUES (new.rowid, new.id, new.item_type, new.name, new.description, new.content);
END;
```

### `items_ad` — After Delete

```sql
CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, id, item_type, name, description, content) 
    VALUES('delete', old.rowid, old.id, old.item_type, old.name, old.description, old.content);
END;
```

### `items_au` — After Update

```sql
CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, id, item_type, name, description, content) 
    VALUES('delete', old.rowid, old.id, old.item_type, old.name, old.description, old.content);
    INSERT INTO items_fts(rowid, id, item_type, name, description, content) 
    VALUES (new.rowid, new.id, new.item_type, new.name, new.description, new.content);
END;
```

---

## Table: `usage_logs`

An append-only table used to track time-series metrics for skill and agent utilization.

```sql
CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY | Auto-incrementing log ID |
| `item_id` | TEXT | NOT NULL | ID of the item being used |
| `item_type` | TEXT | NOT NULL | Type of the item (`skill` or `agent`) |
| `used_at` | TIMESTAMP | DEFAULT NOW | Timestamp of usage |

---

## Upsert Query

The `item_upsert` function uses SQLite's `ON CONFLICT` clause on the composite primary key:

```sql
INSERT INTO items (id, item_type, name, description, content)
VALUES (?1, ?2, ?3, ?4, ?5)
ON CONFLICT(id, item_type) DO UPDATE SET
    name        = excluded.name,
    description = excluded.description,
    content     = excluded.content,
    updated_at  = CURRENT_TIMESTAMP;
```

This is the canonical "upsert" pattern — a single statement that inserts on new IDs and updates on conflicts.

---

## Search Query

```sql
SELECT i.id, i.name, i.description
FROM items i
JOIN items_fts f ON i.rowid = f.rowid
WHERE i.item_type = ?1 AND items_fts MATCH ?2
ORDER BY rank
LIMIT ?3;
```

Results are constrained by `item_type` and ordered by FTS5's internal `rank` column, which is the BM25 relevance score (lower = more relevant).
