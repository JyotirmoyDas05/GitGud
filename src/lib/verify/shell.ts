import { homeDir, listDir, shellHistory, type DirEntry, type HistoryFile } from "~/lib/shell";
import { fail, note, pass, type CheckResult, type Verifier } from "./types";

/**
 * The five terminal and navigation challenges.
 *
 * The Git verifiers have it easy: `git status` reports the result of the work.
 * `pwd`, `ls` and `cd` report nothing and change nothing, so checking them
 * needs a different substrate — the shell's own history file. That is what
 * keeps these real challenges rather than "mark as read" buttons, and it also
 * closes the obvious hole in the two filesystem ones, where a learner could
 * make the folders in Explorer and never open a terminal.
 *
 * Reading history is disclosed in the challenge text, and every result that
 * depends on it names the file it came from.
 */

// --- reading a command line ------------------------------------------------

export interface Invocation {
  name: string;
  args: string[];
}

/**
 * The commands in one history line.
 *
 * A line is often several: `mkdir notes && cd notes` has to count as both a
 * `mkdir` and a `cd`, or a learner who chains — which the challenges
 * themselves encourage by the end — fails a check they actually completed.
 */
export function invocations(line: string): Invocation[] {
  const parts: Invocation[] = [];

  for (const segment of line.split(/\s*(?:&&|\|\||[;|])\s*/)) {
    const words = segment.match(/"[^"]*"|'[^']*'|\S+/g);
    if (!words || words.length === 0) continue;

    // `VAR=x cmd` and `sudo cmd` both put the real command later in the line.
    let at = 0;
    while (at < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[at]) || words[at] === "sudo")) {
      at++;
    }
    if (at >= words.length) continue;

    parts.push({ name: words[at], args: words.slice(at + 1) });
  }

  return parts;
}

/** Every command in every history file, most recent last. */
function allInvocations(files: HistoryFile[]): Invocation[] {
  return files.flatMap((file) => file.commands.flatMap(invocations));
}

/** Did any recorded command named `name` satisfy `where`? */
function ran(
  files: HistoryFile[],
  name: string,
  where: (inv: Invocation) => boolean = () => true,
): boolean {
  return allInvocations(files).some((inv) => inv.name === name && where(inv));
}

// --- history plumbing ------------------------------------------------------

/**
 * Bash, zsh and fish only write history when the shell exits, so a learner who
 * leaves the terminal open sees every check fail while having done the work.
 * That is the single most likely way these challenges waste someone's time, so
 * the fix is spelled out in the failure itself rather than left to a tip box.
 */
function flushHint(files: HistoryFile[]): string {
  const deferred = files.some((f) => f.shell !== "powershell");
  return deferred
    ? " If your terminal is still open, your shell has not saved its history yet — type `exit` to close it, open a new one, then press Check again."
    : "";
}

const NO_HISTORY = fail(
  "Could not find a shell history file. Git Gud reads Bash (~/.bash_history), " +
    "Zsh, Fish and PowerShell history. If you are on Windows using cmd.exe, switch to " +
    "Git Bash or PowerShell — cmd.exe keeps no history. Otherwise, run a command, close " +
    "the terminal so your shell saves its history, and check again.",
);

/** One line naming what was read, so nothing about this is hidden. */
function source(files: HistoryFile[]): CheckResult {
  const names = files.map((f) => `${f.shell} (${f.path})`).join(", ");
  return pass(`Read your shell history — ${names}`);
}

/** `ran`, wrapped as a result with the flush hint on failure. */
function didRun(
  files: HistoryFile[],
  label: string,
  name: string,
  where?: (inv: Invocation) => boolean,
): CheckResult {
  return ran(files, name, where)
    ? pass(`You ran ${label}.`)
    : fail(`No ${label} in your recent history.${flushHint(files)}`);
}

// --- paths -----------------------------------------------------------------

const isAbsolute = (arg: string) => /^([/~]|[A-Za-z]:)/.test(arg);

