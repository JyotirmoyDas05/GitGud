/**
 * Pixel wipe between two routes, radiating from a point.
 *
 * Builds a fixed grid of squares over the window, fills them in outward from
 * `origin` with staggered delays, runs `swap` (the navigation) once the screen
 * is covered, then clears the squares in the same order. Plain DOM and CSS
 * animations: nothing here needs React, and CSS keeps the frames on the
 * compositor while the new route renders underneath.
 *
 * Used once, for leaving Home the first time. Rare enough to earn the delight.
 */
export async function pixelTransition(origin: { x: number; y: number }, swap: () => void) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    swap();
    return;
  }

  const CELL = 40;
  const cols = Math.ceil(window.innerWidth / CELL);
  const rows = Math.ceil(window.innerHeight / CELL);

  const grid = document.createElement("div");
  grid.className = "gg-pixels";
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  // Delay is proportional to distance from the origin, with a little jitter so
  // the wavefront looks hand-placed rather than a perfect circle.
  const maxDist = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const SPREAD = 380;
  let longest = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * CELL;
      const cy = (r + 0.5) * CELL;
      const d = Math.hypot(cx - origin.x, cy - origin.y) / maxDist;
      const delay = Math.round(d * SPREAD + Math.random() * 60);
      longest = Math.max(longest, delay);
      const cell = document.createElement("i");
      cell.style.setProperty("--d", `${delay}ms`);
      grid.appendChild(cell);
    }
  }

  document.body.appendChild(grid);
  const FRAME = 160; // keep in sync with the keyframe duration in index.css

  await wait(longest + FRAME);
  swap();
  // Let the new route commit and paint behind the wall before it comes down.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  grid.dataset.phase = "out";
  await wait(longest + FRAME);
  grid.remove();
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
