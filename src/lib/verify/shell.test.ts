import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { setShellProbe, type DirEntry, type HistoryFile } from "~/lib/shell";
import {
  invocations,
  verifyCommandPerformance,
  verifyMakeItSo,
  verifyMeetTheTerminal,
  verifyThereAndBackAgain,
  verifyYouAreHere,
} from "./shell";
import { passed } from "./types";

/**
 * Real temporary folders for the filesystem checks, a stub history for the
 * rest. History has no equivalent of a temporary Git repo — you cannot make a
 * real shell write one on demand from a test — but the parsing that turns a
 * file into command lines is covered on the Rust side (`shell.rs`), so what
 * is left to test here is the matching, which is where the subtle failures
 * live: `ls` matching inside `mkdir notes && ls`, `cd ~` versus `cd`.
 */

const made: string[] = [];

function tempTree(): string {
  const root = mkdtempSync(join(tmpdir(), "gitgud-shell-"));
  made.push(root);
  return root;
}

function stub(commands: string[], shell = "bash") {
  const history: HistoryFile[] = commands.length
    ? [{ shell, path: `/home/test/.${shell}_history`, commands }]
    : [];

  setShellProbe({
    async listDir(path: string): Promise<DirEntry[]> {
      const { readdirSync } = await import("node:fs");
      return readdirSync(path, { withFileTypes: true }).map((e) => ({
        name: e.name,
        isDir: e.isDirectory(),
      }));
    },
    history: async () => history,
    homeDir: async () => "/home/test",
  });
}

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("invocations", () => {
  it("finds every command on a chained line", () => {
    // A learner told to run three commands often chains them. Reading only
    // the first word of the line would fail them for work they did.
    expect(invocations("mkdir notes && cd notes ; ls -a").map((i) => i.name)).toEqual([
      "mkdir",
      "cd",
      "ls",
    ]);
  });

  it("looks past sudo and environment prefixes", () => {
    expect(invocations("LANG=C sudo ls -l")).toEqual([{ name: "ls", args: ["-l"] }]);
  });

  it("keeps a quoted argument in one piece", () => {
    expect(invocations('echo "hello there"')).toEqual([
      { name: "echo", args: ['"hello there"'] },
    ]);
  });
});

describe("meet the terminal", () => {
  it("passes once whoami and date have been run", async () => {
    stub(["whoami", "date", "exit"]);
    expect(passed(await verifyMeetTheTerminal({}))).toBe(true);
  });

  it("does not fail anyone for closing the window instead of typing exit", async () => {
    stub(["whoami", "date"]);
    expect(passed(await verifyMeetTheTerminal({}))).toBe(true);
  });

  it("explains itself when no history file exists at all", async () => {
    stub([]);
    const results = await verifyMeetTheTerminal({});
    expect(passed(results)).toBe(false);
    expect(results[0].message).toMatch(/cmd\.exe/);
  });

  it("tells a bash user their shell has not saved history yet", async () => {
    // The most likely way this module wastes someone's time: they did the
    // work, the terminal is still open, nothing is on disk.
    stub(["whoami"]);
    const results = await verifyMeetTheTerminal({});
    expect(results.find((r) => !r.passed)?.message).toMatch(/exit/);
  });

  it("does not offer the exit hint to PowerShell, which saves immediately", async () => {
    stub(["whoami"], "powershell");
    const results = await verifyMeetTheTerminal({});
    expect(results.find((r) => !r.passed && !r.optional)?.message).not.toMatch(/exit/);
  });
});

describe("command performance", () => {
  it("passes on echo with an argument, ls with an option, and --help", async () => {
    stub(["echo hello", "ls -a", "mkdir --help", "clear"]);
    expect(passed(await verifyCommandPerformance({}))).toBe(true);
  });

  it("does not accept a bare echo as a command with arguments", async () => {
    stub(["echo", "ls -a", "mkdir --help"]);
    expect(passed(await verifyCommandPerformance({}))).toBe(false);
  });

  it("does not accept a bare ls as a command with options", async () => {
    stub(["echo hi", "ls", "mkdir --help"]);
    expect(passed(await verifyCommandPerformance({}))).toBe(false);
  });

  it("accepts --help on any command, not one particular one", async () => {
    stub(["echo hi", "ls -l", "git --help"]);
    expect(passed(await verifyCommandPerformance({}))).toBe(true);
  });
});

