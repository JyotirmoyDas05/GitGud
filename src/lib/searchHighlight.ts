/**
 * Landing highlight for a search result, after T3 Code's chat citations
 * (`apps/web/src/components/chat/AssistantCitationSource.tsx`, MIT).
 *
 * Jumping to a heading answers "which section", never "which words". This
 * marks the matched text itself: two blinks, a hold, then a fade.
 *
 * The technique is worth stating, because the obvious implementation is worse.
 * Wrapping the match in a `<mark>` would mutate content that React rendered
 * from `dangerouslySetInnerHTML`, and every subsequent render would fight it.
 * Instead this uses the CSS Custom Highlight API: a `Range` is handed to the
 * browser and painted through `::highlight(gg-search-hit)` with no DOM change
 * at all. The pulse is a registered `@property` (`--gg-hit-opacity`, declared
 * in `index.css`) animated with the Web Animations API — registered custom
 * properties interpolate, so a keyframe set can drive it, and because it
 * inherits, animating it on `<html>` reaches the highlight pseudo-element.
 */

/** Two blinks, a hold, a fade — T3 Code's timings, which are tuned. */
const PULSE_MS = 650;
/** The hold is why a glance a second late still finds the quote. */
const HOLD_MS = 1575;
const FADE_MS = 450;
const TOTAL_MS = 1.5 * PULSE_MS + HOLD_MS + FADE_MS;
const PEAK = 0.45;

const HIGHLIGHT_NAME = "gg-search-hit";
const OPACITY = "--gg-hit-opacity";

/** Headings end a section, the same boundary the search index and outline use. */
const SECTION_END = new Set(["H2", "H3"]);

let running: Animation | null = null;

export interface Match {
  startPart: number;
  startOffset: number;
  endPart: number;
  /** Exclusive, so it can be handed to `Range.setEnd` unchanged. */
  endOffset: number;
}

/**
 * Locates `query` across a run of text fragments.
 *
 * Kept free of the DOM so it can be tested, and because the hard parts are
 * textual: a phrase can straddle two elements ("push" in one `<strong>`, the
 * rest in the paragraph), and the content's whitespace does not match what the
 * user typed — the search index collapses runs, while the HTML is full of
 * newlines and indentation. Both are handled by collapsing whitespace while
 * recording, for every character kept, which fragment and offset it came from.
 */
export function findMatch(parts: string[], query: string): Match | null {
  const needle = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!needle) return null;

  let text = "";
  const from: { part: number; offset: number }[] = [];
  let atSpace = true; // also trims the leading whitespace

  parts.forEach((part, index) => {
    for (let i = 0; i < part.length; i++) {
      const char = part[i]!;
      if (/\s/.test(char)) {
        if (atSpace) continue;
        atSpace = true;
        text += " ";
      } else {
        atSpace = false;
        text += char;
      }
      from.push({ part: index, offset: i });
    }
  });

  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return null;

  const start = from[at]!;
  const end = from[at + needle.length - 1]!;
  return {
    startPart: start.part,
    startOffset: start.offset,
    endPart: end.part,
    endOffset: end.offset + 1,
  };
}

/**
 * The best range to mark for `query`: the whole phrase if it is there, else
 * the most distinctive single word.
 *
 * The index requires every term to appear *somewhere* in a section, not
 * together, so plenty of real hits have the words paragraphs apart. Longest
 * term first, because "upstream" locates the passage and "the" does not.
 */
export function findBestMatch(parts: string[], query: string): Match | null {
  const phrase = findMatch(parts, query);
  if (phrase) return phrase;

  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const term of terms) {
    const match = findMatch(parts, term);
    if (match) return match;
  }
  return null;
}

/**
 * Scrolls to a search hit and marks what matched.
 *
 * `headingId` is empty for a page's preamble, in which case the whole first
 * prose block is searched and the view stays at the top.
 */
