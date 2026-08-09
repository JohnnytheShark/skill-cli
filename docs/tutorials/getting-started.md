# Tutorial: Getting Started with skill-cli

> **Type:** Tutorial — *Learning-oriented*
> 
> By the end of this tutorial you will have installed `skill-cli`, indexed your first skills, and queried them from both the terminal and an MCP-compatible AI agent.

---

## Prerequisites

- A terminal emulator (PowerShell, Bash, or Zsh)
- 5–10 minutes

---

## Step 1: Install skill-cli

Choose the method for your operating system. **No Rust installation required** for the pre-built binaries.

### Windows (PowerShell) — Recommended

```powershell
irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex
```

The binary is installed to `~\.skill-cli\bin\skill-cli.exe` and added to your user `PATH` automatically.

> **Important:** After the installer runs, **restart your terminal** before continuing so the updated `PATH` takes effect. If you'd rather not restart, use the full path `~\.skill-cli\bin\skill-cli.exe` in place of `skill-cli` for the rest of this tutorial.

### macOS / Linux — Recommended

```bash
curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash
```

The binary is installed to `~/.skill-cli/bin/skill-cli` and added to your shell profile automatically.

### Build from Source (advanced)

Requires the [Rust toolchain](https://rustup.rs/) (rustup ≥ 1.70).

```bash
git clone https://github.com/JohnnytheShark/skill-cli.git
cd skill-cli
cargo build --release
# Binary is at ./target/release/skill-cli (or skill-cli.exe on Windows)
```

---

### Verify your installation

```bash
skill-cli --version
```

Expected output: `skill-cli 0.1.0` (or similar).

---

## Step 2: Create Your First Skill File

`skill-cli` ingests Markdown files with an optional YAML frontmatter header. Any `.md` file in a directory you sync becomes a skill.

First, create a directory for your skills:

```bash
mkdir my-skills
```

Then create a skill file inside it. Choose the command for your OS:

**macOS / Linux (bash):**
```bash
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

**Windows (PowerShell):**
```powershell
@'
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
git bisect good   # or git bisect bad
git bisect reset  # Return to original HEAD
```

## Tips

- Use `git bisect run <script>` to automate testing.
- The log is viewable with `git bisect log`.
'@ | Set-Content my-skills\git-bisect.md
```

Alternatively on any OS you can simply open any text editor and create `my-skills/git-bisect.md` with the content above.

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

The database is stored at:
- **Linux/macOS:** `~/.config/skills/skills.db`
- **Windows:** `%APPDATA%\skills\skills.db`

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

> **Note:** The search query must be a non-empty keyword string. To see everything in your index, use `skill-cli list`. Running `skill-cli search ""` will return a database error.

---

## Step 5: Connect to an AI Agent via MCP

`skill-cli` exposes its database as an MCP tool server. To connect it to Antigravity, Claude Desktop, or any MCP-compatible agent, add an entry to your `mcp_config.json` file.

**Location of your config file:**
- **Antigravity (global):** `~/.gemini/config/mcp_config.json`
- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

Add the following entry:

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

> **Windows users:** If `skill-cli` is not yet on your `PATH` (e.g., you haven't restarted your terminal since installing), use the full installer path instead:
> ```json
> "command": "C:\\Users\\<YourName>\\.skill-cli\\bin\\skill-cli.exe"
> ```

After saving the file, **restart your agent or IDE**. The tools `skills_search`, `skills_fetch`, and `skills_upsert` will appear in the tools list.

---

## What You've Learned

- How to install `skill-cli` using the one-line installer (no Rust required)
- How to author skills using Markdown + YAML frontmatter
- How to sync a directory of skills into the SQLite database
- How to query skills from the CLI
- How to connect `skill-cli` to an AI agent as an MCP tool server

---

## Next Steps

- **Add more skills:** Repeat steps 2–3 for every skill file you have.
- **Troubleshooting:** If something isn't working, see the [Troubleshooting Guide](../how-to/troubleshooting.md).
- **Understand the architecture:** Read the [Architecture Explanation](../explanation/architecture.md).
