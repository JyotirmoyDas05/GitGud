/**
 * Artwork behind the top of the sidebar, following T3 Code's
 * `sidebar-stage-backdrop`.
 *
 * Two fades stacked, which is what makes it read as *bleeding* rather than as
 * a banner that stops:
 *
 *   1. A mask takes the image itself to fully transparent by 92% of its height.
 *   2. An `::after` gradient in the sidebar's own colour washes over the lower
 *      two-thirds.
 *
 * Either alone leaves a visible edge — the mask ends on whatever is behind it,
 * the gradient never quite reaches zero. Together the art dissolves into the
 * panel with nothing to point at.
 */
export function SidebarArt() {
  return (
    <div
      aria-hidden="true"
      className="sidebar-art pointer-events-none absolute inset-x-0 top-0 z-0 h-20 select-none overflow-hidden"
    >
      <img
        src="/brand/header-art.png"
        alt=""
        className="h-full w-full object-cover"
        // Pixel art: let the hard edges stay hard instead of being smoothed
        // into mush by the browser's default bilinear scaling.
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
