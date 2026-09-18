import { invoke } from "@tauri-apps/api/core";

export interface GitOutput {
  stdout: string;
  stderr: string;
  code: number | null;
}

export type GitRunner = (args: string[], cwd?: string) => Promise<GitOutput>;

const viaTauri: GitRunner = (args, cwd) => invoke<GitOutput>("run_git", { args, cwd });

let runner: GitRunner = viaTauri;

/**
 * Swap the Git backend.
 *
 * Exists so the verifiers can be tested against real temporary repositories
 * in Node, where `invoke` does not exist. Without this seam the only way to
 * exercise them is to click through the app — which is how git-it ended up
 * shipping checks that had silently stopped working.
 */
export function setGitRunner(next: GitRunner) {
  runner = next;
}

/**
 * Run a Git command. Mirrors git-it-electron's `lib/spawn-git.js`.
 *
 * A non-zero exit resolves normally — `git status` outside a repo exits 128
 * and that is a meaningful answer. Only a spawn failure rejects.
 */
export function runGit(args: string[], cwd?: string): Promise<GitOutput> {
  return runner(args, cwd);
}

/** `"git version 2.54.0.windows.1"`, or null when Git is not installed. */
export function gitVersion(): Promise<string | null> {
  return invoke<string | null>("git_version");
}
