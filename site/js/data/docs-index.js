/**
 * docs-index.js — Composite Dataset of all Diataxis Documentation
 */

import { TUTORIALS_DATA } from './tutorials.js';
import { HOWTO_DATA } from './how-to.js';
import { REFERENCE_DATA } from './reference.js';
import { EXPLANATION_DATA } from './explanation.js';

export const DOCS_DATA = {
  ...TUTORIALS_DATA,
  ...HOWTO_DATA,
  ...REFERENCE_DATA,
  ...EXPLANATION_DATA
};

export const DOCS_CATEGORIES = [
  {
    id: "tutorials",
    name: "Tutorials",
    badge: "🎓 LEARNING-ORIENTED",
    axis: "Practical Acquisition",
    desc: "Step-by-step guided lessons for newcomers to index, search, and connect skills with AI agents.",
    primaryDoc: "tutorials/getting-started.md",
    keys: ["tutorials/getting-started.md"]
  },
  {
    id: "how-to",
    name: "How-To Guides",
    badge: "🛠️ PROBLEM-ORIENTED",
    axis: "Practical Application",
    desc: "Task-focused recipes to bulk-sync directories, upsert skills via MCP, and wire into agents.",
    primaryDoc: "how-to/sync-skills-directory.md",
    keys: [
      "how-to/index.md",
      "how-to/sync-skills-directory.md",
      "how-to/search-and-retrieve.md",
      "how-to/upsert-skill-via-mcp.md",
      "how-to/connect-ai-agent.md"
    ]
  },
  {
    id: "reference",
    name: "Reference",
    badge: "📖 INFORMATION-ORIENTED",
    axis: "Theoretical Application",
    desc: "Authoritative specifications for CLI flags, MCP JSON-RPC schemas, database DDL, and formats.",
    primaryDoc: "reference/cli-commands.md",
    keys: [
      "reference/index.md",
      "reference/cli-commands.md",
      "reference/mcp-tools.md",
      "reference/skill-md-format.md",
      "reference/database-schema.md",
      "reference/configuration.md"
    ]
  },
  {
    id: "explanation",
    name: "Explanation",
    badge: "💡 UNDERSTANDING-ORIENTED",
    axis: "Theoretical Acquisition",
    desc: "Deep conceptual discussions on SQLite FTS5 search, two-phase context design, and stdio architecture.",
    primaryDoc: "explanation/architecture.md",
    keys: [
      "explanation/architecture.md",
      "explanation/fts5-search.md",
      "explanation/mcp-protocol.md"
    ]
  }
];
