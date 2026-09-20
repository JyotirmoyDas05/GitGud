import { CHALLENGES, challengeTitle } from "~/challenges";
import { loadChallenge } from "./content";

/**
 * Full-text search across challenge content.
 *
 * Indexed by *section*, not by challenge: "add a collaborator" should land on
 * the paragraph that explains it, not the top of a 124-line page. Sections are
 * cut at `h2`/`h3`, the same boundaries the outline uses, so a result and the
 * outline entry it belongs to are always the same thing.
 *
 * The index is built lazily on first search and cached per locale — eleven
 * challenges of parsed HTML is not work worth doing before someone asks.
 */

export interface SearchSection {
  challengeId: string;
  challengeTitle: string;
  challengeIndex: number;
  /** Anchor id, matching what `Outline` assigns. Empty for a page's preamble. */
  headingId: string;
  heading: string;
  text: string;
  /** Lowercased once, so matching never re-lowercases per keystroke. */
  haystack: string;
}

export interface SearchHit extends SearchSection {
  score: number;
  /** Text around the first match, for the result row. */
  snippet: string;
  /** Character offset of the match within `snippet`. */
  matchAt: number;
  matchLength: number;
}

const cache = new Map<string, SearchSection[]>();

function textOf(node: Element): string {
  return (node.textContent ?? "").replace(/\s+/g, " ").trim();
}

function buildIndex(locale: string): SearchSection[] {
  const sections: SearchSection[] = [];
  const parser = new DOMParser();

  CHALLENGES.forEach((challenge, challengeIndex) => {
    const { before, after } = loadChallenge(locale, challenge.file);
    const doc = parser.parseFromString(`<body>${before}${after}</body>`, "text/html");

    let heading = "";
    let headingId = "";
    let buffer: string[] = [];
    let sectionIndex = 0;

    const flush = () => {
      const text = buffer.join(" ").replace(/\s+/g, " ").trim();
      if (!text && !heading) return;
      sections.push({
        challengeId: challenge.id,
        challengeTitle: challengeTitle(challenge, locale),
        challengeIndex,
        headingId,
        heading,
        text,
        haystack: `${heading} ${text}`.toLowerCase(),
      });
      buffer = [];
    };

    for (const el of Array.from(doc.body.querySelectorAll("h2, h3, p, li, code"))) {
      if (el.tagName === "H2" || el.tagName === "H3") {
        flush();
        heading = textOf(el);
        // Mirrors the id Outline generates, so a hit can scroll to the same
        // anchor the outline links to.
        headingId = `s-${sectionIndex}-${heading
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 32)}`;
        sectionIndex++;
        continue;
      }
      // Skip list items and code that are nested inside an already-captured
      // paragraph, or the same words get indexed twice and skew the score.
      if (el.closest("p") && el.tagName !== "P") continue;
      buffer.push(textOf(el));
    }

    flush();
  });

  return sections;
}

export function search(locale: string, query: string, limit = 24): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  let index = cache.get(locale);
  if (!index) {
    index = buildIndex(locale);
    cache.set(locale, index);
  }

  // Every word must appear somewhere in the section. Ranking then rewards the
  // ones where they appear in the heading or early in the text — an exact
  // phrase beats the same words scattered across a page.
  const terms = q.split(/\s+/).filter(Boolean);
  const hits: SearchHit[] = [];

  for (const section of index) {
    if (!terms.every((t) => section.haystack.includes(t))) continue;

    const phraseAt = section.haystack.indexOf(q);
    const headingHit = section.heading.toLowerCase().includes(q);
    const titleHit = section.challengeTitle.toLowerCase().includes(q);

    let score = 0;
    if (titleHit) score += 60;
    if (headingHit) score += 40;
    if (phraseAt >= 0) score += 25;
    // Earlier matches are usually the definition rather than a passing mention.
    score += Math.max(0, 20 - Math.floor((phraseAt < 0 ? 400 : phraseAt) / 40));
    score += terms.length;

    const bodyLower = section.text.toLowerCase();
    const at = bodyLower.indexOf(terms[0]);
    const start = Math.max(0, at - 48);
    const snippet =
      (start > 0 ? "…" : "") + section.text.slice(start, start + 180).trim() + "…";

    hits.push({
      ...section,
      score,
      snippet,
      matchAt: at < 0 ? -1 : at - start + (start > 0 ? 1 : 0),
      matchLength: terms[0].length,
    });
  }

  return hits.sort((a, b) => b.score - a.score || a.challengeIndex - b.challengeIndex).slice(0, limit);
}

/** Drop a cached index — call when content could have changed under us. */
export function clearSearchCache() {
  cache.clear();
}
