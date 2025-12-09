#!/bin/bash
#
# Install script for review-local
#
# Usage: ./local-wrapper/install.sh [--system]
#   --system: Install to /usr/local/bin instead of ~/.local/bin (requires sudo)
#
# By default, installs to ~/.local/bin (user-level, no sudo required)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Installing review-local...${NC}\n"

# Parse arguments
SYSTEM_INSTALL=false
if [ "$1" = "--system" ]; then
    SYSTEM_INSTALL=true
fi

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Map architecture names
case "$ARCH" in
    x86_64) ARCH="x64" ;;
    aarch64) ARCH="arm64" ;;
    arm64) ARCH="arm64" ;;
    *)
        echo -e "${RED}❌ Unsupported architecture: $ARCH${NC}"
        exit 1
        ;;
esac

PLATFORM="${OS}-${ARCH}"
BINARY="local-wrapper/dist/review-local-${PLATFORM}"

echo -e "${YELLOW}📋 Platform detected: ${PLATFORM}${NC}"

# Check if binary exists
if [ ! -f "$BINARY" ]; then
    echo -e "${RED}❌ Binary not found: $BINARY${NC}"
    echo -e "${YELLOW}💡 Build first: ./local-wrapper/build.sh${NC}"
    exit 1
fi

# Determine install location
if [ "$SYSTEM_INSTALL" = true ]; then
    INSTALL_DIR="/usr/local/bin"
    echo -e "${YELLOW}📂 Installing to: ${INSTALL_DIR} (system-wide)${NC}"

    # Check if we need sudo
    if [ ! -w "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}🔐 Need sudo privileges...${NC}"
        SUDO="sudo"
    fi
else
    INSTALL_DIR="$HOME/.local/bin"
    mkdir -p "$INSTALL_DIR"
    echo -e "${YELLOW}📂 Installing to: ${INSTALL_DIR} (user)${NC}"
fi

# Copy binary
echo -e "${YELLOW}📦 Copying binary...${NC}"
$SUDO cp "$BINARY" "$INSTALL_DIR/review-local"
$SUDO chmod +x "$INSTALL_DIR/review-local"

# Remove macOS quarantine attribute if present (prevents Gatekeeper issues)
if [ "$OS" = "darwin" ]; then
    $SUDO xattr -d com.apple.quarantine "$INSTALL_DIR/review-local" 2>/dev/null || true
fi

# Install Claude Code slash command
CLAUDE_COMMANDS_DIR="$HOME/.claude/commands"
SLASH_COMMAND_FILE="local-wrapper/review-local.md"
if [ -f "$SLASH_COMMAND_FILE" ]; then
    echo -e "${YELLOW}📦 Installing slash command...${NC}"
    mkdir -p "$CLAUDE_COMMANDS_DIR"
    cp "$SLASH_COMMAND_FILE" "$CLAUDE_COMMANDS_DIR/review-local.md"
    echo -e "${GREEN}✓ Slash command installed: /review-local${NC}"
else
    echo -e "${YELLOW}⚠️  Slash command file not found, skipping${NC}"
fi

echo -e "\n${GREEN}✅ Installation complete!${NC}"

# Check if in PATH
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
    echo -e "${YELLOW}⚠️  Warning: ${INSTALL_DIR} is not in your PATH${NC}"
    echo -e "${YELLOW}💡 Add this to your ~/.bashrc or ~/.zshrc:${NC}"
    echo -e "   export PATH=\"${INSTALL_DIR}:\$PATH\""
else
    echo -e "${GREEN}✓ ${INSTALL_DIR} is in your PATH${NC}"
fi

# Check dependencies
echo -e "\n${BLUE}🔍 Checking dependencies...${NC}"

if command -v claude &> /dev/null; then
    echo -e "${GREEN}✓ Claude CLI found${NC}"
else
    echo -e "${YELLOW}⚠️  Claude CLI not found${NC}"
    echo -e "${YELLOW}💡 Install from: https://claude.ai/download${NC}"
fi

if command -v git &> /dev/null; then
    echo -e "${GREEN}✓ git found${NC}"
else
    echo -e "${YELLOW}⚠️  git not found (required for repository context)${NC}"
fi

if command -v jq &> /dev/null; then
    echo -e "${GREEN}✓ jq found${NC}"
else
    echo -e "${YELLOW}⚠️  jq not found (required for JSON processing)${NC}"
    echo -e "${YELLOW}💡 Install: brew install jq (macOS) or apt install jq (Linux)${NC}"
fi

echo -e "\n${BLUE}📋 Usage:${NC}"
echo -e "  ${GREEN}review-local \"analyze recent changes\"${NC}"
echo -e "  ${GREEN}review-local --help${NC}"
echo -e "\n${BLUE}🔐 Authentication:${NC}"
echo -e "  Run: ${GREEN}claude auth login${NC}"
echo -e "  Or set: ${GREEN}export ANTHROPIC_API_KEY=\"sk-ant-...\"${NC}"
