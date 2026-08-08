#!/usr/bin/env bash
# ==============================================================================
# skill-cli Installer for Linux and macOS
# Usage: curl -fsSL https://raw.githubusercontent.com/JohnnytheShark/skill-cli/main/install.sh | bash
# ==============================================================================

set -euo pipefail

REPO="JohnnytheShark/skill-cli"
GITHUB_API="https://api.github.com/repos/${REPO}/releases/latest"

echo "==========================================================="
echo "  skill-cli Installer (Linux / macOS)"
echo "==========================================================="

# 1. Detect OS & Architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "${OS}" in
  linux)
    case "${ARCH}" in
      x86_64)
        TARGET="x86_64-unknown-linux-gnu"
        ;;
      aarch64|arm64)
        TARGET="aarch64-unknown-linux-gnu"
        ;;
      *)
        echo "[-] Unsupported Linux architecture: ${ARCH}" >&2
        exit 1
        ;;
    esac
    ;;
  darwin)
    case "${ARCH}" in
      arm64|aarch64)
        TARGET="aarch64-apple-darwin"
        ;;
      *)
        echo "[-] Precompiled binaries for macOS are available for Apple Silicon (arm64/aarch64)." >&2
        echo "[-] To install on ${ARCH}, build with cargo: cargo install --git https://github.com/JohnnytheShark/skill-cli skill-cli" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "[-] Unsupported operating system: ${OS}" >&2
    echo "[-] For Windows, run: irm https://raw.githubusercontent.com/${REPO}/main/install.ps1 | iex" >&2
    exit 1
    ;;
esac

echo "[+] Detected system: ${OS} (${ARCH}) -> Target: ${TARGET}"

# 2. Fetch latest release version
echo "[+] Fetching latest release info from GitHub..."
TAG=$(curl -sSL -H "Accept: application/vnd.github.v3+json" "${GITHUB_API}" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "${TAG}" ]; then
  echo "[!] Could not fetch latest release via API, defaulting to v0.1.0"
  TAG="v0.1.0"
fi

ARCHIVE_NAME="skill-cli-${TAG}-${TARGET}"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${ARCHIVE_NAME}.tar.gz"

echo "[+] Downloading ${ARCHIVE_NAME}.tar.gz (${TAG})..."
TMP_DIR=$(mktemp -d)
trap 'rm -rf "${TMP_DIR}"' EXIT

curl -fsSL "${DOWNLOAD_URL}" -o "${TMP_DIR}/${ARCHIVE_NAME}.tar.gz"

# 3. Extract Archive
echo "[+] Extracting archive..."
tar -xzf "${TMP_DIR}/${ARCHIVE_NAME}.tar.gz" -C "${TMP_DIR}"

# 4. Install Destination
INSTALL_DIR="${HOME}/.local/bin"
if [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
fi
mkdir -p "${INSTALL_DIR}"

mv "${TMP_DIR}/${ARCHIVE_NAME}/skill-cli" "${INSTALL_DIR}/skill-cli"
chmod +x "${INSTALL_DIR}/skill-cli"

echo ""
echo "==========================================================="
echo "  ✓ Successfully installed skill-cli to ${INSTALL_DIR}/skill-cli"
echo "==========================================================="
echo ""

# 5. Check PATH
if ! echo "${PATH}" | grep -q "${INSTALL_DIR}"; then
  echo "[!] Notice: ${INSTALL_DIR} is not in your PATH."
  echo "    Add the following line to your shell profile (~/.bashrc, ~/.zshrc):"
  echo ""
  echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
  echo ""
fi

echo "Run 'skill-cli --help' or 'skill-cli serve' to get started!"
