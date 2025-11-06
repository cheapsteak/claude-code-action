#!/bin/bash
#
# Fix macOS Gatekeeper blocking review-local binary
#
# This script removes the quarantine attribute that macOS applies to downloaded files
# Run this if you get "review-local is damaged and can't be opened"

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔓 Fixing macOS Gatekeeper for review-local...${NC}\n"

# Find the binary
BINARY=""
if [ -f "review-local" ]; then
    BINARY="review-local"
elif [ -f "./review-local" ]; then
    BINARY="./review-local"
elif [ -f "/usr/local/bin/review-local" ]; then
    BINARY="/usr/local/bin/review-local"
elif [ -f "$HOME/.local/bin/review-local" ]; then
    BINARY="$HOME/.local/bin/review-local"
else
    echo -e "${YELLOW}Binary location (default: ./review-local):${NC}"
    read -r BINARY
    if [ -z "$BINARY" ]; then
        BINARY="./review-local"
    fi
fi

if [ ! -f "$BINARY" ]; then
    echo "❌ Error: Binary not found at $BINARY"
    exit 1
fi

echo -e "${YELLOW}Removing quarantine attribute from: ${BINARY}${NC}"

# Remove quarantine attribute
xattr -d com.apple.quarantine "$BINARY" 2>/dev/null || true

# Make executable
chmod +x "$BINARY"

echo -e "\n${GREEN}✅ Fixed! You can now run the binary.${NC}"
echo -e "\nIf it still doesn't work, try:"
echo -e "  ${BLUE}sudo spctl --master-disable${NC}  (disables Gatekeeper temporarily)"
echo -e "  ${BLUE}sudo spctl --master-enable${NC}   (re-enable afterward)"
