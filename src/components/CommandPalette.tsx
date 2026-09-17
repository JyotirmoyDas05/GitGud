import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CornerDownLeft, Search } from "lucide-react";

import { search, type SearchHit } from "~/lib/search";
import { navigate } from "~/lib/router";
import { revealSearchHit } from "~/lib/searchHighlight";
import { cn } from "~/lib/utils";

/**
 * Search across every challenge — Ctrl/Cmd+K.
 *
 * Results are sections, not pages, and selecting one jumps to that heading's
 * anchor rather than the top of the challenge. With eleven challenges of dense
 * instructions, "where did it explain upstream?" is the common question, and
 * landing on the page is only half an answer.
 */
export function CommandPalette({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => (open ? search(locale, query) : []), [open, locale, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(hit: SearchHit) {
    setOpen(false);
    navigate({ name: "challenge", id: hit.challengeId });
    // The route has to render before the anchor exists.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Scrolling alone leaves you at the right heading with no idea which
        // words matched — the highlight is the other half of the answer.
        revealSearchHit({ headingId: hit.headingId, query });
      }),
    );
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-8 w-full cursor-pointer items-center gap-2 rounded-[var(--control-radius)]",
          "border border-input bg-popover px-2.5 text-muted-foreground text-sm shadow-xs",
          "transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
          "dark:bg-input/32 dark:hover:bg-input/50",
        )}
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop
            className={cn(
              "fixed inset-0 z-40 bg-background/60 backdrop-blur-[3px]",
              "transition-opacity duration-120 ease-out-strong",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[ending-style]:duration-80",
            )}
          />
          <Dialog.Popup
            className={cn(
              "panel-glass fixed top-[12vh] left-1/2 z-50 w-[min(38rem,calc(100vw-2rem))]",
              "-translate-x-1/2 overflow-hidden rounded-xl border outline-none",
              // Keyboard-toggled, so it is kept brisk: 120ms in, 80ms out.
              // `translate`/`scale` are their own properties in Tailwind v4 and
              // must be named here or they snap instead of animating.
              "transition-[translate,scale,opacity,filter] duration-120 ease-out-strong",
              "data-[starting-style]:-translate-y-2 data-[starting-style]:scale-[0.98]",
              "data-[starting-style]:opacity-0 data-[starting-style]:blur-[3px]",
              "data-[ending-style]:-translate-y-2 data-[ending-style]:scale-[0.98]",
              "data-[ending-style]:opacity-0 data-[ending-style]:blur-[3px]",
              "data-[ending-style]:duration-80",
            )}
          >
            <Dialog.Title className="sr-only">Search challenges</Dialog.Title>

            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search challenges…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                  {hits.length}
                </span>
              )}
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
              {query.trim().length < 2 && (
                <p className="px-2.5 py-6 text-center text-muted-foreground text-sm">
                  Type at least two characters.
                </p>
              )}

              {query.trim().length >= 2 && hits.length === 0 && (
                <p className="px-2.5 py-6 text-center text-muted-foreground text-sm">
                  Nothing matches “{query.trim()}”.
                </p>
              )}

              {hits.map((hit, i) => (
                <button
                  key={`${hit.challengeId}-${hit.headingId}-${i}`}
                  type="button"
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(hit)}
                  className={cn(
                    "block w-full cursor-pointer rounded-md px-2.5 py-2 text-left",
                    active === i ? "bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-medium text-sm">
                      {hit.heading || hit.challengeTitle}
                    </span>
                    <span className="ml-auto shrink-0 text-muted-foreground text-[11px]">
                      {hit.challengeIndex + 1}. {hit.challengeTitle}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                    <Highlight text={hit.snippet} at={hit.matchAt} length={hit.matchLength} />
                  </p>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 border-t px-3 py-1.5 text-muted-foreground text-[11px]">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="size-3" /> open
              </span>
              <span>↑↓ navigate</span>
              <span>esc close</span>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/** Marks the matched span without running a regex over untrusted input. */
function Highlight({ text, at, length }: { text: string; at: number; length: number }) {
  if (at < 0 || length <= 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[3px] bg-primary/20 text-foreground">
        {text.slice(at, at + length)}
      </mark>
      {text.slice(at + length)}
    </>
  );
}
