# How-to: Search and Retrieve Skills

> **Type:** How-to — *Task-oriented*
>
> **Goal:** Query the FTS5 skill index from the CLI or from an MCP-connected agent and retrieve full content.

---

## From the CLI

### Search by keyword

```bash
skill-cli search "async runtime"
```

Prints matching skills in the format:
```
- <id> (<name>): <description>
```

> **Note:** The query must be a non-empty string. An empty query (`""`) will return a database error. To browse all skills without filtering, use `skill-cli list`.

### List all skills

```bash
skill-cli list
```

---

## From MCP: `skills_search`

Returns lightweight metadata — safe to inject into an LLM prompt without burning tokens.

**Request:**
```json
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
```

**Response** (abbreviated):
```json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "[{\"id\":\"tokio-basics\",\"name\":\"Tokio Basics\",\"description\":\"...\"}]"
    }]
  }
}
```

- `limit` is optional and defaults to `5`.
- Results are ordered by FTS5 BM25 relevance score (best match first).

---

## From MCP: `skills_fetch`

Retrieves the **full Markdown content** of a single skill for context injection.

**Request:**
```json
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
```

**Response:**
```json
{
  "result": {
    "content": [{
      "type": "text",
      "text": "# Tokio Basics\n\n..."
    }]
  }
}
```

---

## Typical Agent Workflow

1. Agent calls `skills_search` with the user's intent → receives 3–5 metadata results.
2. Agent identifies the most relevant skill ID.
3. Agent calls `skills_fetch` with that ID → receives full Markdown.
4. Agent injects the Markdown into its system prompt or context window.
