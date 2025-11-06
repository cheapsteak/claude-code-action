#!/bin/bash
#
# Package review-local for distribution to other machines
#
# Usage: ./local-wrapper/package-for-distribution.sh [platform]
#   platform: darwin-arm64 (default), darwin-x64, linux-x64, linux-arm64

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PLATFORM="${1:-darwin-arm64}"
DIST_DIR="local-wrapper/dist"
PACKAGE_NAME="review-local-${PLATFORM}-package"

echo -e "${BLUE}📦 Creating distribution package for ${PLATFORM}...${NC}\n"

# Build if not already built
if [ ! -f "${DIST_DIR}/review-local-${PLATFORM}" ]; then
    echo -e "${YELLOW}Building binary first...${NC}"
    ./local-wrapper/build.sh "$PLATFORM"
fi

# Create package directory
PACKAGE_DIR="${DIST_DIR}/${PACKAGE_NAME}"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy binary
cp "${DIST_DIR}/review-local-${PLATFORM}" "${PACKAGE_DIR}/review-local"
chmod +x "${PACKAGE_DIR}/review-local"

# Create installation script
cat > "${PACKAGE_DIR}/install.sh" << 'EOF'
#!/bin/bash
set -e

echo "🚀 Installing review-local..."

# Detect if sudo is needed
INSTALL_DIR="/usr/local/bin"
if [ "$1" = "--user" ]; then
    INSTALL_DIR="$HOME/.local/bin"
    mkdir -p "$INSTALL_DIR"
    echo "Installing to: $INSTALL_DIR (user)"
else
    echo "Installing to: $INSTALL_DIR (system-wide)"
    if [ ! -w "$INSTALL_DIR" ]; then
        SUDO="sudo"
    fi
fi

# Install binary
$SUDO cp review-local "$INSTALL_DIR/review-local"
$SUDO chmod +x "$INSTALL_DIR/review-local"

echo "✅ Installation complete!"
echo ""
echo "Dependencies needed:"
echo "  • Claude CLI: curl -fsSL https://claude.ai/install.sh | bash"
echo "  • git: (usually pre-installed)"
echo "  • jq: brew install jq (macOS) or apt install jq (Linux)"
echo ""
echo "Authentication:"
echo "  Run: claude auth login"
echo "  Or set: export ANTHROPIC_API_KEY=\"sk-ant-...\""
echo ""
echo "Usage:"
echo "  review-local \"your request here\""
echo "  review-local --help"
EOF

chmod +x "${PACKAGE_DIR}/install.sh"

# Create README
cat > "${PACKAGE_DIR}/README.txt" << 'EOF'
# Review Local - Claude Code for Local Development

A standalone tool that runs Claude Code locally with git repository context.

## Quick Start

1. Install dependencies:
   - Claude CLI: curl -fsSL https://claude.ai/install.sh | bash
   - jq: brew install jq (macOS) or apt install jq (Linux)
   - git: (usually pre-installed)

2. Install review-local:
   # System-wide (requires sudo):
   ./install.sh

   # User-local (no sudo):
   ./install.sh --user

3. Authenticate with Claude:
   claude auth login

4. Use anywhere:
   cd ~/your-project
   review-local "analyze recent changes"

## Features

- ✅ Works with Claude Max/Pro subscription (no API key needed)
- ✅ Automatically gathers git context (branch, status, commits)
- ✅ Multiple output modes: default, --quiet, --verbose, --json
- ✅ Supports MCP servers and custom settings
- ✅ Use in any git repository

## Usage Examples

Basic:
  review-local "check for security issues"

Without git context:
  review-local --no-git-context "explain this algorithm"

Quiet mode (just the result):
  review-local --quiet "what is 2+2?"

JSON output:
  review-local --json "analyze complexity"

Custom tools:
  review-local --allowed-tools "Read,Grep,Glob" "find all TODOs"

Get help:
  review-local --help

## Support

Source: https://github.com/anthropics/claude-code-action
Issues: Report at the source repository

Built on @anthropic-ai/claude-code-action
EOF

# Create tarball
cd "${DIST_DIR}"
tar -czf "${PACKAGE_NAME}.tar.gz" "${PACKAGE_NAME}"
cd - > /dev/null

# Cleanup
rm -rf "${PACKAGE_DIR}"

echo -e "\n${GREEN}✅ Package created: ${DIST_DIR}/${PACKAGE_NAME}.tar.gz${NC}"
echo -e "${BLUE}📏 Package size: $(du -h "${DIST_DIR}/${PACKAGE_NAME}.tar.gz" | cut -f1)${NC}"
echo -e "\n${YELLOW}To share with your friend:${NC}"
echo -e "  1. Send them: ${DIST_DIR}/${PACKAGE_NAME}.tar.gz"
echo -e "  2. They extract: tar -xzf ${PACKAGE_NAME}.tar.gz"
echo -e "  3. They install: cd ${PACKAGE_NAME} && ./install.sh"
echo -e "  4. They authenticate: claude auth login"
echo -e "  5. They use it: review-local \"your request\""