/** Compare two paths for "same place", across separators and Windows casing. */
function samePath(a: string, b: string): boolean {
  const normalize = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return normalize(a) === normalize(b);
}

/** Entries of `path`, or `null` when it does not exist. */
async function entriesOf(path: string): Promise<DirEntry[] | null> {
  try {
    return await listDir(path);
  } catch {
    return null;
  }
}

const hasFile = (entries: DirEntry[], name: string) =>
  entries.some((e) => !e.isDir && e.name.toLowerCase() === name.toLowerCase());

const hasDir = (entries: DirEntry[], name: string) =>
  entries.some((e) => e.isDir && e.name.toLowerCase() === name.toLowerCase());

/** Last segment of a path, separator-agnostic. */
function baseName(path: string): string {
  return path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ?? "";
}

// --- 1. Meet the Terminal --------------------------------------------------

/**
 * Proof that a terminal was opened and typed into. `whoami` and `date` are the
 * two safest commands on every platform — both exist in Git Bash, macOS, Linux
 * and PowerShell, and neither can damage anything if mistyped.
 */
export const verifyMeetTheTerminal: Verifier = async () => {
  const files = await shellHistory();
  if (files.length === 0) return [NO_HISTORY];

  return [
    source(files),
    didRun(files, "`whoami`", "whoami"),
    didRun(files, "`date`", "date"),
    // Clicking the window's close button teaches the same thing and leaves no
    // trace, so this can encourage `exit` but must never fail anyone for it.
    note("Closed the terminal with `exit`", ran(files, "exit")),
  ];
};

// --- 2. Command Performance ------------------------------------------------

/**
 * Command, arguments, options — checked as three separate shapes rather than
 * three specific commands, because the lesson is the grammar, not the verbs.
 */
export const verifyCommandPerformance: Verifier = async () => {
  const files = await shellHistory();
  if (files.length === 0) return [NO_HISTORY];

  const usedHelp = allInvocations(files).some((inv) =>
    inv.args.some((a) => a === "--help" || a === "-h" || a === "/?"),
  );

  return [
    source(files),
    didRun(
      files,
      "`echo` with something to say",
      "echo",
      (inv) => inv.args.length > 0,
    ),
    didRun(
      files,
      "`ls` with an option (like `ls -a` or `ls -l`)",
      "ls",
      (inv) => inv.args.some((a) => /^-[A-Za-z]/.test(a)),
    ),
    usedHelp
      ? pass("You asked a command to explain itself with `--help`.")
      : fail(`No \`--help\` in your recent history.${flushHint(files)}`),
    note("Tidied up with `clear`", ran(files, "clear") || ran(files, "cls")),
  ];
};

// --- 3. You Are Here -------------------------------------------------------

/**
 * `pwd` and `ls` leave no trace, so history carries them. The third check is
 * the interesting one: the learner points the folder picker at what they
 * believe is their home directory, and the app compares it against the home
 * directory it resolves independently. That turns "home directory and `~`"
 * from a definition into something with a right answer.
 */
export const verifyYouAreHere: Verifier = async (ctx) => {
  const files = await shellHistory();
  const results: CheckResult[] = [];

  if (files.length === 0) {
    results.push(NO_HISTORY);
  } else {
    results.push(
      source(files),
      didRun(files, "`pwd`", "pwd"),
      didRun(files, "`ls`", "ls"),
    );
  }

  const home = await homeDir();
  if (!home) {
    results.push(note("Could not work out your home directory on this system", false));
    return results;
  }

  if (!ctx.path) {
    results.push(fail(`Pick a folder above — the one \`~\` stands for on your computer.`));
  } else if (samePath(ctx.path, home)) {
    results.push(
      pass(`You picked ${ctx.path} — that is your home directory, the one \`~\` is short for.`),
    );
  } else {
    results.push(
      fail(
        `You picked ${ctx.path}, which is not your home directory. ` +
          `Open a terminal, run \`pwd\` before going anywhere, and pick the folder it prints.`,
      ),
    );
  }

  return results;
};

