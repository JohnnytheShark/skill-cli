/**
 * footer.js — Footer Component
 */

export function renderFooter(containerId = 'footer-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="brand-logo">
              <div class="logo-box">
                <span class="logo-text">SK</span>
              </div>
              <span class="brand-name">skill-cli</span>
            </div>
            <p class="footer-desc">
              High-performance, zero-config AI agent skill engine in Rust. Statically bundled SQLite FTS5 search & MCP stdio server.
            </p>
          </div>

          <div class="footer-col">
            <h4>Diátaxis Docs</h4>
            <ul>
              <li><a href="#doc=tutorials/getting-started.md">Getting Started</a></li>
              <li><a href="#doc=how-to/sync-skills-directory.md">Sync Skills Directory</a></li>
              <li><a href="#doc=how-to/connect-ai-agent.md">Connect AI Agent</a></li>
              <li><a href="#doc=reference/cli-commands.md">CLI Commands</a></li>
              <li><a href="#doc=explanation/architecture.md">Architecture</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>MCP Tools</h4>
            <ul>
              <li><a href="#doc=reference/mcp-tools.md">skills_search</a></li>
              <li><a href="#doc=reference/mcp-tools.md">skills_fetch</a></li>
              <li><a href="#doc=reference/mcp-tools.md">skills_upsert</a></li>
              <li><a href="#doc=reference/mcp-tools.md">skills_delete</a></li>
              <li><a href="#doc=reference/mcp-tools.md">skills_export</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Project</h4>
            <ul>
              <li><a href="https://github.com/JohnnytheShark/skill-cli" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
              <li><a href="https://github.com/JohnnytheShark/skill-cli/releases" target="_blank" rel="noopener noreferrer">Release Downloads</a></li>
              <li><a href="https://github.com/JohnnytheShark/skill-cli/issues" target="_blank" rel="noopener noreferrer">Issue Tracker</a></li>
              <li><a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">Model Context Protocol</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; ${new Date().getFullYear()} Johnny Orellana. Released under the Apache 2.0 License.</span>
          <span>Built with the Diátaxis Framework</span>
        </div>
      </div>
    </footer>
  `;
}
