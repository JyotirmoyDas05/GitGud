import { COMPANION } from "~/challenges";
import { runGit } from "~/lib/git";

/**
 * Unauthenticated GitHub reads.
 *
 * Both api.github.com and the companion repo's Pages site send
 * `Access-Control-Allow-Origin: *`, so the webview can fetch directly — no
 * Rust HTTP client, no async runtime, no extra dependency.
 *
 * Unauthenticated means 60 requests/hour per IP. Fine for a verify button,
 * and it keeps a beginner from hitting a sign-in wall in their first hour.
 */

const API = "https://api.github.com";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (response.status === 404) return null;
  if (response.status === 403 || response.status === 429) {
    throw new Error(
      "GitHub is rate limiting this connection (60 requests an hour without signing in). Wait a few minutes and try again.",
    );
  }
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

/** `null` when no such account exists. */
export function fetchUser(username: string): Promise<GitHubUser | null> {
  return getJson<GitHubUser>(`${API}/users/${encodeURIComponent(username)}`);
}

export interface PullRequest {
  number: number;
  merged_at: string | null;
  html_url: string;
}

/** Pull requests from `username:branch` into the companion repo. */
export async function fetchPullRequests(
  username: string,
  branch: string,
): Promise<PullRequest[]> {
  const head = `${username}:${branch}`;
  const url =
    `${API}/repos/${COMPANION.owner}/${COMPANION.repo}/pulls` +
    `?state=all&head=${encodeURIComponent(head)}&per_page=20`;
  return (await getJson<PullRequest[]>(url)) ?? [];
}

/**
 * Usernames the bot has accepted a collaborator invite from.
 *
 * Published by `accept-invites.yml` because `GET /repos/{o}/{r}/collaborators`
 * needs push access and returns 401 to an unauthenticated client — the app can
 * never read a learner's collaborator list directly.
 */
export async function fetchAcceptedCollaborators(): Promise<string[]> {
  const response = await fetch(`${COMPANION.pages}/collaborators.json`, {
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    collaborators?: { username: string }[];
  };
  return (data.collaborators ?? []).map((c) => c.username.toLowerCase());
}

export interface Contributor {
  username: string;
  at: string | null;
  /** Repo-relative path to their quilt patch, once the bot has placed one. */
  patch: string | null;
}

export interface ContributorList {
  total: number;
  contributors: Contributor[];
}

/**
 * Everyone who has finished, newest first.
 *
 * Published by `build-index.mjs` on every merged pull request. Read from Pages
 * rather than the API so it costs nothing against the 60/hour rate limit and
 * keeps working when the limit is spent.
 */
export async function fetchContributors(): Promise<ContributorList> {
  const response = await fetch(`${COMPANION.pages}/contributors.json`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Could not reach the wall (${response.status}).`);
  const data = (await response.json()) as Partial<ContributorList>;
  return {
    total: data.total ?? 0,
    contributors: data.contributors ?? [],
  };
}

/** Absolute URL for a patch path from `contributors.json`. */
export function patchUrl(patch: string): string {
  return `${COMPANION.pages}/${patch}`;
}

/**
 * The username the learner set in challenge 4.
 *
 * `user.username` is not a real Git config key — git-it invented it and five
 * later challenges read it. Kept for compatibility with the challenge text.
 */
export async function configuredUsername(cwd?: string): Promise<string> {
  const out = await runGit(["config", "user.username"], cwd);
  return out.stdout.trim();
}
