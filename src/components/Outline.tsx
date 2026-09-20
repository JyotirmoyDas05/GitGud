import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "~/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/** Below this the full column does not fit, and the rail takes over. */
const NARROW_PX = 940;

/** Vertical gap between rail strips. Wider than T3 Code's 8px: a challenge has
 *  four headings where a thread has forty, so the rail can afford the room. */
const STRIP_GAP = 16;

/**
 * "On this page" — the equivalent of T3 Code's thread navigator, applied to
 * challenge headings.
 *
 * Challenges run long: challenge 7 is 124 lines of instructions across eight
 * sections, and before this the only way to find "Push your branch" again was
 * to scroll and squint. Headings come from the rendered content rather than a
 * manifest, so translated locales get an outline too without extra data.
 *
 * Two presentations, one state. Wide windows get the labelled column. Narrow
 * ones get `OutlineRail`, a port of T3 Code's timeline minimap — because the
 * column used to simply vanish under ~940px, which is the one case where
 * knowing where you are matters most.
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
  const [narrow, setNarrow] = useState(false);
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

    // Which presentation fits is a property of the scroll container's width,
    // the same thing the `@container` query used to test. Measuring it here
    // instead keeps one source of truth, so the column and the rail can never
    // both be on screen.
    const resize = new ResizeObserver(([entry]) => {
      if (entry) setNarrow(entry.contentRect.width < NARROW_PX);
    });
    if (scroller) resize.observe(scroller);

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
      resize.disconnect();
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, [containerRef, contentKey]);

  // A click is an explicit choice. The smooth scroll passes other headings
  // through the active band on the way, and without this the highlight would
  // flicker across each of them before settling.
  const jump = useCallback((id: string) => {
    setActive(id);
    pinnedUntil.current = Date.now() + 700;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Every challenge has at least two headings, so this threshold keeps the
  // navigator present on all of them.
  if (headings.length < 2) return null;

  if (narrow) {
    // Portalled out of `main`: the scroll container carries a mask for the
    // top fade, which would dissolve a rail pinned inside it.
    return createPortal(
      <OutlineRail headings={headings} active={active} onJump={jump} />,
      document.body,
    );
  }

  return (
    <nav
      aria-label="On this page"
      className="sticky top-4 max-h-[calc(100vh-8rem)] w-48 shrink-0 self-start overflow-y-auto py-8 pr-4"
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

/**
 * The narrow-window navigator, ported from T3 Code's `MessagesTimeline`
 * minimap.
 *
 * A stack of 2px strips pinned to the window edge. Three details carry it:
 *
 *   1. **One hit area, not one per strip.** A 2px line is not a clickable
 *      target. The whole rail is a single button and the pointer's Y position
 *      decides which heading it means, which makes every strip 16px tall in
 *      practice.
 *   2. **Fisheye widths.** Strips grow as they near the pointer — 24px under
 *      it, then 16, then 10, then 8. That is what makes a column of identical
 *      dashes feel like it is responding to you.
 *   3. **Label on demand.** The text appears in a card beside the rail only
 *      for the strip being pointed at, so the navigator costs almost no space
 *      until it is being used.
 */
function OutlineRail({
  headings,
  active,
  onJump,
}: {
  headings: Heading[];
  active: string | null;
  onJump: (id: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const activeIndex = headings.findIndex((h) => h.id === active);
  const focus = hovered ?? (activeIndex >= 0 ? activeIndex : 0);

  /** Which strip a pointer at `clientY` means. */
  const indexAt = (clientY: number) => {
    const rail = railRef.current;
    if (!rail || headings.length < 2) return 0;
    const box = rail.getBoundingClientRect();
    const ratio = (clientY - box.top) / Math.max(1, box.height);
    return Math.max(0, Math.min(headings.length - 1, Math.round(ratio * (headings.length - 1))));
  };

  const move = (delta: number) =>
    setHovered((current) =>
      Math.max(0, Math.min(headings.length - 1, (current ?? focus) + delta)),
    );

  return (
    <div className="pointer-events-none fixed inset-y-0 right-0 z-30 w-16">
      <div
        ref={railRef}
        className="-translate-y-1/2 absolute top-1/2 right-3"
        style={{ height: (headings.length - 1) * STRIP_GAP }}
      >
        <button
          type="button"
          aria-label={`On this page: ${headings[focus]?.text ?? ""}`}
          // Padded well past the strips so the rail is reachable without
          // precision, while staying clear of the content column.
          className={cn(
            "pointer-events-auto absolute inset-y-0 right-0 w-11 cursor-pointer",
            "-my-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          onMouseMove={(e) => setHovered(indexAt(e.clientY))}
          onMouseLeave={() => setHovered(null)}
          onBlur={() => setHovered(null)}
          onFocus={() => setHovered((c) => c ?? focus)}
          onClick={(e) => {
            const target = headings[indexAt(e.clientY)];
            if (target) onJump(target.id);
            e.currentTarget.blur();
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              move(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              move(-1);
            } else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const target = headings[focus];
              if (target) onJump(target.id);
            }
          }}
        >
          {headings.map((h, i) => {
            const distance = hovered === null ? null : Math.abs(i - hovered);
            return (
              <span
                key={h.id}
                aria-hidden="true"
                className={cn(
                  "-translate-y-1/2 pointer-events-none absolute right-0 h-0.5 rounded-full",
                  "transition-[width,background-color] duration-150 ease-out-strong",
                  distance === 0
                    ? "w-6"
                    : distance === 1
                      ? "w-4"
                      : distance === 2
                        ? "w-2.5"
                        : // Sub-headings read as shorter ticks, so the rail
                          // carries the same hierarchy the column does.
                          h.level === 3
                          ? "w-1.5"
                          : "w-2",
                  h.id === active ? "bg-foreground/90" : "bg-muted-foreground/40",
                )}
                style={{ top: (i / Math.max(1, headings.length - 1)) * 100 + "%" }}
              />
            );
          })}
        </button>

        {hovered !== null && headings[hovered] && (
          <span
            className={cn(
              "-translate-y-1/2 pointer-events-none absolute right-9 max-w-56 whitespace-nowrap",
              "panel-glass rounded-lg border px-2.5 py-1.5 text-xs",
              "transition-[opacity,translate] duration-150 ease-out-strong",
            )}
            style={{ top: (hovered / Math.max(1, headings.length - 1)) * 100 + "%" }}
          >
            <span className="block truncate">{headings[hovered]!.text}</span>
          </span>
        )}
      </div>
    </div>
  );
}
