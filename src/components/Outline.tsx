import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * "On this page" — the equivalent of T3 Code's thread navigator, applied to
 * challenge headings.
 *
 * Challenges run long: challenge 7 is 124 lines of instructions across eight
 * sections, and before this the only way to find "Push your branch" again was
 * to scroll and squint. Headings come from the rendered content rather than a
 * manifest, so translated locales get an outline too without extra data.
 *
 * The active heading is tracked with IntersectionObserver rather than a scroll
 * listener: the browser does the work off the main thread and there is no
 * handler firing on every frame.
 */
export function Outline({
  containerRef,
  /** Changes when the rendered content does. Without it the effect never
   *  re-runs — a ref object is stable, so navigating from one challenge to the
   *  next left the previous challenge's headings on screen. */
  contentKey,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  contentKey: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const pinnedUntil = useRef(0);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const found: Heading[] = [];
    for (const el of Array.from(root.querySelectorAll("h2, h3"))) {
      const text = el.textContent?.trim();
      if (!text) continue;
      if (!el.id) {
        el.id = `s-${found.length}-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)}`;
      }
      found.push({ id: el.id, text, level: el.tagName === "H2" ? 2 : 3 });
    }

    setHeadings(found);
    setActive(found[0]?.id ?? null);

    if (found.length === 0) return;

    const scroller = root.closest("main");

    // The observer's "active band" is the top 30% of the viewport. The last
    // heading or two on a page can never reach it — there is not enough
    // content below them to scroll that far — so when the scroller is at its
    // end the final heading is active by definition.
    const atBottom = () =>
      !!scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < pinnedUntil.current || atBottom()) return;
        // Topmost intersecting heading wins, so scrolling up and down both
        // land on the section actually in view rather than the last one
        // crossed.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-64px 0px -70% 0px", threshold: 0 },
    );

    for (const h of found) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    const onScroll = () => {
      if (atBottom()) setActive(found[found.length - 1]!.id);
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, contentKey]);

  // A click is an explicit choice. The smooth scroll passes other headings
  // through the active band on the way, and without this the highlight would
  // flicker across each of them before settling.
  function jump(id: string) {
    setActive(id);
    pinnedUntil.current = Date.now() + 700;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Every challenge has at least two headings, so this threshold keeps the
  // column present on all of them. That matters more than it sounds: at a
  // threshold of three it vanished on challenges 8, 9 and 10, and the content
  // column re-centred as you navigated into and out of them.
  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="On this page"
      className="@[940px]:block sticky top-4 hidden max-h-[calc(100vh-8rem)] w-48 shrink-0 self-start overflow-y-auto py-8 pr-4"
    >
      <p className="px-2 pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        On this page
      </p>
      <ul className="space-y-px">
        {headings.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => jump(h.id)}
              className={cn(
                "block w-full cursor-pointer truncate rounded-md py-1 text-left text-xs",
                "transition-colors duration-150",
                h.level === 3 ? "pl-5 pr-2" : "px-2",
                active === h.id
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title={h.text}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
