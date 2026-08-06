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

```bash
# Build the binary
cargo build --release

# Import skills from a directory of SKILL.md files
./target/release/skill-cli sync --dir ./my-skills

# Search for a skill
./target/release/skill-cli search "rust async"

# List all indexed skills
./target/release/skill-cli list

# Start the MCP server over stdio
./target/release/skill-cli serve
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
