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

Scans a directory of `.md` files and upserts each into the database.

```
skill-cli sync --dir <PATH> [--prune]
```

| Flag | Required | Description |
|---|---|---|
| `--dir <PATH>` / `-d <PATH>` | ✅ | Path to the directory containing `.md` skill files |
| `--prune` | ❌ | Remove skills from the database if their `.md` file is no longer in `<PATH>` |

**Behaviour:**
- Walks the directory non-recursively, skipping symlinks and files larger than 1 MiB.
- Parses YAML frontmatter (`name`, `description`) and uses the body as `content`.
- The file stem (filename without `.md`) is used as the skill `id`.
- Performs an upsert — safe to run multiple times.
- If `--prune` is supplied, any database skill not found in the scanned directory is removed.

---

## `search`

Performs a full-text search and prints matching skills to stdout.

```
skill-cli search <QUERY>
```

| Argument | Required | Description |
|---|---|---|
| `<QUERY>` | ✅ | Keyword or phrase to search. Supports FTS5 query syntax. |

**Output format:**
```
- <id> (<name>): <description>
```

Results are ordered by BM25 relevance score.

---

## `list`

Lists all skills currently indexed in the database.

```
skill-cli list
```

| Flag | Default | Description |
|---|---|---|
| *(none)* | — | No flags. |

**Output format:**
```
- <id> (<name>): <description>
```

---

## `remove`

Deletes a single skill by ID.

```
skill-cli remove <ID>
```

| Argument | Required | Description |
|---|---|---|
| `<ID>` | ✅ | The skill ID to delete |

---

## `remove-bulk`

Deletes multiple skills in one command.

```
skill-cli remove-bulk <ID1> <ID2> ...
```

| Argument | Required | Description |
|---|---|---|
| `<IDS...>` | ✅ | One or more skill IDs separated by spaces |

---

## `purge`

Permanently deletes ALL skills from the database and rebuilds the FTS index.

```
skill-cli purge --yes
```

| Flag | Required | Description |
|---|---|---|
| `--yes` | ✅ | Required safety confirmation flag |

---

## `export`

Exports skills to `.md` files formatted with YAML frontmatter, ready to be shared or synced into another instance.

```
skill-cli export --dir <PATH> [--ids <ID1> <ID2>...] [--query <QUERY>] [--limit <N>]
```

| Flag | Required | Description |
|---|---|---|
| `--dir <PATH>` / `-d <PATH>` | ✅ | Output directory (created automatically if needed) |
| `--ids <ID...>` | ❌ | Export only specific skill IDs (space-separated) |
| `--query <QUERY>` | ❌ | Export only skills matching an FTS search query |
| `--limit <N>` | ❌ | Maximum skills to export when using `--query` (default: `200`) |

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Fatal error (DB connection failed, directory not found, validation error, etc.) |
