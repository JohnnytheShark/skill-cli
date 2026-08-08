/**
 * search-modal.js — Global Ctrl+K / Cmd+K Search Modal Component
 */

import { DOCS_DATA } from '../data/docs-index.js';

export function renderSearchModal(containerId = 'search-modal-mount', onSelectDoc) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="search-modal-overlay">
      <div class="search-modal-card">
        <div class="modal-search-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="global-search-input" placeholder="Search documentation, tools, commands..." autocomplete="off">
          <kbd style="font-size: 0.72rem; padding: 2px 6px; background: var(--bg-surface-raised); border: 1px solid var(--border-subtle); border-radius: 4px; color: var(--text-dim);">ESC</kbd>
        </div>

        <div class="search-results-list" id="search-modal-results">
          <!-- Results injected dynamically -->
        </div>
      </div>
    </div>
  `;

  initSearchModalEvents(container, onSelectDoc);
}

function initSearchModalEvents(container, onSelectDoc) {
  const overlay = container.querySelector('#search-modal-overlay');
  const input = container.querySelector('#global-search-input');
  const resultsContainer = container.querySelector('#search-modal-results');

  function openModal() {
    overlay.classList.add('active');
    input.value = '';
    renderResults('');
    setTimeout(() => input.focus(), 50);
  }

  function closeModal() {
    overlay.classList.remove('active');
  }

  function renderResults(query) {
    const q = query.toLowerCase().trim();
    const keys = Object.keys(DOCS_DATA);

    const matches = keys.filter(k => {
      if (!q) return true;
      const doc = DOCS_DATA[k];
      return doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q);
    }).slice(0, 8);

    if (matches.length === 0) {
      resultsContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No matching documentation articles found for "${query}".</div>`;
      return;
    }

    resultsContainer.innerHTML = matches.map(key => {
      const doc = DOCS_DATA[key];
      // Generate clean snippet
      let snippet = doc.content.replace(/^#+.*$/gm, '').replace(/```[\s\S]*?```/g, '').replace(/[*_`]/g, '').trim().slice(0, 100) + '...';
      return `
        <div class="search-result-item" data-key="${key}">
          <span class="sr-category">${doc.category}</span>
          <div class="sr-title">${doc.title}</div>
          <div class="sr-snippet">${snippet}</div>
        </div>
      `;
    }).join('');

    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const key = item.getAttribute('data-key');
        if (key && onSelectDoc) {
          onSelectDoc(key);
          closeModal();
          const viewer = document.getElementById('diataxis-viewer-mount');
          if (viewer) {
            viewer.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  }

  input.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Global Keyboard shortcut: Ctrl+K / Cmd+K / Esc
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (overlay.classList.contains('active')) {
        closeModal();
      } else {
        openModal();
      }
    } else if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeModal();
    }
  });

  // Connect navbar search button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#nav-search-btn')) {
      openModal();
    }
  });
}
