/**
 * navbar.js — Navigation Bar and Mobile Drawer Component (Earthy / Tactile)
 */

export function renderNavbar(containerId = 'navbar-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <nav class="navbar" id="main-nav" aria-label="Main Navigation">
      <div class="nav-container">
        <a href="#" class="brand-logo" title="skill-cli Documentation Home">
          <div class="logo-box">
            <span class="logo-text">SK</span>
          </div>
          <span class="brand-name">skill-cli</span>
          <span class="brand-badge">v0.3.0</span>
        </a>

        <div class="nav-links">
          <a href="#features">Architecture</a>
          <a href="#diataxis" class="nav-highlight">Diátaxis Docs</a>
          <a href="#playground">MCP Playground</a>
          <a href="#downloads">Binaries</a>
        </div>

        <div class="nav-actions">
          <button class="search-trigger-btn" id="nav-search-btn" title="Search documentation (Ctrl+K)" aria-label="Open Search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>Search docs...</span>
            <kbd>⌘K</kbd>
          </button>

          <a href="https://github.com/JohnnytheShark/skill-cli" target="_blank" rel="noopener noreferrer" class="github-btn" title="View skill-cli on GitHub">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </a>

          <button class="mobile-toggle" id="mobile-nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Drawer -->
    <div class="mobile-drawer" id="mobile-nav-drawer">
      <a href="#features" class="mobile-nav-link">Architecture & Pillars</a>
      <a href="#diataxis" class="mobile-nav-link">Diátaxis Documentation</a>
      <a href="#playground" class="mobile-nav-link">MCP Playground</a>
      <a href="#downloads" class="mobile-nav-link">Download Binaries</a>
      <a href="https://github.com/JohnnytheShark/skill-cli" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
    </div>
  `;

  // Attach navbar events
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  const toggleBtn = document.getElementById('mobile-nav-toggle');
  const drawer = document.getElementById('mobile-nav-drawer');
  if (toggleBtn && drawer) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = drawer.classList.toggle('active');
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
    });
    drawer.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        drawer.classList.remove('active');
        toggleBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
}
