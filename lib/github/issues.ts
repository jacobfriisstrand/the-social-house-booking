// The only code that talks to the GitHub API. Used by the Sentry webhook to
// open one issue per new Sentry issue (docs/agents/stack.md, Observability).
import "server-only";
import { env } from "@/lib/env";

const REPO = "jacobfriisstrand/the-social-house-booking";

interface NewIssue {
  body: string;
  labels: string[];
  title: string;
}

export async function createGithubIssue(issue: NewIssue): Promise<number> {
  const token = env.GITHUB_ISSUES_TOKEN;
  if (!token) {
    throw new Error("GITHUB_ISSUES_TOKEN is not set");
  }
  const response = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    body: JSON.stringify(issue),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      `GitHub issue create failed: ${response.status} ${await response.text()}`
    );
  }
  const created: { number: number } = await response.json();
  return created.number;
}
