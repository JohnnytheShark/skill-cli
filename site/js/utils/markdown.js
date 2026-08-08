/**
 * markdown.js — Fast, High-Fidelity Markdown Parser
 */

export function parseMarkdown(md) {
  if (!md) return '';

  let html = md;

  // Escape HTML entities to prevent raw injection
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Strip YAML frontmatter if present
  html = html.replace(/^---[\s\S]*?---\n*/, '');

  // 1. Code blocks ```lang ... ```
  html = html.replace(/```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang ? lang.trim() : 'text';
    // unescape quotes inside code blocks
    const cleanCode = code.trim();
    return `<pre data-lang="${language}"><div class="code-header"><span class="code-lang">${language}</span><button class="code-copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.innerText); window.showToast && window.showToast('Copied code to clipboard!');">Copy</button></div><code>${cleanCode}</code></pre>`;
  });

  // 2. Inline code `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 3. GitHub style alerts > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING]
  html = html.replace(/^&gt; \[\!NOTE\]\s*\n((?:^&gt; .*\n?)+)/gm, (m, content) => {
    const text = content.replace(/^&gt; ?/gm, '');
    return `<div class="callout callout-note"><strong>Note:</strong> ${text}</div>`;
  });
  html = html.replace(/^&gt; \[\!TIP\]\s*\n((?:^&gt; .*\n?)+)/gm, (m, content) => {
    const text = content.replace(/^&gt; ?/gm, '');
    return `<div class="callout callout-tip"><strong>Tip:</strong> ${text}</div>`;
  });
  html = html.replace(/^&gt; \[\!IMPORTANT\]\s*\n((?:^&gt; .*\n?)+)/gm, (m, content) => {
    const text = content.replace(/^&gt; ?/gm, '');
    return `<div class="callout callout-important"><strong>Important:</strong> ${text}</div>`;
  });
  html = html.replace(/^&gt; \[\!WARNING\]\s*\n((?:^&gt; .*\n?)+)/gm, (m, content) => {
    const text = content.replace(/^&gt; ?/gm, '');
    return `<div class="callout callout-warning"><strong>Warning:</strong> ${text}</div>`;
  });

  // Standard blockquotes > ...
  html = html.replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>');

  // 4. Headers #, ##, ###, ####
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 5. Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // 6. Markdown Tables
  html = html.replace(/^(\|.+?\|)\n(\|[-:\s|]+?\|)\n((?:\|.+?\|\n?)+)/gm, (match, header, separator, body) => {
    const headers = header.split('|').slice(1, -1).map(h => `<th>${h.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cols = row.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cols}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // 7. Bold and Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 8. Markdown Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 9. Unordered Lists
  html = html.replace(/^\- (.*$)/gm, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 10. Ordered Lists
  html = html.replace(/^\d+\.\s+(.*$)/gm, '<ol><li>$1</li></ol>');
  html = html.replace(/<\/ol>\s*<ol>/g, '');

  // 11. Paragraphs (lines separated by double newlines, ignoring blocks already created)
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    if (block.startsWith('<h') || 
        block.startsWith('<pre') || 
        block.startsWith('<table') || 
        block.startsWith('<ul') || 
        block.startsWith('<ol') || 
        block.startsWith('<blockquote') || 
        block.startsWith('<div') || 
        block.startsWith('<hr')) {
      return block;
    }
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n\n');

  return html;
}
