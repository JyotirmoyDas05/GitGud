#!/usr/bin/env node
//
// Renders Keep-a-Changelog-style Markdown from git history. Zero deps — one
// `git log` pass, same ethos as build-index.mjs in the companion repo.
//
// Usage:
//   node scripts/generate-changelog.mjs [--to <ref>] [--from <ref>]
//
//   --to    Upper end of the range. Defaults to HEAD. Pass a tag name when
//           called from CI after the tag exists; pass nothing (HEAD) when
//           called locally before tagging.
//   --from  Lower end of the range. Defaults to the nearest tag that is an
//           ancestor of --to (excluding --to itself), so this works whether
//           --to is already tagged or not. Omit it; auto-detection is the
//           normal path.
//
// Why this exists: this repo writes real work in large, infrequent commits
// rather than one-PR-per-change, and a changelog entry used to be a separate
// thing someone had to remember to hand-write before cutting a release. That
// requirement is gone. The commit message IS the changelog entry now — write
// it once, when the work is fresh, as the commit body. See CONTRIBUTING.md
// for the convention this script expects.
//
// A commit that doesn't follow the convention is not an error — it is simply
// invisible to this script's *curated* section. The release workflow prepends
// this output ahead of GitHub's own auto-generated commit list, so nothing is
// ever actually lost; a plain commit still shows up there, just unsorted.

import { execFileSync } from "node:child_process";

// Real ASCII control characters built for exactly this (US/RS), rather than
// NUL: Node refuses to pass a literal NUL byte as a child-process argument at
// all — it is a C-string terminator, and `execFileSync` throws on it.
const RECORD_SEP = "\x1e";
const FIELD_SEP = "\x1f";

/** type prefix -> Keep a Changelog group. Anything absent is internal-only
 *  (docs/style/chore/ci/test/build) and does not appear in the curated list. */
const TYPE_GROUP = {
  feat: "Added",
  fix: "Fixed",
  perf: "Changed",
  refactor: "Changed",
  revert: "Removed",
  deprecate: "Deprecated",
  security: "Security",
};

// Keep a Changelog's own category order, the same one CHANGELOG.md already
// names in its header comment.
const GROUP_ORDER = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"];

const HEADER_RE = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
const BULLET_RE = /^[-*]\s+(.+)$/;
const SUBHEADING_RE = /^###\s+(.+)$/;

function git(args, { silent = false } = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    // `previousTag`/`githubSlug` treat failure as a normal branch (first
    // release, no remote), not an error — Node still writes the child's
    // stderr straight through by default, which would print a scary-looking
    // "fatal: No tags can describe ..." into an otherwise successful CI run.
    stdio: silent ? ["ignore", "pipe", "ignore"] : ["ignore", "pipe", "inherit"],
  }).trim();
}

function parseArgs(argv) {
  const out = { to: "HEAD", from: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--to") out.to = argv[++i];
    else if (argv[i] === "--from") out.from = argv[++i];
  }
  return out;
}

/** Nearest tag reachable from the commit *before* `to`, or null if there isn't one
 *  (first-ever release: the range becomes "everything up to `to`"). */
function previousTag(to) {
  try {
    return git(["describe", "--tags", "--abbrev=0", "--match", "v*", `${to}^`], { silent: true });
  } catch {
    return null;
  }
}

/** GitHub "owner/repo" from the `origin` remote, or null off a bare/local
 *  checkout — commit links are a nice-to-have, never a requirement. */
function githubSlug() {
  let url;
  try {
    url = git(["remote", "get-url", "origin"], { silent: true });
  } catch {
    return null;
  }
  const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

function readCommits(range) {
  const format = `%H${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}`;
  const raw = execFileSync(
    "git",
    ["log", "--no-merges", `--format=${format}`, range],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 32 },
  );

  return raw
    .split(RECORD_SEP)
    .map((r) => r.replace(/^\n/, ""))
    .filter((r) => r.trim().length > 0)
    .map((record) => {
      const [hash, subject, ...bodyParts] = record.split(FIELD_SEP);
      return { hash, subject: subject ?? "", body: (bodyParts.join(FIELD_SEP) ?? "").trim() };
    });
}

/** Bullet lines directly in `text` (no heading scoping). */
function bulletsIn(text) {
  const bullets = [];
  for (const line of text.split("\n")) {
    const bullet = line.match(BULLET_RE);
    if (bullet) {
      bullets.push(bullet[1].trim());
      continue;
    }
    // A wrapped continuation line of the bullet above it — this repo's own
    // commit bodies hard-wrap prose at ~72 columns rather than writing one
    // giant line per bullet, and the first version of this function threw
    // every line after the first away, silently truncating every bullet with
    // more than one line to its opening clause. A blank line ends a bullet
    // without starting a new one; it is not itself a continuation.
    const trimmed = line.trim();
    if (trimmed.length > 0 && bullets.length > 0) {
      bullets[bullets.length - 1] += ` ${trimmed}`;
    }
  }
  return bullets;
}

/** Route one commit's contribution into `groups`. Mutates in place because the
 *  alternative — returning entries and merging them — buys nothing here. */
function collect(commit, groups, slug) {
  const header = commit.subject.match(HEADER_RE);
  if (!header) return; // Not Conventional Commits; leave it to GitHub's own notes.

  const [, type, , breaking, description] = header;
  const defaultGroup = breaking ? "Changed" : TYPE_GROUP[type];
  if (!defaultGroup) return; // docs/style/chore/ci/test/build: internal, not user-facing.

  // An author who already wrote "### Added" / "### Fixed" in the body gets to
  // keep that structure verbatim — a commit spanning several kinds of change
  // says so itself, and second-guessing it by re-bucketing under one type
  // would throw that structure away for nothing.
  const headings = [...commit.body.matchAll(new RegExp(SUBHEADING_RE.source, "gm"))];
  if (headings.length > 0) {
    const sections = commit.body.split(/^###\s+.+$/m).slice(1);
    headings.forEach((h, i) => {
      const group = h[1].trim();
      for (const bullet of bulletsIn(sections[i] ?? "")) {
        (groups[group] ??= []).push(bullet);
      }
    });
    return;
  }

  const bodyBullets = bulletsIn(commit.body);
  if (bodyBullets.length > 0) {
    for (const bullet of bodyBullets) (groups[defaultGroup] ??= []).push(bullet);
    return;
  }

  // No structured body at all — every commit in this repo's history so far.
  // One bullet from the subject line, plus a link back to the exact commit
  // when we know where the repo lives.
  const short = commit.hash.slice(0, 7);
  const link = slug ? ` ([\`${short}\`](https://github.com/${slug}/commit/${commit.hash}))` : "";
  (groups[defaultGroup] ??= []).push(`${description}${link}`);
}

function render(groups) {
  const sections = GROUP_ORDER.filter((g) => groups[g]?.length).map(
    (g) => `### ${g}\n\n${groups[g].map((b) => `- ${b}`).join("\n")}\n`,
  );
  return sections.length > 0
    ? sections.join("\n")
    : "_No user-facing changes since the last release._\n";
}

function main() {
  const { to, from: explicitFrom } = parseArgs(process.argv.slice(2));
  const from = explicitFrom ?? previousTag(to);
  const range = from ? `${from}..${to}` : to;

  const commits = readCommits(range);
  const slug = githubSlug();
  const groups = {};
  for (const commit of commits) collect(commit, groups, slug);

  process.stdout.write(render(groups));
}

main();
