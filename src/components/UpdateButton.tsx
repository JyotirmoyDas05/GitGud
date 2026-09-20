import { useCallback, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { confirm } from "@tauri-apps/plugin-dialog";
import { ArrowDownToLine, Check, RefreshCw, RotateCw, TriangleAlert } from "lucide-react";

import {
  checkForUpdate,
  downloadUpdate,
  installConfirmation,
  installUpdate,
  isUpdateBusy,
  updateAction,
  updateLabel,
  useUpdateState,
  type UpdateState,
} from "~/lib/updater";
import { cn } from "~/lib/utils";

/**
 * The update control, pinned to the bottom-right of the sidebar.
 *
 * Follows T3 Code's `SidebarUpdatePill`: a single round icon button whose
 * action is derived from the update state rather than a row of buttons for
 * check / download / install, and a hover popup carrying the version and the
 * release notes. One control, because at any moment there is only ever one
 * sensible thing to do.
 *
 * Errors are shown in that popup rather than raised as toasts. T3 Code has a
 * toast system already; adding one here to report a failed release-feed fetch
 * would be a dependency bought for the least important message in the app.
 */
export function UpdateButton() {
  const state = useUpdateState();
  const [pressed, setPressed] = useState(false);

  const action = updateAction(state);
  const busy = isUpdateBusy(state);
  const label = updateLabel(state);

  const onPress = useCallback(async () => {
    if (busy || pressed) return;
    setPressed(true);
    try {
      if (action === "download") {
        await downloadUpdate();
      } else if (action === "install") {
        // The one action in the app that takes the window away, so it asks
        // first and says what it will cost.
        if (await confirm(installConfirmation(state), { title: "Restart to update?" })) {
          await installUpdate();
        }
      } else if (action === "check") {
        await checkForUpdate();
      }
    } finally {
      setPressed(false);
    }
  }, [action, busy, pressed, state]);

  // Nothing to update outside a packaged app, so nothing to show.
  if (state.status === "unsupported") return null;

  const interactive = action !== "none" && !pressed;
  const highlight = state.status === "available" || state.status === "downloaded";

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={250}
        closeDelay={120}
        disabled={!interactive}
        aria-label={label}
        onClick={onPress}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
          "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          interactive ? "cursor-pointer" : "cursor-default",
          highlight
            ? "bg-success-surface text-success-foreground hover:bg-success/16"
            : state.status === "error"
              ? "text-warning-foreground hover:bg-sidebar-row-hover"
              : "text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
        )}
      >
        <UpdateIcon state={state} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner sideOffset={8} side="top" align="end" className="z-50 outline-none">
          <Popover.Popup
            className={cn(
              "panel-glass max-w-72 origin-[var(--transform-origin)] rounded-xl border p-3",
              "text-sm outline-none",
              "transition-[scale,opacity,filter] duration-140 ease-out-strong",
              "data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0",
              "data-[starting-style]:blur-[2px]",
              "data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0",
              "data-[ending-style]:blur-[2px] data-[ending-style]:duration-100",
            )}
          >
            <p className="font-medium">{label}</p>

            {state.notes && (state.status === "available" || state.status === "downloaded") && (
              // Straight from the GitHub Release body, which this project
              // already generates from CHANGELOG.md — so what a learner reads
              // here is the same text as the release page.
              <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line text-muted-foreground text-xs leading-relaxed">
                {state.notes.trim()}
              </p>
            )}

            {state.status === "error" && state.message && (
              <p className="mt-2 break-words text-muted-foreground text-xs">{state.message}</p>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const RING_RADIUS = 11;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function UpdateIcon({ state }: { state: UpdateState }) {
  switch (state.status) {
    case "checking":
      return <RefreshCw className="size-3.5 animate-spin motion-reduce:animate-none" />;

    case "available":
      return <ArrowDownToLine className="size-3.5" />;

    case "downloading":
      return <DownloadRing percent={state.downloadPercent} />;

    case "downloaded":
      return <RotateCw className="size-3.5" />;

    case "error":
      return <TriangleAlert className="size-3.5" />;

    default:
      // Up to date after a real check reads as a result; before one it is
      // just the affordance to run it.
      return state.checkedAt === null ? (
        <RefreshCw className="size-3.5" />
      ) : (
        <Check className="size-3.5" />
      );
  }
}

/**
 * Progress drawn as a ring around the button, as T3 Code does it.
 *
 * A bar would need a row of its own in a column this narrow. The ring reports
 * the same thing inside the space the button already occupies.
 */
function DownloadRing({ percent }: { percent: number | null }) {
  const clamped = percent === null ? null : Math.min(100, Math.max(0, percent));

  return (
    <span className="relative grid size-7 place-items-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 28 28"
        className={cn(
          "pointer-events-none absolute inset-0 size-full -rotate-90",
          // No length to divide by means no honest percentage, so the ring
          // spins instead of claiming one.
          clamped === null && "animate-spin motion-reduce:animate-none",
        )}
      >
        <circle
          cx="14"
          cy="14"
          r={RING_RADIUS}
          fill="none"
          stroke="color-mix(in srgb, currentColor 20%, transparent)"
          strokeWidth="1.5"
        />
        <circle
          cx="14"
          cy="14"
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={
            clamped === null
              ? RING_CIRCUMFERENCE * 0.75
              : RING_CIRCUMFERENCE * (1 - clamped / 100)
          }
        />
      </svg>
      <ArrowDownToLine className="size-3" />
    </span>
  );
}
