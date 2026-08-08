/**
 * explanation.js — Diataxis Explanation Documentation Data
 */

export const EXPLANATION_DATA = {
  "explanation/architecture.md": {
    title: "Architecture & Design Decisions",
    category: "Explanation",
    badge: "💡 UNDERSTANDING-ORIENTED",
    content: `# Explanation: Architecture

> **Type:** Explanation — *Understanding-oriented*
>
> This document explains *why* \`skill-cli\` is designed the way it is and the trade-offs behind its architecture.

---

## The Core Problem

AI agents (LLMs) have finite context windows. When an agent needs to follow a complex, multi-step procedure it faces a dilemma:

- **Embed the procedure in the system prompt** → wastes tokens on knowledge the agent may not need right now.
- **Re-generate the procedure on demand** → risks hallucination, is inconsistent, and is slow.

\`skill-cli\` is a third path: a **persistent, searchable, structured store of procedural knowledge** that agents can pull from at query time. Only the relevant skill content enters the context window, keeping prompts lean and outputs deterministic.

---

## Two Personalities, One Binary

\`skill-cli\` serves two distinct audiences from a single statically linked binary:

\`\`\`text
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
\`\`\`

**CLI mode** is for humans: \`sync\`, \`search\`, \`list\` — fast terminal workflows.

**MCP mode** (\`serve\`) exposes the same database operations over a JSON-RPC 2.0 protocol that agents understand natively.

The shared database layer means there is no duplication: a skill synced via CLI is immediately available to agents, and a skill upserted by an agent is immediately visible in CLI queries.

---

## Why SQLite?

SQLite was chosen over a dedicated vector store or an external database for several reasons:

- **Zero infrastructure.** A single file, no daemon, no network, no container. The binary carries SQLite statically linked via \`bundled-full\`.
- **FTS5 is fast enough.** For the scale of a personal or team skill library (hundreds to low thousands of entries) BM25 keyword search has millisecond latency and requires no model embeddings.
- **Upsert semantics.** \`INSERT OR REPLACE\` / \`ON CONFLICT DO UPDATE\` makes the sync workflow trivial.
- **Triggers keep FTS in sync.** The three database triggers (\`skills_ai\`, \`skills_ad\`, \`skills_au\`) ensure the FTS virtual table is always consistent with the content table with no application-level coordination required.

---

## Why stdio transport for MCP?

- **Zero network surface.** The server cannot be reached over the network at all. There is no port, no TLS to configure, no firewall rules.
- **Native process isolation.** The agent host spawns \`skill-cli\` as a child process; the OS provides the isolation boundary.
- **Simple deployment.** Any MCP-compatible host can launch the binary and pipe JSON-RPC messages without any server setup.

---

## Why the Two-Phase Search Design?

The MCP tools are deliberately separated into \`skills_search\` (metadata only) and \`skills_fetch\` (full content):

\`\`\`text
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
\`\`\`

The agent first searches and gets back a small, token-cheap list. It then selects the most relevant skill and fetches only that one. This two-step approach avoids injecting dozens of full Markdown documents into the context when only one is needed.`
  },

  "explanation/fts5-search.md": {
    title: "FTS5 Full-Text Search Mechanics",
    category: "Explanation",
    badge: "💡 UNDERSTANDING-ORIENTED",
    content: `# Explanation: FTS5 Full-Text Search

> **Type:** Explanation — *Understanding-oriented*
>
> How SQLite FTS5 works in \`skill-cli\`, why it was chosen over vector search, and BM25 ranking mechanics.

---

## What is FTS5?

FTS5 is SQLite's fifth-generation **Full-Text Search** extension. It allows efficient keyword search over large amounts of text without an external search engine.

In \`skill-cli\`, FTS5 indexes the \`name\`, \`description\`, and \`content\` columns of every skill. A \`MATCH\` query returns skills that contain matching tokens, ranked by relevance.

---

## BM25 Ranking

By default, FTS5 ranks results using the **BM25** algorithm. BM25 scores documents higher when:

- The query term appears **frequently** in the document.
- The document is **shorter** than the average.
- The query term is **rare** across the corpus (common words are down-weighted).

The FTS5 \`rank\` column returns the BM25 score. **Lower rank = better match.** \`skill-cli\` uses \`ORDER BY rank\` (ascending) so the best results come first.

---

## Why Keyword Search Over Vector Search?

1. **Deterministic & Reproducible:** The same query always returns identical rankings.
2. **Zero External API Dependencies:** Requires no OpenAI/Voyage/Ollama embedding calls.
3. **Sub-millisecond Speed:** Queries execute in under 1ms locally.
4. **Offline Capability:** Works anywhere without Internet access.`
  },

  "explanation/mcp-protocol.md": {
    title: "MCP & JSON-RPC 2.0 Wire Protocol",
    category: "Explanation",
    badge: "💡 UNDERSTANDING-ORIENTED",
    content: `# Explanation: MCP and the JSON-RPC 2.0 Protocol

> **Type:** Explanation — *Understanding-oriented*
>
> How the Model Context Protocol works, stdio JSON-RPC 2.0 message framing, and why \`skill-cli\` has zero SDK bloat.

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that defines how AI agents discover and invoke external capabilities at runtime.

It separates tool definition (what the server offers) from tool invocation (how and when the LLM calls it).

---

## JSON-RPC 2.0 Framing

MCP over stdio communicates via single-line newline-delimited JSON-RPC 2.0 objects:

\`\`\`json
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"skills_search","arguments":{"query":"rust"}},"id":1}
\`\`\`

---

## Why No Heavy SDK?

\`skill-cli\` implements the MCP protocol directly in clean Rust rather than taking on external framework dependencies. This guarantees:
- Pure statically linked machine binary (~4MB).
- Direct control over \`stdin\` / \`stdout\` buffering.
- High reliability and zero dependency vulnerabilities.`
  }
};
