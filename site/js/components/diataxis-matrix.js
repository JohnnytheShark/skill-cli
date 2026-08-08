/**
 * diataxis-matrix.js — Diataxis 4-Quadrant Matrix Component (Earthy / Tactile)
 */

import { DOCS_CATEGORIES } from '../data/docs-index.js';

export function renderDiataxisMatrix(containerId = 'diataxis-matrix-container', onSelectDoc) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="diataxis-quadrant-grid" role="region" aria-label="Diataxis Documentation Pillars">
      ${DOCS_CATEGORIES.map(cat => {
        const quadrantClass = `q-${cat.id}`;
        return `
          <div class="quadrant-card ${quadrantClass}" data-primary="${cat.primaryDoc}" tabindex="0" role="button" aria-label="${cat.name}: ${cat.desc}">
            <div class="q-header">
              <span class="q-badge">${cat.badge}</span>
              <span class="q-axis">${cat.axis}</span>
            </div>
            <h3 class="q-title">${cat.name}</h3>
            <p class="q-desc">${cat.desc}</p>
            <ul class="q-links">
              ${cat.keys.slice(0, 3).map(key => {
                const title = key.split('/').pop().replace('.md', '').replace(/-/g, ' ');
                const capitalized = title.charAt(0).toUpperCase() + title.slice(1);
                return `
                  <li>
                    <a href="#doc=${key}" class="matrix-doc-link" data-doc="${key}">
                      <span>→</span>
                      <span>${capitalized}</span>
                    </a>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach card click & keyboard handlers to load docs
  container.querySelectorAll('.quadrant-card').forEach(card => {
    const handleSelect = (e) => {
      if (e.target.closest('a')) return;
      const primary = card.getAttribute('data-primary');
      if (primary && onSelectDoc) {
        onSelectDoc(primary);
        const viewerEl = document.getElementById('diataxis-viewer-mount');
        if (viewerEl) {
          viewerEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(e);
      }
    });
  });

  container.querySelectorAll('.matrix-doc-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const docKey = link.getAttribute('data-doc');
      if (docKey && onSelectDoc) {
        onSelectDoc(docKey);
        const viewerEl = document.getElementById('diataxis-viewer-mount');
        if (viewerEl) {
          viewerEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}
