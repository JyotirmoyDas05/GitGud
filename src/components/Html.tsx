import { useEffect, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

import { LinkPreview } from "~/components/LinkPreview";
import { highlight } from "~/lib/shellHighlight";

/** Lucide `copy`, inlined: this DOM is built imperatively, outside React. */
const COPY_ICON =
  '<svg class="gg-icon gg-icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

/** Lucide `check`. */
const CHECK_ICON =
  '<svg class="gg-icon gg-icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

/** GitHub's mark, drawn in currentColor so it follows the theme (as T3 Code does). */
const GITHUB_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5 18 5.3 18 5.3c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>';

/** Lucide `globe`, the fallback when a site's favicon cannot be fetched. */
const GLOBE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>';

/** Hosts whose favicon already failed this session — go straight to the globe. */
const failedFaviconHosts = new Set<string>();

/**
 * Renders a trusted HTML fragment from `src/content/`.
 *
 * The HTML is ours — it ships in the bundle and never comes from the network
 * or from user input — so `dangerouslySetInnerHTML` is appropriate here. It
 * would not be for anything fetched at runtime.
 *
 * Behaviours are attached imperatively rather than by rewriting the content:
 * external links open in the system browser and gain a site icon, and every
 * shell snippet is syntax-coloured and gains a copy button. Doing it here
 * keeps the challenge HTML byte-identical to git-it's, which matters because
 * nine locales of it were translated by hand and a rewrite would have to be
 * redone per locale.
 */
export function Html({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // --- external links -------------------------------------------------
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link) return;

      const url = link.getAttribute("href");
      if (!url || !/^https?:/i.test(url)) return;

      event.preventDefault();
      void openUrl(url);
    }

    root.addEventListener("click", onClick);

    for (const link of Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'))) {
      if (link.querySelector(".gg-favicon")) continue;
      link.prepend(favicon(link.href));
    }

    // --- copyable, coloured code blocks ------------------------------------
    const timers: number[] = [];

    for (const code of Array.from(root.querySelectorAll("code.shell, code.comment"))) {
      if (code.parentElement?.dataset.codeblock) continue;

      const isShell = code.classList.contains("shell");
      // Spans only; `textContent` still yields the exact command for copying.
      if (isShell) code.innerHTML = highlight(code.textContent ?? "");

      const block = document.createElement("div");
      block.dataset.codeblock = "true";
      block.className = "gg-codeblock";

      const header = document.createElement("div");
      header.className = "gg-codeblock-header";

      const label = document.createElement("span");
      label.className = "gg-codeblock-label";
      label.textContent = isShell ? "terminal" : "output";
      header.appendChild(label);

      // Only shell snippets are meant to be run, so only those get a copy
      // button; copying sample output would just be a trap.
      if (isShell) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "gg-codeblock-copy";
        button.setAttribute("aria-label", "Copy command");
        // Two stacked icons rather than swapped text: text changes reflow the
        // header and the width jump is more distracting than the state change
        // it is announcing. Both icons occupy the same cell and cross-fade.
        button.innerHTML = `${COPY_ICON}${CHECK_ICON}`;

        button.addEventListener("click", () => {
          // The `$` prompt is drawn by CSS, not present in the text, so what
          // gets copied is exactly what should be pasted into a terminal.
          void navigator.clipboard.writeText(code.textContent ?? "").then(
            () => {
              button.dataset.copied = "true";
              button.setAttribute("aria-label", "Copied");
              timers.push(
                window.setTimeout(() => {
                  delete button.dataset.copied;
                  button.setAttribute("aria-label", "Copy command");
                }, 1600),
              );
            },
            () => {
              button.dataset.failed = "true";
              button.setAttribute("aria-label", "Could not copy — press Ctrl+C");
            },
          );
        });

        header.appendChild(button);
      }

      code.replaceWith(block);
      block.append(header, code);
    }

    return () => {
      root.removeEventListener("click", onClick);
      for (const t of timers) window.clearTimeout(t);
    };
  }, [html]);

  return (
    <>
      <div
        ref={ref}
        className={className}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: bundled content, see above
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <LinkPreview rootRef={ref} />
    </>
  );
}

/**
 * Site icon for a link, following T3 Code: GitHub gets its mark in
 * currentColor, everything else gets Google's favicon service with a globe
 * as the fallback.
 */
function favicon(href: string): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "gg-favicon";
  wrap.setAttribute("aria-hidden", "true");

  let host = "";
  try {
    host = new URL(href).hostname.toLowerCase();
  } catch {
    wrap.innerHTML = GLOBE_ICON;
    return wrap;
  }

  if (host === "github.com" || host.endsWith(".github.com")) {
    wrap.innerHTML = GITHUB_ICON;
    return wrap;
  }
  if (failedFaviconHosts.has(host)) {
    wrap.innerHTML = GLOBE_ICON;
    return wrap;
  }

  const img = document.createElement("img");
  img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
  img.alt = "";
  img.loading = "lazy";
  img.draggable = false;
  img.width = 14;
  img.height = 14;
  img.addEventListener("error", () => {
    failedFaviconHosts.add(host);
    wrap.innerHTML = GLOBE_ICON;
  });
  wrap.appendChild(img);
  return wrap;
}
