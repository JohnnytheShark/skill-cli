# How-to: Troubleshooting

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Diagnose and fix the most common problems encountered when installing and using `skill-cli`.

---

## `skill-cli: command not found` after installing

**Cause:** The installer added `~/.skill-cli/bin` to your user `PATH`, but the current terminal session loaded the old `PATH` before the change was made.

**Fix:** Close and reopen your terminal, then try again.

If that doesn't work, check the path was added:

```powershell
# Windows PowerShell
[Environment]::GetEnvironmentVariable("Path", "User")
# Should include: C:\Users\<YourName>\.skill-cli\bin
```

```bash
# macOS / Linux
echo $PATH
# Should include: ~/.skill-cli/bin
```

If it's missing, add it manually:

```powershell
# Windows PowerShell (permanent)
$bin = "$HOME\.skill-cli\bin"
[Environment]::SetEnvironmentVariable("Path", "$([Environment]::GetEnvironmentVariable('Path','User'));$bin", "User")
```

```bash
# macOS / Linux (add to your shell profile)
echo 'export PATH="$HOME/.skill-cli/bin:$PATH"' >> ~/.zshrc   # zsh
echo 'export PATH="$HOME/.skill-cli/bin:$PATH"' >> ~/.bashrc  # bash
source ~/.zshrc  # or source ~/.bashrc
```

---

## `Database error during search` when searching with an empty query

**Cause:** The FTS5 search engine requires a non-empty keyword string. An empty query (`""`) is invalid.

**Fix:** Use a keyword, or use `skill-cli list` to see all indexed skills without a search query:

```bash
# Wrong — will error
skill-cli search ""

# Correct — list all skills
skill-cli list

# Correct — search with a keyword
skill-cli search "git"
```

The same applies to the `skills_search` MCP tool — always pass a non-empty `query` string.

---

## MCP server not connecting to the agent (wrong binary path)

**Cause:** The `command` field in `mcp_config.json` points to a binary that doesn't exist or isn't executable.

**Fix:** Use the full absolute path to the binary instead of relying on the short name:

**Windows** — the installer puts the binary here:
```
C:\Users\<YourName>\.skill-cli\bin\skill-cli.exe
```

**macOS / Linux** — the installer puts the binary here:
```
/Users/<YourName>/.skill-cli/bin/skill-cli    (macOS)
/home/<YourName>/.skill-cli/bin/skill-cli     (Linux)
```

Update your `mcp_config.json`:
```json
{
  "mcpServers": {
    "skill-engine": {
      "command": "C:\\Users\\<YourName>\\.skill-cli\\bin\\skill-cli.exe",
      "args": ["serve"]
    }
  }
}
```

Then restart your agent or IDE.

To confirm the path is correct before updating the config, run it directly:

```powershell
# Windows PowerShell
& "C:\Users\<YourName>\.skill-cli\bin\skill-cli.exe" --version

# macOS / Linux
~/.skill-cli/bin/skill-cli --version
```

---

## Skills not appearing after `sync`

**Cause:** One of several possible issues — wrong directory path, files missing frontmatter, or a silent error.

**Diagnosis:**

1. Check the directory path is correct and contains `.md` files:
   ```bash
   ls ./my-skills/      # macOS / Linux
   dir .\my-skills\     # Windows PowerShell
   ```

2. Run sync again with the full path to rule out relative path issues:
   ```bash
   skill-cli sync --dir /absolute/path/to/my-skills
   ```

3. Verify skills were imported:
   ```bash
   skill-cli list
   ```

4. Check that your `.md` files have valid YAML frontmatter. The minimum required format is:
   ```markdown
   ---
   name: Skill Name
   description: One-line summary
   ---
   ```
   Files without frontmatter are still imported, but the `name` will default to the filename and `description` will be empty.

---

## Agent says it can't find a skill I just synced

**Cause:** The agent's MCP connection to `skill-cli serve` was established before you synced. Because `skill-cli` reads from the database at query time (not at startup), no restart is needed — but if the `search` query doesn't match, the skill won't appear.

**Fix:**

1. Confirm the skill is in the database: `skill-cli list`
2. Try a broader keyword from the skill's `name` or `description` fields
3. Remember that `skills_search` uses keyword FTS5 — not semantic search. The query must share actual words with the skill's name, description, or content.

---

## `install.ps1` fails with "execution policy" error on Windows

**Cause:** PowerShell's execution policy is blocking the script.

**Fix:** Run the following in an Administrator PowerShell window, then retry the installer:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Or run the installer with an explicit bypass for just this command:

```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex"
```

---

## Still stuck?

Open an issue on [GitHub](https://github.com/JohnnytheShark/skill-cli/issues) with:
- Your OS and version
- The exact command you ran
- The full error output
