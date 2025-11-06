#!/usr/bin/env bun
/**
 * Local wrapper for running base-action outside of GitHub Actions
 *
 * This script uses Bun's module overrides to replace @actions/core with a local stub,
 * allowing base-action to run locally without modification.
 */

// IMPORTANT: Set RUNNER_TEMP before importing base-action modules
// because they use it at module load time
if (!process.env.RUNNER_TEMP) {
  process.env.RUNNER_TEMP = "/tmp";
}

import { getGitContext, formatGitContext } from "./git-context";
import { preparePrompt } from "../base-action/src/prepare-prompt";
import { setupClaudeCodeSettings } from "../base-action/src/setup-claude-code-settings";
import { validateEnvironmentVariables } from "../base-action/src/validate-env";
import { OutputFormatter, type OutputMode } from "./output-formatter";

// Import runClaude dynamically to ensure RUNNER_TEMP is set first
import type { ClaudeOptions } from "../base-action/src/run-claude";

interface LocalRunOptions {
  prompt: string;
  includeGitContext?: boolean;
  claudeArgs?: string;
  settings?: string;
  model?: string;
  maxTurns?: string;
  workingDir?: string;
  mcpConfig?: string;
  allowedTools?: string;
  disallowedTools?: string;
  outputMode?: OutputMode;
  noProgress?: boolean;
}

