/**
 * app.js — Main Application Coordinator and Component Bootstrapper
 */

import { renderNavbar } from './components/navbar.js';
import { renderHero } from './components/hero.js';
import { renderTerminalDemo } from './components/terminal-demo.js';
import { renderFeatures } from './components/features.js';
import { renderDiataxisMatrix } from './components/diataxis-matrix.js';
import { renderDiataxisViewer, setActiveDoc } from './components/diataxis-viewer.js';
import { renderMcpPlayground } from './components/mcp-playground.js';
import { renderDownloads } from './components/downloads.js';
import { renderSearchModal } from './components/search-modal.js';
import { renderFooter } from './components/footer.js';

function handleHashRouting() {
  const hash = window.location.hash;
  if (hash.startsWith('#doc=')) {
    const docKey = hash.replace('#doc=', '');
    setActiveDoc(docKey);
    const viewer = document.getElementById('diataxis-viewer-mount');
    if (viewer) {
      setTimeout(() => viewer.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mount Navbar
  renderNavbar('navbar-mount');

  // 2. Mount Hero
  renderHero('hero-mount');

  // 3. Mount Terminal Simulator in Hero
  renderTerminalDemo('terminal-demo-mount');

  // 4. Mount Architecture Features
  renderFeatures('features-mount');

  // 5. Mount Diataxis Suite (Matrix & Viewer)
  renderDiataxisViewer('diataxis-viewer-mount');
  renderDiataxisMatrix('diataxis-matrix-container', (docKey) => {
    setActiveDoc(docKey);
  });

  // 6. Mount MCP Interactive Playground
  renderMcpPlayground('playground-mount');

  // 7. Mount Downloads Section
  renderDownloads('downloads-mount');

  // 8. Mount Global Search Modal
  renderSearchModal('search-modal-mount', (docKey) => {
    setActiveDoc(docKey);
  });

  // 9. Mount Footer
  renderFooter('footer-mount');

  // 10. Handle initial hash routing & hashchange events
  handleHashRouting();
  window.addEventListener('hashchange', handleHashRouting);
});
