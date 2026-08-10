# Reference: CLI Commands

> **Type:** Reference — *Information-oriented*
>
> Complete reference for all `skill-cli` subcommands and flags.

---

## Global Usage

```
skill-cli [COMMAND]
```

If no command is provided, `skill-cli` defaults to `serve` and starts the MCP server.

---

## `serve`

Starts the MCP JSON-RPC 2.0 server over standard input/output.

```
skill-cli serve
```

| Flag | Default | Description |
|---|---|---|
| *(none)* | — | No flags. DB path is resolved automatically (`~/.config/skills/skills.db`). |

**Behaviour:**
- Reads newline-delimited JSON-RPC requests from `stdin`.
- Writes newline-delimited JSON-RPC responses to `stdout`.
- Logs diagnostics to `stderr` (safe to redirect separately).
- Runs until `stdin` is closed.

---

## `sync`

Scans a directory of `.md` files and upserts each into the database as the specified item type.

```
skill-cli sync --type <TYPE> --dir <PATH> [--prune]
```

| Flag | Required | Description |
|---|---|---|
| `--type <TYPE>` / `-t <TYPE>` | ✅ | Item type to sync (`skill` or `agent`) |
| `--dir <PATH>` / `-d <PATH>` | ✅ | Path to the directory containing `.md` files |
| `--prune` | ❌ | Remove items from the database if their `.md` file is no longer in `<PATH>` |

**Behaviour:**
- Walks the directory non-recursively, skipping symlinks and files larger than 1 MiB.
- Parses YAML frontmatter (`name`, `description`) and uses the body as `content`.
- The file stem (filename without `.md`) is used as the item `id`.
- Performs an upsert — safe to run multiple times.
- If `--prune` is supplied, any database item of the matching type not found in the scanned directory is removed.

---

## `search`

Performs a full-text search and prints matching items to stdout.

```
skill-cli search --type <TYPE> <QUERY>
```

| Argument/Flag | Required | Description |
|---|---|---|
| `--type <TYPE>` / `-t <TYPE>` | ✅ | Item type to search (`skill` or `agent`) |
| `<QUERY>` | ✅ | Keyword or phrase to search. Supports FTS5 query syntax. |

**Output format:**
```
- <id> (<name>): <description>
```

Results are ordered by BM25 relevance score.

---

## `list`

Lists all items of a specified type currently indexed in the database.

```
skill-cli list --type <TYPE>
```

| Flag | Required | Description |
|---|---|---|
| `--type <TYPE>` / `-t <TYPE>` | ✅ | Item type to list (`skill` or `agent`) |

**Output format:**
```
- <id> (<name>): <description>
```

---

## `remove`

Deletes a single item by ID and type.

```
skill-cli remove --type <TYPE> <ID>
```

| Argument/Flag | Required | Description |
|---|---|---|
| `--type <TYPE>` / `-t <TYPE>` | ✅ | Item type (`skill` or `agent`) |
| `<ID>` | ✅ | The item ID to delete |

---

## `remove-bulk`

Deletes multiple items in one command.

```
skill-cli remove-bulk --type <TYPE> <ID1> <ID2> ...
```

| Argument/Flag | Required | Description |
|---|---|---|
| `--type <TYPE>` / `-t <TYPE>` | ✅ | Item type (`skill` or `agent`) |
| `<IDS...>` | ✅ | One or more item IDs separated by spaces |

---

## `purge`

Permanently deletes ALL items of the specified type from the database and rebuilds the FTS index.

```
skill-cli purge --type <TYPE> --yes
```

| Flag | Required | Description |
|---|---|---|
| `--type <TYPE>` / `-t <TYPE>` | ✅ | Item type (`skill` or `agent`) |
| `--yes` | ✅ | Required safety confirmation flag |

---

## `export`

Exports items to `.md` files formatted with YAML frontmatter, ready to be shared or synced into another instance.

```
skill-cli export --type <TYPE> --dir <PATH> [--ids <ID1> <ID2>...] [--query <QUERY>] [--limit <N>]
```

| Flag | Required | Description |
|---|---|---|
| `--type <TYPE>` / `-t <TYPE>` | ✅ | Item type to export (`skill` or `agent`) |
| `--dir <PATH>` / `-d <PATH>` | ✅ | Output directory (created automatically if needed) |
| `--ids <ID...>` | ❌ | Export only specific item IDs (space-separated) |
| `--query <QUERY>` | ❌ | Export only items matching an FTS search query |
| `--limit <N>` | ❌ | Maximum items to export when using `--query` (default: `200`) |

---

## `metrics`

Displays the fact that metrics are being tracked. For analytics, run SQL queries on the `usage_logs` database table.

```
skill-cli metrics
```

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Fatal error (DB connection failed, directory not found, validation error, etc.) |