describe("you are here", () => {
  it("passes when pwd and ls were run and the home folder was picked", async () => {
    stub(["pwd", "ls"]);
    expect(passed(await verifyYouAreHere({ path: "/home/test" }))).toBe(true);
  });

  it("accepts the same home path written with the other separator", async () => {
    // Windows hands back `C:\Users\x` from the picker while the resolver may
    // report `C:/Users/x`. Same folder; failing on the slash would be absurd.
    setShellProbe({
      listDir: async () => [],
      history: async () => [{ shell: "bash", path: "h", commands: ["pwd", "ls"] }],
      homeDir: async () => "C:/Users/test",
    });
    expect(passed(await verifyYouAreHere({ path: "C:\\Users\\test\\" }))).toBe(true);
  });

  it("fails on a folder that is not home", async () => {
    stub(["pwd", "ls"]);
    const results = await verifyYouAreHere({ path: "/home/test/Documents" });
    expect(passed(results)).toBe(false);
    expect(results[results.length - 1].message).toMatch(/not your home directory/);
  });
});

describe("there and back again", () => {
  it("passes on all four shapes of cd", async () => {
    stub(["cd Documents", "cd ..", "cd ~", "cd /usr/local", "pwd"]);
    expect(passed(await verifyThereAndBackAgain({}))).toBe(true);
  });

  it("counts a bare cd as going home", async () => {
    stub(["cd Documents", "cd ..", "cd", "cd /usr/local"]);
    expect(passed(await verifyThereAndBackAgain({}))).toBe(true);
  });

  it("does not let an absolute path stand in for a relative one", async () => {
    // Four checks, four ideas. If `cd /usr/local` satisfied "relative path"
    // the challenge would pass without the learner ever meeting the concept.
    stub(["cd /usr/local", "cd ..", "cd ~", "cd /etc"]);
    expect(passed(await verifyThereAndBackAgain({}))).toBe(false);
  });

  it("accepts a Windows drive path as absolute", async () => {
    stub(["cd Documents", "cd ..", "cd ~", "cd C:/Users"]);
    expect(passed(await verifyThereAndBackAgain({}))).toBe(true);
  });

  it("accepts ~/Documents as absolute, since ~ expands to one", async () => {
    stub(["cd Documents", "cd ..", "cd ~", "cd ~/Documents"]);
    expect(passed(await verifyThereAndBackAgain({}))).toBe(true);
  });
});

describe("make it so", () => {
  function practiceTree(): string {
    const root = tempTree();
    const practice = join(root, "gitgud-practice");
    mkdirSync(join(practice, "notes", "archive", "2026"), { recursive: true });
    writeFileSync(join(practice, "hello.txt"), "");
    writeFileSync(join(practice, "notes", "day-one.txt"), "");
    return practice;
  }

  it("passes on the full tree built from the terminal", async () => {
    const practice = practiceTree();
    stub(["mkdir gitgud-practice", "touch hello.txt", "mkdir -p notes/archive/2026"]);
    expect(passed(await verifyMakeItSo({ path: practice }))).toBe(true);
  });

  it("fails when the folders exist but no terminal was ever used", async () => {
    // Anyone can right-click New Folder. The module is about the terminal.
    const practice = practiceTree();
    stub(["whoami", "date"]);
    const results = await verifyMakeItSo({ path: practice });
    expect(passed(results)).toBe(false);
    expect(results.some((r) => !r.passed && /mkdir/.test(r.message))).toBe(true);
  });

  it("names the missing step rather than the deepest missing path", async () => {
    const root = tempTree();
    const practice = join(root, "gitgud-practice");
    mkdirSync(practice, { recursive: true });
    writeFileSync(join(practice, "hello.txt"), "");
    stub(["mkdir gitgud-practice", "touch hello.txt"]);

    const results = await verifyMakeItSo({ path: practice });
    expect(results.some((r) => !r.passed && /mkdir notes/.test(r.message))).toBe(true);
    expect(results.some((r) => r.message.includes("day-one.txt"))).toBe(false);
  });

  it("rejects the wrong folder by name before reading it", async () => {
    const root = tempTree();
    mkdirSync(join(root, "something-else"));
    stub(["mkdir gitgud-practice", "touch hello.txt"]);

    const results = await verifyMakeItSo({ path: join(root, "something-else") });
    expect(passed(results)).toBe(false);
    expect(results[0].message).toMatch(/not `gitgud-practice`/);
  });

  it("asks for a folder instead of throwing when none is picked", async () => {
    stub(["mkdir gitgud-practice"]);
    const results = await verifyMakeItSo({});
    expect(passed(results)).toBe(false);
    expect(results).toHaveLength(1);
  });
});
