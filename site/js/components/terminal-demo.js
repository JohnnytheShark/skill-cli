/**
 * terminal-demo.js — Interactive Terminal Simulator for skill-cli Workflow
 */

export function renderTerminalDemo(containerId = 'terminal-demo-mount') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="terminal-card" id="terminal-card-instance" aria-label="Terminal Session Simulation">
      <div class="terminal-header">
        <div class="terminal-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
        <span class="terminal-title">skill-cli session — stdio & mcp</span>
        <span class="terminal-badge">LIVE DEMO</span>
      </div>

      <div class="terminal-body" id="term-output-body" role="region" aria-live="polite">
        <!-- Lines injected dynamically -->
      </div>

      <div class="terminal-footer">
        <span>SQLite FTS5 + JSON-RPC 2.0</span>
        <button class="term-action-btn" id="term-replay-btn" aria-label="Replay Terminal Demonstration">Replay Demo</button>
      </div>
    </div>
  `;

  startTerminalSimulation();

  const replayBtn = document.getElementById('term-replay-btn');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      startTerminalSimulation();
    });
  }
}

let termTimer = null;

function startTerminalSimulation() {
  const body = document.getElementById('term-output-body');
  if (!body) return;

  if (termTimer) {
    clearTimeout(termTimer);
  }

  body.innerHTML = '';

  const steps = [
    {
      delay: 200,
      html: `<div class="term-line"><span class="term-prompt">$ </span><span class="term-user-text">skill-cli sync --dir ./my-skills</span></div>`
    },
    {
      delay: 700,
      html: `<div class="term-line" style="color: var(--color-taupe);">Scanning directory ./my-skills...<br>Indexed: <strong style="color: var(--color-offwhite);">git-bisect.md</strong> (Git Bisect)<br>Indexed: <strong style="color: var(--color-offwhite);">rust-error-handling.md</strong> (Result & ?) <br>Indexed: <strong style="color: var(--color-offwhite);">tokio-async-runtime.md</strong> (Tokio Concurrency)<br><span class="term-success">✓ Synced 3 skills into SQLite database (~/.config/skills/skills.db)</span></div>`
    },
    {
      delay: 1600,
      html: `<div class="term-line"><span class="term-prompt">$ </span><span class="term-user-text">skill-cli search "async runtime"</span></div>`
    },
    {
      delay: 2300,
      html: `<div class="term-line" style="color: var(--color-taupe);"><strong style="color: var(--color-leaf);">tokio-async-runtime</strong> (Score: 0.94) — Core concurrency paradigms, channels, and graceful shutdown patterns</div>`
    },
    {
      delay: 3200,
      html: `<div class="term-line"><span class="term-prompt">$ </span><span class="term-user-text">skill-cli serve</span> <span style="color: var(--color-taupe);"># Spawning stdio MCP server</span></div>`
    },
    {
      delay: 4000,
      html: `<div class="term-line"><span class="term-tool">Agent → stdio</span> <span class="term-ai-text">tools/call: skills_search({ query: "error handling" })</span></div>`
    },
    {
      delay: 4900,
      html: `<div class="term-line"><div class="term-json-box">{"id": "rust-error-handling", "name": "Rust Error Handling", "description": "Idiomatic error handling patterns in Rust using Result and the ? operator"}</div></div>`
    },
    {
      delay: 5700,
      html: `<div class="term-line"><span class="term-tool">Agent → stdio</span> <span class="term-ai-text">tools/call: skills_fetch({ id: "rust-error-handling" })</span></div>`
    },
    {
      delay: 6500,
      html: `<div class="term-line"><span class="term-success">✓ Full Markdown injected into agent context (522 tokens saved vs bulk dump)</span></div>`
    }
  ];

  function runStep(index) {
    if (index >= steps.length) return;
    const step = steps[index];
    termTimer = setTimeout(() => {
      body.innerHTML += step.html;
      body.scrollTop = body.scrollHeight;
      runStep(index + 1);
    }, step.delay);
  }

  runStep(0);
}
