# Explanation: FTS5 Full-Text Search

> **Type:** Explanation — *Understanding-oriented*
>
> This document explains how FTS5 works in `skill-cli`, why it was chosen over alternatives, and what its query language supports.

---

## What is FTS5?

FTS5 is SQLite's fifth-generation **Full-Text Search** extension. It allows efficient keyword search over large amounts of text without a separate search engine.

In `skill-cli`, FTS5 indexes the `name`, `description`, and `content` columns of every skill. A `MATCH` query returns skills that contain matching tokens, ranked by relevance.

---

## How the Index is Maintained

FTS5 operates on a **content table** pattern: the `skills_fts` virtual table mirrors `skills` but is kept in sync by three database triggers rather than by application code.

```
INSERT/UPDATE/DELETE on skills
          │
          ▼
    trigger fires
          │
          ▼
  skills_fts updated
```

This means the application never needs to manage the index directly — it simply writes to `skills` and the index stays accurate.

---

## BM25 Ranking

By default, FTS5 ranks results using the **BM25** algorithm. BM25 is a probabilistic ranking function that scores documents higher when:

- The query term appears **frequently** in the document.
- The document is **shorter** than the average (a term appearing 3 times in a short description is more relevant than 3 times in a long essay).
- The query term is **rare** across the corpus (common words are down-weighted).

The FTS5 `rank` column returns the BM25 score. **Lower rank = better match.** `skill-cli` uses `ORDER BY rank` (ascending) so the best results come first.

---

## Query Syntax

FTS5 supports a rich query language. Examples:

| Query | Meaning |
|---|---|
| `rust async` | Documents containing both `rust` and `async` (anywhere) |
| `"async runtime"` | Documents containing the exact phrase `async runtime` |
| `rust OR python` | Documents containing either `rust` or `python` |
| `rust NOT python` | Documents containing `rust` but not `python` |
| `rust*` | Documents containing any word starting with `rust` (prefix) |
| `name:rust` | Documents where the `name` column contains `rust` |

All `skill-cli search <query>` and `skills_search` MCP calls pass the query string directly to FTS5 MATCH, so the full query syntax is available to callers.

---

## Why Keyword Search Instead of Semantic Search?

Semantic (embedding-based) vector search can find conceptually similar results even when exact keywords don't match. So why does `skill-cli` use keyword FTS5 instead?

**Reproducibility.** Keyword search is deterministic — the same query always returns the same results. Embedding-based search can vary across model versions.

**No external dependencies.** Semantic search requires calling an embedding model API (or running a local model). FTS5 runs entirely inside the SQLite binary that is statically compiled into `skill-cli`.

**Speed.** FTS5 returns results in <1ms on typical skill libraries. Embedding generation adds network latency or GPU time.

**Skill names are already precise.** A well-authored `SKILL.md` has a clear `name` and `description` that contain the right keywords. The query `"git bisect"` reliably finds the Git Bisect skill.

**The trade-off:** You cannot find skills by semantic similarity when no shared keywords exist. Mitigation: write rich descriptions and include synonyms in your skill content.

---

## Tuning Search Results

To improve search quality without changing code:

1. **Improve `description` fields.** Descriptions are indexed and appear in search results. Include key terminology and synonyms.
2. **Use the `name` column wisely.** FTS5 does not weight columns differently by default, but a precise name helps humans read results quickly.
3. **Prefix search for exploration.** Use `skill-cli search "rust*"` to find all rust-related skills.
4. **Phrase search for precision.** Wrap multi-word concepts in quotes: `skill-cli search '"error handling"'`.
