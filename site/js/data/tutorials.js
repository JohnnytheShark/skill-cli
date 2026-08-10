/**
 * tutorials.js — Diataxis Tutorials Documentation Data
 */

export const TUTORIALS_DATA = {
  "tutorials/getting-started.md": {
    title: "Getting Started with skill-cli",
    category: "Tutorials",
    badge: "🎓 LEARNING-ORIENTED",
    content: `# Tutorial: Getting Started with skill-cli

> **Type:** Tutorial — *Learning-oriented*
> 
> By the end of this tutorial you will have installed \`skill-cli\`, indexed your first skills, and queried them from both the terminal and an MCP-compatible AI agent.

---

## Prerequisites

- A terminal emulator (PowerShell, Bash, or Zsh)
- 5–10 minutes

---

## Step 1: Install skill-cli

Choose the method for your operating system. **No Rust installation required** for the pre-built binaries.

### Windows (PowerShell) — Recommended

\`\`\`powershell
irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex
\`\`\`

The binary is installed to \`~\\.skill-cli\\bin\\skill-cli.exe\` and added to your user \`PATH\` automatically.

> **Important:** After the installer runs, **restart your terminal** before continuing so the updated \`PATH\` takes effect. If you'd rather not restart, use the full path \`~\\.skill-cli\\bin\\skill-cli.exe\` in place of \`skill-cli\` for the rest of this tutorial.

### macOS / Linux — Recommended

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash
\`\`\`

The binary is installed to \`~/.skill-cli/bin/skill-cli\` and added to your shell profile automatically.

### Build from Source (advanced)

Requires the [Rust toolchain](https://rustup.rs/) (rustup ≥ 1.70).

\`\`\`bash
git clone https://github.com/JohnnytheShark/skill-cli.git
cd skill-cli
cargo build --release
\`\`\`

---

### Verify your installation

\`\`\`bash
skill-cli --version
\`\`\`

Expected output: \`skill-cli 0.2.0\` (or similar).

---

## Step 2: Create Your First Skill File

\`skill-cli\` ingests Markdown files with an optional YAML frontmatter header. Any \`.md\` file in a directory you sync becomes a skill.

First, create a directory for your skills:

\`\`\`bash
mkdir my-skills
\`\`\`

Then create a skill file inside it.

**macOS / Linux:**
\`\`\`bash
cat > my-skills/git-bisect.md << 'EOF'
---
name: Git Bisect
description: Use binary search to find the commit that introduced a bug
---

# Git Bisect

Git bisect uses a binary search algorithm to help you find which commit introduced a bug.

## Usage

\`\`\`bash
git bisect start
git bisect bad                  # Current commit is bad
git bisect good <known-good>    # A known-good commit
git bisect good   # or git bisect bad
git bisect reset  # Return to original HEAD
\`\`\`

## Tips

- Use \`git bisect run <script>\` to automate testing.
- The log is viewable with \`git bisect log\`.
EOF
\`\`\`

**Windows (PowerShell):**
\`\`\`powershell
@'
---
name: Git Bisect
description: Use binary search to find the commit that introduced a bug
---

# Git Bisect

Git bisect uses a binary search algorithm to help you find which commit introduced a bug.
'@ | Set-Content my-skills\\git-bisect.md
\`\`\`

> On any OS you can also create the file in any text editor.

---

## Step 3: Sync Skills into the Database

\`\`\`bash
skill-cli sync --type skill --dir ./my-skills
\`\`\`

Expected output:
\`\`\`text
Imported skill: git-bisect
Successfully synced 1 skills.
\`\`\`

The database is stored at:
- **Linux/macOS:** \`~/.config/skills/skills.db\`
- **Windows:** \`%APPDATA%\\skills\\skills.db\`

---

## Step 4: Search and List Skills

List all indexed skills:
\`\`\`bash
skill-cli list --type skill
\`\`\`

Search by keyword:
\`\`\`bash
skill-cli search --type skill "binary search"
\`\`\`

Expected output:
\`\`\`text
- git-bisect (Git Bisect): Use binary search to find the commit that introduced a bug
\`\`\`

> **Note:** The search query must be a non-empty keyword string. To see everything in your index, use \`skill-cli list\`. Running \`skill-cli search ""\` will return a database error.

---

## Step 5: Connect to an AI Agent via MCP

Add an entry to your agent's \`mcp_config.json\`:

**Config file locations:**
- **Antigravity (global):** \`~/.gemini/config/mcp_config.json\`
- **Claude Desktop (macOS):** \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- **Claude Desktop (Windows):** \`%APPDATA%\\Claude\\claude_desktop_config.json\`

\`\`\`json
{
  "mcpServers": {
    "skill-engine": {
      "command": "skill-cli",
      "args": ["serve"]
    }
  }
}
\`\`\`

> **Windows users:** If the short name doesn't work, use the full installer path:
> \`\`\`json
> "command": "C:\\\\Users\\\\<YourName>\\\\.skill-cli\\\\bin\\\\skill-cli.exe"
> \`\`\`

After saving the file, **restart your agent or IDE**.

---

## What You've Learned

- How to install \`skill-cli\` using the one-line installer (no Rust required)
- How to author skills using Markdown + YAML frontmatter
- How to sync a directory of skills into the SQLite database
- How to query skills from the CLI
- How to connect \`skill-cli\` to an AI agent as an MCP tool server

---

## Next Steps

- **Add more skills:** Repeat steps 2–3 for every skill file you have.
- **Troubleshooting:** If something isn't working, see the [Troubleshooting Guide](../how-to/troubleshooting.md).
- **Understand the architecture:** Read the [Architecture Explanation](../explanation/architecture.md).`
  }
};
