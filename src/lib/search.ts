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
 * The index is built lazily on first search and cached per locale.
 *
 * The first version of this had several faults that only show up with a real
 * query, and they are worth naming because the fixes are the bulk of the file:
 *
 *  - Only the *first* word of a multi-word query was ever highlighted, so
 *    searching "version control" marked "version" and left "control" plain.
 *  - The challenge title was not searchable. `titleHit` scored +60 but the
 *    section had already been filtered out unless the body also held every
 *    term, so searching a challenge by its name found nothing.
 *  - The snippet was anchored on the first word alone, so it could open far
 *    from where the whole phrase actually appears.
 *  - `snippet` was built with `.trim()` *after* the offset was computed, so a
 *    slice starting on whitespace shifted the highlight off the word.
 *  - Nothing folded accents, which the eight translated locales need, and
 *    nothing handled plurals or a typo.
 */

// --- text -------------------------------------------------------------------

/**
 * Lowercase and strip accents *without changing the string's length*, so an
 * offset found in the folded text addresses the same character in the
 * original. Any character whose folding would resize it is left alone; that
 * costs a rare missed match and never a misplaced highlight.
 */
export function fold(text: string): string {
  let out = "";
  for (const char of text) {
    const stripped = char.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const lower = (stripped || char).toLowerCase();
    out += lower.length === char.length ? lower : char;
  }
  return out;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&nbsp;": " ",
  "&quot;": '"',
  "&#39;": "'",
  "&#60;": "<",
  "&#62;": ">",
};

/**
 * Tags out, entities in, whitespace collapsed.
 *
 * A regex rather than `DOMParser`, for two reasons. It runs in Node, which is
 * what makes the ranking testable against the real content instead of against
 * a mock. And it removed a special case: the DOM walk collected `p`, `li` and
 * `code` separately and then had to skip `code` nested inside a `p` to avoid
 * indexing the same words twice. Flattening a chunk of markup cannot
 * double-count in the first place.
 *
 * Safe here only because this HTML is ours and ships in the bundle.
 */
