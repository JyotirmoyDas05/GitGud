import { runGit } from "~/lib/git";

/** Shared helpers for the repository-based challenges. */

/** True when `path` is inside a Git work tree. */
export async function isRepo(path: string): Promise<boolean> {
  const out = await runGit(["rev-parse", "--is-inside-work-tree"], path);
  return out.stdout.trim() === "true";
}

/**
 * The branch currently checked out.
 *
 * `branch --show-current` rather than `rev-parse --abbrev-ref HEAD`: the
 * latter errors on an unborn branch, which is the state right after `git init`.
 */
export async function currentBranch(path: string): Promise<string> {
  const out = await runGit(["branch", "--show-current"], path);
  return out.stdout.trim();
}

/** URL of a remote, or empty string when it does not exist. */
export async function remoteUrl(path: string, remote: string): Promise<string> {
  const out = await runGit(["remote", "get-url", remote], path);
  return out.code === 0 ? out.stdout.trim() : "";
}

export async function remotes(path: string): Promise<string[]> {
  const out = await runGit(["remote"], path);
  return out.stdout.trim().split("\n").filter(Boolean);
}

/** Does `ref` resolve? Used to tell "pushed" from "never pushed". */
export async function refExists(path: string, ref: string): Promise<boolean> {
  const out = await runGit(["rev-parse", "--verify", "--quiet", ref], path);
  return out.code === 0 && out.stdout.trim().length > 0;
}

/** Commits on `from` that are not on `to`. */
export async function countAhead(
  path: string,
  to: string,
  from: string,
): Promise<number> {
  const out = await runGit(["rev-list", "--count", `${to}..${from}`], path);
  return out.code === 0 ? Number.parseInt(out.stdout.trim(), 10) || 0 : 0;
}

/**
 * Is `file` tracked by Git, comparing case-insensitively?
 *
 * git-it did `files.join().match(username)` over the whole contributors
 * directory, so username "ana" passed on someone else's "add-anand.txt".
 * Listing the exact directory and comparing whole names removes that.
 *
 * Case-insensitive because GitHub usernames are case-insensitive-unique: one
 * account cannot be both "Ana" and "ana", so accepting either spelling blocks
 * nobody while still refusing a different person's file.
 */
export async function tracksFile(path: string, file: string): Promise<boolean> {
  const dir = file.slice(0, file.lastIndexOf("/"));
  const out = await runGit(["ls-files", "--", dir], path);
  if (out.code !== 0) return false;

  const wanted = file.toLowerCase();
  return out.stdout
    .split("\n")
    .map((f) => f.trim().toLowerCase())
    .some((f) => f === wanted);
}

/** Does the repo have at least one commit? */
export async function hasCommits(path: string): Promise<boolean> {
  const out = await runGit(["rev-list", "--count", "--max-count=1", "HEAD"], path);
  return out.code === 0 && Number.parseInt(out.stdout.trim(), 10) > 0;
}

/** Uncommitted changes, tracked or not. */
export async function isClean(path: string): Promise<boolean> {
  const out = await runGit(["status", "--porcelain"], path);
  return out.code === 0 && out.stdout.trim() === "";
}
