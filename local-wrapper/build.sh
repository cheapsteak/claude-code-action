#!/bin/bash
#
# Build script for review-local standalone binary
#
# Usage: ./local-wrapper/build.sh [platform]
#   platform: darwin-arm64 (default), darwin-x64, linux-x64, linux-arm64

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect platform if not specified
PLATFORM="${1:-darwin-arm64}"

echo -e "${BLUE}🔨 Building review-local for platform: ${PLATFORM}${NC}\n"

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Error: bun is not installed${NC}"
    echo -e "${YELLOW}💡 Install from: https://bun.sh${NC}"
    exit 1
fi

# Create build directory
BUILD_DIR="local-wrapper/dist"
mkdir -p "$BUILD_DIR"

echo -e "${YELLOW}📦 Compiling TypeScript to standalone binary...${NC}"

# Build with Bun
bun build local-wrapper/run-local.ts \
  --compile \
  --target="bun-${PLATFORM}" \
  --outfile="${BUILD_DIR}/review-local-${PLATFORM}"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Build successful!${NC}"
    echo -e "${GREEN}📦 Binary created: ${BUILD_DIR}/review-local-${PLATFORM}${NC}"

    # Make executable
    chmod +x "${BUILD_DIR}/review-local-${PLATFORM}"

    # Show size
    SIZE=$(du -h "${BUILD_DIR}/review-local-${PLATFORM}" | cut -f1)
    echo -e "${BLUE}📏 Binary size: ${SIZE}${NC}"

    echo -e "\n${BLUE}📋 Next steps:${NC}"
    echo -e "  1. Test: ${BUILD_DIR}/review-local-${PLATFORM} --help"
    echo -e "  2. Install: sudo ./local-wrapper/install.sh"
    echo -e "  3. Use anywhere: cd ~/any-repo && review-local \"review code\""
else
    echo -e "\n${RED}❌ Build failed${NC}"
    exit 1
fi
