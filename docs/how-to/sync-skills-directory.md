# How-to: Sync a Skills Directory

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Bulk-import a folder of `.md` skill files into the SQLite database.

---

## Prerequisites

- `skill-cli` is installed and on your `PATH`
- You have a directory of Markdown files (with optional YAML frontmatter)

---

## The `sync` Command

```
skill-cli sync --dir <PATH>
```

`<PATH>` must be a directory. `skill-cli` will walk it non-recursively and process every `.md` file found.

---

## Skill File Format

Each file should follow this structure:

```markdown
---
name: Human-readable name
description: One-line summary for search results
---

# Body content goes here

Full Markdown instructions for the LLM/agent.
```

- The filename (without `.md`) becomes the `id` in the database.
- If no frontmatter is found the file is still imported; `name` defaults to the file stem and `description` defaults to empty.

---

## Example

```bash
# Directory layout:
# skills/
#   python-dataclasses.md
#   rust-lifetimes.md
#   git-bisect.md

skill-cli sync --dir ./skills
```

Output:
```
Imported skill: python-dataclasses
Imported skill: rust-lifetimes
Imported skill: git-bisect
Successfully synced 3 skills.
```

---

## Upsert Behaviour

`sync` calls `skills_upsert` internally. If a skill with the same `id` already exists in the database it is **updated**, not duplicated. This makes `sync` safe to run repeatedly — for example in CI/CD or a pre-commit hook.

---

## Automating with a Pre-commit Hook

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/usr/bin/env bash
set -e
skill-cli sync --dir ./skills
EOF
chmod +x .git/hooks/pre-commit
```

Now every commit automatically keeps your skill database up to date.
