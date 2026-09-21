import { describe, expect, it } from "vitest";

import { setShellProbe, type DirEntry, type HistoryFile } from "~/lib/shell";
import { verifyCommandPerformance, verifyMeetTheTerminal } from "./shell";
import { fail, note, pass, toneOf } from "./types";

/**
 * The optional checks — `exit` in challenge 1, `clear` in challenge 2 — were
 * reported as never running. They were running: the verifiers detected both
 * correctly and set `passed: true`. The list drew every optional result as the
 * same hollow circle, so a satisfied one was indistinguishable from one that
 * had been skipped.
 *
 * Two halves, so a regression in either is caught: that the commands are still
 * found, and that a found one reads differently from a missing one.
 */

function stub(commands: string[], shell = "bash") {
  const history: HistoryFile[] = [{ commands, path: `/home/test/.${shell}_history`, shell }];
  setShellProbe({
    async history() {
      return history;
    },
    async homeDir() {
      return "/home/test";
    },
    async listDir(): Promise<DirEntry[]> {
      return [];
    },
  });
}

describe("optional checks are distinguishable once satisfied", () => {
  it("separates all four states", () => {
    expect(toneOf(pass("x"))).toBe("done");
    expect(toneOf(fail("x"))).toBe("failed");
    expect(toneOf(note("x", true))).toBe("optional-done");
    expect(toneOf(note("x", false))).toBe("optional-todo");
  });

  it("never reports a satisfied optional check the same way as a skipped one", () => {
    expect(toneOf(note("x", true))).not.toBe(toneOf(note("x", false)));
  });
});

describe("the optional terminal commands are detected", () => {
  it("finds `exit` in challenge 1, and reports it missing when it is", async () => {
    stub(["whoami", "date", "exit"]);
    const ran = await verifyMeetTheTerminal({});
    expect(toneOf(ran.find((r) => r.message.includes("exit"))!)).toBe("optional-done");

    stub(["whoami", "date"]);
    const skipped = await verifyMeetTheTerminal({});
    expect(toneOf(skipped.find((r) => r.message.includes("exit"))!)).toBe("optional-todo");
  });

  it("finds `clear` in challenge 2, and `cls` for PowerShell", async () => {
    stub(["echo hi", "ls -a", "ls --help", "clear"]);
    const bash = await verifyCommandPerformance({});
    expect(toneOf(bash.find((r) => r.message.includes("clear"))!)).toBe("optional-done");

    stub(["echo hi", "ls -a", "ls --help", "cls"], "powershell");
    const ps = await verifyCommandPerformance({});
    expect(toneOf(ps.find((r) => r.message.includes("clear"))!)).toBe("optional-done");
  });

  it("still finds them when chained onto another command", async () => {
    stub(["whoami", "date && exit"]);
    const results = await verifyMeetTheTerminal({});
    expect(toneOf(results.find((r) => r.message.includes("exit"))!)).toBe("optional-done");
  });
});
