/**
 * mcp-playground.js — Interactive MCP & CLI Playground Sandbox
 */

export function renderMcpPlayground(containerId = 'playground-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <section class="section" id="playground" aria-label="Interactive MCP Playground">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Interactive Sandbox</div>
          <h2 class="section-title">MCP Protocol <span class="title-accent">Wire Playground</span></h2>
          <p class="section-desc">
            Simulate how AI agents communicate with <code>skill-cli</code> over stdio JSON-RPC 2.0. Test FTS5 queries, inspect request frames, and preview responses.
          </p>
        </div>

        <div class="playground-wrap">
          <div class="playground-grid">
            <!-- Left Pane: Input -->
            <div class="play-pane">
              <div class="play-pane-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 17 10 11 4 5"></polyline>
                  <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
                <span>Select Tool / Command</span>
              </div>

              <div class="play-tool-select" role="tablist">
                <button class="tool-chip active" data-tool="skills_search" role="tab" aria-selected="true">skills_search</button>
                <button class="tool-chip" data-tool="skills_fetch" role="tab" aria-selected="false">skills_fetch</button>
                <button class="tool-chip" data-tool="skills_upsert" role="tab" aria-selected="false">skills_upsert</button>
                <button class="tool-chip" data-tool="collections_search" role="tab" aria-selected="false">collections_search</button>
                <button class="tool-chip" data-tool="cli_search" role="tab" aria-selected="false">CLI: search</button>
              </div>

              <div class="play-input-box" id="play-input-controls">
                <!-- Injected dynamically based on selected tool -->
              </div>

              <button class="btn btn-primary" id="play-execute-btn" aria-label="Execute JSON-RPC call">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Execute JSON-RPC Call</span>
              </button>
            </div>

            <!-- Right Pane: Output -->
            <div class="play-pane">
              <div class="play-pane-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span>Wire Protocol Stream (stdout)</span>
              </div>

              <div class="play-output-box" id="play-output-result" role="region" aria-live="polite">
// Click "Execute JSON-RPC Call" to simulate response...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  initPlaygroundLogic(container);
}

const MOCK_SKILLS_DB = [
  {
    id: "git-bisect",
    name: "Git Bisect",
    description: "Use binary search to find the commit that introduced a bug",
    content: "# Git Bisect\n\nGit bisect uses binary search to pinpoint regressions in source code."
  },
  {
    id: "rust-error-handling",
    name: "Rust Error Handling",
    description: "Idiomatic error handling patterns in Rust using Result and the ? operator",
    content: "# Rust Error Handling\n\nUse Result<T, E> and custom error enums with thiserror."
  },
  {
    id: "tokio-async-runtime",
    name: "Tokio Async Patterns",
    description: "Core concurrency paradigms, channels, and graceful shutdown patterns",
    content: "# Tokio Async Patterns\n\nUtilize mpsc channels and select! for structured concurrency."
  },
  {
    id: "python-dataclasses",
    name: "Python Dataclasses",
    description: "Structured data modeling with type annotations and immutable frozen instances",
    content: "# Python Dataclasses\n\nDecorate with @dataclass(frozen=True, slots=True)."
  }
];

