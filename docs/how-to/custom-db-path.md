# How-to: Find and Locate the skills.db Database

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Understand where `skill-cli` stores its database and what the default path is on each platform.

---

## Default Database Location

`skill-cli` uses the `dirs` crate to resolve the platform config directory and appends `skills/skills.db`. The directory is created automatically on first run.

| Platform | Default Path |
|---|---|
| **Windows** | `%APPDATA%\skills\skills.db` |
| **macOS** | `~/Library/Application Support/skills/skills.db` |
| **Linux** | `~/.config/skills/skills.db` (or `$XDG_CONFIG_HOME/skills/skills.db`) |

---

## Verify the database exists

After running any `skill-cli` command for the first time, the database is created automatically. To confirm:

```powershell
# Windows PowerShell
Test-Path "$env:APPDATA\skills\skills.db"
```

```bash
# macOS / Linux
ls ~/.config/skills/skills.db
```

---

## There is no custom path flag

`skill-cli` is intentionally **zero-config** — there is no `--db` flag or environment variable to change the database path. All commands automatically resolve to the platform default above.

If you need to work with a different database (e.g., for testing), the recommended approach is to `export` skills from one instance and `sync` them into another:

```bash
# Export all skills from the current database to .md files
skill-cli export --dir ./exported-skills

# On another machine (or after clearing the DB), sync them back in
skill-cli sync --dir ./exported-skills
```

---

## Backing up the database

Because the database is a plain SQLite file, backing it up is straightforward:

```powershell
# Windows PowerShell
Copy-Item "$env:APPDATA\skills\skills.db" "$env:APPDATA\skills\skills.db.bak"
```

```bash
# macOS / Linux
cp ~/.config/skills/skills.db ~/.config/skills/skills.db.bak
```

---

## See also

- [Reference: Configuration](../reference/configuration.md) — full platform path table and logging details.
- [Reference: Database Schema](../reference/database-schema.md) — SQLite schema, triggers, and FTS5 setup.
