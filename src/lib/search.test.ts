import { describe, expect, it } from "vitest";

import {
  fold,
  rank,
  search,
  sectionsOf,
  stripHtml,
  variants,
  withinOneEdit,
  type SearchSection,
} from "./search";

/**
 * The index builder is plain string work rather than a DOM walk, which is what
 * lets these run against the real bundled challenges instead of against a
 * fixture that drifts from them.
 */

function section(over: Partial<SearchSection> & { text: string }): SearchSection {
  const heading = over.heading ?? "";
  const title = over.challengeTitle ?? "Some Challenge";
  return {
    challengeId: over.challengeId ?? "c",
    challengeIndex: over.challengeIndex ?? 0,
    challengeTitle: title,
    heading,
    headingFold: fold(heading),
    headingId: over.headingId ?? "s-0-x",
    text: over.text,
    textFold: fold(over.text),
    titleFold: fold(title),
  };
}

/** What the palette would actually show as marked. */
function marked(hit: { snippet: string; ranges: { at: number; length: number }[] }): string[] {
  return hit.ranges.map((r) => hit.snippet.slice(r.at, r.at + r.length));
}

describe("html to text", () => {
  it("drops tags, decodes entities and collapses whitespace", () => {
    expect(stripHtml("<p>Run <code>git add &#60;FILE&#62;</code>\n  now</p>")).toBe(
      "Run git add <FILE> now",
    );
  });

  it("counts a word inside a nested tag exactly once", () => {
    // The DOM version collected `p`, `li` and `code` separately and needed a
    // special case to stop counting nested code twice.
    const text = stripHtml("<p>use <code>branch</code> here</p>");
    expect(text.match(/branch/g)).toHaveLength(1);
  });
});

describe("folding", () => {
  it("lowercases and strips accents", () => {
    expect(fold("Repositório")).toBe("repositorio");
  });

  it("never changes length, so offsets stay valid", () => {
    for (const word of ["Repositório", "naïve", "ÜBER", "straße", "普通", "git"]) {
      expect(fold(word)).toHaveLength(word.length);
    }
  });
});

describe("word variants", () => {
  it("bridges singular and plural both ways", () => {
    expect(variants("repositories")).toContain("repository");
    expect(variants("repository")).toContain("repositori");
    expect(variants("branches")).toContain("branch");
  });

  it("leaves short commands alone, so `ls` cannot become `l`", () => {
    expect(variants("ls")).toEqual(["ls"]);
    expect(variants("cd")).toEqual(["cd"]);
  });
});

describe("one edit apart", () => {
  it("accepts a substitution, an insertion, a deletion and a swap", () => {
    expect(withinOneEdit("github", "gothub")).toBe(true);
    expect(withinOneEdit("github", "gihub")).toBe(true);
    expect(withinOneEdit("github", "githubb")).toBe(true);
    expect(withinOneEdit("branch", "brnach")).toBe(true);
  });

  it("rejects two edits", () => {
    expect(withinOneEdit("github", "gothib")).toBe(false);
  });
});

