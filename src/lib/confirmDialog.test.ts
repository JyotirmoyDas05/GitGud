import { afterEach, describe, expect, it } from "vitest";

import { readConfirmDialogState, requestConfirmDialog, respondToConfirmDialog } from "./confirmDialog";

afterEach(() => {
  // Leaving a confirmation open would leak into the next test's first read.
  if (readConfirmDialogState().status === "confirming") respondToConfirmDialog(false);
});

describe("confirmDialog", () => {
  it("splits a question line from the reassurance under it, like installConfirmation's shape", () => {
    void requestConfirmDialog(
      "Install version 0.2.1 and restart Git Gud?\n\nYour completed challenges are saved to disk and will still be here afterwards.",
    );
    expect(readConfirmDialogState()).toEqual({
      status: "confirming",
      title: "Install version 0.2.1 and restart Git Gud?",
      description: "Your completed challenges are saved to disk and will still be here afterwards.",
      variant: "default",
    });
  });

  it("falls back to the whole message as the title when nothing ends in a question mark", () => {
    void requestConfirmDialog("Do the thing");
    expect(readConfirmDialogState()).toEqual({
      status: "confirming",
      title: "Do the thing",
      description: null,
      variant: "default",
    });
  });

  it("uses an explicit title instead of splitting, for callers with a locale title already separate", () => {
    void requestConfirmDialog("Everything on disk for this app goes with it.", {
      title: "Clear all progress?",
      variant: "destructive",
    });
    expect(readConfirmDialogState()).toEqual({
      status: "confirming",
      title: "Clear all progress?",
      description: "Everything on disk for this app goes with it.",
      variant: "destructive",
    });
  });

  it("resolves true or false and returns to idle", async () => {
    const pending = requestConfirmDialog("Sure?");
    expect(readConfirmDialogState().status).toBe("confirming");
    respondToConfirmDialog(true);
    expect(await pending).toBe(true);
    expect(readConfirmDialogState()).toEqual({ status: "idle" });
  });
});