export function stripHtml(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags.replace(
    /&(?:amp|gt|lt|nbsp|quot|#39|#60|#62);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
  return decoded.replace(/\s+/g, " ").trim();
}

/**
 * Spellings of a term worth accepting, so a plural in the query finds a
 * singular in the text and the other way round. Substring matching already
 * covers prefixes ("commit" finds "committing"); this covers the endings that
 * change, like repository/repositories.
 *
 * Only for terms of four characters or more: stripping the "s" from "ls"
 * leaves "l", which matches nearly everything.
 */
export function variants(term: string): string[] {
  const out = [term];
  if (term.length >= 4) {
    if (term.endsWith("ies")) out.push(`${term.slice(0, -3)}y`);
    if (term.endsWith("es")) out.push(term.slice(0, -2));
    if (term.endsWith("s")) out.push(term.slice(0, -1));
    // repository -> repositori, which is a prefix of "repositories".
    if (term.endsWith("y")) out.push(`${term.slice(0, -1)}i`);
    if (term.length >= 6 && term.endsWith("ing")) out.push(term.slice(0, -3));
    if (term.length >= 5 && term.endsWith("ed")) out.push(term.slice(0, -2));
  }
  return [...new Set(out)];
}

/** The spelling of `term` that appears in `hay`, or null. */
function matchIn(hay: string, term: string): string | null {
  for (const variant of variants(term)) {
    if (hay.includes(variant)) return variant;
  }
  return null;
}

/**
 * One insertion, deletion, substitution or adjacent transposition apart.
 *
 * Used only when a query returns nothing at all, to catch "gihub" or "brnach"
 * rather than showing an empty list.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;

  let head = 0;
  while (head < la && head < lb && a[head] === b[head]) head++;

  let tail = 0;
  while (tail < la - head && tail < lb - head && a[la - 1 - tail] === b[lb - 1 - tail]) tail++;

  if (la - head - tail <= 1 && lb - head - tail <= 1) return true;

  // Transposition: the two characters that differ are the same, swapped.
  return (
    la === lb &&
    la - head - tail === 2 &&
    a[head] === b[head + 1] &&
    a[head + 1] === b[head]
  );
}

// --- the index --------------------------------------------------------------

export interface SearchSection {
  challengeId: string;
  challengeTitle: string;
  challengeIndex: number;
  /** Anchor id, matching what `Outline` assigns. Empty for a page's preamble. */
  headingId: string;
  heading: string;
  text: string;
  /** Folded copies, index-aligned with the originals. Built once per locale. */
  textFold: string;
  headingFold: string;
  titleFold: string;
}

export interface SnippetRange {
  at: number;
  length: number;
}

export interface SearchHit extends SearchSection {
  score: number;
  /** Text around the best match, for the result row. */
  snippet: string;
  /** Every matched word inside `snippet`, so all of them can be marked. */
  ranges: SnippetRange[];
  /** True when the hit only survived the relaxed, typo-tolerant pass. */
  fuzzy: boolean;
}

const cache = new Map<string, SearchSection[]>();

const HEADINGS = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

/** Cuts one challenge's HTML into sections at its `h2`/`h3` boundaries. */
export function sectionsOf(
  html: string,
  meta: { challengeId: string; challengeIndex: number; challengeTitle: string },
): SearchSection[] {
  const sections: SearchSection[] = [];
  const titleFold = fold(meta.challengeTitle);

  let heading = "";
  let headingId = "";
  let from = 0;
  let index = 0;

  const push = (chunk: string) => {
    const text = stripHtml(chunk);
    if (!text && !heading) return;
    sections.push({
      ...meta,
      heading,
      headingFold: fold(heading),
      headingId,
      text,
      textFold: fold(text),
      titleFold,
    });
  };

  HEADINGS.lastIndex = 0;
  for (let match = HEADINGS.exec(html); match; match = HEADINGS.exec(html)) {
    push(html.slice(from, match.index));
    heading = stripHtml(match[2] ?? "");
    // Mirrors the id `Outline` generates, so a hit scrolls to the same anchor
    // the outline links to.
    headingId = `s-${index}-${heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 32)}`;
    index++;
    from = match.index + match[0].length;
  }
  push(html.slice(from));

  return sections;
}

function buildIndex(locale: string): SearchSection[] {
  return CHALLENGES.flatMap((challenge, challengeIndex) => {
    const { before, after } = loadChallenge(locale, challenge.file);
    return sectionsOf(`${before}${after}`, {
      challengeId: challenge.id,
      challengeIndex,
      challengeTitle: challengeTitle(challenge, locale),
    });
  });
}

// --- ranking ----------------------------------------------------------------

/**
 * Dropped from a query that also has a real word in it, so "what is a branch"
 * ranks on "branch" instead of on the twenty "a"s in a section — and marks
 * only the word the learner meant.
 *
 * English only, deliberately: the eight translated locales lose nothing by it,
 * and a half-guessed stopword list per language would do more harm than good.
 */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "does",
  "for", "from", "how", "i", "if", "in", "is", "it", "its", "me", "my", "of",
  "on", "or", "that", "the", "this", "to", "was", "what", "when", "where",
  "which", "who", "why", "will", "with", "you", "your",
]);

const PHRASE_IN_HEADING = 60;
const PHRASE_IN_TEXT = 35;
const TERM_IN_HEADING = 12;
const TERM_IN_TITLE = 8;
const MAX_PROXIMITY = 20;
const MAX_FREQUENCY = 10;
const MAX_EARLINESS = 10;
/** A typo-tolerant hit is a guess; it ranks below anything found literally. */
const FUZZY_PENALTY = 45;
/** How much of a partial match's rank comes from how many terms it covered. */
const COVERAGE = 40;

/** At most this many sections from one challenge, so one page cannot flood. */
const PER_CHALLENGE = 3;

const SNIPPET_LEAD = 60;
const SNIPPET_WIDTH = 190;

