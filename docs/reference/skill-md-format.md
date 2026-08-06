# Reference: SKILL.md Format

> **Type:** Reference — *Information-oriented*
>
> Complete specification for the `.md` skill file format consumed by `skill-cli sync`.

---

## File Location & Naming

- Files must have the `.md` extension.
- The file **stem** (name without `.md`) becomes the skill `id` in the database.
- IDs must be unique across all synced directories.
- Recommendation: use `kebab-case` slugs (e.g., `rust-error-handling.md`).

---

## File Structure

```
---
<YAML frontmatter>
---

<Markdown body>
```

A file with no frontmatter is valid; all fields will fall back to defaults.

---

## YAML Frontmatter Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | string | No | file stem | Human-readable display name shown in search results |
| `description` | string | No | `""` (empty) | One-sentence summary indexed by FTS5 |

Any additional YAML keys are currently ignored.

---

## Markdown Body

The body (everything after the closing `---`) is stored verbatim as the skill `content`. There are no structural requirements — write any valid Markdown.

**Best practices:**
- Open with an `# H1` heading matching the `name` field.
- Keep instructions clear, self-contained, and actionable.
- Include code blocks with language tags for syntax highlighting.
- Avoid embedding secrets or sensitive paths.

---

## Complete Example

```markdown
---
name: Rust Lifetimes
description: Understand and apply lifetime annotations in Rust
---

# Rust Lifetimes

Lifetimes are Rust's mechanism for ensuring that references do not outlive the
data they point to.

## Basic Annotation

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

## Rules of Thumb

1. Every reference has a lifetime.
2. The borrow checker infers lifetimes in most cases.
3. Explicit annotations are only required when the borrow checker cannot
   determine the relationship between input and output lifetimes.
```

---

## Minimal Valid File (no frontmatter)

```markdown
# Quick note on cargo features

Use `features = ["full"]` to enable all Tokio features during development.
```

This will be stored with:
- `id`: derived from the filename
- `name`: same as `id`
- `description`: `""`
- `content`: the entire file text
