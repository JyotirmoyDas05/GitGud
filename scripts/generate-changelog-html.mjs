#!/usr/bin/env node
//
// Regenerates the release list on the site's changelog page from
// CHANGELOG.md, the same way scripts/cut-release.ps1 regenerates
// CHANGELOG.md itself from git history — one source of truth, no page to
// remember to hand-edit at release time.
//
// Usage: node scripts/generate-changelog-html.mjs
// Writes site/changelog.html in place, replacing only the region between
// the <!-- releases:start/end --> markers.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { bulletsIn } from "./generate-changelog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG_PATH = join(ROOT, "CHANGELOG.md");
const SITE_PATH = join(ROOT, "site", "changelog.html");

const VERSION_RE = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})[ \t]*$/gm;
const SUBHEADING_RE = /^### (.+)$/gm;

const TAG_CLASS = {
  Added: "cl-tag--added",
  Fixed: "cl-tag--fixed",
};

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** CHANGELOG.md bullets carry the same light Markdown generate-changelog.mjs
 *  writes: `code`, **bold**, and [text](url) commit links. Escaping first
 *  means the raw `&`/`<`/`>` in prose is safe, and none of these three
 *  patterns introduce characters that need escaping themselves. */
function inlineMarkdownToHtml(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function prettyDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Same shape as generate-changelog.mjs's per-commit `collect()`: split a
 *  release's body on its own "### Group" headings and pull bullets (with
 *  wrapped continuation lines) out of each one. */
function parseGroups(body) {
  const headings = [...body.matchAll(new RegExp(SUBHEADING_RE.source, "gm"))];
  const sections = body.split(/^### .+$/m).slice(1);
  const groups = [];
  headings.forEach((h, i) => {
    const bullets = bulletsIn(sections[i] ?? "");
    if (bullets.length > 0) groups.push({ name: h[1].trim(), bullets });
  });
  return groups;
}

function parseReleases(changelog) {
  const headings = [...changelog.matchAll(VERSION_RE)];
  return headings.map((match, i) => {
    const start = match.index + match[0].length;
    const end = headings[i + 1]?.index ?? changelog.length;
    return {
      version: match[1],
      date: match[2],
      groups: parseGroups(changelog.slice(start, end)),
    };
  });
}

function renderRelease(release, index) {
  const changes = release.groups
    .flatMap((group) =>
      group.bullets.map(
        (bullet) =>
          `              <li><span class="cl-tag ${TAG_CLASS[group.name] ?? "cl-tag--changed"}">${escapeHtml(group.name)}</span>${inlineMarkdownToHtml(bullet)}</li>`,
      ),
    )
    .join("\n");

  return `          <li class="cl-entry" data-rise style="--d:${200 + index * 40}ms">
            <div class="cl-dot"></div>
            <div class="cl-body tile">
              <div class="cl-meta">
                <span class="cl-version">v${release.version}</span>
                <span class="cl-date">${prettyDate(release.date)}</span>
              </div>
              <ul class="cl-changes">
${changes}
              </ul>
            </div>
          </li>`;
}

function main() {
  // cut-release.ps1 inserts each entry with `\r\n` while the entry body
  // itself (from generate-changelog.mjs, run under Node) is `\n`-only, so
  // CHANGELOG.md ends up with a stray `\r` at the seam between releases —
  // right on the last bullet of every section. bulletsIn()'s BULLET_RE has
  // no `s`/`m` flags, so `$` won't match before that trailing `\r`, and the
  // line silently falls through to the "continuation" branch instead of
  // starting a new bullet. Normalizing here (not in bulletsIn, which is also
  // used on `\n`-only git log text where this never comes up) fixes it at
  // the one call site that actually feeds it `\r`-containing input.
  const changelog = readFileSync(CHANGELOG_PATH, "utf8").replace(/\r\n?/g, "\n");
  const releases = parseReleases(changelog);
  const listHtml = releases.map(renderRelease).join("\n\n");

  const site = readFileSync(SITE_PATH, "utf8");
  const markerRe = /(<!-- releases:start -->\n)[\s\S]*?(\n\s*<!-- releases:end -->)/;
  if (!markerRe.test(site)) {
    throw new Error("site/changelog.html has no <!-- releases:start/end --> markers to replace");
  }
  const updated = site.replace(markerRe, `$1${listHtml}$2`);
  writeFileSync(SITE_PATH, updated);
  console.log(`Wrote ${releases.length} releases to site/changelog.html`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
