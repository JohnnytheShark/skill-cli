/**
 * how-to.js — Diataxis How-to Guides Documentation Data
 */

export const HOWTO_DATA = {
  "how-to/index.md": {
    title: "How-to Guides Overview",
    category: "How-to Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    content: `# How-to Guides

> **Type:** How-to — *Task-oriented*
>
> Step-by-step solutions to practical, real-world tasks with \`skill-cli\`.

---

## Available Guides

| Guide | Goal |
|---|---|
| [Sync a Skills Directory](./sync-skills-directory.md) | Bulk-import a folder of \`.md\` files into SQLite with automatic upserts |
| [Search and Retrieve Skills](./search-and-retrieve.md) | Query skills from CLI or via MCP tools (\`skills_search\`, \`skills_fetch\`) |
| [Upsert a Skill via MCP](./upsert-skill-via-mcp.md) | Programmatically persist new procedural knowledge from an agent at runtime |
| [Connect an AI Agent via MCP](./connect-ai-agent.md) | Configure Claude Desktop, Antigravity, or custom Python agents |
| [Find the Database Path](./custom-db-path.md) | Locate \`skills.db\` on your platform and back it up |
| [Troubleshooting](./troubleshooting.md) | Fix common errors: command not found, database errors, MCP connection issues |

---

## The How-To Mindset

How-to guides assume you already have \`skill-cli\` installed and understand basic concepts. Each guide takes you through a single, concrete recipe from start to finish.`
  },

  "how-to/sync-skills-directory.md": {
    title: "Sync a Skills Directory",
    category: "How-to Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    content: `# How-to: Sync a Skills Directory

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Bulk-import a folder of \`.md\` skill files into the SQLite database.

---

## Prerequisites

- \`skill-cli\` is installed and on your \`PATH\`
- You have a directory of Markdown files (with optional YAML frontmatter)

---

## The \`sync\` Command

\`\`\`bash
skill-cli sync --type <TYPE> --dir <PATH>
\`\`\`

\`<PATH>\` must be a directory. \`skill-cli\` will walk it non-recursively and process every \`.md\` file found.

---

## Skill File Format

Each file should follow this structure:

\`\`\`markdown
---
name: Human-readable name
description: One-line summary for search results
---

# Body content goes here

Full Markdown instructions for the LLM/agent.
\`\`\`

- The filename (without \`.md\`) becomes the \`id\` in the database.
- If no frontmatter is found the file is still imported; \`name\` defaults to the file stem and \`description\` defaults to empty.

---

## Example

\`\`\`bash
# Directory layout:
# skills/
#   python-dataclasses.md
#   rust-lifetimes.md
#   git-bisect.md

skill-cli sync --type skill --dir ./skills
\`\`\`

Output:
\`\`\`text
Imported skill: python-dataclasses
Imported skill: rust-lifetimes
Imported skill: git-bisect
Successfully synced 3 skill(s).
\`\`\`

---

## Upsert Behaviour

\`sync\` calls \`skills_upsert\` internally. If a skill with the same \`id\` already exists in the database it is **updated**, not duplicated. This makes \`sync\` safe to run repeatedly — for example in CI/CD or a pre-commit hook.

---

## Automating with a Pre-commit Hook

\`\`\`bash
cat > .git/hooks/pre-commit << 'EOF'
#!/usr/bin/env bash
set -e
skill-cli sync --type skill --dir ./skills
EOF
chmod +x .git/hooks/pre-commit
\`\`\`

Now every commit automatically keeps your skill database up to date.`
  },

  "how-to/search-and-retrieve.md": {
    title: "Search and Retrieve Skills",
    category: "How-to Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    content: `# How-to: Search and Retrieve Skills

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Query the FTS5 skill index from the CLI or from an MCP-connected agent and retrieve full content.

---

## From the CLI

### Search by keyword

\`\`\`bash
skill-cli search "async runtime"
\`\`\`

Prints matching skills in the format:
\`\`\`text
- <id> (<name>): <description>
\`\`\`

> **Note:** The query must be a non-empty string. An empty query (\`""\`) will return a database error. To browse all skills without filtering, use \`skill-cli list\`.

### List all skills

\`\`\`bash
skill-cli list
\`\`\`

---

## From MCP: \`skills_search\`

Returns lightweight metadata — safe to inject into an LLM prompt without burning tokens.

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "skills_search",
    "arguments": {
      "query": "async runtime",
      "limit": 5
    }
  },
  "id": 1
}
\`\`\`

**Response** (abbreviated):
\`\`\`json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "[{\"id\":\"tokio-basics\",\"name\":\"Tokio Basics\",\"description\":\"...\"}]"
    }]
  }
}
\`\`\`

- \`limit\` is optional and defaults to \`5\`.
- Results are ordered by FTS5 BM25 relevance score (best match first).

---

## From MCP: \`skills_fetch\`

Retrieves the **full Markdown content** of a single skill for context injection.

**Request:**
\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "skills_fetch",
    "arguments": {
      "id": "tokio-basics"
    }
  },
  "id": 2
}
\`\`\`

**Response:**
\`\`\`json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "# Tokio Basics\\n\\n..."
    }]
  }
}
\`\`\`

---

## Typical Agent Workflow

1. Agent calls \`skills_search\` with the user's intent → receives 3–5 metadata results.
2. Agent identifies the most relevant skill ID.
3. Agent calls \`skills_fetch\` with that ID → receives full Markdown.
4. Agent injects the Markdown into its system prompt or context window.`
  },

  "how-to/upsert-skill-via-mcp.md": {
    title: "Upsert a Skill via MCP",
    category: "How-to Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    content: `# How-to: Upsert a Skill via the MCP API

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Create or update a skill at runtime using the \`skills_upsert\` MCP tool — without touching the filesystem.

---

## When to use this

- An agent has synthesized new procedural knowledge and wants to persist it
- A CI pipeline publishes generated skill content programmatically
- You want to update a single skill without re-syncing the entire directory

---

## The \`skills_upsert\` Tool

Send a \`tools/call\` JSON-RPC request:

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "skills_upsert",
    "arguments": {
      "id": "rust-error-handling",
      "name": "Rust Error Handling",
      "description": "Idiomatic error handling patterns in Rust using Result and the ? operator",
      "content": "# Rust Error Handling\\n\\nUse \`Result<T, E>\` for recoverable errors..."
    }
  },
  "id": 1
}
\`\`\`

### Successful response

\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"status\":\"success\",\"id\":\"rust-error-handling\"}"
      }
    ]
  },
  "id": 1
}
\`\`\`

---

## Upsert semantics

| Scenario | Behaviour |
|---|---|
| \`id\` does not exist | A new row is inserted into \`skills\` |
| \`id\` already exists | The row is updated (\`name\`, \`description\`, \`content\`, \`updated_at\`) |
| FTS index | Automatically refreshed by database triggers in both cases |

---

## Using the CLI equivalent

If you prefer not to use MCP, the same operation can be triggered during a \`sync\` run by placing or updating the corresponding \`.md\` file in the sync directory.`
  },

  "how-to/connect-ai-agent.md": {
    title: "Connect an AI Agent via MCP",
    category: "How-to Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    content: `# How-to: Connect an AI Agent via MCP

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Configure an MCP-compatible AI agent (e.g. Claude Desktop, a custom agent, or Antigravity) to call \`skill-cli\` as a tool server.

---

## How MCP stdio transport works

\`skill-cli serve\` reads JSON-RPC 2.0 messages from \`stdin\` line by line and writes responses to \`stdout\`. The hosting agent process is responsible for spawning the binary and wiring up the pipes.

---

## Option A: Antigravity / Claude Desktop (\`mcp_config.json\`)

**Config file locations:**
- **Antigravity (global):** \`~/.gemini/config/mcp_config.json\`
- **Claude Desktop (macOS):** \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- **Claude Desktop (Windows):** \`%APPDATA%\\Claude\\claude_desktop_config.json\`

Add an entry to your MCP configuration file:

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

> **Windows users:** If \`skill-cli\` isn't found (e.g. you haven't restarted your terminal since installing), use the full installer path:
> \`\`\`json
> "command": "C:\\\\Users\\\\<YourName>\\\\.skill-cli\\\\bin\\\\skill-cli.exe"
> \`\`\`
> Confirm the binary exists: \`& "$HOME\\.skill-cli\\bin\\skill-cli.exe" --version\`

> **macOS / Linux users:** If \`skill-cli\` isn't found, use:
> \`\`\`json
> "command": "/Users/<YourName>/.skill-cli/bin/skill-cli"
> \`\`\`

After saving, restart your agent/IDE. The tools \`skills_search\`, \`skills_fetch\`, \`skills_upsert\`, \`skills_delete\`, \`skills_delete_bulk\`, and \`skills_export\` will appear in the tools list.

---

## Option B: Manual stdio test

You can speak the MCP protocol directly:

\`\`\`bash
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | skill-cli serve
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | skill-cli serve
\`\`\`

---

## Option C: Custom Agent (Python example)

\`\`\`python
import subprocess
import json

proc = subprocess.Popen(
    ["skill-cli", "serve"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    text=True,
)

def call(method, params=None, req_id=1):
    msg = json.dumps({"jsonrpc": "2.0", "method": method, "params": params or {}, "id": req_id})
    proc.stdin.write(msg + "\\n")
    proc.stdin.flush()
    return json.loads(proc.stdout.readline())

# Initialize
call("initialize")
call("notifications/initialized")

# Search for a skill
result = call("tools/call", {"name": "skills_search", "arguments": {"query": "git", "limit": 3}})
print(result)
\`\`\`

---

## Verifying the connection

Once connected, ask your agent:
> *"Search my skill engine for anything related to git."*

The agent should invoke \`skills_search\`, receive metadata, then optionally call \`skills_fetch\` to retrieve the full Markdown content and inject it into its context.

---

## Troubleshooting

If the MCP server isn't connecting, see the [Troubleshooting Guide](./troubleshooting.md).`
  },

  "how-to/troubleshooting.md": {
    title: "Troubleshooting",
    category: "How-to Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    content: `# How-to: Troubleshooting

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Diagnose and fix the most common problems encountered when installing and using \`skill-cli\`.

---

## \`skill-cli: command not found\` after installing

**Cause:** The installer added \`~/.skill-cli/bin\` to your user \`PATH\`, but the current terminal session loaded the old \`PATH\` before the change was made.

**Fix:** Close and reopen your terminal, then try again.

If the issue persists, verify the path was added:

\`\`\`powershell
# Windows PowerShell
[Environment]::GetEnvironmentVariable("Path", "User")
# Should include: C:\Users\<YourName>\.skill-cli\bin
\`\`\`

\`\`\`bash
# macOS / Linux
echo $PATH
# Should include: ~/.skill-cli/bin
\`\`\`

---

## \`Database error during search\` with an empty query

**Cause:** FTS5 requires a non-empty keyword string. An empty query (\`""\`) is invalid.

**Fix:** Use a keyword, or \`skill-cli list\` to see all skills:

\`\`\`bash
# Wrong — will error
skill-cli search ""

# Correct
skill-cli list
skill-cli search "git"
\`\`\`

The same rule applies to the \`skills_search\` MCP tool — always pass a non-empty \`query\` string.

---

## MCP server not connecting (wrong binary path)

**Cause:** The \`command\` in \`mcp_config.json\` points to a binary that can't be found.

**Fix:** Use the full absolute path to the binary.

| Platform | Installer path |
|---|---|
| **Windows** | \`C:\\Users\\<YourName>\\.skill-cli\\bin\\skill-cli.exe\` |
| **macOS** | \`/Users/<YourName>/.skill-cli/bin/skill-cli\` |
| **Linux** | \`/home/<YourName>/.skill-cli/bin/skill-cli\` |

Verify the binary first:

\`\`\`powershell
# Windows
& "$HOME\.skill-cli\bin\skill-cli.exe" --version
\`\`\`

\`\`\`bash
# macOS / Linux
~/.skill-cli/bin/skill-cli --version
\`\`\`

Then restart your agent or IDE.

---

## Skills not appearing after \`sync\`

1. Confirm the directory path and that it contains \`.md\` files
2. Run sync again with the absolute path: \`skill-cli sync --dir /absolute/path/to/skills\`
3. Verify import: \`skill-cli list\`
4. Files without frontmatter are still imported — \`name\` defaults to the filename and \`description\` is empty

---

## \`install.ps1\` fails with execution policy error on Windows

\`\`\`powershell
# Run in an Administrator PowerShell window
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Or bypass just for the installer
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex"
\`\`\`

---

## Still stuck?

Open an issue on [GitHub](https://github.com/JohnnytheShark/skill-cli/issues) with your OS version, the exact command you ran, and the full error output.`
  },

  "how-to/custom-db-path.md": {
    title: "Find the Database Path",
    category: "How-to Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    content: `# How-to: Find and Locate the skills.db Database

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Understand where \`skill-cli\` stores its database and what the default path is on each platform.

---

## Default Database Location

| Platform | Default Path |
|---|---|
| **Windows** | \`%APPDATA%\\skills\\skills.db\` |
| **macOS** | \`~/Library/Application Support/skills/skills.db\` |
| **Linux** | \`~/.config/skills/skills.db\` |

The directory is created automatically on first run.

---

## There is no custom path flag

\`skill-cli\` is intentionally zero-config — there is no \`--db\` flag or environment variable to change the database path. To migrate skills between instances, use \`export\` and \`sync\`:

\`\`\`bash
# Export all skills to .md files
skill-cli export --dir ./exported-skills

# On another machine, sync them in
skill-cli sync --dir ./exported-skills
\`\`\`

---

## Backing up the database

\`\`\`powershell
# Windows
Copy-Item "$env:APPDATA\skills\skills.db" "$env:APPDATA\skills\skills.db.bak"
\`\`\`

\`\`\`bash
# macOS / Linux
cp ~/.config/skills/skills.db ~/.config/skills/skills.db.bak
\`\`\``
  }
};
