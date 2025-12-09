#!/bin/bash
#
# Uninstall script for review-local
#
# Usage: ./local-wrapper/uninstall.sh [--system]
#   --system: Uninstall from /usr/local/bin instead of ~/.local/bin
#
# By default, uninstalls from ~/.local/bin (user-level)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗑️  Uninstalling review-local...${NC}\n"

# Parse arguments
SYSTEM_INSTALL=false
if [ "$1" = "--system" ]; then
    SYSTEM_INSTALL=true
fi

# Determine install location
if [ "$SYSTEM_INSTALL" = true ]; then
    INSTALL_DIR="/usr/local/bin"
    echo -e "${YELLOW}📂 Uninstalling from: ${INSTALL_DIR} (system-wide)${NC}"

    # Check if we need sudo
    if [ ! -w "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}🔐 Need sudo privileges...${NC}"
        SUDO="sudo"
    fi
else
    INSTALL_DIR="$HOME/.local/bin"
    echo -e "${YELLOW}📂 Uninstalling from: ${INSTALL_DIR} (user)${NC}"
fi

# Check if binary exists
if [ ! -f "$INSTALL_DIR/review-local" ]; then
    echo -e "${YELLOW}⚠️  review-local not found in ${INSTALL_DIR}${NC}"
    echo -e "${YELLOW}💡 Already uninstalled or never installed${NC}"
    exit 0
fi

# Remove binary
echo -e "${YELLOW}🗑️  Removing binary...${NC}"
$SUDO rm "$INSTALL_DIR/review-local"

echo -e "\n${GREEN}✅ Uninstall complete!${NC}"
echo -e "${BLUE}review-local has been removed from ${INSTALL_DIR}${NC}"
