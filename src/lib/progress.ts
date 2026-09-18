import { useCallback, useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";

import { CHALLENGE_IDS } from "~/challenges";

/**
 * Challenge completion.
 *
 * The file in the app data directory is the source of truth — a webview's
 * localStorage can be cleared by the OS, by a webview update, or by the user
 * clearing browser data, and none of that should cost someone eleven completed
 * challenges. localStorage is still written, but only as a fallback for the
 * first read before the file has been loaded, and as a migration path for
 * anyone whose progress predates this change.
 */

const KEY = "git-gud:progress";

export interface Progress {
  completed: Record<string, boolean>;
  /** Last directory the user picked, reused across challenges. */
  savedDir: string | null;
  /** Optional friend invited in challenge 8. Never gates completion. */
  invitedFriend: string | null;
}

/** Wire shape of the Rust side, which uses snake_case. */
interface StoredProgress {
  completed: Record<string, boolean>;
  saved_dir: string | null;
  invited_friend: string | null;
}

const EMPTY: Progress = { completed: {}, savedDir: null, invitedFriend: null };

function readLocal(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      completed: parsed.completed ?? {},
      savedDir: parsed.savedDir ?? null,
      invitedFriend: parsed.invitedFriend ?? null,
    };
  } catch {
    // A corrupt blob must not brick the app.
    return EMPTY;
  }
}

let cache: Progress = readLocal();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Set when the saved file exists but could not be read. */
let unreadable = false;

/** True when saved progress exists on disk but could not be parsed. */
export function useProgressUnreadable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => unreadable,
    () => false,
  );
}

/**
 * Load from disk and adopt it.
 *
 * `null` means nothing has ever been saved — only then is it safe to adopt
 * whatever localStorage holds, which covers anyone whose progress predates
 * file storage.
 *
 * A thrown error means a file exists and could not be read. That is *not* the
 * same as empty, and the difference matters: treating them alike is how this
 * function briefly managed to overwrite a real saved file with an empty
 * localStorage — the precise data loss the file was introduced to prevent.
 * On that path, keep whatever is in memory and write nothing.
 */
export async function hydrate(): Promise<void> {
  let stored: StoredProgress | null;

  try {
    stored = await invoke<StoredProgress | null>("read_progress");
  } catch (e) {
    if (String(e).includes("could not be read")) {
      unreadable = true;
      emit();
      return;
    }
    // No backend at all (plain browser) — localStorage alone is fine.
    return;
  }

  if (stored === null) {
    // Nothing saved yet. Adopt localStorage if it has anything.
    if (Object.keys(cache.completed).length > 0) await persist(cache);
    return;
  }

  cache = {
    completed: stored.completed ?? {},
    savedDir: stored.saved_dir ?? null,
    invitedFriend: stored.invited_friend ?? null,
  };
  localStorage.setItem(KEY, JSON.stringify(cache));
  emit();
}

async function persist(next: Progress) {
  localStorage.setItem(KEY, JSON.stringify(next));
  try {
    await invoke("write_progress", {
      progress: {
        completed: next.completed,
        saved_dir: next.savedDir,
        invited_friend: next.invitedFriend,
      } satisfies StoredProgress,
    });
  } catch {
    // Keep going: localStorage still holds it, and failing to save must not
    // take the interface down mid-challenge.
  }
}

function write(next: Progress) {
  cache = next;
  emit();
  void persist(next);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useProgress() {
  const progress = useSyncExternalStore(
    subscribe,
    () => cache,
    () => EMPTY,
  );

  const setCompleted = useCallback((id: string, done: boolean) => {
    write({ ...cache, completed: { ...cache.completed, [id]: done } });
  }, []);

  const setSavedDir = useCallback((dir: string | null) => {
    write({ ...cache, savedDir: dir });
  }, []);

  const setInvitedFriend = useCallback((name: string | null) => {
    write({ ...cache, invitedFriend: name });
  }, []);

  const clearAll = useCallback(() => {
    write({ ...cache, completed: {} });
  }, []);

  const completedCount = CHALLENGE_IDS.filter((id) => progress.completed[id]).length;

  return {
    progress,
    completedCount,
    total: CHALLENGE_IDS.length,
    isComplete: (id: string) => Boolean(progress.completed[id]),
    allDone: completedCount === CHALLENGE_IDS.length,
    setCompleted,
    setSavedDir,
    setInvitedFriend,
    clearAll,
  };
}

/**
 * The challenge to resume on: the first incomplete one.
 *
 * git-it pointed "pick up where you left off" at `next_challenge` of the last
 * completed entry, which on a wrapped ring sent a user who finished the last
 * challenge back to the first one.
 */
export function nextIncomplete(completed: Record<string, boolean>): string {
  return CHALLENGE_IDS.find((id) => !completed[id]) ?? CHALLENGE_IDS[0];
}
