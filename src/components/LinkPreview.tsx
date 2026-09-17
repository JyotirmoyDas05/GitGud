import { useEffect, useState } from "react";
import { PreviewCard } from "@base-ui/react/preview-card";

import { cn } from "~/lib/utils";

/**
 * Hover preview for external links, in the manner of Aceternity's LinkPreview:
 * a small screenshot of the destination, fetched from microlink, floating
 * above the link after a short dwell.
 *
 * One card serves every link in the rendered content. The content is plain
 * HTML built outside React, so instead of wrapping each anchor in a trigger
 * the hover is detected by delegation on the content root and the card is
 * anchored to whichever link is under the pointer.
 *
 * ponytail: microlink's free tier is rate-limited (~50 screenshots a day per
 * IP); a miss just shows the domain. Self-host or cache if it ever matters.
 */
export function LinkPreview({ rootRef }: { rootRef: React.RefObject<HTMLElement | null> }) {
  const [anchor, setAnchor] = useState<HTMLAnchorElement | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<"pending" | "ok" | "failed">("pending");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let openTimer = 0;
    let closeTimer = 0;
    const linkOf = (e: Event) =>
      (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="http"]') ?? null;

    function over(e: MouseEvent) {
      const link = linkOf(e);
      if (!link) return;
      window.clearTimeout(closeTimer);
      window.clearTimeout(openTimer);
      // 450ms dwell: a pointer passing over a link on its way elsewhere should
      // not summon a card.
      openTimer = window.setTimeout(() => {
        setAnchor((prev) => {
          if (prev !== link) setLoaded("pending");
          return link;
        });
        setOpen(true);
      }, 450);
    }

    function out(e: MouseEvent) {
      if (!linkOf(e)) return;
      window.clearTimeout(openTimer);
      closeTimer = window.setTimeout(() => setOpen(false), 120);
    }

    root.addEventListener("mouseover", over);
    root.addEventListener("mouseout", out);
    return () => {
      root.removeEventListener("mouseover", over);
      root.removeEventListener("mouseout", out);
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, [rootRef]);

  const url = anchor?.href ?? "";
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* not a URL we can preview */
  }

  const shot = url
    ? `https://api.microlink.io/?${new URLSearchParams({
        url,
        screenshot: "true",
        meta: "false",
        embed: "screenshot.url",
        colorScheme: "dark",
        "viewport.isMobile": "true",
        "viewport.deviceScaleFactor": "1",
        "viewport.width": "720",
        "viewport.height": "450",
      })}`
    : "";

  return (
    <PreviewCard.Root open={open && !!anchor} onOpenChange={setOpen}>
      <PreviewCard.Portal>
        <PreviewCard.Positioner
          anchor={anchor}
          side="top"
          sideOffset={8}
          className="pointer-events-none z-50"
        >
          <PreviewCard.Popup
            className={cn(
              "panel-glass w-60 origin-[var(--transform-origin)] overflow-hidden rounded-xl border p-1",
              "transition-[translate,scale,opacity,filter] duration-160 ease-out-strong",
              "data-[starting-style]:translate-y-1 data-[starting-style]:scale-[0.96]",
              "data-[starting-style]:opacity-0 data-[starting-style]:blur-[2px]",
              "data-[ending-style]:translate-y-1 data-[ending-style]:scale-[0.96]",
              "data-[ending-style]:opacity-0 data-[ending-style]:blur-[2px]",
              "data-[ending-style]:duration-100",
            )}
          >
            <div className="relative aspect-[8/5] overflow-hidden rounded-lg bg-muted">
              {loaded !== "failed" && shot && (
                <img
                  key={shot}
                  src={shot}
                  alt=""
                  width={240}
                  height={150}
                  onLoad={() => setLoaded("ok")}
                  onError={() => setLoaded("failed")}
                  className={cn(
                    "block h-full w-full object-cover object-top",
                    "transition-opacity duration-200 ease-out-strong",
                    loaded === "ok" ? "opacity-100" : "opacity-0",
                  )}
                />
              )}
              {loaded !== "ok" && (
                <div className="absolute inset-0 grid place-items-center text-muted-foreground text-xs">
                  {loaded === "failed" ? "No preview" : "Loading…"}
                </div>
              )}
            </div>
            <p className="truncate px-1.5 pt-1.5 pb-0.5 text-muted-foreground text-[11px]">{host}</p>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
