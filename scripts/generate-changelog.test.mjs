import { describe, expect, it } from "vitest";

import { bulletsIn } from "./generate-changelog.mjs";

/**
 * `bulletsIn` reads a commit body: bullet lines start an entry, and a
 * wrapped continuation line (this repo hard-wraps commit bodies at ~72
 * columns) is folded onto the bullet above it.
 *
 * The bug this guards: the function's own comment said "a blank line ends a
 * bullet without starting a new one", but the code never checked for one —
 * it appended *any* non-blank, non-bullet line to the last bullet, so a
 * stray paragraph anywhere after a bullet, no matter how many blank lines
 * separated them, was silently glued onto its end. This surfaced in a real
 * release commit, where an explanatory paragraph placed after a `### Fixed`
 * list ended up appended to that list's last bullet in the generated notes.
 */
describe("bulletsIn", () => {
  it("reads a single bullet", () => {
    expect(bulletsIn("- one thing")).toEqual(["one thing"]);
  });

  it("folds a wrapped continuation line onto the bullet above it", () => {
    const body = "- one thing that wraps\n  onto a second line";
    expect(bulletsIn(body)).toEqual(["one thing that wraps onto a second line"]);
  });

  it("starts a new bullet at the next dash", () => {
    const body = "- first\n- second";
    expect(bulletsIn(body)).toEqual(["first", "second"]);
  });

  it("drops a paragraph that follows a blank line instead of gluing it on", () => {
    const body = "- first\n\nAn explanatory paragraph that is not a bullet.";
    expect(bulletsIn(body)).toEqual(["first"]);
  });

  it("still folds a continuation that appears before any blank line", () => {
    const body = "- first\n  still first\n\nAn aside, dropped.\n\n- second";
    expect(bulletsIn(body)).toEqual(["first still first", "second"]);
  });

  it("returns nothing for prose with no bullets at all", () => {
    expect(bulletsIn("Just a sentence, no dash.")).toEqual([]);
  });
});
