# Local Claude Review Tool

Run the GitHub Action's base-action core locally with git repository context.

## Overview

This tool adapts the `claude-code-action` GitHub Action to work as a standalone CLI tool that can be installed globally on your machine. It provides the same Claude Code experience but runs locally with your git repository context.

## Features

- ✅ Uses GitHub Action's proven `base-action` core (no code duplication)
- ✅ Automatically gathers git context (branch, status, commits)
- ✅ Works with Claude Max/Pro subscription (no API key needed)
- ✅ Installable globally - use in any repository
- ✅ Cross-platform binary (macOS/Linux)
- ✅ Supports all base-action features (MCP servers, custom settings, etc.)
- ✅ Includes `/review-local` slash command for Claude Code

## Quick Start

### 1. Build

```bash
./local-wrapper/build.sh
```

### 2. Install

```bash
# User-level (default, no sudo required)
./local-wrapper/install.sh

# Or system-wide (requires sudo)
sudo ./local-wrapper/install.sh --system
```

### 3. Authenticate

```bash
# Option 1: Use your Claude Max/Pro subscription
claude auth login

# Option 2: Use API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 4. Use Anywhere

```bash
cd ~/any-repository
review-local "analyze recent changes for security issues"
```

## Usage

### Basic Usage

```bash
review-local "your request here"
```

### Advanced Options

```bash
# Without git context
review-local --no-git-context "explain this algorithm"

# With custom Claude arguments
review-local --claude-args "--max-turns 10" "refactor the auth module"

# Limit allowed tools
review-local --allowed-tools "Read,Grep,Glob" "find all TODO comments"

# In a specific directory
review-local --working-dir ~/my-project "review the test coverage"

# With custom MCP configuration
review-local --mcp-config ~/.claude/my-mcp.json "analyze database schema"
```

### As a Slash Command

The installer also adds a `/review-local` slash command to `~/.claude/commands/`. Use it from any Claude Code session:

```
/review-local "check for bugs in the recent changes"
/review-local   # defaults to "Review the recent changes and suggest improvements"
```

## How It Works

### Architecture

```
┌─────────────────────────────────────┐
│  review-local (CLI wrapper)         │
│  - Gathers git context              │
│  - Validates environment            │
│  - Formats prompt                   │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  base-action (GitHub Action core)   │
│  - Manages Claude Code settings     │
│  - Orchestrates Claude CLI          │
│  - Handles named pipe IPC           │
│  - Processes streaming output       │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  Claude CLI (claude command)        │
│  - Executes with your subscription  │
│  - Or uses ANTHROPIC_API_KEY        │
└─────────────────────────────────────┘
```

### Key Innovation: Module Aliasing

We use Bun's module override feature to replace `@actions/core` with a local stub, allowing us to run the base-action code unmodified:

**package.json:**

```json
{
  "bun": {
    "overrides": {
      "@actions/core": "./local-wrapper/core-stub.ts"
    }
  }
}
```

This means:

- ✅ No code duplication
- ✅ Base-action remains untouched
- ✅ Easy to update when base-action changes
- ✅ Clean separation of concerns

## Dependencies

### Required

- **Bun** - Runtime and bundler ([install](https://bun.sh))
- **Claude CLI** - For execution ([install](https://claude.ai/download))
- **git** - For repository context
- **jq** - For JSON processing (`brew install jq` or `apt install jq`)

### Optional

- **Claude Max/Pro subscription** - Recommended, easier than API keys
- **ANTHROPIC_API_KEY** - Alternative to subscription

## Development

### Project Structure

```
local-wrapper/
├── run-local.ts          # Main CLI wrapper
├── git-context.ts        # Git repository context gatherer
├── core-stub.ts          # @actions/core stub implementation
├── build.sh              # Build script for standalone binary
├── install.sh            # Installation script
├── uninstall.sh          # Uninstallation script
└── README.md             # This file
```

### Testing Locally

```bash
# Test without building
bun run local-wrapper/run-local.ts "test prompt"

# Test with options
bun run local-wrapper/run-local.ts --no-git-context "test"

# Test help
bun run local-wrapper/run-local.ts --help
```

### Building for Multiple Platforms

```bash
# macOS ARM (M1/M2/M3)
./local-wrapper/build.sh darwin-arm64

# macOS Intel
./local-wrapper/build.sh darwin-x64

# Linux x64
./local-wrapper/build.sh linux-x64

# Linux ARM
./local-wrapper/build.sh linux-arm64
```

Binaries will be created in `local-wrapper/dist/`.

## Distribution to Other Machines

### Same Architecture

1. Build the binary: `./local-wrapper/build.sh`
2. Copy `local-wrapper/dist/review-local-<platform>` to target machine
3. On target machine:
   - Install Claude CLI: `curl -fsSL https://claude.ai/install.sh | bash`
   - Install jq: `brew install jq` (macOS) or `apt install jq` (Linux)
   - Install the binary: `sudo cp review-local-<platform> /usr/local/bin/review-local`
   - Authenticate: `claude auth login`

### Different Architectures

Build for the target platform first:

```bash
# On your machine
./local-wrapper/build.sh linux-x64  # For Linux servers
./local-wrapper/build.sh darwin-x64  # For Intel Macs
```

Then follow the same distribution steps above.

## Troubleshooting

### "review-local is damaged and can't be opened" (macOS)

This is macOS Gatekeeper blocking unsigned binaries. Fix it with:

```bash
# If using the distribution package:
./fix-macos-gatekeeper.sh

# Or manually:
xattr -d com.apple.quarantine review-local
chmod +x review-local
```

The `package-for-distribution.sh` script automatically includes the fix script and the install script removes the quarantine attribute, so this should be rare.

### "claude: command not found"

Install Claude CLI:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### "jq: command not found"

Install jq:

```bash
# macOS
brew install jq

# Linux (Debian/Ubuntu)
sudo apt install jq

# Linux (RHEL/CentOS)
sudo yum install jq
```

### "Authentication failed"

Either authenticate with Claude:

```bash
claude auth login
```

Or set API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### "No git repository found"

Make sure you're running in a git repository:

```bash
git init  # If needed
```

Or skip git context:

```bash
review-local --no-git-context "your request"
```

## Uninstalling

```bash
# User-level (default)
./local-wrapper/uninstall.sh

# System-wide
sudo ./local-wrapper/uninstall.sh --system
```

## Comparison with GitHub Action

| Feature               | GitHub Action          | Local Tool                 |
| --------------------- | ---------------------- | -------------------------- |
| Execution Environment | GitHub Actions         | Local machine              |
| Context Source        | PR/Issue data          | Git repository             |
| Authentication        | OIDC + GitHub App      | Claude CLI auth or API key |
| Comment Updates       | GitHub comments        | Terminal output            |
| Branch Operations     | Automatic PR branches  | Manual git commands        |
| MCP Servers           | GitHub-specific        | Any MCP server             |
| Cost                  | GitHub Actions minutes | Local compute              |
| Use Case              | CI/CD automation       | Interactive development    |

## License

Same as parent project (see main repository LICENSE)

## Credits

Built on top of `@anthropic-ai/claude-code-action` base-action.
