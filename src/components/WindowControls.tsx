import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * Minimise / maximise / close for an undecorated window.
 *
 * The window is created with `decorations: false` so the app's own header *is*
 * the title bar — one bar instead of the OS bar stacked on top of ours. That
 * trade is the whole point: it buys ~32px of vertical space and lets the
 * chrome match the app, but it means these three buttons, the drag region and
 * the maximise state are now our responsibility.
 *
 * Sized and spaced to Windows' own controls (46×32) so muscle memory still
 * works — this is the one place where matching the OS beats matching the app.
 */
/**
 * `getCurrentWindow()` reads Tauri internals off `window` and throws outright
 * when they are absent — in a browser, in tests, in Storybook. Unguarded it
 * took the entire tree down with it and rendered a blank page, which is a poor
 * trade for three buttons that simply have nothing to control.
 */
function currentWindow() {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
}

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  const available = Boolean(currentWindow());

  useEffect(() => {
    const win = currentWindow();
    if (!win) return;
    let unlisten: (() => void) | undefined;

    void win.isMaximized().then(setMaximized).catch(() => {});
    void win
      .onResized(() => {
        void win.isMaximized().then(setMaximized).catch(() => {});
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => unlisten?.();
  }, []);

  const win = () => currentWindow();

  const controls = [
    {
      label: "Minimise",
      icon: Minus,
      onClick: () => void win()?.minimize().catch(() => {}),
      danger: false,
    },
    {
      label: maximized ? "Restore" : "Maximise",
      // Two overlapping squares read as "restore"; one reads as "maximise".
      icon: maximized ? Copy : Square,
      onClick: () => void win()?.toggleMaximize().catch(() => {}),
      danger: false,
    },
    {
      label: "Close",
      icon: X,
      onClick: () => void win()?.close().catch(() => {}),
      danger: true,
    },
  ];

  // Nothing to control outside a Tauri window; the OS still owns the frame.
  if (!available) return null;

  return (
    <div className="flex h-full items-stretch">
      {controls.map(({ label, icon: Icon, onClick, danger }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          title={label}
          onClick={onClick}
          className={cn(
            "inline-flex w-[46px] cursor-default items-center justify-center",
            // Stronger than the usual muted chrome: on the home route these
            // sit directly on the sky rather than on glass, and zinc-500 on a
            // bright blue is barely there.
            "text-foreground/80 transition-colors duration-100",
            danger
              ? "hover:bg-[#c42b1c] hover:text-white"
              : "hover:bg-accent hover:text-foreground",
          )}
        >
          <Icon className={cn(danger ? "size-4" : "size-3.5")} strokeWidth={danger ? 2 : 2.5} />
        </button>
      ))}
    </div>
  );
}
