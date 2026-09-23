import { useSyncExternalStore } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

/**
 * Self-update, fed by GitHub Releases.
 *
 * Modelled on T3 Code's desktop updater (`apps/desktop/src/updates` plus
 * `components/desktopUpdate.logic.ts`): one piece of state, one button whose
 * action is *derived* from that state rather than stored beside it, and a
 * status the button can render without knowing how updating works.
 *
 * The machinery underneath is different because the app is. T3 Code is
 * Electron and drives `electron-updater`, whose API is an event stream that
 * needs a real reducer to tame. Tauri's updater is three calls — check,
 * download, install — so this is a small store with three actions rather than
 * a port of their state machine.
 */

export type UpdateStatus =
  /** Not running inside Tauri, so there is nothing to update. */
  | "unsupported"
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "downloaded"
  | "error";

/** Which stage failed. Decides whether the button offers a retry, and of what. */
export type ErrorContext = "check" | "download" | "install";

export interface UpdateState {
  status: UpdateStatus;
  /** The running version, for the footer readout. */
  currentVersion: string | null;
  availableVersion: string | null;
  /** Release notes, straight from the GitHub Release body. */
  notes: string | null;
  /** 0–100 while downloading, else null. */
  downloadPercent: number | null;
  checkedAt: number | null;
  message: string | null;
  errorContext: ErrorContext | null;
  /** How this copy was installed — see `src-tauri/src/linux_update.rs`. */
  installKind: InstallKind;
}

/**
 * `bundled` means Tauri's own updater applies (Windows, macOS); `appimage`
 * likewise. `rpm`/`deb` are applied by `linux_update.rs` instead, through the
 * distribution's package manager. `other` is an install neither can touch —
 * a binary someone copied into place by hand.
 */
export type InstallKind = "bundled" | "appimage" | "rpm" | "deb" | "other";

/** True when this install updates through a package manager, not Tauri. */
export const isPackaged = (kind: InstallKind) => kind === "rpm" || kind === "deb";

/** What pressing the button does right now. */
export type UpdateAction = "check" | "download" | "install" | "none";

const EMPTY: UpdateState = {
  status: "unsupported",
  currentVersion: null,
  availableVersion: null,
  notes: null,
  downloadPercent: null,
  checkedAt: null,
  message: null,
  errorContext: null,
  installKind: "bundled",
};

// --- derived, and therefore testable without a store -----------------------

/**
 * The button is one control whose meaning changes, not four controls.
 *
 * A failed download still knows which version it was after, so it offers that
 * download again rather than dropping the learner back to "check" and making
 * them rediscover the update. Same for a failed install of an update already
 * on disk — the bytes are still there.
 */
export function updateAction(state: UpdateState): UpdateAction {
  // An install nothing can replace — a loose binary someone copied into
  // place. It can still be told a new version exists; it cannot be updated.
  if (state.installKind === "other" && (state.status === "available" || state.status === "downloaded")) {
    return "none";
  }

  switch (state.status) {
    case "available":
      return "download";
    case "downloaded":
      return "install";
    case "checking":
    case "downloading":
    case "unsupported":
      return "none";
    case "error":
      if (state.errorContext === "download" && state.availableVersion) return "download";
      if (state.errorContext === "install") return "install";
      return "check";
    default:
      return "check";
  }
}

/** True while the app is mid-flight and the button must not be pressed again. */
export function isUpdateBusy(state: UpdateState): boolean {
  return state.status === "checking" || state.status === "downloading";
}

export function updateLabel(state: UpdateState): string {
  if (state.installKind === "other" && state.availableVersion && state.status === "available") {
    return `Version ${state.availableVersion} is available. This copy was not installed by a package, so update it the way you put it here.`;
  }

  switch (state.status) {
    case "unsupported":
      return "Updates are not available in this build.";
    case "checking":
      return "Checking for updates…";
    case "available":
      return `Version ${state.availableVersion} is available. Click to download.`;
    case "downloading":
      return state.downloadPercent === null
        ? "Downloading update…"
        : `Downloading update — ${Math.floor(state.downloadPercent)}%`;
    case "downloaded":
      return `Version ${state.availableVersion} is ready. Click to restart and install.`;
    case "error":
      switch (state.errorContext) {
        case "download":
          return `Download failed. Click to try again.`;
        case "install":
          return `Install failed. Click to try again.`;
        default:
          return state.message ?? "Could not check for updates.";
      }
    default:
      return state.checkedAt === null ? "Check for updates" : "Up to date. Click to check again.";
  }
}

export function installConfirmation(state: UpdateState): string {
  const version = state.availableVersion ? ` ${state.availableVersion}` : "";
  return (
    `Install version${version} and restart Git Gud?\n\n` +
    "Your completed challenges are saved to disk and will still be here afterwards."
  );
}

// --- store -----------------------------------------------------------------

let cache: UpdateState = EMPTY;
const listeners = new Set<() => void>();

/**
 * The pending update, held between `download()` and `install()`.
 *
 * It lives outside the state object because it is a live handle, not data: it
 * cannot be serialised, compared, or rendered, and putting it in the snapshot
 * would break `useSyncExternalStore`'s identity check.
 */
let pending: Update | null = null;

function set(next: Partial<UpdateState>) {
  cache = { ...cache, ...next };
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => EMPTY,
  );
}

/** Tauri is absent in a plain browser, and in tests. */
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const asMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Read the running version and take one look for an update.
 *
 * Deliberately quiet: a failure here leaves the button sitting on "check"
 * rather than lighting up an error the learner did not ask for and cannot act
 * on. Nobody opened this app to be told about its release feed.
 */
