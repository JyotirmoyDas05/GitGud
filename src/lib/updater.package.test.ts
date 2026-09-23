import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The `.rpm`/`.deb` update path must never touch the web view's network stack.
 *
 * It used to `fetch()` the package's `.sig` from GitHub. Release assets carry
 * no `Access-Control-Allow-Origin` header, so WebKitGTK refused the response
 * with "Load failed", and no package install could ever update itself — on
 * every distribution, every time. Rust now fetches the signature alongside
 * the package, and this pins that: no `fetch`, and the command gets only the
 * URL.
 */

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
vi.mock("@tauri-apps/api/event", () => ({ listen: async () => () => {} }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: async () => "0.2.2" }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: async () => {} }));
vi.mock("@tauri-apps/plugin-updater", () => ({
  check: async () => ({ version: "0.2.3", body: "" }),
}));

const { checkForUpdate, downloadUpdate, resetUpdateStateForTests } = await import("./updater");

describe("package update download", () => {
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
    vi.stubGlobal("fetch", fetchSpy);
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "update_arch") return "x86_64";
      if (cmd === "download_package") return "/tmp/git-gud-update/pkg.rpm";
      return undefined;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    invoke.mockReset();
    fetchSpy.mockReset();
  });

  for (const kind of ["rpm", "deb"] as const) {
    it(`downloads a .${kind} without a web-view fetch`, async () => {
      resetUpdateStateForTests({ status: "idle", installKind: kind });
      await checkForUpdate();
      await downloadUpdate();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(invoke).toHaveBeenCalledWith("download_package", {
        url: `https://github.com/JyotirmoyDas05/GitGud/releases/download/v0.2.3/Git-Gud_0.2.3_x86_64.${kind}`,
      });
    });
  }
});
