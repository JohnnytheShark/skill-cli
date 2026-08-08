/**
 * terminal-demo.js — Interactive Terminal Simulator for skill-cli Workflow
 */

export function renderTerminalDemo(containerId = 'terminal-demo-mount') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="terminal-card" id="terminal-card-instance">
      <div class="terminal-header">
        <div class="terminal-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <span class="terminal-title">skill-cli session — stdio & mcp</span>
        <span class="terminal-badge">LIVE DEMO</span>
      </div>

      <div class="terminal-body" id="term-output-body">
        <!-- Lines injected dynamically -->
      </div>

      <div class="terminal-footer">
        <span>SQLite FTS5 + JSON-RPC 2.0</span>
        <button class="term-action-btn" id="term-replay-btn">Replay Demo</button>
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
      delay: 300,
      html: `<div class="term-line"><span class="term-prompt">$ </span><span class="term-user-text">skill-cli sync --dir ./my-skills</span></div>`
    },
    {
      delay: 800,
      html: `<div class="term-line" style="color: #94a3b8;">Scanning directory ./my-skills...<br>Imported skill: <strong style="color: #fff;">git-bisect</strong><br>Imported skill: <strong style="color: #fff;">rust-error-handling</strong><br>Imported skill: <strong style="color: #fff;">tokio-async-runtime</strong><br><span class="term-success">✓ Successfully synced 3 skills into SQLite.</span></div>`
    },
    {
      delay: 1700,
      html: `<div class="term-line"><span class="term-prompt">$ </span><span class="term-user-text">skill-cli search "async runtime"</span></div>`
    },
    {
      delay: 2400,
      html: `<div class="term-line" style="color: #94a3b8;">- <strong style="color: #34d399;">tokio-async-runtime</strong> (Tokio Async Patterns): Core concurrency paradigms, channels, and graceful shutdown patterns</div>`
    },
    {
      delay: 3300,
      html: `<div class="term-line"><span class="term-prompt">$ </span><span class="term-user-text">skill-cli serve</span> <span style="color: #64748b;"># [MCP stdio server listening]</span></div>`
    },
    {
      delay: 4100,
      html: `<div class="term-line"><span class="term-tool">Agent → MCP</span> <span class="term-ai-text">tools/call: skills_search({ query: "error handling" })</span></div>`
    },
    {
      delay: 5000,
      html: `<div class="term-line"><div class="term-json-box">{"id": "rust-error-handling", "name": "Rust Error Handling", "description": "Idiomatic error handling patterns in Rust using Result and the ? operator"}</div></div>`
    },
    {
      delay: 5900,
      html: `<div class="term-line"><span class="term-tool">Agent → MCP</span> <span class="term-ai-text">tools/call: skills_fetch({ id: "rust-error-handling" })</span></div>`
    },
    {
      delay: 6700,
      html: `<div class="term-line"><span class="term-success">✓ Full Markdown injected into LLM context window (522 tokens saved vs full dump)</span></div>`
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
