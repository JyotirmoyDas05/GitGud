import { describe, expect, it } from "vitest";

import {
  installConfirmation,
  isUpdateBusy,
  updateAction,
  updateLabel,
  type UpdateState,
} from "./updater";

/**
 * The button is one control whose meaning is derived from the state, so the
 * derivation is the part worth testing: a wrong answer here offers a learner
 * "restart to install" for an update that was never downloaded, or strands
 * them on "check" after a download failed.
 *
 * Mirrors the coverage T3 Code keeps in `desktopUpdate.logic.test.ts`.
 */

function state(over: Partial<UpdateState> = {}): UpdateState {
  return {
    status: "idle",
    currentVersion: "0.1.0",
    availableVersion: null,
    notes: null,
    downloadPercent: null,
    checkedAt: null,
    message: null,
    errorContext: null,
    ...over,
  };
}

describe("updateAction", () => {
  it("offers a check before anything has happened", () => {
    expect(updateAction(state())).toBe("check");
  });

  it("offers a download once one is available", () => {
    expect(updateAction(state({ status: "available", availableVersion: "0.2.0" }))).toBe(
      "download",
    );
  });

  it("offers an install once the bytes are on disk", () => {
    expect(updateAction(state({ status: "downloaded", availableVersion: "0.2.0" }))).toBe(
      "install",
    );
  });

  it("does nothing while a check or a download is in flight", () => {
    expect(updateAction(state({ status: "checking" }))).toBe("none");
    expect(updateAction(state({ status: "downloading" }))).toBe("none");
  });

  it("retries the download rather than the check when a download failed", () => {
    // Dropping back to "check" would make the learner rediscover an update
    // the app already knows about.
    const failed = state({
      status: "error",
      errorContext: "download",
      availableVersion: "0.2.0",
    });
    expect(updateAction(failed)).toBe("download");
  });

  it("retries the install when the install failed, since the download stands", () => {
    const failed = state({
      status: "error",
      errorContext: "install",
      availableVersion: "0.2.0",
    });
    expect(updateAction(failed)).toBe("install");
  });

  it("falls back to a check when a download failed without a known version", () => {
    const failed = state({ status: "error", errorContext: "download", availableVersion: null });
    expect(updateAction(failed)).toBe("check");
  });

  it("offers a check again after a failed check", () => {
    expect(updateAction(state({ status: "error", errorContext: "check" }))).toBe("check");
  });

  it("does nothing outside a packaged app", () => {
    expect(updateAction(state({ status: "unsupported" }))).toBe("none");
  });
});

describe("isUpdateBusy", () => {
  it("is true only while checking or downloading", () => {
    expect(isUpdateBusy(state({ status: "checking" }))).toBe(true);
    expect(isUpdateBusy(state({ status: "downloading" }))).toBe(true);
    expect(isUpdateBusy(state({ status: "downloaded" }))).toBe(false);
    expect(isUpdateBusy(state({ status: "error" }))).toBe(false);
    expect(isUpdateBusy(state())).toBe(false);
  });
});

describe("updateLabel", () => {
  it("distinguishes never-checked from up-to-date", () => {
    expect(updateLabel(state())).toBe("Check for updates");
    expect(updateLabel(state({ checkedAt: 1 }))).toMatch(/Up to date/);
  });

  it("names the version on offer", () => {
    expect(updateLabel(state({ status: "available", availableVersion: "0.2.0" }))).toContain(
      "0.2.0",
    );
  });

  it("reports download progress as a whole number", () => {
    const label = updateLabel(state({ status: "downloading", downloadPercent: 42.7 }));
    expect(label).toContain("42%");
  });

  it("does not claim a percentage when there is no content length", () => {
    const label = updateLabel(state({ status: "downloading", downloadPercent: null }));
    expect(label).not.toMatch(/\d+%/);
  });

  it("surfaces the reason a check failed", () => {
    const label = updateLabel(
      state({ status: "error", errorContext: "check", message: "network unreachable" }),
    );
    expect(label).toBe("network unreachable");
  });
});

describe("a failed silent check", () => {
  it("does not read as up to date", () => {
    // The trap: swallowing the error and stamping `checkedAt` turns the
    // button into a tick that claims a clean result the app never got.
    const afterSilentFailure = state({ status: "idle", checkedAt: null });
    expect(updateLabel(afterSilentFailure)).toBe("Check for updates");
    expect(updateLabel(afterSilentFailure)).not.toMatch(/Up to date/);
  });
});

describe("installConfirmation", () => {
  it("names the version and says progress survives", () => {
    const message = installConfirmation(state({ availableVersion: "0.2.0" }));
    expect(message).toContain("0.2.0");
    // A restart prompt in a progress-tracking app has to answer the obvious
    // question before the learner has to ask it.
    expect(message).toMatch(/saved to disk/);
  });

  it("reads correctly with no version to name", () => {
    expect(installConfirmation(state())).toContain("Install version and restart");
  });
});
