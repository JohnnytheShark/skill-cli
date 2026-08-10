# skill-cli Documentation

**skill-cli** is a high-performance, open-source Rust application that acts as a centralized AI Agent Skill Engine.

## Documentation Structure

This documentation follows the [Diátaxis framework](https://diataxis.fr/), organized into four distinct types based on reader needs:

---

| Type | Purpose | When to use |
|---|---|---|
| [Tutorials](./tutorials/getting-started.md) | Learning-oriented | You are new and want to build understanding |
| [How-to Guides](./how-to/index.md) | Task-oriented | You need to accomplish a specific goal |
| [Reference](./reference/index.md) | Information-oriented | You need precise technical details |
| [Explanation](./explanation/architecture.md) | Understanding-oriented | You want deeper conceptual knowledge |

---

## Quick Start

**Install (one command, no Rust required):**

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex
```

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash
```

**Then:**

```bash
# Import skills from a directory of .md files
skill-cli sync --type skill --dir ./my-skills

# Import agents from a directory of .md files
skill-cli sync --type agent --dir ./my-agents

# Search for a skill
skill-cli search --type skill "rust async"

# List all indexed agents
skill-cli list --type agent

# View usage metrics
skill-cli metrics

# Start the MCP server over stdio
skill-cli serve
```

## Project Layout

```
skill-cli/
├── Cargo.toml          # Project manifest & dependencies
├── src/
│   ├── main.rs         # Entry point, CLI routing
│   ├── cli.rs          # Clap argument definitions
│   ├── db.rs           # SQLite + FTS5 database layer
│   ├── mcp.rs          # MCP / JSON-RPC 2.0 server
│   └── models.rs       # Shared data structures
└── docs/               # You are here
    ├── tutorials/
    ├── how-to/
    ├── reference/
    └── explanation/
```
