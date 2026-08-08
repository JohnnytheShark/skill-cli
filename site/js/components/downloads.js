/**
 * downloads.js — Precompiled Release Binary Download Component
 */

const REPO = "JohnnytheShark/skill-cli";
const RELEASE_VERSION = "v0.1.0";

export function renderDownloads(containerId = 'downloads-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const currentOS = detectOS();

  container.innerHTML = `
    <section class="section" id="downloads">
      <div class="container">
        <div class="section-header">
          <div class="section-tag">Precompiled Binaries</div>
          <h2 class="section-title">Download <span class="gradient-text">skill-cli</span></h2>
          <p class="section-desc">
            Fast, self-contained, statically linked executables with zero external runtime dependencies.
          </p>
        </div>

        <div class="release-cards-grid">
          <!-- Linux x86_64 -->
          <div class="release-card ${currentOS === 'linux' ? 'rc-recommended' : ''}">
            <div class="rc-header">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                <line x1="6" y1="6" x2="6.01" y2="6"></line>
                <line x1="6" y1="18" x2="6.01" y2="18"></line>
              </svg>
              <div>
                <h4>Linux x86_64</h4>
                <span class="rc-tag">glibc & musl (Static)</span>
              </div>
            </div>
            <div class="rc-body">
              <p>Standard Linux distros (Ubuntu, Debian, Fedora, Arch, Alpine, RHEL).</p>
            </div>
            <div class="rc-links">
              <div class="rc-download-item">
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-x86_64-unknown-linux-gnu.tar.gz" class="btn btn-secondary btn-sm">
                  <span>GNU (.tar.gz)</span>
                  <span>↓</span>
                </a>
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-x86_64-unknown-linux-gnu.tar.gz.sha256" target="_blank" class="rc-checksum">sha256</a>
              </div>
              <div class="rc-download-item">
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-x86_64-unknown-linux-musl.tar.gz" class="btn btn-secondary btn-sm">
                  <span>MUSL Static (.tar.gz)</span>
                  <span>↓</span>
                </a>
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-x86_64-unknown-linux-musl.tar.gz.sha256" target="_blank" class="rc-checksum">sha256</a>
              </div>
            </div>
          </div>

          <!-- Linux ARM64 -->
          <div class="release-card">
            <div class="rc-header">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <div>
                <h4>Linux ARM64 / AArch64</h4>
                <span class="rc-tag">64-bit ARM</span>
              </div>
            </div>
            <div class="rc-body">
              <p>Raspberry Pi 4/5, AWS Graviton, Ampere Altra, ARM servers.</p>
            </div>
            <div class="rc-links">
              <div class="rc-download-item">
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-aarch64-unknown-linux-gnu.tar.gz" class="btn btn-secondary btn-sm">
                  <span>ARM64 (.tar.gz)</span>
                  <span>↓</span>
                </a>
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-aarch64-unknown-linux-gnu.tar.gz.sha256" target="_blank" class="rc-checksum">sha256</a>
              </div>
            </div>
          </div>

          <!-- macOS Apple Silicon -->
          <div class="release-card ${currentOS === 'mac' ? 'rc-recommended' : ''}">
            <div class="rc-header">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a2.5 2.5 0 1 1 2.5-2.5 2.5 2.5 0 0 1-2.5 2.5z"></path>
              </svg>
              <div>
                <h4>macOS Apple Silicon</h4>
                <span class="rc-tag">Apple M1 / M2 / M3 / M4</span>
              </div>
            </div>
            <div class="rc-body">
              <p>Native ARM64 build for modern Apple Silicon MacBooks & Macs.</p>
            </div>
            <div class="rc-links">
              <div class="rc-download-item">
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-aarch64-apple-darwin.tar.gz" class="btn btn-secondary btn-sm">
                  <span>Apple Silicon (.tar.gz)</span>
                  <span>↓</span>
                </a>
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-aarch64-apple-darwin.tar.gz.sha256" target="_blank" class="rc-checksum">sha256</a>
              </div>
            </div>
          </div>

          <!-- Windows x86_64 -->
          <div class="release-card ${currentOS === 'windows' ? 'rc-recommended' : ''}">
            <div class="rc-header">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="8" height="8"></rect>
                <rect x="13" y="3" width="8" height="8"></rect>
                <rect x="3" y="13" width="8" height="8"></rect>
                <rect x="13" y="13" width="8" height="8"></rect>
              </svg>
              <div>
                <h4>Windows x86_64</h4>
                <span class="rc-tag">64-bit Executable (.exe)</span>
              </div>
            </div>
            <div class="rc-body">
              <p>Windows 10, Windows 11, and Windows Server 2016+.</p>
            </div>
            <div class="rc-links">
              <div class="rc-download-item">
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-x86_64-pc-windows-msvc.zip" class="btn btn-secondary btn-sm">
                  <span>Windows (.zip)</span>
                  <span>↓</span>
                </a>
                <a href="https://github.com/${REPO}/releases/download/${RELEASE_VERSION}/skill-cli-${RELEASE_VERSION}-x86_64-pc-windows-msvc.zip.sha256" target="_blank" class="rc-checksum">sha256</a>
              </div>
            </div>
          </div>

          <!-- Rust Cargo Crates -->
          <div class="release-card">
            <div class="rc-header">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <div>
                <h4>Build from Source</h4>
                <span class="rc-tag">Cargo Install</span>
              </div>
            </div>
            <div class="rc-body">
              <p>Install directly from source with the standard Rust toolchain.</p>
            </div>
            <div class="rc-links">
              <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('cargo install --git https://github.com/${REPO} skill-cli'); window.showToast && window.showToast('Copied cargo command!');">
                <span>cargo install</span>
                <span>📋</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function detectOS() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}
