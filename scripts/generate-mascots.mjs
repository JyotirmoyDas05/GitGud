#!/usr/bin/env node
//
// Generates the pool of guide characters shipped in public/mascots/.
//
// Run at build time, never at runtime: the avatars are static SVGs, so the
// app carries no DiceBear dependency and the bundle does not grow by 31
// style definitions to show eleven pictures.
//
//   node scripts/generate-mascots.mjs
//
// DiceBear core is MIT. Individual styles carry their own licences, which is
// why the manifest records creator + licence per avatar — about.html builds
// its attribution list from it, so a CC BY style can never be shipped
// uncredited by accident.

import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createAvatar } from "@dicebear/core";
import * as collection from "@dicebear/collection";

const OUT = "public/mascots";
// The manifest is imported by JS, so it belongs in src/. Vite refuses to let
// code import out of public/ — that directory is copied verbatim, not bundled.
const MANIFEST = "src/mascots.json";

// Human-figure styles only. The abstract ones (identicon, rings, shapes,
// glass) and the object ones (bottts, icons) are excluded: the mascot is
// meant to read as a character guiding you, not as a placeholder.
//
// `moods` and `marbles` are missing on purpose — they exist in the Rust
// crate but not in npm @dicebear/collection 9.4.x. Phase 6 brings the Rust
// generator in for the quilt; fold them in there.
const STYLES = [
  "adventurer",
  "adventurerNeutral",
  "avataaars",
  "avataaarsNeutral",
  "bigEars",
  "bigEarsNeutral",
  "bigSmile",
  "croodles",
  "croodlesNeutral",
  "dylan",
  "lorelei",
  "loreleiNeutral",
  "micah",
  "miniavs",
  "notionists",
  "notionistsNeutral",
  "openPeeps",
  "personas",
  "pixelArt",
  "pixelArtNeutral",
  "toonHead",
];

// Muted enough to sit on either the light or the dark app background without
// one avatar shouting over the rest.
const BACKGROUNDS = [
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
  "c8e6c9",
  "f8d7a3",
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const manifest = [];

for (const name of STYLES) {
  const style = collection[name];
  if (!style) {
    console.warn(`skipped ${name} — not in this @dicebear/collection version`);
    continue;
  }

  // A solid background is not decoration: the "Neutral" variants draw only
  // facial features, so on a transparent canvas they render as eyes and a
  // mouth floating in space. The colour gives them a head to sit on.
  // Picked per style so the cast reads as a set rather than a clash.
  const background = BACKGROUNDS[manifest.length % BACKGROUNDS.length];

  const svg = createAvatar(style, {
    seed: `git-gud/${name}`,
    size: 96,
    radius: 50,
    backgroundColor: [background],
  }).toString();

  writeFileSync(join(OUT, `${name}.svg`), svg);

  manifest.push({
    id: name,
    title: style.meta?.title ?? name,
    creator: style.meta?.creator ?? "Unknown",
    license: style.meta?.license?.name ?? "Unknown",
    licenseUrl: style.meta?.license?.url ?? "",
    source: style.meta?.source ?? "",
  });
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

const bytes = readdirSync(OUT)
  .filter((f) => f.endsWith(".svg"))
  .reduce((sum, f) => sum + statSync(join(OUT, f)).size, 0);

console.log(
  `Generated ${manifest.length} mascots — ${(bytes / 1024).toFixed(0)} kB total.`,
);

const needAttribution = manifest.filter((m) => m.license.startsWith("CC BY"));
if (needAttribution.length) {
  console.log(
    `Attribution required for ${needAttribution.length}: ` +
      needAttribution.map((m) => `${m.title} (${m.creator})`).join(", "),
  );
}
