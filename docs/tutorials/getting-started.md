# Tutorial: Getting Started with skill-cli

> **Type:** Tutorial — *Learning-oriented*
> 
> By the end of this tutorial you will have installed `skill-cli`, indexed your first skills, and queried them from both the terminal and an MCP-compatible AI agent.

---

## Prerequisites

- [Rust toolchain](https://rustup.rs/) (`rustup` ≥ 1.70)
- A terminal emulator
- 10–15 minutes

---

## Step 1: Clone and Build

```bash
git clone <your-repo-url> skill-cli
cd skill-cli
cargo build --release
```

After a successful build you will find the binary at `./target/release/skill-cli`.

> **Tip:** Add the binary to your `PATH` for convenience:
> ```bash
> # Linux / macOS
> export PATH="$PWD/target/release:$PATH"
> 
> # Windows PowerShell
> $env:PATH += ";$PWD\target\release"
> ```

---

## Step 2: Create Your First Skill File

`skill-cli` ingests Markdown files with a YAML frontmatter header called `SKILL.md` (or any `.md` file in a directory you sync).

Create a directory and your first skill:

```bash
mkdir my-skills
cat > my-skills/git-bisect.md << 'EOF'
---
name: Git Bisect
description: Use binary search to find the commit that introduced a bug
---

# Git Bisect

Git bisect uses a binary search algorithm to help you find which commit introduced a bug.

## Usage

```bash
git bisect start
git bisect bad                  # Current commit is bad
git bisect good <known-good>    # A known-good commit
# Git will check out a middle commit; test it, then:
git bisect good   # or git bisect bad
# Repeat until git identifies the first bad commit
git bisect reset  # Return to original HEAD
```

## Tips

- Use `git bisect run <script>` to automate testing.
- The log is viewable with `git bisect log`.
EOF
```

---

## Step 3: Sync Skills into the Database

```bash
skill-cli sync --dir ./my-skills
```

Expected output:
```
Imported skill: git-bisect
Successfully synced 1 skills.
```

The database is stored at `~/.config/skills/skills.db` (Windows: `%APPDATA%\skills\skills.db`).

---

## Step 4: Search and List Skills

List all indexed skills:
```bash
skill-cli list
```

Search by keyword:
```bash
skill-cli search "binary search"
```

Expected output:
```
- git-bisect (Git Bisect): Use binary search to find the commit that introduced a bug
```

---

## Step 5: Run the MCP Server

Start the MCP stdio server so an AI agent can call your skill engine:

```bash
skill-cli serve
```

The server is now listening for JSON-RPC 2.0 messages on `stdin` and writing responses to `stdout`. In a new terminal, you can test it manually:

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | skill-cli serve
```

---

## What You've Learned

- How to build `skill-cli` from source
- How to author skills using Markdown + YAML frontmatter
- How to sync a directory of skills into the SQLite database
- How to query skills from the CLI
- How to start the MCP server

---

## Next Steps

- **Add more skills:** Repeat steps 2–3 for every skill file you have.
- **Connect to an AI agent:** See the [How-to: Connect an AI Agent via MCP](../how-to/connect-ai-agent.md) guide.
- **Understand the architecture:** Read the [Architecture Explanation](../explanation/architecture.md).
