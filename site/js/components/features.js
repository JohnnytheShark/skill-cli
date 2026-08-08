/**
 * features.js — Architecture & Feature Cards Component
 */

export function renderFeatures(containerId = 'features-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <section class="section" id="features">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Architecture & Capabilities</div>
          <h2 class="section-title">Engineered for <span class="gradient-text">Speed, Simplicity & Isolation</span></h2>
          <p class="section-desc">
            Built from first principles in Rust to give AI agents access to curated procedural knowledge without the bloat of vector databases or external microservices.
          </p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feat-icon feat-icon-sqlite">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
            </div>
            <h3>Zero-Config SQLite Embedded</h3>
            <p>
              Statically compiled with <code>rusqlite bundled-full</code>. No local database servers to install, configure, or keep running in the background. Database lives in your platform's native config directory.
            </p>
          </div>

          <div class="feature-card">
            <div class="feat-icon feat-icon-fts">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <h3>FTS5 BM25 Search Engine</h3>
            <p>
              Full-Text Search with BM25 algorithmic ranking. Sub-millisecond keyword retrieval across skill names, descriptions, and full markdown bodies with zero external embedding API calls.
            </p>
          </div>

          <div class="feature-card">
            <div class="feat-icon feat-icon-mcp">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h3>Native MCP stdio Server</h3>
            <p>
              Full compliance with the Model Context Protocol (2024-11-05 spec) over standard input/output. Compatible out of the box with Claude Desktop, Antigravity, and any custom agent runtime.
            </p>
          </div>

          <div class="feature-card">
            <div class="feat-icon feat-icon-sync">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </div>
            <h3>Idempotent Directory Sync</h3>
            <p>
              One-way sync from your local folder of Markdown files directly into SQLite. Automated YAML frontmatter parsing, automatic upserts, and optional pruning for CI/CD automation.
            </p>
          </div>

          <div class="feature-card">
            <div class="feat-icon feat-icon-twophase">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h3>Two-Phase Context Loading</h3>
            <p>
              Split between lightweight metadata queries (<code>skills_search</code>) and targeted deep injection (<code>skills_fetch</code>) protects precious LLM token windows from clutter and bloat.
            </p>
          </div>

          <div class="feature-card">
            <div class="feat-icon feat-icon-sec">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h3>Zero Network Attack Surface</h3>
            <p>
              Runs exclusively over standard I/O pipes as a child process of the agent. Zero open ports, no remote network access, and complete OS-level process isolation for secure procedural memory.
            </p>
          </div>
        </div>
      </div>
    </section>
  `;
}
