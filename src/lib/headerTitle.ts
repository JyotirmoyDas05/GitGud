import { useSyncExternalStore } from "react";

/**
 * The title currently promoted into the header.
 *
 * A route sets this when its own on-page heading scrolls out of view, so the
 * bar can pick it up and the user never loses track of where they are. A
 * module-level store rather than context: the producer (a view) and the
 * consumer (the shell's header) sit on opposite sides of the tree, and
 * threading a provider between them would only exist to carry two strings.
 */

export interface HeaderTitle {
  eyebrow: string;
  title: string;
  /** Mascot id, so the guide travels up with the heading it belongs to. */
  mascotId?: string;
}

let current: HeaderTitle | null = null;
const listeners = new Set<() => void>();

export function setHeaderTitle(next: HeaderTitle | null) {
  // Reference equality is not enough — the view re-renders and would otherwise
  // publish an equal-but-new object on every scroll frame.
  if (
    current?.title === next?.title &&
    current?.eyebrow === next?.eyebrow &&
    current?.mascotId === next?.mascotId
  ) {
    return;
  }
  current = next;
  for (const l of listeners) l();
}

export function useHeaderTitle(): HeaderTitle | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => current,
    () => null,
  );
}
