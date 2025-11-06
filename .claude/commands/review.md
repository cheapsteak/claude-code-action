---
description: Run local GitHub Action review with git context
---

You are being invoked via the `/review` slash command to analyze code using the GitHub Action's base-action core with local git repository context.

Execute the local review tool with the user's request:

```bash
bun run local-wrapper/run-local.ts "<user's request>"
```

This will:
1. Gather current git repository context (branch, status, recent commits)
2. Format it similar to how the GitHub Action formats PR/issue context
3. Execute Claude Code with the enhanced prompt using base-action
4. Stream results to the terminal

Before executing, briefly explain what you're about to do.

Example:
User: /review "check for security issues"
Assistant: I'll run the local review tool to analyze your repository for security issues, including git context about recent changes.
[Execute: bun run local-wrapper/run-local.ts "check for security issues"]
