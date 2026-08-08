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

\`\`\`bash
skill-cli [COMMAND]
\`\`\`

If no command is provided, \`skill-cli\` defaults to \`serve\` and starts the MCP server.

---

## \`serve\`

Starts the MCP JSON-RPC 2.0 server over standard input/output.

\`\`\`bash
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

Scans a directory of \`.md\` files and upserts each into the database.

\`\`\`bash
skill-cli sync --dir <PATH> [--prune]
\`\`\`

| Flag | Required | Description |
|---|---|---|
| \`--dir <PATH>\` / \`-d <PATH>\` | ✅ | Path to the directory containing \`.md\` skill files |
| \`--prune\` | ❌ | Remove skills from the database if their \`.md\` file is no longer in \`<PATH>\` |

**Behaviour:**
- Walks the directory non-recursively, skipping symlinks and files larger than 1 MiB.
- Parses YAML frontmatter (\`name\`, \`description\`) and uses the body as \`content\`.
- The file stem (filename without \`.md\`) is used as the skill \`id\`.
- Performs an upsert — safe to run multiple times.
- If \`--prune\` is supplied, any database skill not found in the scanned directory is removed.

---

## \`search\`

Performs a full-text search and prints matching skills to stdout.

\`\`\`bash
skill-cli search <QUERY>
\`\`\`

| Argument | Required | Description |
|---|---|---|
| \`<QUERY>\` | ✅ | Keyword or phrase to search. Supports FTS5 query syntax. |

**Output format:**
\`\`\`text
- <id> (<name>): <description>
\`\`\`

Results are ordered by BM25 relevance score.

---

## \`list\`

Lists all skills currently indexed in the database.

\`\`\`bash
skill-cli list
\`\`\`

---

## \`remove\`

Deletes a single skill by ID.

\`\`\`bash
skill-cli remove <ID>
\`\`\`

---

## \`remove-bulk\`

Deletes multiple skills in one command.

\`\`\`bash
skill-cli remove-bulk <ID1> <ID2> ...
\`\`\`

---

## \`purge\`

Permanently deletes ALL skills from the database and rebuilds the FTS index.

\`\`\`bash
skill-cli purge --yes
\`\`\`

---

## \`export\`

Exports skills to \`.md\` files formatted with YAML frontmatter, ready to be shared or synced into another instance.

\`\`\`bash
skill-cli export --dir <PATH> [--ids <ID1> <ID2>...] [--query <QUERY>] [--limit <N>]
\`\`\`

---

## Exit Codes

| Code | Meaning |
|---|---|
| \`0\` | Success |
| \`1\` | Fatal error (DB connection failed, directory not found, validation error, etc.) |`
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
    "serverInfo": { "name": "skill-cli", "version": "0.1.0" }
  },
  "id": 1
}

// → Client sends (no response expected):
{"jsonrpc":"2.0","method":"notifications/initialized","id":null}
\`\`\`

---

## Tool: \`skills_search\`

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
    "description": "Use binary search to find the commit that introduced a bug"
  }
]
\`\`\`

---

## Tool: \`skills_fetch\`

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

\`\`\`markdown
# Git Bisect

Git bisect uses a binary search algorithm...
\`\`\`

---

## Tool: \`skills_upsert\`

Insert or update a skill. The FTS index is refreshed automatically via database triggers.

### Input Schema

\`\`\`json
{
  "type": "object",
  "properties": {
    "id": { "type": "string", "description": "Unique skill identifier (slug format recommended)" },
    "name": { "type": "string", "description": "Human-readable display name" },
    "description": { "type": "string", "description": "One-sentence summary used in search results" },
    "content": { "type": "string", "description": "Full Markdown content for the skill" }
  },
  "required": ["id", "name", "description", "content"]
}
\`\`\`

---

## Tool: \`skills_delete\`

Delete a single skill by ID from the database and remove it from the FTS search index.

\`\`\`json
{ "status": "success", "deleted": true, "id": "git-bisect" }
\`\`\`

---

## Tool: \`skills_delete_bulk\`

Delete multiple skills in a single MCP tool call.

\`\`\`json
{ "status": "success", "deleted": 3 }
\`\`\`

---

## Tool: \`skills_export\`

Export skills as a JSON array of complete skill objects. Can be filtered by \`ids\` or by FTS \`query\`.

---

## Error Codes

| Code | Meaning |
|---|---|
| \`-32700\` | Parse error — malformed JSON |
| \`-32601\` | Method or tool not found |
| \`-32602\` | Invalid params — missing required argument or failed validation |
| \`-32000\` | Database error |`
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
| Windows | \`%APPDATA%\\skills\\skills.db\` |

The directory is created automatically on first run.

---

## Table: \`skills\`

\`\`\`sql
CREATE TABLE IF NOT EXISTS skills (
    id          TEXT      PRIMARY KEY,
    name        TEXT      NOT NULL,
    description TEXT      NOT NULL,
    content     TEXT      NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

---

## Virtual Table: \`skills_fts\`

An FTS5 virtual table that mirrors \`skills\` for full-text search.

\`\`\`sql
CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
    id UNINDEXED,
    name,
    description,
    content,
    content='skills',
    content_rowid='rowid'
);
\`\`\`

---

## Triggers

Three triggers keep the \`skills_fts\` index in sync with \`skills\` automatically:
- \`skills_ai\`: AFTER INSERT
- \`skills_ad\`: AFTER DELETE
- \`skills_au\`: AFTER UPDATE`
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
