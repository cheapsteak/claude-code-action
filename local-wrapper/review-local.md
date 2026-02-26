---
description: Run local GitHub Action review with git context
---

You are being invoked via the `/review-local` slash command to analyze code using the GitHub Action's base-action core with local git repository context.

**Check if the user provided a specific request:**

- If the user typed `/review-local "their request"` or `/review-local their request`, use their request
- If the user typed just `/review-local` with nothing after it, use the default prompt: "Review the recent changes and suggest improvements"

Execute the local review tool using TWO separate steps (the tool interferes with Claude Code's I/O if output is read in the same Bash call):

**Step 1** — Run the tool, capturing output to a file in the current working directory:

```bash
~/.local/bin/review-local "<the prompt to use>" > review-local-output.txt 2>&1
```

**Step 2** — Use the Read tool to read `review-local-output.txt`, display its contents to the user, then delete the file with a Bash call (`rm review-local-output.txt`).

This will:

1. Gather current git repository context (branch, status, recent commits)
2. Format it similar to how the GitHub Action formats PR/issue context
3. Execute Claude Code with the enhanced prompt using base-action
4. Return the results for you to display

Before executing, briefly explain what you're about to do.

Examples:

User: `/review-local "check for security issues"`
Assistant: I'll run the local review tool to analyze your repository for security issues, including git context about recent changes.
[Step 1: ~/.local/bin/review-local "check for security issues" > review-local-output.txt 2>&1]
[Step 2: Read review-local-output.txt, display results, then rm review-local-output.txt]

User: `/review-local`
Assistant: I'll run the local review tool to review your recent changes and suggest improvements.
[Step 1: ~/.local/bin/review-local "Review the recent changes and suggest improvements" > review-local-output.txt 2>&1]
[Step 2: Read review-local-output.txt, display results, then rm review-local-output.txt]
