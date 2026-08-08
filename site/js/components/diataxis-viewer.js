/**
 * diataxis-viewer.js — Diataxis Document Explorer and Reader Component
 */

import { DOCS_DATA, DOCS_CATEGORIES } from '../data/docs-index.js';
import { parseMarkdown } from '../utils/markdown.js';

let currentActiveDocKey = "tutorials/getting-started.md";

export function renderDiataxisViewer(containerId = 'diataxis-viewer-mount', initialDocKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (initialDocKey && DOCS_DATA[initialDocKey]) {
    currentActiveDocKey = initialDocKey;
  }

  const docCount = Object.keys(DOCS_DATA).length;

  container.innerHTML = `
    <section class="section" id="diataxis" style="padding-top: 0;" aria-label="Diátaxis Documentation Suite">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Documentation Suite</div>
          <h2 class="section-title">The Complete <span class="title-accent">Diátaxis Library</span></h2>
          <p class="section-desc">
            Systematic technical documentation organized across the four Diátaxis quadrants: learning-oriented Tutorials, task-oriented How-To Guides, information-oriented Reference, and understanding-oriented Explanation.
          </p>
        </div>

        <div id="diataxis-matrix-container">
          <!-- diataxis-matrix.js mounts here -->
        </div>

        <div class="doc-viewer-container" id="doc-viewer-card">
          <!-- Sidebar -->
          <aside class="doc-sidebar" aria-label="Documentation Navigation">
            <div class="doc-sidebar-header">
              <span class="sidebar-title">Documentation Index</span>
              <span class="doc-count">${docCount} Articles</span>
            </div>

            <div class="doc-search-box">
              <input type="text" id="doc-filter-input" placeholder="Filter articles by keyword..." aria-label="Filter documentation articles">
            </div>

            <div class="doc-nav-list" id="doc-sidebar-nav" role="navigation">
              ${renderSidebarNavItems()}
            </div>
          </aside>

          <!-- Main Doc Body Pane -->
          <div class="doc-content-pane">
            <div class="doc-toolbar">
              <div class="doc-breadcrumbs" id="doc-breadcrumbs">
                ${renderBreadcrumbs(currentActiveDocKey)}
              </div>
              <div class="doc-toolbar-actions">
                <button class="doc-action-btn" id="doc-copy-raw-btn" title="Copy raw Markdown to clipboard" aria-label="Copy raw Markdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy Markdown</span>
                </button>
                <a href="https://github.com/JohnnytheShark/skill-cli/tree/main/docs/${currentActiveDocKey}" target="_blank" rel="noopener noreferrer" class="doc-action-btn" id="doc-github-link" aria-label="Edit this article on GitHub">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  <span>Edit on GitHub</span>
                </a>
              </div>
            </div>

            <article class="doc-body" id="doc-rendered-body">
              ${renderActiveDocContent(currentActiveDocKey)}
            </article>
          </div>
        </div>
      </div>
    </section>
  `;

  attachViewerEvents(container);
}

function renderSidebarNavItems(filterQuery = '') {
  const q = filterQuery.toLowerCase().trim();

  return DOCS_CATEGORIES.map(cat => {
    const matchingKeys = cat.keys.filter(key => {
      if (!q) return true;
      const doc = DOCS_DATA[key];
      return doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q);
    });

    if (matchingKeys.length === 0) return '';

    return `
      <div class="doc-group">
        <div class="doc-group-title">${cat.name}</div>
        ${matchingKeys.map(key => {
          const doc = DOCS_DATA[key];
          const isActive = key === currentActiveDocKey ? 'active' : '';
          return `
            <div class="doc-nav-item ${isActive}" data-doc-key="${key}" tabindex="0" role="button" aria-pressed="${isActive ? 'true' : 'false'}">
              <span>${doc.title}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');
}

function renderBreadcrumbs(docKey) {
  const doc = DOCS_DATA[docKey];
  if (!doc) return '<span>Docs</span>';
  return `<span>${doc.category}</span> <span style="color: var(--color-taupe);">/</span> <strong style="color: var(--color-offwhite);">${doc.title}</strong>`;
}

function renderActiveDocContent(docKey) {
  const doc = DOCS_DATA[docKey];
  if (!doc) {
    return `<h2>Document not found</h2><p>Please select a document from the sidebar navigation.</p>`;
  }
  return parseMarkdown(doc.content);
}

export function setActiveDoc(docKey) {
  if (!DOCS_DATA[docKey]) return;
  currentActiveDocKey = docKey;

  const sidebar = document.getElementById('doc-sidebar-nav');
  if (sidebar) {
    const filterInput = document.getElementById('doc-filter-input');
    sidebar.innerHTML = renderSidebarNavItems(filterInput ? filterInput.value : '');
    attachNavClickEvents(sidebar);
  }

  const breadcrumbs = document.getElementById('doc-breadcrumbs');
  if (breadcrumbs) {
    breadcrumbs.innerHTML = renderBreadcrumbs(docKey);
  }

  const renderedBody = document.getElementById('doc-rendered-body');
  if (renderedBody) {
    renderedBody.innerHTML = renderActiveDocContent(docKey);
    renderedBody.parentElement.scrollTop = 0;
  }

  const ghLink = document.getElementById('doc-github-link');
  if (ghLink) {
    ghLink.href = `https://github.com/JohnnytheShark/skill-cli/tree/main/docs/${docKey}`;
  }

  window.location.hash = `doc=${docKey}`;
}

function attachViewerEvents(container) {
  const filterInput = container.querySelector('#doc-filter-input');
  const sidebar = container.querySelector('#doc-sidebar-nav');

  if (filterInput && sidebar) {
    filterInput.addEventListener('input', (e) => {
      sidebar.innerHTML = renderSidebarNavItems(e.target.value);
      attachNavClickEvents(sidebar);
    });
  }

  attachNavClickEvents(sidebar);

  const copyRawBtn = container.querySelector('#doc-copy-raw-btn');
  if (copyRawBtn) {
    copyRawBtn.addEventListener('click', () => {
      const doc = DOCS_DATA[currentActiveDocKey];
      if (doc) {
        navigator.clipboard.writeText(doc.content);
        if (window.showToast) {
          window.showToast('Copied raw Markdown to clipboard');
        }
      }
    });
  }
}

function attachNavClickEvents(sidebar) {
  if (!sidebar) return;
  sidebar.querySelectorAll('.doc-nav-item').forEach(item => {
    const handleSelect = () => {
      const key = item.getAttribute('data-doc-key');
      if (key) {
        setActiveDoc(key);
      }
    };

    item.addEventListener('click', handleSelect);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });
  });
}
