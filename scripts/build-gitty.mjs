/**
 * Turns the two Gitty-chan clips into animated WebP sprites.
 *
 * The clips arrive as H.264, which has no alpha channel, so the editor's
 * transparency checkerboard is baked into the pixels. It has to be keyed out,
 * and the key is safe because of a measured gap: the checkerboard greys never
 * drop below 212, while the lightest colour in the sprite (the beard) tops out
 * at 187. Anything desaturated and brighter than the threshold is background.
 *
 * Animated WebP rather than a sprite sheet: 161 frames of a 480x270 sheet is a
 * ~10MB decoded texture held for the life of the page, where the WebP is a
 * ~100KB file the browser decodes frame by frame. The one thing a sheet buys —
 * playing a run once and stopping — is handled by encoding the acting clip
 * with a loop count of 1 and remounting the image to replay it.
 *
 * Usage: node scripts/build-gitty.mjs   (needs ffmpeg on PATH)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "assets", "gitty");
const OUT = path.join(root, "public", "gitty");
const WORK = path.join(root, ".screenshots", "gitty-build");

/** Native sprite size. Displayed at 2x, so it stays a clean integer upscale. */
const W = 240;
const H = 135;

/**
 * Half of the clips' 24fps. Twelve is the usual rate for sprite animation and
 * it halves the file, which matters more than the smoothness does here: lossy
 * WebP would have saved as much but smears the flat colours pixel art is made
 * of, so dropping frames is the cheaper compromise.
 */
const KEEP_EVERY = 2;
const FPS = 12;

/** Above this, a desaturated pixel is the editor's checkerboard. */
const KEY_LUM = 212;
/** Below this it is sprite. Between the two, alpha ramps, which softens the cut. */
const KEEP_LUM = 198;
const KEY_SAT = 12;

const CLIPS = [
  { name: "gitty-rest", file: "Gitty-chan-resting.mp4", loop: 0 },
  { name: "gitty-act", file: "Gitty-chan-acting.mp4", loop: 1 },
];

mkdirSync(OUT, { recursive: true });

for (const clip of CLIPS) {
  const frames = path.join(WORK, clip.name);
  rmSync(frames, { force: true, recursive: true });
  mkdirSync(frames, { recursive: true });

  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-i", path.join(SOURCE, clip.file),
    path.join(frames, "%04d.png"),
  ]);

  const cut = path.join(WORK, `${clip.name}-cut`);
  rmSync(cut, { force: true, recursive: true });
  mkdirSync(cut, { recursive: true });

  const names = readdirSync(frames).sort().filter((_, i) => i % KEEP_EVERY === 0);
  for (const [index, name] of names.entries()) {
    // Downsample first: nearest picks one pixel per block, which discards most
    // of the compression fringe along the sprite's edges before it is judged.
    const { data, info } = await sharp(path.join(frames, name))
      .resize(W, H, { kernel: "nearest" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const rgba = Buffer.alloc(W * H * 4);
    for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = Math.min(r, g, b);
      const sat = Math.max(r, g, b) - lum;

      let alpha = 255;
      if (sat <= KEY_SAT && lum >= KEY_LUM) alpha = 0;
      else if (sat <= KEY_SAT && lum > KEEP_LUM) {
        alpha = Math.round(((KEY_LUM - lum) / (KEY_LUM - KEEP_LUM)) * 255);
      }

      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = alpha;
    }

    await sharp(rgba, { raw: { channels: 4, height: H, width: W } })
      .png()
      .toFile(path.join(cut, `${String(index + 1).padStart(4, "0")}.png`));
  }

  const out = path.join(OUT, `${clip.name}.webp`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-framerate", String(FPS),
    "-i", path.join(cut, "%04d.png"),
    "-c:v", "libwebp_anim",
    "-lossless", "1",
    "-compression_level", "6",
    "-loop", String(clip.loop),
    out,
  ]);

  console.log(`${clip.name}: ${names.length} frames -> ${out}`);

  // A still for `prefers-reduced-motion`: the point of the sprite is that a
  // character is there, which a single frame still carries.
  if (clip.name === "gitty-rest") {
    await sharp(path.join(cut, "0001.png"))
      .webp({ lossless: true })
      .toFile(path.join(OUT, "gitty-still.webp"));
  }
}