function occurrences(hay: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + needle.length)) {
    out.push(at);
  }
  return out;
}

/**
 * Width of the tightest run of text containing every term, or null when one of
 * them is missing from the body. Terms sitting next to each other are almost
 * always a better answer than the same terms a page apart.
 */
function tightestWindow(textFold: string, matched: string[]): number | null {
  const lists = matched.map((term) => occurrences(textFold, term));
  if (lists.some((list) => list.length === 0)) return null;

  const cursors = new Array(lists.length).fill(0);
  let best = Infinity;

  for (;;) {
    let lowest = 0;
    let start = Infinity;
    let end = -Infinity;

    for (let i = 0; i < lists.length; i++) {
      const at = lists[i]![cursors[i]!]!;
      if (at < start) {
        start = at;
        lowest = i;
      }
      const stop = at + matched[i]!.length;
      if (stop > end) end = stop;
    }

    best = Math.min(best, end - start);
    cursors[lowest]!++;
    if (cursors[lowest]! >= lists[lowest]!.length) return best;
  }
}

interface Scored {
  section: SearchSection;
  score: number;
  /** The spelling of each query term that actually appeared. */
  matched: string[];
  fuzzy: boolean;
}

/**
 * `all` — every term must appear. The normal pass.
 * `some` — at least one does, ranked by how many. Rescues "ssh key" when only
 *   one of the words is in the content at all, which used to return nothing.
 * `typo` — every term appears or is one edit from a word that does.
 */
type Mode = "all" | "some" | "typo";

function scoreSection(
  section: SearchSection,
  phrase: string,
  terms: string[],
  mode: Mode,
): Scored | null {
  const { headingFold, textFold, titleFold } = section;
  const everywhere = `${titleFold} ${headingFold} ${textFold}`;

  const matched: string[] = [];
  let fuzzy = false;

  for (const term of terms) {
    const found = matchIn(everywhere, term);
    if (found) {
      matched.push(found);
      continue;
    }
    if (mode === "all") return null;
    if (mode === "some") continue;

    // Typo pass: accept a word one edit away from the term.
    const near = everywhere
      .split(/[^\p{L}\p{N}]+/u)
      .find((word) => word.length >= 3 && withinOneEdit(word, term));
    if (!near) return null;
    matched.push(near);
    fuzzy = true;
  }

  if (matched.length === 0) return null;

  let score = 0;
  if (mode === "some") score += Math.round(COVERAGE * (matched.length / terms.length));

  if (phrase.length > 0 && terms.length > 1) {
    if (headingFold.includes(phrase)) score += PHRASE_IN_HEADING;
    else if (textFold.includes(phrase)) score += PHRASE_IN_TEXT;
  }

  for (const term of matched) {
    if (headingFold.includes(term)) score += TERM_IN_HEADING;
    if (titleFold.includes(term)) score += TERM_IN_TITLE;
  }

  const window = tightestWindow(textFold, matched);
  if (window !== null) {
    const span = matched.reduce((sum, term) => sum + term.length, 0);
    const slack = Math.max(0, window - span);
    score += Math.round(MAX_PROXIMITY * (1 - Math.min(1, slack / 160)));
  }

  const total = matched.reduce((sum, term) => sum + occurrences(textFold, term).length, 0);
  score += Math.min(MAX_FREQUENCY, total * 2);

  const first = matched
    .map((term) => textFold.indexOf(term))
    .filter((at) => at >= 0)
    .sort((a, b) => a - b)[0];
  if (first !== undefined) {
    score += Math.round(MAX_EARLINESS * (1 - Math.min(1, first / 600)));
  }

  if (fuzzy) score -= FUZZY_PENALTY;

  return { fuzzy, matched, score, section };
}

