import { useEffect, useRef, useState } from "react";

/**
 * The full-bleed pixel landscape behind the home page, and Gitty-chan standing
 * on its grass.
 *
 * The whole thing hangs off one geometric idea. The scene is pinned to the
 * bottom of the pane and locked to the artwork's own aspect ratio, so its
 * height is always `paneWidth / ASPECT` no matter how the window is sized.
 * That makes every position inside it expressible as a percentage that stays
 * true at any size — including the one that matters, the line where grass
 * meets sky. Sizing the scene with `cover` instead would have moved that line
 * around as the pane's proportions changed, and Gitty would drift off the
 * ground.
 *
 * Measured from the artwork rather than eyeballed: grass starts at 87.6% of
 * the light image's height and 88.4% of the dark one's, which is close enough
 * to share a single value.
 */

/** Both backgrounds are cropped to this, so one set of offsets fits both. */
const ASPECT = 1000 / 563;

/** Where the grass begins, as a fraction of scene height. */
const GROUND = 0.895;

/** Gitty's frame height, as a fraction of scene height. */
const GITTY_HEIGHT = 0.32;

/** In the sprite, the feet sit 6.7% of the frame above its bottom edge. */
const FEET_INSET = 0.067;

/** 81 frames at 12fps. After this the acting clip has finished its one loop. */
const ACT_MS = 6750;

export function HomeScene({ dark }: { dark: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Fills the band above the artwork when the pane is taller than the
          scene, so the sky reaches the top instead of ending on an edge. Both
          values are the average of their image's top rows, so the join is
          invisible rather than a stripe of nearly-the-right blue. */}
      <div className="absolute inset-0 bg-[#379ed9] dark:bg-[#182650]" />

      <div className="absolute inset-x-0 bottom-0" style={{ aspectRatio: String(ASPECT) }}>
        <img
          src={dark ? "/brand/home-bg-dark.webp" : "/brand/home-bg-light.webp"}
          alt=""
          className="absolute inset-0 h-full w-full select-none object-cover object-bottom"
          style={{ imageRendering: "pixelated" }}
        />

        <Gitty dark={dark} />
      </div>
    </div>
  );
}

function Gitty({ dark }: { dark: boolean }) {
  const [acting, setActing] = useState(false);
  /** Bumped per theme change so the clip replays even if it is already shown. */
  const [take, setTake] = useState(0);
  // Compared against, rather than a "have I run once" flag: React invokes
  // effects twice on mount in development, which would have read as a theme
  // change and had Gitty cast a spell at every page load.
  const previous = useRef(dark);
  const reduce = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (previous.current === dark) return;
    previous.current = dark;
    if (reduce.current) return;

    setActing(true);
    setTake((n) => n + 1);
    const timer = window.setTimeout(() => setActing(false), ACT_MS);
    return () => window.clearTimeout(timer);
  }, [dark]);

  const src = reduce.current
    ? "/gitty/gitty-still.webp"
    : acting
      ? `/gitty/gitty-act.webp?take=${take}`
      : "/gitty/gitty-rest.webp";

  return (
    <img
      // Remounting is what restarts the clip: the acting sprite is encoded
      // with a loop count of one, so it holds its last frame rather than
      // repeating, and a fresh element plus a fresh URL is the reliable way to
      // make the browser play it again.
      key={acting ? `act-${take}` : "rest"}
      src={src}
      alt=""
      className="absolute select-none"
      style={{
        aspectRatio: "240 / 135",
        // Raise the frame so the feet land on the grass rather than the frame
        // bottom, which sits lower.
        bottom: `${(1 - GROUND - FEET_INSET * GITTY_HEIGHT) * 100}%`,
        height: `${GITTY_HEIGHT * 100}%`,
        imageRendering: "pixelated",
        left: "6%",
      }}
    />
  );
}
