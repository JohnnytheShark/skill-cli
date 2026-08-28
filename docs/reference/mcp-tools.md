# Reference: MCP Tools

> **Type:** Reference — *Information-oriented*
>
> Complete JSON-RPC 2.0 / MCP protocol reference for all tools exposed by `skill-cli serve`.

---

## Protocol

`skill-cli serve` implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) version `2024-11-05` over a `stdio` transport.

### Initialize

Every session must begin with an `initialize` / `notifications/initialized` handshake:

```json
// → Client sends:
{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}

// ← Server responds:
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "skill-cli", "version": "0.3.0" }
  },
  "id": 1
}

// → Client sends (no response expected):
{"jsonrpc":"2.0","method":"notifications/initialized","id":null}
```

### List Tools

```json
// → Client sends:
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}

// ← Server responds with all registered tools and their inputSchema.
```

### Call a Tool

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "<tool-name>",
    "arguments": { /* tool-specific */ }
  },
  "id": 3
}
```

---

## Tools Overview

> **Note on Agents:** For every `skills_*` tool listed below, there is an identical `agents_*` counterpart (e.g. `agents_search`, `agents_upsert`, `agents_fetch`). They take the exact same arguments and behave identically but operate on the `agent` or `collection` item type respectively.

---

## Tool: `skills_search` (`agents_search`, and `collections_search`)

Query the FTS5 index for matching skills. Returns **metadata only** to preserve context tokens.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "FTS5 keyword query string"
    },
    "collection": {
      "type": "string",
      "description": "Optional collection filter"
    },
    "limit": {
      "type": "number",
      "description": "Maximum number of results to return (clamped to 200)",
      "default": 5
    }
  },
  "required": ["query"]
}
```

### Output

A JSON array of skill metadata objects:

```json
[
  {
    "id": "git-bisect",
    "name": "Git Bisect",
    "description": "Use binary search to find the commit that introduced a bug",
    "collections": ["git"]
  }
]
```

Results are ordered by FTS5 BM25 relevance (ascending rank score = better match first).

---

## Tool: `skills_fetch` (`agents_fetch`, and `collections_fetch`)

Retrieve the **full Markdown content** of a single skill by its ID.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The unique skill ID to fetch"
    }
  },
  "required": ["id"]
}
```

### Output

The raw Markdown body of the skill as a plain text string:

```
# Git Bisect

Git bisect uses a binary search algorithm...
```

Returns the string `"Skill not found"` if the ID does not exist.

---

## Tool: `skills_upsert` (`agents_upsert`, and `collections_upsert`)

Insert or update a skill. The FTS index is refreshed automatically via database triggers.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique skill identifier (slug format recommended)"
    },
    "name": {
      "type": "string",
      "description": "Human-readable display name"
    },
    "description": {
      "type": "string",
      "description": "One-sentence summary used in search results"
    },
    "content": {
      "type": "string",
      "description": "Full markdown content"
    },
    "collections": {
      "type": "array",
      "description": "Full Markdown content for the skill"
    }
  },
  "required": ["id", "name", "description", "content"]
}
```

### Output

```json
{ "status": "success", "id": "git-bisect" }
```

---

## Tool: `skills_delete` (`agents_delete`, and `collections_delete`)

Delete a single skill by ID from the database and remove it from the FTS search index.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "The skill ID to delete"
    }
  },
  "required": ["id"]
}
```

### Output

```json
{ "status": "success", "deleted": true, "id": "git-bisect" }
```

---

## Tool: `skills_delete_bulk` (`agents_delete_bulk`, and `collections_delete_bulk`)

Delete multiple skills in a single MCP tool call.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Array of skill IDs to delete (max 500)"
    }
  },
  "required": ["ids"]
}
```

### Output

```json
{ "status": "success", "deleted": 3 }
```

---

## Tool: `skills_export` (`agents_export`, and `collections_export`)

Export skills as a JSON array of complete skill objects. Can be filtered by `ids` or by FTS `query`.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "ids": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Specific skill IDs to export"
    },
    "query": {
      "type": "string",
      "description": "FTS search query to filter export"
    },
    "limit": {
      "type": "integer",
      "default": 200
    }
  }
}
```

### Output

```json
[
  {
    "id": "git-bisect",
    "name": "Git Bisect",
    "description": "...",
    "content": "..."
  }
]
```

---

## Tool: `log_usage`

Log the usage of a skill or agent for metrics tracking and time-series analytics.

### Input Schema

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "ID of the skill or agent used"
    },
    "type": {
      "type": "string",
      "enum": ["skill", "agent"],
      "description": "The type of the item being logged"
    }
  },
  "required": ["id", "type"]
}
```

### Output

```json
{ "status": "success" }
```

---

## Error Codes

| Code | Meaning |
|---|---|
| `-32700` | Parse error — malformed JSON |
| `-32601` | Method or tool not found |
| `-32602` | Invalid params — missing required argument or failed validation |
| `-32000` | Database error |
