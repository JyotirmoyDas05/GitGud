import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { setGitRunner, type GitOutput } from "~/lib/git";
import {
  verifyBranches,
  verifyCommitToIt,
  verifyForksAndClones,
  verifyRemoteControl,
  verifyRepository,
} from "./challenges";
import { passed } from "./types";

const exec = promisify(execFile);

/**
 * Real Git, real temporary repositories.
 *
 * These are the checks git-it never had: three of its verifiers had quietly
 * stopped working (the hardcoded `master`, the "Initial commit" string, the
 * substring filename match) and nothing caught it because the only way to run
 * them was to click the button.
 */
async function git(args: string[], cwd?: string): Promise<GitOutput> {
  try {
    const { stdout, stderr } = await exec("git", args, {
      cwd,
      env: { ...process.env, LANG: "C", LC_ALL: "C", GIT_TERMINAL_PROMPT: "0" },
    });
    return { stdout, stderr, code: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; code?: number };
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", code: err.code ?? 1 };
  }
}

let root: string;

function scratch(name: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function initRepo(name: string, branch = "main"): Promise<string> {
  const dir = scratch(name);
  await git(["init", `--initial-branch=${branch}`], dir);
  await git(["config", "user.email", "test@example.com"], dir);
  await git(["config", "user.name", "Test User"], dir);
  return dir;
}

async function commitSomething(dir: string, file = "readme.txt") {
  writeFileSync(join(dir, file), "hello\n");
  await git(["add", "-A"], dir);
  await git(["commit", "-m", "add " + file], dir);
}

beforeAll(() => {
  setGitRunner(git);
  root = mkdtempSync(join(tmpdir(), "gitgud-verify-"));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("challenge 2 — repository", () => {
  it("fails on a plain folder", async () => {
    const dir = scratch("plain");
    const results = await verifyRepository({ path: dir });
    expect(passed(results)).toBe(false);
  });

  it("passes on a git repository", async () => {
    const dir = await initRepo("repo-ok");
    const results = await verifyRepository({ path: dir });
    expect(passed(results)).toBe(true);
  });
});

describe("challenge 3 — commit to it", () => {
  it("fails on a repo with no commits", async () => {
    // git-it matched the string "Initial commit" here, which Git 2.x renamed
    // to "No commits yet" — so this case silently started passing.
    const dir = await initRepo("no-commits");
    const results = await verifyCommitToIt({ path: dir });
    expect(passed(results)).toBe(false);
    expect(results[0].message).toMatch(/No commits yet/i);
  });

  it("passes once a change is committed", async () => {
    const dir = await initRepo("committed");
    await commitSomething(dir);
    const results = await verifyCommitToIt({ path: dir });
    expect(passed(results)).toBe(true);
  });

  it("fails when changes are left uncommitted", async () => {
    const dir = await initRepo("dirty");
    await commitSomething(dir);
    writeFileSync(join(dir, "extra.txt"), "not staged\n");
    const results = await verifyCommitToIt({ path: dir });
    expect(passed(results)).toBe(false);
  });
});

describe("challenge 5 — remote control", () => {
  it("fails with no remote", async () => {
    const dir = await initRepo("no-remote");
    await commitSomething(dir);
    const results = await verifyRemoteControl({ path: dir });
    expect(passed(results)).toBe(false);
  });

  it("passes on a non-master default branch", async () => {
    // The regression that mattered: git-it ran `reflog show origin/master`,
    // so every repository created after GitHub's 2020 default-branch change
    // failed this challenge no matter what the learner did.
    const remote = scratch("origin-main.git");
    await git(["init", "--bare", "--initial-branch=main"], remote);

    const dir = await initRepo("pushed-main", "main");
    await commitSomething(dir);
    await git(["remote", "add", "origin", remote], dir);
    await git(["push", "-u", "origin", "main"], dir);

    const results = await verifyRemoteControl({ path: dir });
    expect(passed(results)).toBe(true);
  });

  it("fails when there are unpushed commits", async () => {
    const remote = scratch("origin-behind.git");
    await git(["init", "--bare", "--initial-branch=main"], remote);

    const dir = await initRepo("unpushed", "main");
    await commitSomething(dir);
    await git(["remote", "add", "origin", remote], dir);
    await git(["push", "-u", "origin", "main"], dir);
    await commitSomething(dir, "second.txt");

    const results = await verifyRemoteControl({ path: dir });
    expect(passed(results)).toBe(false);
  });
});

describe("challenge 6 — forks and clones", () => {
  it("rejects an origin pointing at someone else's fork", async () => {
    const dir = await initRepo("wrong-origin");
    await git(["config", "user.username", "learner"], dir);
    await git(
      ["remote", "add", "origin", "https://github.com/someoneelse/git-gud-verifywork.git"],
      dir,
    );
    await git(
      ["remote", "add", "upstream", "https://github.com/JyotirmoyDas05/git-gud-verifywork.git"],
      dir,
    );
    const results = await verifyForksAndClones({ path: dir });
    expect(passed(results)).toBe(false);
  });

  it("accepts both remotes, with or without the .git suffix", async () => {
    const dir = await initRepo("right-remotes");
    await git(["config", "user.username", "learner"], dir);
    await git(["remote", "add", "origin", "https://github.com/learner/git-gud-verifywork"], dir);
    await git(
      ["remote", "add", "upstream", "git@github.com:JyotirmoyDas05/git-gud-verifywork.git"],
      dir,
    );
    const results = await verifyForksAndClones({ path: dir });
    expect(passed(results)).toBe(true);
  });
});

describe("challenge 7 — branches", () => {
  it("does not accept another person's file as yours", async () => {
    // git-it did `files.join().match(username)` across the whole directory,
    // so the username "ana" passed on a stranger's "add-anand.txt".
    const dir = await initRepo("substring", "add-ana");
    await git(["config", "user.username", "ana"], dir);
    mkdirSync(join(dir, "contributors"), { recursive: true });
    writeFileSync(join(dir, "contributors", "add-anand.txt"), "not yours\n");
    await git(["add", "-A"], dir);
    await git(["commit", "-m", "someone else"], dir);

    const results = await verifyBranches({ path: dir });
    const fileCheck = results.find((r) => /add-ana\.txt/.test(r.message));
    expect(fileCheck?.passed).toBe(false);
  });

  it("accepts the learner's own file", async () => {
    const dir = await initRepo("own-file", "add-ana");
    await git(["config", "user.username", "ana"], dir);
    mkdirSync(join(dir, "contributors"), { recursive: true });
    writeFileSync(join(dir, "contributors", "add-ana.txt"), "hello\n");
    await git(["add", "-A"], dir);
    await git(["commit", "-m", "mine"], dir);

    const results = await verifyBranches({ path: dir });
    const fileCheck = results.find((r) => /Found contributors/.test(r.message));
    expect(fileCheck?.passed).toBe(true);
  });
});
