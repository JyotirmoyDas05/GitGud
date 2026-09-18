import { describe, expect, it } from "vitest";

import { findBestMatch, findMatch } from "./searchHighlight";

/** Reassembles what the Range would cover, so a match is checked by its text. */
function covered(parts: string[], query: string): string | null {
  const m = findMatch(parts, query);
  if (!m) return null;
  if (m.startPart === m.endPart) {
    return parts[m.startPart]!.slice(m.startOffset, m.endOffset);
  }
  const head = parts[m.startPart]!.slice(m.startOffset);
  const middle = parts.slice(m.startPart + 1, m.endPart).join("");
  return head + middle + parts[m.endPart]!.slice(0, m.endOffset);
}

describe("search hit matching", () => {
  it("finds a phrase inside one fragment", () => {
    expect(covered(["Now run git status to see what changed."], "git status")).toBe(
      "git status",
    );
  });

  it("spans fragments, which is how bold and links break up a sentence", () => {
    // "the upstream remote" split across <p>, <strong>, <p> — one phrase, three nodes.
    expect(covered(["Add the ", "upstream", " remote now"], "upstream remote")).toBe(
      "upstream remote",
    );
  });

  it("matches across the newlines and indentation in the source HTML", () => {
    expect(covered(["Push your\n      branch to GitHub"], "push your branch")).toBe(
      "Push your\n      branch",
    );
  });

  it("ignores case and surrounding whitespace in the query", () => {
    expect(covered(["Create a Repository first"], "  A REPOSITORY ")).toBe("a Repository");
  });

  it("returns null when the words are not there, so the caller can fall back", () => {
    expect(findMatch(["Commit your work"], "rebase")).toBeNull();
    expect(findMatch(["Commit your work"], "   ")).toBeNull();
  });

  it("reports offsets that address the right fragment", () => {
    const m = findMatch(["alpha ", "beta gamma"], "gamma")!;
    expect(m.startPart).toBe(1);
    expect(m.startOffset).toBe(5);
    expect(m.endOffset).toBe(10);
  });
});

describe("falling back when the phrase is not literal", () => {
  // Every search term must appear in a section, but not next to each other —
  // this is the common case, not the exception.
  const scattered = [
    "Add the upstream remote so you can pull. ",
    "Later, push to your own remote instead.",
  ];

  it("prefers the whole phrase when it is present", () => {
    const m = findBestMatch(scattered, "upstream remote")!;
    expect(scattered[m.startPart]!.slice(m.startOffset, m.endOffset)).toBe("upstream remote");
  });

  it("falls back to the longest term, not the first", () => {
    // "the upstream" never occurs as a phrase here, so the terms decide.
    const parts = ["You can pull from it. The copy upstream stays ahead."];
    const m = findBestMatch(parts, "the upstream")!;
    // "the" appears first and would be a useless marker; "upstream" locates it.
    expect(parts[0]!.slice(m.startOffset, m.endOffset)).toBe("upstream");
  });

  it("gives up only when no term appears at all", () => {
    expect(findBestMatch(["Commit your work"], "rebase squash")).toBeNull();
  });
});
