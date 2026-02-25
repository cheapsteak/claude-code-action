/**
 * Generates git repository context for local execution
 */
import { $ } from "bun";

export interface GitContext {
  repository: {
    name: string;
    owner: string;
    fullName: string;
    defaultBranch: string;
  };
  branch: {
    current: string;
    upstream: string | null;
    commits: number;
  };
  status: {
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
    staged: string[];
  };
  recentCommits: Array<{
    hash: string;
    author: string;
    date: string;
    message: string;
  }>;
}

/**
 * Safely execute a git command and return output or null on error
 */
async function gitCommand(cmd: string): Promise<string | null> {
  try {
    const result = await $`sh -c ${cmd}`.quiet().text();
    return result.trim();
  } catch {
    return null;
  }
}

export async function getGitContext(): Promise<GitContext> {
  // Get repository name
  const remoteUrl = await gitCommand("git config --get remote.origin.url");
  let repoName = "unknown";
  let repoOwner = "unknown";

  if (remoteUrl) {
    // Parse GitHub URL (supports both HTTPS and SSH)
    const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
    if (match) {
      repoOwner = match[1];
      repoName = match[2];
    }
  }

  // Get default branch
  const defaultBranch =
    (await gitCommand("git symbolic-ref refs/remotes/origin/HEAD"))?.replace(
      "refs/remotes/origin/",
      "",
    ) || "main";

  // Get current branch
  const currentBranch =
    (await gitCommand("git branch --show-current")) || "unknown";

  // Get upstream branch
  const upstream = await gitCommand(
    `git rev-parse --abbrev-ref ${currentBranch}@{upstream}`,
  );

  // Count commits ahead/behind
  const commitsAhead = await gitCommand(
    `git rev-list --count ${upstream}..HEAD`,
  );

  // Get git status
  const statusOutput = (await gitCommand("git status --porcelain")) || "";
  const statusLines = statusOutput.split("\n").filter(Boolean);

  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];
  const staged: string[] = [];

  for (const line of statusLines) {
    const status = line.substring(0, 2);
    const file = line.substring(3);

    if (status[0] === "?" && status[1] === "?") {
      untracked.push(file);
    } else {
      if (status[0] !== " " && status[0] !== "?") {
        staged.push(file);
      }
      if (status[1] === "M" || status[0] === "M") {
        modified.push(file);
      }
      if (status[1] === "A" || status[0] === "A") {
        added.push(file);
      }
      if (status[1] === "D" || status[0] === "D") {
        deleted.push(file);
      }
    }
  }

  // Get recent commits
  const logOutput =
    (await gitCommand("git log -10 --pretty=format:'%H|%an|%ai|%s'")) || "";

  const recentCommits = logOutput
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, message] = line.split("|");
      return { hash, author, date, message };
    });

  return {
    repository: {
      name: repoName,
      owner: repoOwner,
      fullName: `${repoOwner}/${repoName}`,
      defaultBranch,
    },
    branch: {
      current: currentBranch,
      upstream,
      commits: parseInt(commitsAhead || "0", 10),
    },
    status: {
      modified,
      added,
      deleted,
      untracked,
      staged,
    },
    recentCommits,
  };
}

/**
 * Format git context as a human-readable markdown string
 */
export function formatGitContext(context: GitContext): string {
  const parts: string[] = [];

  parts.push("# Git Repository Context\n");

  parts.push(`**Repository:** ${context.repository.fullName}`);
  parts.push(`**Branch:** ${context.branch.current}`);

  if (context.branch.upstream) {
    parts.push(`**Upstream:** ${context.branch.upstream}`);
    if (context.branch.commits > 0) {
      parts.push(`**Commits ahead:** ${context.branch.commits}`);
    }
  }

  parts.push("");

  // Working directory status
  if (
    context.status.modified.length > 0 ||
    context.status.added.length > 0 ||
    context.status.deleted.length > 0 ||
    context.status.untracked.length > 0 ||
    context.status.staged.length > 0
  ) {
    parts.push("## Working Directory Status\n");

    if (context.status.staged.length > 0) {
      parts.push("**Staged files:**");
      context.status.staged.forEach((file) => parts.push(`  - ${file}`));
      parts.push("");
    }

    if (context.status.modified.length > 0) {
      parts.push("**Modified files:**");
      context.status.modified.forEach((file) => parts.push(`  - ${file}`));
      parts.push("");
    }

    if (context.status.added.length > 0) {
      parts.push("**Added files:**");
      context.status.added.forEach((file) => parts.push(`  - ${file}`));
      parts.push("");
    }

    if (context.status.deleted.length > 0) {
      parts.push("**Deleted files:**");
      context.status.deleted.forEach((file) => parts.push(`  - ${file}`));
      parts.push("");
    }

    if (context.status.untracked.length > 0) {
      parts.push("**Untracked files:**");
      context.status.untracked.forEach((file) => parts.push(`  - ${file}`));
      parts.push("");
    }
  } else {
    parts.push("## Working Directory Status\n");
    parts.push("*Working directory is clean*\n");
  }

  // Recent commits
  if (context.recentCommits.length > 0) {
    parts.push("## Recent Commits\n");
    context.recentCommits.slice(0, 5).forEach((commit) => {
      parts.push(`- **${commit.hash.substring(0, 7)}** ${commit.message}`);
      parts.push(
        `  *${commit.author}* on ${new Date(commit.date).toLocaleDateString()}`,
      );
    });
  }

  return parts.join("\n");
}
