# Explanation: Architecture

> **Type:** Explanation — *Understanding-oriented*
>
> This document explains *why* `skill-cli` is designed the way it is.
> It is not a step-by-step guide — it is a discussion of the architectural decisions and the trade-offs behind them.

---

## The Core Problem

AI agents (LLMs) have finite context windows. When an agent needs to follow a complex, multi-step procedure it faces a dilemma:

- **Embed the procedure in the system prompt** → wastes tokens on knowledge the agent may not need right now.
- **Re-generate the procedure on demand** → risks hallucination, is inconsistent, and is slow.

`skill-cli` is a third path: a **persistent, searchable, structured store of procedural knowledge** that agents can pull from at query time. Only the relevant skill content enters the context window, keeping prompts lean and outputs deterministic.

---

## Two Personalities, One Binary

`skill-cli` serves two distinct audiences from a single statically linked binary:

```
┌────────────────────────────────────────┐
│              skill-cli binary          │
│                                        │
│  ┌──────────────┐  ┌────────────────┐  │
│  │  CLI mode    │  │   MCP mode     │  │
│  │ (human dev)  │  │ (LLM / agent)  │  │
│  └──────┬───────┘  └───────┬────────┘  │
│         │                  │            │
│         └────────┬─────────┘            │
│                  ▼                      │
│          ┌──────────────┐               │
│          │   db layer   │               │
│          │  (rusqlite)  │               │
│          └──────────────┘               │
└────────────────────────────────────────┘
```

**CLI mode** is for humans: `sync`, `search`, `list` — fast terminal workflows.

**MCP mode** (`serve`) exposes the same database operations over a JSON-RPC 2.0 protocol that agents understand natively.

The shared database layer means there is no duplication: a skill synced via CLI is immediately available to agents, and a skill upserted by an agent is immediately visible in CLI queries.

---

## Why SQLite?

SQLite was chosen over a dedicated vector store or an external database for several reasons:

- **Zero infrastructure.** A single file, no daemon, no network, no container. The binary carries SQLite statically linked via `bundled-full`.
- **FTS5 is fast enough.** For the scale of a personal or team skill library (hundreds to low thousands of entries) BM25 keyword search has millisecond latency and requires no model embeddings.
- **Upsert semantics.** `INSERT OR REPLACE` / `ON CONFLICT DO UPDATE` makes the sync workflow trivial.
- **Triggers keep FTS in sync.** The three database triggers (`skills_ai`, `skills_ad`, `skills_au`) ensure the FTS virtual table is always consistent with the content table with no application-level coordination required.

The trade-off is that SQLite FTS5 uses keyword matching, not semantic (embedding-based) search. This is intentional: keyword search is reproducible, fast, and requires no API calls.

---

## Why stdio transport for MCP?

The MCP specification supports multiple transport layers. `skill-cli` implements `stdio` (standard input/output) for these reasons:

- **Zero network surface.** The server cannot be reached over the network at all. There is no port, no TLS to configure, no firewall rules.
- **Native process isolation.** The agent host spawns `skill-cli` as a child process; the OS provides the isolation boundary.
- **Simple deployment.** Any MCP-compatible host (Claude Desktop, Antigravity, custom Python, etc.) can launch the binary and pipe JSON-RPC messages without any server setup.

The trade-off is that the server cannot be shared across multiple agent processes simultaneously in this mode. For multi-agent or multi-host deployments an HTTP transport adapter could be layered on top in the future.

---

## Why the Two-Phase Search Design?

The MCP tools are deliberately separated into `skills_search` (metadata only) and `skills_fetch` (full content):

```
Agent context window
┌──────────────────────────────────────────┐
│ System prompt                            │
│ Conversation history                     │
│                                          │
│ [skills_search result]  ← tiny (5 rows) │
│   id, name, description only            │
│                                          │
│ [skills_fetch result]   ← 1 full skill  │
│   full Markdown content                  │
└──────────────────────────────────────────┘
```

The agent first searches and gets back a small, token-cheap list. It then selects the most relevant skill and fetches only that one. This two-step approach avoids injecting dozens of full Markdown documents into the context when only one is needed.

---

## Connection Pooling

The database layer uses `r2d2` with `r2d2_sqlite`. This is slightly over-engineered for the current `stdio` server (which is single-threaded and serves one agent at a time), but it:

- Provides a clear upgrade path if a concurrent HTTP transport is added.
- Encapsulates connection lifecycle management cleanly.
- Has negligible overhead for the single-threaded case.

---

## The Sync Mental Model

`sync` is a **one-way, idempotent import**:

```
Filesystem (.md files)  ──sync──►  SQLite (skills table)
```

Edits made directly to the SQLite database are not reflected back to the filesystem. The filesystem is the source of truth for human-authored skills. The database is the source of truth for agents at runtime.

This separation keeps the sync command simple and safe to run repeatedly without side effects.