export async function initUpdates(): Promise<void> {
  if (!inTauri()) return;

  try {
    set({ status: "idle", currentVersion: await getVersion() });
  } catch {
    set({ status: "idle" });
  }

  // How an update gets applied is a property of how this copy was installed,
  // so it is read once rather than per check.
  try {
    set({ installKind: await invoke<InstallKind>("install_kind") });
  } catch {
    // Older shell, or the command is missing: assume Tauri's own updater,
    // which is what every build before .deb/.rpm shipped already did.
  }

  await checkForUpdate({ silent: true });
}

export async function checkForUpdate({ silent = false } = {}): Promise<void> {
  if (!inTauri() || isUpdateBusy(cache)) return;

  set({ status: "checking", message: null, errorContext: null });

  try {
    const update = await check();
    pending = update;

    if (!update) {
      set({
        status: "idle",
        availableVersion: null,
        notes: null,
        checkedAt: Date.now(),
      });
      return;
    }

    set({
      status: "available",
      availableVersion: update.version,
      notes: update.body ?? null,
      checkedAt: Date.now(),
    });
  } catch (e) {
    // A background check that cannot reach GitHub is not news, so it does not
    // raise an error. It must not leave `checkedAt` set either: that is what
    // turns the button into a tick reading "Up to date", and a failed check
    // knows nothing about whether the app is up to date. Saying nothing is
    // the honest outcome, so it falls back to the unchecked state.
    //
    // An explicit press is different. Somebody is waiting for an answer, so
    // they get the real one.
    set(
      silent
        ? { status: "idle" }
        : {
            status: "error",
            message: asMessage(e),
            errorContext: "check",
            checkedAt: Date.now(),
          },
    );
  }
}

export async function downloadUpdate(): Promise<void> {
  if (!pending || isUpdateBusy(cache)) return;

  set({ status: "downloading", downloadPercent: 0, message: null, errorContext: null });

  if (isPackaged(cache.installKind)) {
    await downloadPackage();
    return;
  }

  let total = 0;
  let received = 0;

  try {
    await pending.download((event) => {
      switch (event.event) {
        case "Started":
          total = event.data.contentLength ?? 0;
          set({ downloadPercent: 0 });
          break;
        case "Progress":
          received += event.data.chunkLength;
          // A server that sends no Content-Length leaves nothing to divide by;
          // the button falls back to an indeterminate spinner rather than
          // rendering a bogus percentage.
          set({ downloadPercent: total > 0 ? (received / total) * 100 : null });
          break;
        case "Finished":
          set({ downloadPercent: 100 });
          break;
      }
    });

    set({ status: "downloaded", downloadPercent: 100 });
  } catch (e) {
    set({
      status: "error",
      message: asMessage(e),
      errorContext: "download",
      downloadPercent: null,
    });
  }
}

/**
 * Install and restart. Does not return on success — the process is replaced.
 *
 * The caller is expected to have confirmed with the user first; this is the
 * one action in the app that closes the window out from under them.
 */
export async function installUpdate(): Promise<void> {
  if (!pending && !packagePath) return;

  try {
    if (isPackaged(cache.installKind)) {
      if (!packagePath) throw new Error("the downloaded package is no longer available");
      await invoke("install_package", { path: packagePath, kind: cache.installKind });
    } else {
      await pending!.install();
    }
    await relaunch();
  } catch (e) {
    set({ status: "error", message: asMessage(e), errorContext: "install" });
  }
}

// --- the .deb/.rpm path ----------------------------------------------------

/**
 * Where the verified package landed, between the download press and the
 * install press. Mirrors what `pending` is for a Tauri-managed update.
 */
let packagePath: string | null = null;

/**
 * The release asset for this machine's package format.
 *
 * `latest.json` only ever names the AppImage for Linux, because that is the
 * only Linux artifact Tauri's updater can apply — so the package URL is built
 * from the same naming contract `install.sh` and `assetNamePattern` already
 * share. docs/UPDATES.md lists every place that contract is written down.
 */
function packageUrl(version: string, kind: InstallKind, arch: string): string {
  return `https://github.com/JyotirmoyDas05/GitGud/releases/download/v${version}/Git-Gud_${version}_${arch}.${kind}`;
}

async function downloadPackage(): Promise<void> {
  const version = cache.availableVersion;
  if (!version) return;

  const stop = await listen<{ received: number; total: number }>(
    "linux-update://progress",
    ({ payload }) => {
      // No Content-Length means nothing honest to divide by, so the ring
      // spins instead of showing an invented percentage — same rule as the
      // Tauri-managed path above.
      set({
        downloadPercent: payload.total > 0 ? (payload.received / payload.total) * 100 : null,
      });
    },
  );

  try {
    const arch = (await invoke<string>("update_arch").catch(() => "x86_64")) || "x86_64";
    const url = packageUrl(version, cache.installKind, arch);

    // Rust fetches the package *and* its `.sig`. The signature used to be a
    // `fetch()` from here, and GitHub serves release assets with no CORS
    // header, so WebKitGTK refused it with "Load failed" and every .rpm/.deb
    // update failed before it started. Nothing on this path may go through the
    // web view's network stack.
    packagePath = await invoke<string>("download_package", { url });
    set({ status: "downloaded", downloadPercent: 100 });
  } catch (e) {
    packagePath = null;
    set({
      status: "error",
      message: asMessage(e),
      errorContext: "download",
      downloadPercent: null,
    });
  } finally {
    stop();
  }
}

/** Test seam: the store is module state, so tests need a way back to zero. */
export function resetUpdateStateForTests(next: Partial<UpdateState> = {}) {
  cache = { ...EMPTY, ...next };
  pending = null;
  for (const l of listeners) l();
}