async function runLocal(options: LocalRunOptions) {
  try {
    const outputMode = options.outputMode || "default";
    const showProgress = !options.noProgress && outputMode !== "quiet" && outputMode !== "json";

    if (showProgress) {
      process.stderr.write("🚀 Starting local Claude Code execution...\n\n");
    }

    // Change to working directory if specified
    if (options.workingDir) {
      process.chdir(options.workingDir);
      if (showProgress) {
        process.stderr.write(`📂 Changed directory to: ${options.workingDir}\n\n`);
      }
    }

    // Ensure RUNNER_TEMP is set (redundant safety check)
    if (!process.env.RUNNER_TEMP) {
      process.env.RUNNER_TEMP = "/tmp";
    }

    // Validate authentication (optional - Claude CLI might already be authenticated)
    if (showProgress) {
      process.stderr.write("🔐 Checking authentication...\n");
    }
    try {
      validateEnvironmentVariables();
      if (showProgress) {
        process.stderr.write("✅ Environment variables validated\n\n");
      }
    } catch (error) {
      if (showProgress) {
        process.stderr.write("⚠️  No API key found in environment variables\n");
        process.stderr.write("💡 Assuming Claude CLI is already authenticated (claude auth login)\n");
        process.stderr.write("   If this fails, either run 'claude auth login' or set ANTHROPIC_API_KEY\n\n");
      }
    }

    // Setup Claude Code settings (suppress its console output in quiet/json modes)
    if (showProgress) {
      process.stderr.write("⚙️  Setting up Claude Code settings...\n");
    }

    if (!showProgress) {
      // Suppress setupClaudeCodeSettings console output
      const originalConsoleLog = console.log;
      console.log = () => {};
      await setupClaudeCodeSettings(options.settings);
      console.log = originalConsoleLog;
    } else {
      await setupClaudeCodeSettings(options.settings);
    }

    if (showProgress) {
      process.stderr.write("✅ Settings configured\n\n");
    }

    // Build prompt with optional git context
    let fullPrompt = options.prompt;

    if (options.includeGitContext !== false) {
      if (showProgress) {
        process.stderr.write("📊 Gathering git repository context...\n");
      }
      try {
        const gitContext = await getGitContext();
        const contextString = formatGitContext(gitContext);
        fullPrompt = `${contextString}\n\n---\n\n# User Request\n\n${options.prompt}`;
        if (showProgress) {
          process.stderr.write("✅ Git context added to prompt\n\n");
        }
      } catch (error) {
        if (showProgress) {
          process.stderr.write(`⚠️  Failed to gather git context: ${error}\n`);
          process.stderr.write("   Continuing without git context...\n\n");
        }
      }
    }

    // Prepare prompt file
    if (showProgress) {
      process.stderr.write("📝 Preparing prompt...\n");
    }
    const promptConfig = await preparePrompt({
      prompt: fullPrompt,
      promptFile: "",
    });
    if (showProgress) {
      process.stderr.write(`✅ Prompt file created: ${promptConfig.path}\n\n`);
    }

    // Run Claude (dynamic import to ensure RUNNER_TEMP is set)
    if (showProgress) {
      process.stderr.write("🤖 Executing Claude Code...\n\n");
      if (outputMode === "default") {
        process.stderr.write("=".repeat(80) + "\n\n");
      }
    }

    const { runClaude } = await import("../base-action/src/run-claude");

    // In verbose mode, just pass through everything
    if (outputMode === "verbose") {
      await runClaude(promptConfig.path, {
        claudeArgs: options.claudeArgs,
        model: options.model,
        maxTurns: options.maxTurns,
        mcpConfig: options.mcpConfig,
        allowedTools: options.allowedTools,
        disallowedTools: options.disallowedTools,
      });
    } else {
      // For other modes, suppress runClaude's output and format afterward
      const originalStdoutWrite = process.stdout.write.bind(process.stdout);
      const originalConsoleLog = console.log;

      try {
        // Suppress output during execution
        process.stdout.write = (() => true) as any;
        console.log = () => {};

        await runClaude(promptConfig.path, {
          claudeArgs: options.claudeArgs,
          model: options.model,
          maxTurns: options.maxTurns,
          mcpConfig: options.mcpConfig,
          allowedTools: options.allowedTools,
          disallowedTools: options.disallowedTools,
        });
      } finally {
        // Always restore output, even if runClaude crashes
        process.stdout.write = originalStdoutWrite;
        console.log = originalConsoleLog;
      }

      // Read and format the execution file
      const EXECUTION_FILE = "/tmp/claude-execution-output.json";
      try {
        const { readFile } = await import("fs/promises");
        const executionData = await readFile(EXECUTION_FILE, "utf-8");
        const messages = JSON.parse(executionData);

        // Create formatter and process messages
        const formatter = new OutputFormatter(outputMode, showProgress);
        for (const msg of messages) {
          formatter.processLine(JSON.stringify(msg));
        }
        formatter.displayFinal();
      } catch (error) {
        if (showProgress) {
          process.stderr.write(`\n⚠️  Could not read execution results: ${error}\n`);
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Execution failed:");
    console.error(error);
    process.exit(1);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  // Show help if no arguments or --help flag
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
🔧 Local Claude Code Runner
============================

Runs the GitHub Action's base-action core locally with git repository context.

Usage:
  bun run local-wrapper/run-local.ts [options] <prompt>
  review-local [options] <prompt>  (after building/installing)

Options:
  --no-git-context              Skip gathering git repository context
  --claude-args <args>          Additional arguments for Claude CLI
                                Example: "--max-turns 5 --allowed-tools Edit,Read"
  --settings <json|path>        Claude Code settings (JSON string or file path)
  --model <model>               Override model (e.g., claude-sonnet-4-5)
  --max-turns <n>               Maximum conversation turns
  --mcp-config <json|path>      MCP server configuration
  --allowed-tools <list>        Comma-separated list of allowed tools
  --disallowed-tools <list>     Comma-separated list of disallowed tools
  --working-dir <path>          Run in specific directory
  -h, --help                    Show this help message

Output Options:
  (default)                     Quiet mode - just the result
  --progress                    Show progress and formatted output
  --verbose, -v                 Show all JSON output (full debug mode)
  --json                        Output structured JSON format

Authentication:
  One of the following is required:
    1. Run 'claude auth login' (uses your Claude Max/Pro subscription)
    2. Set ANTHROPIC_API_KEY environment variable
    3. Configure AWS Bedrock or Google Vertex AI credentials

Examples:
  # Simple execution with git context
  bun run local-wrapper/run-local.ts "Review the recent changes"

  # Without git context
  bun run local-wrapper/run-local.ts --no-git-context "Help me refactor auth"

  # With custom Claude arguments
  bun run local-wrapper/run-local.ts \\
    --claude-args "--max-turns 5 --allowed-tools Edit,Read,Write" \\
    "Fix the failing tests"

  # In a specific directory
  bun run local-wrapper/run-local.ts --working-dir ~/my-project "Review code"

  # With custom MCP servers
  bun run local-wrapper/run-local.ts \\
    --mcp-config ~/.claude/mcp-config.json \\
    "Analyze the database schema"

Build & Install:
  # Build standalone binary
  bun run local-wrapper/build.sh

  # Install globally
  sudo ./local-wrapper/install.sh

  # Then use anywhere
  cd ~/any-repo && review-local "check for security issues"
`);
    process.exit(0);
  }

  // Parse arguments
  const options: LocalRunOptions = {
    prompt: "",
    includeGitContext: true,
    outputMode: "quiet",
    noProgress: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--no-git-context") {
      options.includeGitContext = false;
      i++;
    } else if (arg === "--progress") {
      options.outputMode = "default";
      i++;
    } else if (arg === "--verbose" || arg === "-v") {
      options.outputMode = "verbose";
      i++;
    } else if (arg === "--json") {
      options.outputMode = "json";
      i++;
    } else if (arg === "--claude-args" && i + 1 < args.length) {
      options.claudeArgs = args[i + 1];
      i += 2;
    } else if (arg === "--settings" && i + 1 < args.length) {
      options.settings = args[i + 1];
      i += 2;
    } else if (arg === "--model" && i + 1 < args.length) {
      options.model = args[i + 1];
      i += 2;
    } else if (arg === "--max-turns" && i + 1 < args.length) {
      options.maxTurns = args[i + 1];
      i += 2;
    } else if (arg === "--mcp-config" && i + 1 < args.length) {
      options.mcpConfig = args[i + 1];
      i += 2;
    } else if (arg === "--allowed-tools" && i + 1 < args.length) {
      options.allowedTools = args[i + 1];
      i += 2;
    } else if (arg === "--disallowed-tools" && i + 1 < args.length) {
      options.disallowedTools = args[i + 1];
      i += 2;
    } else if (arg === "--working-dir" && i + 1 < args.length) {
      options.workingDir = args[i + 1];
      i += 2;
    } else {
      // Treat remaining args as prompt
      options.prompt = args.slice(i).join(" ");
      break;
    }
  }

  if (!options.prompt) {
    console.error("❌ Error: No prompt provided\n");
    console.log("Run with --help for usage information");
    process.exit(1);
  }

  await runLocal(options);
}

if (import.meta.main) {
  main();
}

export { runLocal };
