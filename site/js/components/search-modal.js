/**
 * search-modal.js — Global Ctrl+K / Cmd+K Search Modal Component
 */

import { DOCS_DATA } from '../data/docs-index.js';

export function renderSearchModal(containerId = 'search-modal-mount', onSelectDoc) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="search-modal-backdrop" id="search-modal-overlay" role="dialog" aria-modal="true" aria-label="Documentation Search">
      <div class="search-modal-box">
        <div class="search-modal-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="global-search-input" placeholder="Search documentation, commands, tools..." autocomplete="off" aria-label="Search query">
          <kbd style="font-size: 0.72rem; padding: 2px 6px; background: var(--bg-canvas); border: 1px solid var(--border-subtle); border-radius: 4px; color: var(--color-taupe);">ESC</kbd>
        </div>

        <div class="search-modal-results" id="search-modal-results" role="listbox">
          <!-- Results injected dynamically -->
        </div>

        <div class="search-modal-footer">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Select with <kbd>↵</kbd></span>
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
      resultsContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--color-taupe); font-size: 0.88rem;">No matching documentation articles found for "${query}".</div>`;
      return;
    }

    resultsContainer.innerHTML = matches.map(key => {
      const doc = DOCS_DATA[key];
      let snippet = doc.content.replace(/^#+.*$/gm, '').replace(/```[\s\S]*?```/g, '').replace(/[*_`]/g, '').trim().slice(0, 100) + '...';
      return `
        <div class="search-result-item" data-key="${key}" role="option" tabindex="0">
          <span style="font-family: var(--font-mono); font-size: 0.68rem; color: var(--color-leaf); text-transform: uppercase;">${doc.category}</span>
          <div class="search-result-title">${doc.title}</div>
          <div class="search-result-snippet">${snippet}</div>
        </div>
      `;
    }).join('');

    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      const handleSelect = () => {
        const key = item.getAttribute('data-key');
        if (key && onSelectDoc) {
          onSelectDoc(key);
          closeModal();
          const viewer = document.getElementById('diataxis-viewer-mount');
          if (viewer) {
            viewer.scrollIntoView({ behavior: 'smooth' });
          }
        }
      };

      item.addEventListener('click', handleSelect);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleSelect();
        }
      });
    });
  }

  input.addEventListener('input', (e) => {
    renderResults(e.target.value);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

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

  document.addEventListener('click', (e) => {
    if (e.target.closest('#nav-search-btn')) {
      openModal();
    }
  });
}
