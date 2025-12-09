---
description: Run local GitHub Action review with git context
---

You are being invoked via the `/review-local` slash command to analyze code using the GitHub Action's base-action core with local git repository context.

**Check if the user provided a specific request:**

- If the user typed `/review-local "their request"` or `/review-local their request`, use their request
- If the user typed just `/review-local` with nothing after it, use the default prompt: "Review the recent changes and suggest improvements"

Execute the local review tool:

```bash
~/.local/bin/review-local "<the prompt to use>"
```

This will:
1. Gather current git repository context (branch, status, recent commits)
2. Format it similar to how the GitHub Action formats PR/issue context
3. Execute Claude Code with the enhanced prompt using base-action
4. Stream results to the terminal

Before executing, briefly explain what you're about to do.

Examples:

User: `/review-local "check for security issues"`
Assistant: I'll run the local review tool to analyze your repository for security issues, including git context about recent changes.
[Execute: ~/.local/bin/review-local "check for security issues"]

User: `/review-local`
Assistant: I'll run the local review tool to review your recent changes and suggest improvements.
[Execute: ~/.local/bin/review-local "Review the recent changes and suggest improvements"]
