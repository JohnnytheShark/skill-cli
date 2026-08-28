/**
 * reference.js — Diataxis Reference Documentation Data
 */

export const REFERENCE_DATA = {
  "reference/index.md": {
    title: "Reference Overview",
    category: "Reference",
    badge: "📖 INFORMATION-ORIENTED",
    content: `# Technical Reference

> **Type:** Reference — *Information-oriented*
>
> Authoritative and complete specifications for commands, tools, formats, and schemas.

---

## Reference Documents

| Reference | Contents |
|---|---|
| [CLI Commands](./cli-commands.md) | Full syntax and flags for \`serve\`, \`sync\`, \`search\`, \`list\`, \`remove\`, \`remove-bulk\`, \`purge\`, and \`export\` |
| [MCP Tools](./mcp-tools.md) | JSON-RPC 2.0 wire protocol, tool schemas, inputs, outputs, and error codes |
| [SKILL.md Format](./skill-md-format.md) | YAML frontmatter specifications and body structure rules |
| [Database Schema](./database-schema.md) | SQLite DDL, FTS5 virtual table definition, and sync triggers |
| [Configuration](./configuration.md) | DB paths, logging semantics, and static compilation features |`
  },

  "reference/cli-commands.md": {
    title: "CLI Commands Reference",
    category: "Reference",
    badge: "📖 INFORMATION-ORIENTED",
    content: `# Reference: CLI Commands

> **Type:** Reference — *Information-oriented*
>
> Complete reference for all \`skill-cli\` subcommands and flags.

---

## Global Usage

\`\`\`
skill-cli [COMMAND]
\`\`\`

If no command is provided, \`skill-cli\` defaults to \`serve\` and starts the MCP server.

---

## \`serve\`

Starts the MCP JSON-RPC 2.0 server over standard input/output.

\`\`\`
skill-cli serve
\`\`\`

| Flag | Default | Description |
|---|---|---|
| *(none)* | — | No flags. DB path is resolved automatically (\`~/.config/skills/skills.db\`). |

**Behaviour:**
- Reads newline-delimited JSON-RPC requests from \`stdin\`.
- Writes newline-delimited JSON-RPC responses to \`stdout\`.
- Logs diagnostics to \`stderr\` (safe to redirect separately).
- Runs until \`stdin\` is closed.

---

## \`sync\`

Scans a directory of \`.md\` files and upserts each into the database as the specified item type.

\`\`\`
skill-cli sync --type <TYPE> --dir <PATH> [--prune]
\`\`\`

| Flag | Required | Description |
|---|---|---|
| \`--type <TYPE>\` / \`-t <TYPE>\` | ✅ | Item type to sync (\`skill\` or \`agent\`) |
| \`--dir <PATH>\` / \`-d <PATH>\` | ✅ | Path to the directory containing \`.md\` files |
| \`--prune\` | ❌ | Remove items from the database if their \`.md\` file is no longer in \`<PATH>\` |

**Behaviour:**
- Walks the directory non-recursively, skipping symlinks and files larger than 1 MiB.
- Parses YAML frontmatter (\`name\`, \`description\`) and uses the body as \`content\`.
- The file stem (filename without \`.md\`) is used as the item \`id\`.
- Performs an upsert — safe to run multiple times.
- If \`--prune\` is supplied, any database item of the matching type not found in the scanned directory is removed.

---

## \`search\`

Performs a full-text search and prints matching items to stdout.

\`\`\`
skill-cli search --type <TYPE> <QUERY>
\`\`\`

| Argument/Flag | Required | Description |
|---|---|---|
| \`--type <TYPE>\` / \`-t <TYPE>\` | ✅ | Item type to search (\`skill\` or \`agent\`) |
| \`<QUERY>\` | ✅ | Keyword or phrase to search. Supports FTS5 query syntax. |

**Output format:**
\`\`\`
- <id> (<name>): <description>
\`\`\`

Results are ordered by BM25 relevance score.

---

## \`list\`

Lists all items of a specified type currently indexed in the database.

\`\`\`
skill-cli list --type <TYPE>
\`\`\`

| Flag | Required | Description |
|---|---|---|
| \`--type <TYPE>\` / \`-t <TYPE>\` | ✅ | Item type to list (\`skill\` or \`agent\`) |

**Output format:**
\`\`\`
- <id> (<name>): <description>
\`\`\`

---

## \`remove\`

Deletes a single item by ID and type.

\`\`\`
skill-cli remove --type <TYPE> <ID>
\`\`\`

| Argument/Flag | Required | Description |
|---|---|---|
| \`--type <TYPE>\` / \`-t <TYPE>\` | ✅ | Item type (\`skill\` or \`agent\`) |
| \`<ID>\` | ✅ | The item ID to delete |

---

## \`remove-bulk\`

Deletes multiple items in one command.

\`\`\`
skill-cli remove-bulk --type <TYPE> <ID1> <ID2> ...
\`\`\`

| Argument/Flag | Required | Description |
|---|---|---|
| \`--type <TYPE>\` / \`-t <TYPE>\` | ✅ | Item type (\`skill\` or \`agent\`) |
| \`<IDS...>\` | ✅ | One or more item IDs separated by spaces |

---

## \`purge\`

Permanently deletes ALL items of the specified type from the database and rebuilds the FTS index.

\`\`\`
skill-cli purge --type <TYPE> --yes
\`\`\`

| Flag | Required | Description |
|---|---|---|
| \`--type <TYPE>\` / \`-t <TYPE>\` | ✅ | Item type (\`skill\` or \`agent\`) |
| \`--yes\` | ✅ | Required safety confirmation flag |

---

## \`export\`

Exports items to \`.md\` files formatted with YAML frontmatter, ready to be shared or synced into another instance.

\`\`\`
skill-cli export --type <TYPE> --dir <PATH> [--ids <ID1> <ID2>...] [--query <QUERY>] [--limit <N>]
\`\`\`

| Flag | Required | Description |
|---|---|---|
| \`--type <TYPE>\` / \`-t <TYPE>\` | ✅ | Item type to export (\`skill\` or \`agent\`) |
| \`--dir <PATH>\` / \`-d <PATH>\` | ✅ | Output directory (created automatically if needed) |
| \`--ids <ID...>\` | ❌ | Export only specific item IDs (space-separated) |
| \`--query <QUERY>\` | ❌ | Export only items matching an FTS search query |
| \`--limit <N>\` | ❌ | Maximum items to export when using \`--query\` (default: \`200\`) |

---

## \`metrics\`

Displays the fact that metrics are being tracked. For analytics, run SQL queries on the \`usage_logs\` database table.

\`\`\`
skill-cli metrics
\`\`\`

---

## Exit Codes

| Code | Meaning |
|---|---|
| \`0\` | Success |
| \`1\` | Fatal error (DB connection failed, directory not found, validation error, etc.) |
`
  },

  "reference/mcp-tools.md": {
    title: "MCP Tools Reference",
    category: "Reference",
    badge: "📖 INFORMATION-ORIENTED",
    content: `# Reference: MCP Tools

> **Type:** Reference — *Information-oriented*
>
> Complete JSON-RPC 2.0 / MCP protocol reference for all tools exposed by \`skill-cli serve\`.

---

## Protocol

\`skill-cli serve\` implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) version \`2024-11-05\` over a \`stdio\` transport.

### Initialize

Every session must begin with an \`initialize\` / \`notifications/initialized\` handshake:

\`\`\`json
// → Client sends:
{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}

// ← Server responds:
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "skill-cli", "version": "0.3.0" }
  },
  "id": 1
}

// → Client sends (no response expected):
{"jsonrpc":"2.0","method":"notifications/initialized","id":null}
\`\`\`

### List Tools

\`\`\`json
// → Client sends:
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}

// ← Server responds with all registered tools and their inputSchema.
\`\`\`

### Call a Tool

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "<tool-name>",
    "arguments": { /* tool-specific */ }
  },
  "id": 3
}
\`\`\`

---

## Tools Overview

> **Note on Agents:** For every \`skills_*\` tool listed below, there is an identical \`agents_*\` counterpart (e.g. \`agents_search\`, \`agents_upsert\`, \`agents_fetch\`). They take the exact same arguments and behave identically but operate on the \`agent\` item type.

---

## Tool: \`skills_search\` (and \`agents_search\`)

Query the FTS5 index for matching skills. Returns **metadata only** to preserve context tokens.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "FTS5 keyword query string"
    },
    "collection": {
      "type": "string",
      "description": "Optional collection filter"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results to return (clamped to 200)",
      "default": 5
    }
  },
  "required": ["query"]
}
\`\`\`

### Output

A JSON array of skill metadata objects:

\`\`\`json
[
  {
    "id": "git-bisect",
    "name": "Git Bisect",
    "description": "Use binary search to find the commit that introduced a bug",
    "collections": ["git"]
  }
]
\`\`\`

Results are ordered by FTS5 BM25 relevance (ascending rank score = better match first).

---

## Tool: \`skills_fetch\` (and \`agents_fetch\`)

Retrieve the **full Markdown content** of a single skill by its ID.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The unique skill ID to fetch"
    }
  },
  "required": ["id"]
}
\`\`\`

### Output

The raw Markdown body of the skill as a plain text string:

\`\`\`
# Git Bisect

Git bisect uses a binary search algorithm...
\`\`\`

Returns the string \`"Skill not found"\` if the ID does not exist.

---

## Tool: \`skills_upsert\` (and \`agents_upsert\`)

Insert or update a skill. The FTS index is refreshed automatically via database triggers.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique skill identifier (slug format recommended)"
    },
    "name": {
      "type": "string",
      "description": "Human-readable display name"
    },
    "description": {
      "type": "string",
      "description": "One-sentence summary used in search results"
    },
    "content": {
      "type": "string",
      "description": "Full markdown content"
    },
    "collections": {
      "type": "array",
      "description": "Full Markdown content for the skill"
    }
  },
  "required": ["id", "name", "description", "content"]
}
\`\`\`

### Output

\`\`\`json
{ "status": "success", "id": "git-bisect" }
\`\`\`

---

## Tool: \`skills_delete\` (and \`agents_delete\`)

Delete a single skill by ID from the database and remove it from the FTS search index.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The skill ID to delete"
    }
  },
  "required": ["id"]
}
\`\`\`

### Output

\`\`\`json
{ "status": "success", "deleted": true, "id": "git-bisect" }
\`\`\`

---

## Tool: \`skills_delete_bulk\` (and \`agents_delete_bulk\`)

Delete multiple skills in a single MCP tool call.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Array of skill IDs to delete (max 500)"
    }
  },
  "required": ["ids"]
}
\`\`\`

### Output

\`\`\`json
{ "status": "success", "deleted": 3 }
\`\`\`

---

## Tool: \`skills_export\` (and \`agents_export\`)

Export skills as a JSON array of complete skill objects. Can be filtered by \`ids\` or by FTS \`query\`.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Specific skill IDs to export"
    },
    "query": {
      "type": "string",
      "description": "FTS search query to filter export"
    },
    "limit": {
      "type": "integer",
      "default": 200
    }
  }
}
\`\`\`

### Output

\`\`\`json
[
  {
    "id": "git-bisect",
    "name": "Git Bisect",
    "description": "...",
    "content": "..."
  }
]
\`\`\`

---

## Tool: \`log_usage\`

Log the usage of a skill or agent for metrics tracking and time-series analytics.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "ID of the skill or agent used"
    },
    "type": {
      "type": "string",
      "enum": ["skill", "agent"],
      "description": "The type of the item being logged"
    }
  },
  "required": ["id", "type"]
}
\`\`\`

### Output

\`\`\`json
{ "status": "success" }
\`\`\`

---

## Error Codes

| Code | Meaning |
|---|---|
| \`-32700\` | Parse error — malformed JSON |
| \`-32601\` | Method or tool not found |
| \`-32602\` | Invalid params — missing required argument or failed validation |
| \`-32000\` | Database error |
`
  },

  "reference/skill-md-format.md": {
    title: "SKILL.md Format Reference",
    category: "Reference",
    badge: "📖 INFORMATION-ORIENTED",
    content: `# Reference: SKILL.md Format

> **Type:** Reference — *Information-oriented*
>
> Complete specification for the \`.md\` skill file format consumed by \`skill-cli sync\`.

---

## File Location & Naming

- Files must have the \`.md\` extension.
- The file **stem** (name without \`.md\`) becomes the skill \`id\` in the database.
- IDs must be unique across all synced directories.
- Recommendation: use \`kebab-case\` slugs (e.g., \`rust-error-handling.md\`).

---

## File Structure

\`\`\`markdown
---
<YAML frontmatter>
---

<Markdown body>
\`\`\`

A file with no frontmatter is valid; all fields will fall back to defaults.

---

## YAML Frontmatter Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| \`name\` | string | No | file stem | Human-readable display name shown in search results |
| \`description\` | string | No | \`""\` (empty) | One-sentence summary indexed by FTS5 |

Any additional YAML keys are currently ignored.

---

## Complete Example

\`\`\`markdown
---
name: Rust Lifetimes
description: Understand and apply lifetime annotations in Rust
---

# Rust Lifetimes

Lifetimes are Rust's mechanism for ensuring that references do not outlive the data they point to.

## Basic Annotation

\`\`\`rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
\`\`\`
\`\`\``
  },

  "reference/database-schema.md": {
    title: "Database Schema Reference",
    category: "Reference",
    badge: "📖 INFORMATION-ORIENTED",
    content: `# Reference: Database Schema

> **Type:** Reference — *Information-oriented*
>
> Precise definition of the SQLite schema created and managed by \`skill-cli\`.

---

## Database Location

| Platform | Default Path |
|---|---|
| Linux / macOS | \`~/.config/skills/skills.db\` |
| Windows | \`%APPDATA%\skills\skills.db\` |

The directory is created automatically on first run.

---

## Table: \`items\`

The primary unified storage table for all items (skills, agents).

\`\`\`sql
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
\`\`\`

| Column | Type | Constraints | Description |
|---|---|---|---|
| \`id\` | TEXT | PRIMARY KEY | Unique item identifier (file stem or user-supplied) |
| \`item_type\` | TEXT | PRIMARY KEY | Identifies the type of item (\`skill\` or \`agent\`) |
| \`name\` | TEXT | NOT NULL | Human-readable display name |
| \`description\` | TEXT | NOT NULL | One-sentence summary used in FTS and CLI output |
| \`content\` | TEXT | NOT NULL | Full Markdown body |
| \`created_at\` | TIMESTAMP | DEFAULT NOW | Row creation time (UTC) |
| \`updated_at\` | TIMESTAMP | DEFAULT NOW | Last update time (UTC) |

---

## Virtual Table: \`items_fts\`

An FTS5 virtual table that mirrors \`items\` for full-text search.

\`\`\`sql
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    id UNINDEXED,
    item_type UNINDEXED,
    name,
    description,
    content,
    content='items',
    content_rowid='rowid'
);
\`\`\`

| Option | Value | Purpose |
|---|---|---|
| \`id UNINDEXED\` | — | Stored but not indexed; used to join back to \`items\` |
| \`item_type UNINDEXED\` | — | Stored but not indexed; used for type filtering |
| \`name\` | indexed | Searched by FTS5 |
| \`description\` | indexed | Searched by FTS5 |
| \`content\` | indexed | Full Markdown body searched by FTS5 |
| \`content='items'\` | — | Content table reference (for triggers) |
| \`content_rowid='rowid'\` | — | Links FTS rows to the \`items\` table rowid |

---

## Triggers

Three triggers keep the \`items_fts\` index in sync with \`items\` automatically.

### \`items_ai\` — After Insert

\`\`\`sql
CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, id, item_type, name, description, content) 
    VALUES (new.rowid, new.id, new.item_type, new.name, new.description, new.content);
END;
\`\`\`

### \`items_ad\` — After Delete

\`\`\`sql
CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, id, item_type, name, description, content) 
    VALUES('delete', old.rowid, old.id, old.item_type, old.name, old.description, old.content);
END;
\`\`\`

### \`items_au\` — After Update

\`\`\`sql
CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, id, item_type, name, description, content) 
    VALUES('delete', old.rowid, old.id, old.item_type, old.name, old.description, old.content);
    INSERT INTO items_fts(rowid, id, item_type, name, description, content) 
    VALUES (new.rowid, new.id, new.item_type, new.name, new.description, new.content);
END;
\`\`\`

---

## Table: \`usage_logs\`

An append-only table used to track time-series metrics for skill and agent utilization.

\`\`\`sql
CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

| Column | Type | Constraints | Description |
|---|---|---|---|
| \`id\` | INTEGER | PRIMARY KEY | Auto-incrementing log ID |
| \`item_id\` | TEXT | NOT NULL | ID of the item being used |
| \`item_type\` | TEXT | NOT NULL | Type of the item (\`skill\` or \`agent\`) |
| \`used_at\` | TIMESTAMP | DEFAULT NOW | Timestamp of usage |

---

## Upsert Query

The \`item_upsert\` function uses SQLite's \`ON CONFLICT\` clause on the composite primary key:

\`\`\`sql
INSERT INTO items (id, item_type, name, description, content)
VALUES (?1, ?2, ?3, ?4, ?5)
ON CONFLICT(id, item_type) DO UPDATE SET
    name        = excluded.name,
    description = excluded.description,
    content     = excluded.content,
    updated_at  = CURRENT_TIMESTAMP;
\`\`\`

This is the canonical "upsert" pattern — a single statement that inserts on new IDs and updates on conflicts.

---

## Search Query

\`\`\`sql
SELECT i.id, i.name, i.description
FROM items i
JOIN items_fts f ON i.rowid = f.rowid
WHERE i.item_type = ?1 AND items_fts MATCH ?2
ORDER BY rank
LIMIT ?3;
\`\`\`

Results are constrained by \`item_type\` and ordered by FTS5's internal \`rank\` column, which is the BM25 relevance score (lower = more relevant).
`
  },

  "reference/configuration.md": {
    title: "Configuration Reference",
    category: "Reference",
    badge: "📖 INFORMATION-ORIENTED",
    content: `# Reference: Configuration

> **Type:** Reference — *Information-oriented*
>
> How \`skill-cli\` resolves runtime configuration.

---

## Database Path

\`skill-cli\` uses the \`dirs\` crate to locate the platform config directory, then appends \`skills/skills.db\`.

| Platform | Resolved path |
|---|---|
| Linux | \`$XDG_CONFIG_HOME/skills/skills.db\` or \`~/.config/skills/skills.db\` |
| macOS | \`~/Library/Application Support/skills/skills.db\` |
| Windows | \`%APPDATA%\\skills\\skills.db\` |

---

## Zero-Config Principle

\`skill-cli\` is intentionally zero-config. All behavior is driven by CLI flags, OS platform conventions, and database state.

---

## Logging

All diagnostic output is written to \`stderr\`, preserving \`stdout\` as a clean JSON-RPC 2.0 stream for MCP communication.

---

## Compilation Features

\`skill-cli\` uses the \`bundled-full\` feature of \`rusqlite\`, statically linking SQLite and FTS5 directly into the standalone binary.`
  }
};
