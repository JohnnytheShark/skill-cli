# skill-cli

> **A high-performance, open-source Rust AI Agent Skill Engine.**

`skill-cli` is a single statically-linked binary that acts as a centralized skill store for AI agents and human developers. It provides:

- A **CLI** for syncing, searching, and managing skills stored in a local SQLite database.
- An **MCP server** (over `stdio`, JSON-RPC 2.0) that exposes clean, token-efficient tools for LLMs and agents to search, fetch, and update skills without clogging context windows.

---

## Features

- ⚡ **Millisecond FTS5 search** — BM25-ranked full-text search powered by SQLite's built-in FTS5 engine, no external search infrastructure required.
- 🗄️ **Embedded SQLite** — Zero-config, single-file database (`~/.config/skills/skills.db`). Statically compiled, no system SQLite installation needed.
- 🤖 **MCP-native** — Implements the Model Context Protocol (`2024-11-05`) over `stdio`. Compatible with Claude Desktop, Antigravity, and any MCP host.
- 📁 **Filesystem sync** — Import any directory of `.md` files with YAML frontmatter in one command.
- 🦀 **Pure Rust** — Single binary, no runtime, no daemon, no network service to manage.

---

## Quick Start

### Install

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex
```

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash
```

The binary is installed to `~/.skill-cli/bin/` and added to your `PATH` automatically. **Restart your terminal** after installing, then verify:

```bash
skill-cli --version
```

> **Build from Source (advanced):** Requires the [Rust toolchain](https://rustup.rs/).
> ```bash
> git clone https://github.com/JohnnytheShark/skill-cli.git
> cd skill-cli
> cargo build --release
> ```

### Sync skills from a directory

```bash
skill-cli sync --dir ./my-skills
```

Each `.md` file becomes a skill. Frontmatter provides the name and description:

```markdown
---
name: Git Bisect
description: Use binary search to find the commit that introduced a bug
---

# Git Bisect
...
```

### Search from the terminal

```bash
skill-cli search "async runtime"
skill-cli list
```

### Run the MCP server

```bash
skill-cli serve
```

Point any MCP-compatible agent at this binary and it will expose three tool groups: `skills_*`, `agents_*`, and `collections_*`.

---

## CLI Reference

| Command | Description |
|---|---|
| `skill-cli serve` | Start the MCP JSON-RPC 2.0 server over stdio |
| `skill-cli sync --dir <PATH> [--prune]` | Sync `.md` files in a directory into SQLite (optional `--prune` deletes removed files) |
| `skill-cli search <QUERY> [--collection <NAME>]` | Full-text search the skill index |
| `skill-cli list` | List all indexed skills |
| `skill-cli remove <ID>` | Delete a single skill by ID |
| `skill-cli remove-bulk <ID...>` | Delete multiple skills by ID |
| `skill-cli purge --yes` | Delete all skills from the database and rebuild FTS index |
| `skill-cli export --dir <PATH> [--ids ...] [--query ...]` | Export skills as sync-compatible `.md` files |

---

## MCP Tools

| Tool | Input | Output |
|---|---|---|
| `skills_search` | `{ "query": "...", "collection": "...", "limit": 5 }` | Array of `{ id, name, description }` metadata |
| `skills_fetch` | `{ "id": "..." }` | Raw Markdown content string |
| `skills_upsert` | `{ "id", "name", "description", "content", "collections" }` | `{ "status": "success", "id": "..." }` |
| `skills_delete` | `{ "id": "..." }` | `{ "status": "success", "deleted": bool, "id": "..." }` |
| `skills_delete_bulk` | `{ "ids": ["..."] }` | `{ "status": "success", "deleted": number }` |
| `skills_export` | `{ "ids"?: [...], "query"?: "...", "collection"?: "...", "limit"?: 200 }` | JSON array of complete `{ id, name, description, content }` objects |

---

## Connecting to an Agent

Add to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "skill-engine": {
      "command": "skill-cli",
      "args": ["serve"]
    }
  }
}
```

---

## Documentation

Full Diátaxis documentation is in the [`docs/`](./docs/) directory:

| Type | Contents |
|---|---|
| [Tutorial](./docs/tutorials/getting-started.md) | Step-by-step introduction for new users |
| [How-to Guides](./docs/how-to/index.md) | Practical guides for specific tasks |
| [Reference](./docs/reference/index.md) | Complete CLI, MCP, schema, and format specs |
| [Explanation](./docs/explanation/architecture.md) | Architecture, design decisions, and concepts |

---

## Development

```bash
cargo check      # Verify compilation
cargo clippy     # Lint
cargo test       # Run unit tests
cargo build --release  # Optimised build
```

---

## License

Copyright 2026 **Johnny Orellana**

Licensed under the [Apache License, Version 2.0](./LICENSE).

You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

See [NOTICE](./NOTICE) for required attribution notices.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.
