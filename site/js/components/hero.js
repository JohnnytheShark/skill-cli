/**
 * hero.js — Hero Section Component with Multi-Platform Install Switcher
 */

export function renderHero(containerId = 'hero-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <section class="hero-section" aria-label="Introduction">
      <div class="container">
        <div class="hero-layout">
          <div class="hero-text">
            <div class="hero-pill">
              <span class="pill-dot"></span>
              <span>v0.3.0 • Rust AI Skill Engine</span>
            </div>

            <h1 class="hero-title">
              The deterministic skill store for <span class="title-accent">AI agents</span>
            </h1>

            <p class="hero-subtitle">
              A single statically-linked Rust binary providing an embedded <strong>SQLite FTS5</strong> search engine and native <strong>Model Context Protocol (MCP)</strong> server over standard I/O. Indexes markdown files on disk into token-efficient procedural memory with zero background daemons.
            </p>

            <div class="hero-installer-box">
              <div class="install-tabs" role="tablist">
                <button class="inst-tab active" data-tab="curl-sh" role="tab" aria-selected="true">Linux / macOS</button>
                <button class="inst-tab" data-tab="powershell" role="tab" aria-selected="false">Windows PowerShell</button>
                <button class="inst-tab" data-tab="cargo" role="tab" aria-selected="false">Cargo</button>
              </div>

              <div class="install-command-wrap">
                <div class="command-content">
                  <span class="prompt-sym">$</span>
                  <span id="hero-cmd-text">curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash</span>
                </div>
                <button class="copy-btn" id="hero-copy-cmd-btn" title="Copy command to clipboard" aria-label="Copy installation command">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div class="hero-ctas">
              <a href="#downloads" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span>Download Binaries</span>
              </a>
              <a href="#diataxis" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span>Read Documentation</span>
              </a>
            </div>

            <div class="hero-stats">
              <div class="stat-item">
                <span class="stat-value">~4 MB</span>
                <span class="stat-label">Single Binary</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">&lt; 1 ms</span>
                <span class="stat-label">FTS5 Search</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">0 deps</span>
                <span class="stat-label">Zero Daemons</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">100%</span>
                <span class="stat-label">MCP 2024-11-05</span>
              </div>
            </div>
          </div>

          <div class="hero-terminal-wrap" id="terminal-demo-mount">
            <!-- terminal-demo.js mounts here -->
          </div>
        </div>
      </div>
    </section>
  `;

  // Attach command tab switching
  const commands = {
    'curl-sh': 'curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash',
    'powershell': 'irm https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.ps1 | iex',
    'cargo': 'cargo install --git https://github.com/JohnnytheShark/skill-cli skill-cli'
  };

  const tabs = container.querySelectorAll('.inst-tab');
  const cmdText = document.getElementById('hero-cmd-text');
  const copyBtn = document.getElementById('hero-copy-cmd-btn');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const key = tab.getAttribute('data-tab');
      if (commands[key] && cmdText) {
        cmdText.textContent = commands[key];
      }
    });
  });

  if (copyBtn && cmdText) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(cmdText.textContent);
      if (window.showToast) {
        window.showToast('Copied installation command to clipboard');
      }
    });
  }
}
