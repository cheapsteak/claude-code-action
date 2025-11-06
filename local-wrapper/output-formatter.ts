/**
 * Output formatter for Claude Code execution
 * Provides different output modes: default (smart), quiet, verbose, json
 */

export type OutputMode = "default" | "quiet" | "verbose" | "json";

export interface ClaudeMessage {
  type: string;
  subtype?: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string; name?: string; input?: any }>;
  };
  result?: string;
  duration_ms?: number;
  total_cost_usd?: number;
  num_turns?: number;
}

export interface FormattedOutput {
  finalResult: string;
  summary: {
    duration_ms: number;
    cost_usd: number;
    turns: number;
  };
  success: boolean;
}

/**
 * Parse and format Claude CLI JSON stream output
 */
export class OutputFormatter {
  private mode: OutputMode;
  private showProgress: boolean;
  private messages: ClaudeMessage[] = [];
  private finalResult: string = "";
  private summary = { duration_ms: 0, cost_usd: 0, turns: 0 };

  constructor(mode: OutputMode = "default", showProgress: boolean = true) {
    this.mode = mode;
    this.showProgress = showProgress;
  }

  /**
   * Process a single line of JSON output from Claude CLI
   */
  processLine(line: string): void {
    if (!line.trim()) return;

    try {
      const msg: ClaudeMessage = JSON.parse(line);
      this.messages.push(msg);

      // Handle different message types based on mode
      if (this.mode === "verbose") {
        // Verbose mode: show everything as-is
        console.log(JSON.stringify(msg, null, 2));
        return;
      }

      // Extract final result
      if (msg.type === "result") {
        this.finalResult = msg.result || "";
        this.summary = {
          duration_ms: msg.duration_ms || 0,
          cost_usd: msg.total_cost_usd || 0,
          turns: msg.num_turns || 0,
        };
        return;
      }

      // Default and quiet/json modes: filter output
      if (this.mode !== "quiet" && this.mode !== "json") {
        this.handleDefaultMode(msg);
      }
    } catch (e) {
      // Not JSON, might be regular output - pass through in verbose mode
      if (this.mode === "verbose") {
        console.log(line);
      }
    }
  }

  /**
   * Handle output in default (smart) mode
   */
  private handleDefaultMode(msg: ClaudeMessage): void {
    // Show assistant text messages (Claude's reasoning)
    if (msg.type === "assistant" && msg.message?.content) {
      for (const content of msg.message.content) {
        if (content.type === "text" && content.text) {
          // Output Claude's text to stdout
          process.stdout.write(content.text + "\n");
        } else if (content.type === "tool_use") {
          // Show tool usage summary to stderr
          if (this.showProgress) {
            const toolName = content.name || "tool";
            const description = content.input?.description || "";
            process.stderr.write(`\n▸ Running: ${toolName}${description ? ` - ${description}` : ""}\n`);
          }
        }
      }
    }
  }

  /**
   * Display the final formatted output
   */
  displayFinal(): void {
    if (this.mode === "json") {
      // JSON mode: structured output
      const output = {
        result: this.finalResult,
        duration_ms: this.summary.duration_ms,
        cost_usd: this.summary.cost_usd,
        turns: this.summary.turns,
        success: !!this.finalResult,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    if (this.mode === "quiet") {
      // Quiet mode: just the result
      if (this.finalResult) {
        console.log(this.finalResult);
      }
      return;
    }

    // Default mode: highlighted result with summary
    if (this.finalResult) {
      process.stdout.write("\n" + "─".repeat(80) + "\n");
      process.stdout.write(this.finalResult + "\n");
      process.stdout.write("─".repeat(80) + "\n");
    }

    if (this.showProgress && this.summary.duration_ms > 0) {
      const durationSec = (this.summary.duration_ms / 1000).toFixed(1);
      const cost = this.summary.cost_usd.toFixed(4);
      process.stderr.write(
        `\n✅ Completed in ${durationSec}s | Cost: $${cost} | ${this.summary.turns} turns\n`
      );
    }
  }

  /**
   * Get the formatted output (for programmatic use)
   */
  getOutput(): FormattedOutput {
    return {
      finalResult: this.finalResult,
      summary: this.summary,
      success: !!this.finalResult,
    };
  }
}

/**
 * Process complete output stream
 */
export function formatClaudeOutput(
  output: string,
  mode: OutputMode = "default",
  showProgress: boolean = true
): FormattedOutput {
  const formatter = new OutputFormatter(mode, showProgress);

  // Process each line
  const lines = output.split("\n");
  for (const line of lines) {
    formatter.processLine(line);
  }

  // Display final output
  formatter.displayFinal();

  return formatter.getOutput();
}