/** Where the snippet should open: the phrase if it is there, else the window. */
function anchorOf(textFold: string, phrase: string, matched: string[]): number {
  if (phrase) {
    const at = textFold.indexOf(phrase);
    if (at >= 0) return at;
  }

  const positions = matched
    .map((term) => textFold.indexOf(term))
    .filter((at) => at >= 0)
    .sort((a, b) => a - b);
  return positions[0] ?? 0;
}

/** Every matched word inside the snippet body, merged where they overlap. */
function rangesIn(bodyFold: string, matched: string[]): SnippetRange[] {
  const found: SnippetRange[] = [];
  for (const term of matched) {
    for (const at of occurrences(bodyFold, term)) {
      found.push({ at, length: term.length });
    }
  }

  found.sort((a, b) => a.at - b.at);

  const merged: SnippetRange[] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range.at <= last.at + last.length) {
      last.length = Math.max(last.length, range.at + range.length - last.at);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function snippetFor(section: SearchSection, phrase: string, marks: string[]) {
  const { text, textFold } = section;
  const anchor = anchorOf(textFold, phrase, marks);

  let start = Math.max(0, anchor - SNIPPET_LEAD);
  // Open on a word boundary rather than mid-word.
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space >= 0 && space - start < 24) start = space + 1;
  }

  let end = Math.min(text.length, start + SNIPPET_WIDTH);
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > start + 60) end = space;
  }

  // Sliced, never trimmed: trimming after the offsets are taken is what used
  // to slide the highlight off the word it was marking.
  const body = text.slice(start, end);
  const lead = start > 0 ? "…" : "";
  const tail = end < text.length ? "…" : "";

  const ranges = rangesIn(textFold.slice(start, end), marks).map((range) => ({
    at: range.at + lead.length,
    length: range.length,
  }));

  return { ranges, snippet: `${lead}${body}${tail}` };
}

/**
 * Rank sections for a query. Pure, and exported so the scoring can be tested
 * without building an index or touching a DOM.
 */
export function rank(sections: SearchSection[], query: string, limit = 24): SearchHit[] {
  const phrase = fold(query.trim()).replace(/\s+/g, " ");
  if (phrase.length < 2) return [];

  const words = phrase.split(" ").filter(Boolean);
  const meaningful = words.filter((word) => !STOPWORDS.has(word));
  // Unless the query is nothing but stopwords, in which case they are the query.
  const terms = meaningful.length > 0 ? meaningful : words;

  const collect = (mode: Mode) =>
    sections
      .map((section) => scoreSection(section, phrase, terms, mode))
      .filter((scored): scored is Scored => scored !== null);

  // Each fallback only runs when the one before it came back empty, so an
  // ordinary query never pays for either.
  let scored = collect("all");
  if (scored.length === 0 && terms.length > 1) scored = collect("some");
  if (scored.length === 0) scored = collect("typo");

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.section.challengeIndex - b.section.challengeIndex ||
      a.section.heading.localeCompare(b.section.heading),
  );

  const perChallenge = new Map<string, number>();
  const hits: SearchHit[] = [];

  for (const { fuzzy, matched, score, section } of scored) {
    const seen = perChallenge.get(section.challengeId) ?? 0;
    if (seen >= PER_CHALLENGE) continue;
    perChallenge.set(section.challengeId, seen + 1);

    // Mark any accepted spelling, not just the one that satisfied the match.
    // A term can be satisfied by the challenge title ("Forks and Clones") while
    // the body says "clone" — marking only the title's spelling left the word
    // in the snippet plain.
    const marks = [...new Set([...matched, ...terms.flatMap(variants)])];

    hits.push({
      ...section,
      ...snippetFor(section, terms.length > 1 ? phrase : "", marks),
      fuzzy,
      score,
    });
    if (hits.length >= limit) break;
  }

  return hits;
}

export function search(locale: string, query: string, limit = 24): SearchHit[] {
  let index = cache.get(locale);
  if (!index) {
    index = buildIndex(locale);
    cache.set(locale, index);
  }
  return rank(index, query, limit);
}

/** Drop a cached index — call when content could have changed under us. */
export function clearSearchCache() {
  cache.clear();
}
