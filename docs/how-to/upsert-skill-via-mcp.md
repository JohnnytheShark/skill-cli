# How-to: Upsert a Skill via the MCP API

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Create or update a skill at runtime using the `skills_upsert` MCP tool — without touching the filesystem.

---

## When to use this

- An agent has synthesized new procedural knowledge and wants to persist it
- A CI pipeline publishes generated skill content programmatically
- You want to update a single skill without re-syncing the entire directory

---

## The `skills_upsert` Tool

Send a `tools/call` JSON-RPC request:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "skills_upsert",
    "arguments": {
      "id": "rust-error-handling",
      "name": "Rust Error Handling",
      "description": "Idiomatic error handling patterns in Rust using Result and the ? operator",
      "content": "# Rust Error Handling\n\nUse `Result<T, E>` for recoverable errors..."
    }
  },
  "id": 1
}
```

### Successful response

```json
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
```

---

## Upsert semantics

| Scenario | Behaviour |
|---|---|
| `id` does not exist | A new row is inserted into `skills` |
| `id` already exists | The row is updated (`name`, `description`, `content`, `updated_at`) |
| FTS index | Automatically refreshed by database triggers in both cases |

---

## Using the CLI equivalent

If you prefer not to use MCP, the same operation can be triggered during a `sync` run by placing or updating the corresponding `.md` file in the sync directory.
