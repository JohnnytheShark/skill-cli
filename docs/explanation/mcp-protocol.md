# Explanation: MCP and the JSON-RPC 2.0 Protocol

> **Type:** Explanation — *Understanding-oriented*
>
> This document explains what MCP is, how JSON-RPC 2.0 works, and why `skill-cli` implements it without an SDK.

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that defines how AI agents (LLMs and tool-calling systems) discover and invoke external capabilities ("tools") at runtime.

It separates the concerns of:

- **Tool definition** — a server declares what it can do, what inputs it accepts, and what outputs it produces.
- **Tool invocation** — a client (the agent host) decides when and how to call a tool based on the LLM's output.

This gives agents a clean, standardised interface to external systems without the agent needing hardcoded knowledge of each system's API.

---

## JSON-RPC 2.0 in Plain Terms

MCP's wire format is JSON-RPC 2.0. Every message is a JSON object on a single line.

### Request (client → server)

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "skills_search",
    "arguments": { "query": "error handling", "limit": 3 }
  },
  "id": 42
}
```

- `jsonrpc`: always `"2.0"`.
- `method`: what to do.
- `params`: input data.
- `id`: used to match responses to requests.

### Response (server → client)

```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{ "type": "text", "text": "[...]" }]
  },
  "id": 42
}
```

- `result` is present on success.
- `error` is present on failure.
- `id` echoes the request's id.

### Notification (no response expected)

```json
{ "jsonrpc": "2.0", "method": "notifications/initialized", "id": null }
```

Notifications have a `null` id and require no response.

---

## The Session Lifecycle

```
Client                        Server (skill-cli serve)
  │                                │
  │──── initialize ───────────────►│
  │◄─── {protocolVersion, ...} ────│
  │                                │
  │──── notifications/initialized ►│  (no response)
  │                                │
  │──── tools/list ───────────────►│
  │◄─── [{name, description, ...}] │
  │                                │
  │──── tools/call ───────────────►│
  │◄─── {content: [...]} ──────────│
  │                                │
  │  (stdin closed / process ends) │
```

---

## Why No SDK?

`skill-cli` implements the MCP protocol directly in ~250 lines of Rust rather than using a third-party MCP SDK. The reasons:

1. **Zero extra dependencies.** The protocol is simple enough that a hand-rolled implementation is smaller than any SDK.
2. **Full control over the stdio loop.** The server reads line by line with `BufRead`, which is synchronous, predictable, and has no hidden buffering surprises.
3. **Transparency.** Developers reading the source can understand the full protocol flow without indirection through an SDK's abstractions.
4. **Correctness.** By mapping the five MCP methods (`initialize`, `notifications/initialized`, `tools/list`, `tools/call`, and a catch-all error for unknown methods) directly, there is no hidden behaviour.

The trade-off is that adding new MCP features (e.g., resources, prompts, sampling) requires manual implementation rather than configuration.

---

## stdout vs stderr

`skill-cli serve` routes output to two separate streams:

| Stream | Content |
|---|---|
| `stdout` | JSON-RPC 2.0 protocol messages only |
| `stderr` | Human-readable logs and diagnostics |

This is a strict requirement of the MCP `stdio` transport: any non-JSON bytes on `stdout` would corrupt the message stream and cause parse errors in the agent host. All `eprintln!()` calls in the source go to `stderr` for this reason.