describe("ranking", () => {
  const sections = [
    section({
      challengeId: "a",
      challengeIndex: 0,
      heading: "Git",
      text: "Git is a program for keeping track of changes over time, known in programming as version control. If you have used track changes you are familiar.",
    }),
    section({
      challengeId: "b",
      challengeIndex: 1,
      heading: "Version Control",
      text: "Tracking changes like this is called version control.",
    }),
    section({
      challengeId: "c",
      challengeIndex: 2,
      heading: "Elsewhere",
      text: "The version of Git matters. Control of your own files does too.",
    }),
  ];

  it("marks every word of a multi-word query, not just the first", () => {
    const [top] = rank(sections, "version control");
    expect(marked(top!)).toEqual(["version", "control"]);
  });

  it("puts the phrase in a heading above the phrase in body text", () => {
    const hits = rank(sections, "version control");
    expect(hits[0]!.challengeId).toBe("b");
  });

  it("ranks the two words together above the two words scattered", () => {
    const hits = rank(sections, "version control");
    const scattered = hits.findIndex((h) => h.challengeId === "c");
    const together = hits.findIndex((h) => h.challengeId === "a");
    expect(together).toBeLessThan(scattered);
  });

  it("opens the snippet on the phrase rather than on the first word", () => {
    const hit = rank(sections, "version control").find((h) => h.challengeId === "c")!;
    // "version" appears first, but "control" is the second half of the query;
    // the marked text must still be the words themselves. Compared folded
    // because the highlight keeps the original case — here a capital "Control"
    // that opens a sentence.
    expect(marked(hit).map(fold).sort()).toEqual(["control", "version"]);
  });

  it("highlights exactly the marked words, with offsets that line up", () => {
    for (const hit of rank(sections, "version control")) {
      for (const range of hit.ranges) {
        const shown = hit.snippet.slice(range.at, range.at + range.length);
        expect(fold(shown)).toMatch(/version|control/);
      }
    }
  });

  it("finds a section by a word only present in the challenge title", () => {
    const titled = [
      section({
        challengeId: "t",
        challengeTitle: "Forks and Clones",
        heading: "Making a copy",
        text: "Press the button at the top right of the page.",
      }),
    ];
    expect(rank(titled, "forks")).toHaveLength(1);
  });

  it("marks the spelling the body actually uses", () => {
    const one = [
      section({
        challengeTitle: "Forks and Clones",
        heading: "Forks and Clones",
        text: "Fork a project from GitHub and clone it locally.",
      }),
    ];
    // "clones" is satisfied by the title; the snippet says "clone", and that
    // is the word that has to light up.
    expect(marked(rank(one, "forks and clones")[0]!).map(fold)).toContain("clone");
  });

  it("matches across a plural", () => {
    const one = [section({ heading: "Repository", text: "A repository holds your work." })];
    expect(rank(one, "repositories")).toHaveLength(1);
  });

  it("falls back to a typo-tolerant pass only when nothing matched", () => {
    const one = [section({ heading: "Branches", text: "A branch is a line of work." })];
    const typo = rank(one, "brnach");
    expect(typo).toHaveLength(1);
    expect(typo[0]!.fuzzy).toBe(true);

    // An exact hit must never be reported as a guess.
    expect(rank(one, "branch")[0]!.fuzzy).toBe(false);
  });

  it("ignores stopwords when the query also has a real word", () => {
    const one = [
      section({ heading: "Branches", text: "A branch is a line of work that you can merge." }),
    ];
    const [hit] = rank(one, "what is a branch");
    // Only "branch" is marked: marking every "a" and "is" was noise, and they
    // also dragged the ranking toward whichever section had the most filler.
    expect(marked(hit!).map(fold)).toEqual(["branch"]);
  });

  it("keeps stopwords when they are the whole query", () => {
    const one = [section({ text: "The thing about the terminal." })];
    expect(rank(one, "the")).toHaveLength(1);
  });

  it("falls back to the words it does know rather than returning nothing", () => {
    const one = [section({ heading: "Merge, Tada!", text: "Merge your branch into main." })];
    // "conflict" is nowhere in the content; an empty list helps nobody.
    const hits = rank(one, "merge conflict");
    expect(hits).toHaveLength(1);
    expect(marked(hits[0]!).map(fold)).toEqual(["merge"]);
    expect(hits[0]!.fuzzy).toBe(false);
  });

  it("prefers sections covering more of the query when falling back", () => {
    const two = [
      section({ challengeId: "one", text: "A remote lives on a server." }),
      section({ challengeId: "two", text: "A remote branch lives on a server." }),
    ];
    expect(rank(two, "remote branch conflict")[0]!.challengeId).toBe("two");
  });

  it("returns nothing for two characters or fewer of nonsense", () => {
    expect(rank(sections, "z")).toHaveLength(0);
    expect(rank(sections, "qqqq")).toHaveLength(0);
  });

  it("caps how many sections one challenge can contribute", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      section({ challengeId: "same", heading: `Part ${i}`, text: "branch branch branch" }),
    );
    expect(rank(many, "branch").length).toBeLessThanOrEqual(3);
  });
});

describe("against the real challenges", () => {
  it("cuts a challenge into sections with outline-shaped ids", () => {
    const parts = sectionsOf(
      "<p>Intro text.</p><h2>First Bit</h2><p>Body one.</p><h3>Second Bit</h3><p>Body two.</p>",
      { challengeId: "x", challengeIndex: 0, challengeTitle: "X" },
    );
    expect(parts.map((p) => p.heading)).toEqual(["", "First Bit", "Second Bit"]);
    expect(parts[1]!.headingId).toBe("s-0-first-bit");
    expect(parts[2]!.headingId).toBe("s-1-second-bit");
  });

  it("finds version control, and marks both words", () => {
    const hits = search("en-US", "version control");
    expect(hits.length).toBeGreaterThan(0);
    expect(marked(hits[0]!)).toContain("control");
  });

  it("finds a challenge by its title", () => {
    expect(search("en-US", "forks and clones").length).toBeGreaterThan(0);
    expect(search("en-US", "githubbin").length).toBeGreaterThan(0);
  });

  it("finds a shell command typed as a phrase", () => {
    const hits = search("en-US", "git remote add");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.challengeId).toBe("remote_control");
  });

  it("survives a typo in a common word", () => {
    expect(search("en-US", "reposittory").length).toBeGreaterThan(0);
  });
});