export function revealSearchHit({
  headingId,
  query,
}: {
  headingId: string;
  query: string;
}) {
  const heading = headingId ? document.getElementById(headingId) : null;
  const root = heading ?? document.querySelector("main .prose");
  if (!root) return;

  const scroller = root.closest("main");
  if (heading) heading.scrollIntoView({ behavior: "smooth", block: "start" });

  // Waiting matters: the blink is the payload, and starting it mid-flight
  // spends the first half of it off-screen.
  whenSettled(scroller, () => flash(heading, root, query));
}

function flash(heading: Element | null, root: Element, query: string) {
  const nodes = textNodes(heading, root);
  if (nodes.length === 0) return;

  const match = findBestMatch(nodes.map((n) => n.data), query);

  const range = document.createRange();
  if (match) {
    range.setStart(nodes[match.startPart]!, match.startOffset);
    range.setEnd(nodes[match.endPart]!, match.endOffset);
  } else if (heading) {
    // Not a single term survived into the rendered text — the match came from
    // the heading itself. Mark that, so the landing is never unmarked.
    range.selectNodeContents(heading);
  } else {
    return;
  }

  paint(range);
}

function paint(range: Range) {
  running?.cancel();

  // Safari before 17.2 and any older WebView have no highlight registry. The
  // native selection draws the same span, just without the pulse.
  if (typeof Highlight === "undefined" || typeof CSS === "undefined" || !CSS.highlights) {
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return;
  }

  CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(range));

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const at = (ms: number) => ms / TOTAL_MS;
  const holdEnd = at(TOTAL_MS - FADE_MS);

  const frames = reduce
    ? // Reduced motion keeps the marker and drops the blinking, rather than
      // dropping the feature: the point is finding the text.
      [
        { offset: 0, [OPACITY]: PEAK },
        { offset: holdEnd, [OPACITY]: PEAK },
        { offset: 1, [OPACITY]: 0 },
      ]
    : [
        { offset: 0, [OPACITY]: 0 },
        { offset: at(PULSE_MS * 0.5), [OPACITY]: PEAK },
        { offset: at(PULSE_MS), [OPACITY]: 0 },
        { offset: at(PULSE_MS * 1.5), [OPACITY]: PEAK },
        { offset: holdEnd, [OPACITY]: PEAK },
        { offset: 1, [OPACITY]: 0 },
      ];

  running = document.documentElement.animate(frames, {
    duration: TOTAL_MS,
    easing: "ease-in-out",
  });
  // A cancel rejects this; that only happens when a newer hit already painted.
  running.finished.then(clearHighlight, () => {});
}

/** Drops the mark — call when the content under it is about to change. */
export function clearHighlight() {
  running?.cancel();
  running = null;
  if (typeof CSS !== "undefined" && CSS.highlights) CSS.highlights.delete(HIGHLIGHT_NAME);
}

/** Every non-blank text node of a section: the heading, then its siblings. */
function textNodes(heading: Element | null, root: Element): Text[] {
  const out: Text[] = [];

  const collect = (el: Node) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;
      if (text.data.trim()) out.push(text);
    }
  };

  if (!heading) {
    collect(root);
    return out;
  }

  collect(heading);
  for (
    let el = heading.nextElementSibling;
    el && !SECTION_END.has(el.tagName);
    el = el.nextElementSibling
  ) {
    collect(el);
  }
  return out;
}

/**
 * Runs `done` once the scroll container stops moving.
 *
 * Polling beats the `scrollend` event here: when the target is already in
 * view nothing scrolls, so no event ever fires, and the fallback timeout
 * would be the only path — which is the common case, not the rare one.
 */
function whenSettled(scroller: Element | null, done: () => void) {
  if (!scroller) {
    done();
    return;
  }

  let previous = scroller.scrollTop;
  let stillFor = 0;
  const deadline = performance.now() + 1200;

  const tick = () => {
    if (scroller.scrollTop === previous) stillFor++;
    else {
      stillFor = 0;
      previous = scroller.scrollTop;
    }
    if (stillFor >= 3 || performance.now() > deadline) done();
    else requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
