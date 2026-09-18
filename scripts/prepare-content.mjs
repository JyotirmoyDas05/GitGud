#!/usr/bin/env node
//
// One-time normalization of the content imported from git-it-electron.
// Rewrites in place. Safe to re-run: every substitution is idempotent.
//
//   node scripts/prepare-content.mjs
//
// Kept in the repo only because re-importing a locale later is plausible.
// Delete it once the content has diverged enough that a re-import is off
// the table.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/content";
const OLD_REPO = "jlord/patchwork";
const NEW_REPO = "JyotirmoyDas05/git-gud-verifywork";
const NEW_NAME = "git-gud-verifywork";

/** Every .html under src/content, any locale. */
function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* htmlFiles(path);
    else if (entry.endsWith(".html")) yield path;
  }
}

const substitutions = [
  // Assets now live in public/, served from the web root.
  [/\.\.\/\.\.\/\.\.\/assets\/imgs\//g, "/imgs/"],

  // The Handlebars slots become a marker the renderer splits on, so the verify
  // block keeps its original mid-page position instead of being appended.
  [/\{\{\{\s*verify_(directory_)?button\s*\}\}\}/g, "<!--VERIFY-->"],

  // Point at our own companion repo. Longest patterns first so a shorter one
  // cannot eat part of a longer match.
  [/https?:\/\/jlord\.github\.io\/patchwork/g, "https://jyotirmoydas05.github.io/git-gud-verifywork"],
  [/jlord\.github\.io\/patchwork/g, "jyotirmoydas05.github.io/git-gud-verifywork"],
  [new RegExp(`https?://github\\.com/${OLD_REPO}`, "g"), `https://github.com/${NEW_REPO}`],
  [new RegExp(`github\\.com/${OLD_REPO}`, "g"), `github.com/${NEW_REPO}`],
  [new RegExp(OLD_REPO, "g"), NEW_REPO],

  // Bug #10: "Patchwork/contributors/add-yourusername.txt" read as a literal
  // path to ~16% of users, who then created a nested Patchwork/ folder inside
  // the repo. Name the folder once, unambiguously.
  [/<strong>Patchwork\/contributors\/add-yourusername\.txt<\/strong>/g,
   "<strong>contributors/add-yourusername.txt</strong>"],
  [/the 'contributors' folder in Patchwork:/g,
   "the 'contributors' folder at the top level of the repository:"],

  // Bare repo-name mentions in prose and paths.
  [/YOURUSERNAME\/patchwork/g, `YOURUSERNAME/${NEW_NAME}`],
  [/yourusername\.github\.io\/patchwork/g, `yourusername.github.io/${NEW_NAME}`],
  [/yourusername\/patchwork/g, `yourusername/${NEW_NAME}`],
  [/'patchwork'/g, `'${NEW_NAME}'`],
  [/cd patchwork/g, `cd ${NEW_NAME}`],
  // Catch-all, last: the translations use localized username placeholders
  // ("tunombredeusuario/patchwork", "TUNOMBREDEUSUARIO/patchwork") that no
  // English-shaped pattern above can anticipate.
  [/\bpatchwork\b/gi, NEW_NAME],

  // Challenge 8 now uses our own bot, not the dead reporobot service.
  // Case-insensitive: the prose capitalizes it mid-sentence ("Reporobot added
  // your name"), and a case-sensitive pass leaves most mentions behind. The
  // negative lookahead spares the image filename, which still exists.
  [/\breporobot\b(?!\.png)/gi, "gitgud-verifybot"],

  // The collaborator settings page moved years ago.
  [/settings\/collaboration/g, "settings/access"],

  // The product is called Git Gud now. about.html is not normalized — it is
  // hand-written per locale, because the original described Electron and
  // credited its own author.
  [/\bGit-it\b/g, "Git Gud"],
  [/\bgit-it\b/g, "Git Gud"],
];

let changed = 0;

for (const file of htmlFiles(ROOT)) {
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const [pattern, replacement] of substitutions) {
    after = after.replace(pattern, replacement);
  }
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

console.log(`Normalized ${changed} file(s).`);
