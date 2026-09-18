/**
 * Runs the real verifiers against a real fork on GitHub.
 *
 * Not part of `npm test` — it needs a network, a throwaway account and a
 * checkout in a known state. Invoked by hand during the end-to-end walk:
 *
 *   npx vitest run --config vitest.live.config.ts
 *
 * Every other check in this repo is hermetic; this one exists because the
 * hermetic ones cannot see a fork, an invitation or a pull request.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { setGitRunner, type GitOutput } from "~/lib/git";
import {
  verifyBranches,
  verifyForksAndClones,
  verifyMergeTada,
  verifyPull,
  verifyPullRequest,
  verifySmallWorld,
} from "./challenges";
import { passed, type CheckResult } from "./types";

const exec = promisify(execFile);
const WORK = process.env.GITGUD_E2E_PATH ?? "";

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

setGitRunner(git);

function show(label: string, results: CheckResult[]) {
  console.log(`\n${label}`);
  for (const r of results) {
    console.log(`  ${r.optional ? "○" : r.passed ? "✓" : "✗"} ${r.message}`);
  }
}

const only = process.env.GITGUD_E2E_ONLY?.split(",") ?? [];
const want = (name: string) => only.length === 0 || only.includes(name);

describe("end-to-end against a real fork", () => {
  it.runIf(want("6"))("challenge 6 — forks and clones", async () => {
    const results = await verifyForksAndClones({ path: WORK });
    show("challenge 6", results);
    expect(passed(results)).toBe(true);
  });

  it.runIf(want("7"))("challenge 7 — branches", async () => {
    const results = await verifyBranches({ path: WORK });
    show("challenge 7", results);
    expect(passed(results)).toBe(true);
  });

  it.runIf(want("8"))("challenge 8 — collaborator", async () => {
    const results = await verifySmallWorld({ path: WORK });
    show("challenge 8", results);
    expect(passed(results)).toBe(true);
  });

  it.runIf(want("9"))("challenge 9 — pull", async () => {
    const results = await verifyPull({ path: WORK });
    show("challenge 9", results);
    expect(passed(results)).toBe(true);
  });

  it.runIf(want("10"))("challenge 10 — pull request", async () => {
    const results = await verifyPullRequest({ path: WORK });
    show("challenge 10", results);
    expect(passed(results)).toBe(true);
  });

  it.runIf(want("11"))("challenge 11 — merge, tada", async () => {
    const results = await verifyMergeTada({ path: WORK });
    show("challenge 11", results);
    expect(passed(results)).toBe(true);
  });
});