// --- 4. There and Back Again -----------------------------------------------

/**
 * Four shapes of `cd`, one per idea in the lesson: down into a child by a
 * relative name, up with `..`, home with `~`, and anywhere at all with an
 * absolute path. Checking the shapes rather than specific destinations means
 * the challenge works from whatever folders the learner actually has.
 */
export const verifyThereAndBackAgain: Verifier = async () => {
  const files = await shellHistory();
  if (files.length === 0) return [NO_HISTORY];

  const cdArg = (where: (arg: string) => boolean) => (inv: Invocation) =>
    inv.args.filter((a) => !a.startsWith("-")).some(where);

  return [
    source(files),
    didRun(
      files,
      "`cd` into a folder by its name (a relative path)",
      "cd",
      cdArg((a) => !isAbsolute(a) && !a.startsWith("..")),
    ),
    didRun(files, "`cd ..` to go up to the parent folder", "cd", cdArg((a) => a.startsWith(".."))),
    didRun(
      files,
      "`cd ~` to jump home",
      "cd",
      (inv) => inv.args.length === 0 || inv.args.includes("~"),
    ),
    didRun(
      files,
      "`cd` with an absolute path",
      "cd",
      cdArg((a) => isAbsolute(a) && a !== "~"),
    ),
    note("Checked where you landed with `pwd`", ran(files, "pwd")),
  ];
};

// --- 5. Make It So ---------------------------------------------------------

/** The tree challenge 5 asks for, relative to the folder the learner picks. */
export const PRACTICE_DIR = "gitgud-practice";

export const verifyMakeItSo: Verifier = async (ctx) => {
  const results: CheckResult[] = [];

  if (!ctx.path) {
    return [fail(`Pick your \`${PRACTICE_DIR}\` folder above, then check again.`)];
  }

  results.push(
    samePath(baseName(ctx.path), PRACTICE_DIR)
      ? pass(`Found \`${PRACTICE_DIR}\`.`)
      : fail(
          `You picked \`${baseName(ctx.path)}\`, not \`${PRACTICE_DIR}\`. ` +
            `Pick the folder you made with \`mkdir ${PRACTICE_DIR}\`.`,
        ),
  );

  const root = await entriesOf(ctx.path);
  if (!root) {
    results.push(fail(`Could not read ${ctx.path}. Has it been moved or deleted?`));
    return results;
  }

  results.push(
    hasFile(root, "hello.txt")
      ? pass("`hello.txt` is there.")
      : fail("No `hello.txt` inside. Run `touch hello.txt` in that folder."),
  );

  // Checked level by level so the failure names the step that is missing,
  // rather than reporting "notes/day-one.txt" for someone who never made
  // `notes` at all.
  const notes = hasDir(root, "notes") ? await entriesOf(`${ctx.path}/notes`) : null;

  if (!notes) {
    results.push(fail("No `notes` folder inside. Run `mkdir notes`."));
  } else {
    results.push(
      hasFile(notes, "day-one.txt")
        ? pass("`notes/day-one.txt` is there.")
        : fail("`notes` is there but empty. Run `touch notes/day-one.txt`."),
    );

    const archive = hasDir(notes, "archive") ? await entriesOf(`${ctx.path}/notes/archive`) : null;
    results.push(
      archive && hasDir(archive, "2026")
        ? pass("`notes/archive/2026` is there — `mkdir -p` built all three at once.")
        : fail("No `notes/archive/2026`. Run `mkdir -p notes/archive/2026`."),
    );
  }

  // Without this, making the folders in Explorer would pass. The whole point
  // of the module is that the terminal did it.
  const files = await shellHistory();
  if (files.length === 0) {
    results.push(NO_HISTORY);
  } else {
    results.push(
      source(files),
      didRun(files, "`mkdir` in your terminal", "mkdir"),
      didRun(files, "`touch` in your terminal", "touch"),
    );
  }

  return results;
};