function initPlaygroundLogic(container) {
  let activeTool = 'skills_search';
  const inputContainer = container.querySelector('#play-input-controls');
  const executeBtn = container.querySelector('#play-execute-btn');
  const outputBox = container.querySelector('#play-output-result');

  function renderToolInputs() {
    if (activeTool === 'skills_search') {
      inputContainer.innerHTML = `
        <label class="play-field-label" for="p-query">Search Query (FTS5 BM25):</label>
        <input class="play-input" type="text" id="p-query" value="error handling" placeholder="Enter keywords e.g. rust, git, async...">
        <label class="play-field-label" for="p-limit">Limit (Default: 5):</label>
        <input class="play-input" type="number" id="p-limit" value="5" min="1" max="20">
      `;
    } else if (activeTool === 'skills_fetch') {
      inputContainer.innerHTML = `
        <label class="play-field-label" for="p-id">Skill ID:</label>
        <input class="play-input" type="text" id="p-id" value="rust-error-handling" placeholder="Skill ID slug e.g. git-bisect">
      `;
    } else if (activeTool === 'skills_upsert') {
      inputContainer.innerHTML = `
        <label class="play-field-label" for="p-upsert-id">ID Slug:</label>
        <input class="play-input" type="text" id="p-upsert-id" value="sqlite-fts5-guide">
        <label class="play-field-label" for="p-upsert-name">Skill Name:</label>
        <input class="play-input" type="text" id="p-upsert-name" value="SQLite FTS5 Guide">
        <label class="play-field-label" for="p-upsert-desc">Description:</label>
        <input class="play-input" type="text" id="p-upsert-desc" value="Full-Text Search configuration and trigger management in SQLite">
        <label class="play-field-label" for="p-upsert-content">Markdown Body:</label>
        <textarea class="play-input" id="p-upsert-content" rows="3" style="resize: vertical;"># SQLite FTS5\n\nUse virtual table with content triggers for instant search.</textarea>
      `;
    } else if (activeTool === 'cli_search') {
      inputContainer.innerHTML = `
        <label class="play-field-label" for="p-cli-query">CLI Argument &lt;QUERY&gt;:</label>
        <input class="play-input" type="text" id="p-cli-query" value="async" placeholder="Query term">
      `;
    }
  }

  renderToolInputs();

  container.querySelectorAll('.tool-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.tool-chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      activeTool = chip.getAttribute('data-tool');
      renderToolInputs();
    });
  });

  executeBtn.addEventListener('click', () => {
    outputBox.innerHTML = '<span style="color: var(--color-taupe);">Executing SQLite FTS5 query...</span>';

    setTimeout(() => {
      if (activeTool === 'skills_search') {
        const query = (document.getElementById('p-query')?.value || '').toLowerCase();
        const limit = parseInt(document.getElementById('p-limit')?.value || '5', 10);
        const matches = MOCK_SKILLS_DB.filter(s => 
          s.id.includes(query) || s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
        ).slice(0, limit);

        const request = {
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "skills_search",
            arguments: { query, limit }
          },
          id: Math.floor(Math.random() * 1000)
        };

        const response = {
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(matches.map(m => ({ id: m.id, name: m.name, description: m.description })), null, 2)
              }
            ]
          },
          id: request.id
        };

        outputBox.textContent = `// → stdin (JSON-RPC Request):\n${JSON.stringify(request, null, 2)}\n\n// ← stdout (JSON-RPC Response):\n${JSON.stringify(response, null, 2)}`;
      } else if (activeTool === 'skills_fetch') {
        const id = (document.getElementById('p-id')?.value || '').trim();
        const match = MOCK_SKILLS_DB.find(s => s.id === id);

        const request = {
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "skills_fetch",
            arguments: { id }
          },
          id: Math.floor(Math.random() * 1000)
        };

        const response = match ? {
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: match.content
              }
            ]
          },
          id: request.id
        } : {
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: `Skill with id '${id}' not found`
          },
          id: request.id
        };

        outputBox.textContent = `// → stdin (JSON-RPC Request):\n${JSON.stringify(request, null, 2)}\n\n// ← stdout (JSON-RPC Response):\n${JSON.stringify(response, null, 2)}`;
      } else if (activeTool === 'skills_upsert') {
        const id = document.getElementById('p-upsert-id')?.value || 'new-skill';
        const name = document.getElementById('p-upsert-name')?.value || 'New Skill';
        const desc = document.getElementById('p-upsert-desc')?.value || '';
        const content = document.getElementById('p-upsert-content')?.value || '';

        const request = {
          jsonrpc: "2.0",
          method: "tools/call",
          params: {
            name: "skills_upsert",
            arguments: { id, name, description: desc, content }
          },
          id: Math.floor(Math.random() * 1000)
        };

        const response = {
          jsonrpc: "2.0",
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify({ status: "success", id }, null, 2)
              }
            ]
          },
          id: request.id
        };

        outputBox.textContent = `// → stdin (JSON-RPC Request):\n${JSON.stringify(request, null, 2)}\n\n// ← stdout (JSON-RPC Response - FTS triggers fired):\n${JSON.stringify(response, null, 2)}`;
      } else if (activeTool === 'cli_search') {
        const query = (document.getElementById('p-cli-query')?.value || '').toLowerCase();
        const matches = MOCK_SKILLS_DB.filter(s => 
          s.id.includes(query) || s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
        );

        let out = `$ skill-cli search "${query}"\n\n`;
        if (matches.length === 0) {
          out += `No skills found matching query "${query}".`;
        } else {
          matches.forEach(m => {
            out += `- ${m.id} (${m.name}): ${m.description}\n`;
          });
        }
        outputBox.textContent = out;
      }
    }, 150);
  });
}
