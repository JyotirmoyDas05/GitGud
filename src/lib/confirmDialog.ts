/**
 * A themed confirm, in place of `@tauri-apps/plugin-dialog`'s `confirm()` —
 * which draws the OS's own native message box, breaking out of the app's UI
 * entirely (light background, system font, no relation to the dark shell
 * around it) for the one moment that most needs to look trustworthy: "this
 * is about to restart the app."
 *
 * After T3 Code's `confirmDialog.ts` (MIT, © 2026 T3 Tools Inc.): an
 * imperative `requestConfirmDialog(message)` resolving a `Promise<boolean>`,
 * so a caller reads almost the same as the `confirm()` call it replaces,
 * backed by a module-level store one host renders from.
 *
 * Trimmed from their version: T3 Code supports several independent surfaces
 * (server settings, desktop update, PR actions) that can each open a confirm
 * concurrently, so theirs tracks how many hosts are mounted and queues a
 * second request behind an open one. This app has exactly one call site —
 * the update button's install action — and mounts exactly one host for the
 * lifetime of the window, so there is nothing to register and no queue to
 * manage: a second request while one is open simply replaces it, which never
 * happens in practice since the button that opens it disables itself first.
 */

export type ConfirmDialogVariant = "default" | "destructive";

export type ConfirmDialogState =
  | { readonly status: "idle" }
  | {
      readonly status: "confirming";
      readonly title: string;
      readonly description: string | null;
      readonly variant: ConfirmDialogVariant;
    };

const IDLE: ConfirmDialogState = { status: "idle" };
let state: ConfirmDialogState = IDLE;
let pendingResolve: ((confirmed: boolean) => void) | null = null;
const listeners = new Set<() => void>();

function publish(next: ConfirmDialogState) {
  state = next;
  for (const listener of listeners) listener();
}

export function readConfirmDialogState(): ConfirmDialogState {
  return state;
}

/** Fixed idle snapshot for `useSyncExternalStore`'s server-snapshot slot —
 * matches `useUpdateState`'s convention even though this app never renders
 * on a server, so any future host mount stays consistent with it. */
export function readIdleConfirmDialogState(): ConfirmDialogState {
  return IDLE;
}

export function subscribeConfirmDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Splits a `confirm()`-style message into a title and a description, the
 * same way the OS dialog does with its separate `title` option: the first
 * line ending in "?" is the question, everything else is the reassurance
 * underneath it. Used when a caller passes one combined string rather than
 * an explicit `title`.
 */
function splitMessage(message: string): { title: string; description: string | null } {
  const lines = message.trim().split("\n");
  const questionAt = lines.findIndex((line) => line.trim().endsWith("?"));
  if (questionAt < 0) return { title: message.trim(), description: null };

  const description = lines
    .filter((_, i) => i !== questionAt)
    .join("\n")
    .trim();
  return { title: lines[questionAt]!.trim(), description: description || null };
}

export interface ConfirmDialogOptions {
  /** When the title is already known separately (as a locale string, say),
   * rather than embedded as the first line of `message`. */
  title?: string;
  variant?: ConfirmDialogVariant;
}

/** Opens the dialog and resolves once the learner answers. */
export function requestConfirmDialog(
  message: string,
  options?: ConfirmDialogOptions,
): Promise<boolean> {
  const { title, description } = options?.title
    ? { title: options.title, description: message.trim() || null }
    : splitMessage(message);

  return new Promise((resolve) => {
    pendingResolve = resolve;
    publish({ status: "confirming", title, description, variant: options?.variant ?? "default" });
  });
}

/** Called by the host when the learner picks an answer, or dismisses it. */
export function respondToConfirmDialog(confirmed: boolean): void {
  pendingResolve?.(confirmed);
  pendingResolve = null;
  publish(IDLE);
}
