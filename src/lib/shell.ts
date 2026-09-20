import { invoke } from "@tauri-apps/api/core";

/**
 * The frontend side of `src-tauri/src/shell.rs`.
 *
 * Mirrors `lib/git.ts` deliberately, including the swappable backend: the
 * terminal verifiers are the ones most likely to rot silently (history
 * formats differ per shell, and nobody notices a check that always passes),
 * so they have to be runnable in Node against real temporary folders.
 */

export interface DirEntry {
  name: string;
  isDir: boolean;
}

export interface HistoryFile {
  /** `bash`, `zsh`, `fish` or `powershell`. */
  shell: string;
  /** Named in the verify results, so the learner knows what was read. */
  path: string;
  /** Most recent last, capped at 300 by the Rust side. */
  commands: string[];
}

/** Wire shape — Rust serializes `is_dir`. */
interface WireEntry {
  name: string;
  is_dir: boolean;
}

export interface ShellProbe {
  listDir(path: string): Promise<DirEntry[]>;
  history(): Promise<HistoryFile[]>;
  homeDir(): Promise<string | null>;
}

const viaTauri: ShellProbe = {
  async listDir(path) {
    const entries = await invoke<WireEntry[]>("list_dir", { path });
    return entries.map((e) => ({ name: e.name, isDir: e.is_dir }));
  },
  history: () => invoke<HistoryFile[]>("shell_history"),
  homeDir: () => invoke<string | null>("home_dir"),
};

let probe: ShellProbe = viaTauri;

/** Swap the backend. Exists for the tests, the same as `setGitRunner`. */
export function setShellProbe(next: ShellProbe) {
  probe = next;
}

/** Immediate children of a folder. Rejects when the folder does not exist. */
export function listDir(path: string): Promise<DirEntry[]> {
  return probe.listDir(path);
}

/** Recent commands from every shell history file we can find. */
export function shellHistory(): Promise<HistoryFile[]> {
  return probe.history();
}

/** The learner's home directory — what `~` is short for. */
export function homeDir(): Promise<string | null> {
  return probe.homeDir();
}
