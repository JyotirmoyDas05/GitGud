# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
but nobody writes an entry here by hand. `scripts/generate-changelog.mjs`
derives one from `git log` since the previous tag — the commit message *is*
the changelog entry, written once as you work, not a separate file to update
before tagging. See CONTRIBUTING.md for the commit convention that makes the
generated bullets read well. This file is a mirror kept for anyone browsing
the source; the entry that actually ships as the GitHub Release (and, from
there, the in-app updater's release-notes popover) is generated fresh at tag
time regardless of whether this file was ever regenerated locally — the two
can drift and nothing breaks.

`## [Unreleased]` below is free scratch space for a note with no commit behind
it (a known issue, a heads-up) — optional, never required, never read by the
generator.

## [Unreleased]

### Added

- **Two new modules before Git: "The Terminal" and "Files & Folders"**, five
  challenges covering what a terminal is, opening and closing it, reading the
  prompt, commands/arguments/options, `--help`, the current directory, `pwd`,
  `ls` and its options, files vs directories, `cd`, absolute and relative
  paths, `~`, `..`, `mkdir`, `mkdir -p`, `touch` and tab completion
- Sidebar and home progress are now grouped by module, so the terminal
  material reads as its own track rather than five extra rows in a list of
  sixteen. Each module heading carries its own completion count, and a rail
  down the left of each group fills in as you finish its challenges
- Reference pages (Dictionary, Resources, About) are pinned below the
  challenge list instead of scrolling away with it
- **Shell-history verification.** `pwd`, `ls` and `cd` change nothing on disk,
  so there is nothing to inspect afterwards; the new checks read the history
  file the learner's own shell keeps (Bash, Zsh, Fish, PowerShell) and look for
  the commands the challenge asked for. Local only, disclosed in the challenge
  text, and every result names the file it read
- `list_dir` and `home_dir` Tauri commands — the filesystem side of the same
  checks: the practice tree is verified by reading it, and "your home
  directory" is verified against the one the app resolves independently
- Dictionary page gains the full terminal command list
- **In-app updates from GitHub Releases.** A control at the bottom-right of the
  sidebar, beside the running version, checks on launch and every six hours.
  Check, download and install are three deliberate presses; installing asks
  first, because it restarts the app. Release notes come straight from the
  CHANGELOG entry of the release being offered, so this text is what a learner
  reads before deciding. Bundles are signed and verified against a key compiled
  into the app, so a build from anywhere else is refused. See `docs/UPDATES.md`

### Fixed

- Inline tips rendered as broken half-boxes: they are `<span>` elements and an
  inline box cannot carry a border, so a tip that wrapped onto a second line
  was drawn as two ragged fragments
- The sidebar had a scrollbar (and, when a title ran long, a horizontal one
  underneath it). Both are gone; the list still scrolls and its bottom edge
  fades to say so
- The release workflow's CHANGELOG step ran in a job with no checkout, so it
  never found `CHANGELOG.md` and every release quietly kept its auto-generated
  notes. The notes are now read in the build job, which is also what the
  updater manifest needs
- Multi-line sample output (`ls -l` listings, directory trees) collapsed onto
  one line — `code.comment` now preserves whitespace the way `code.shell` does
- The directory picker asked for "the repository folder" on every challenge
  that needed one, including the terminal challenges, which want a home
  directory and a practice folder

## [0.2.0] - 2026-09-20

### Added

- Two new modules ahead of Git: The Terminal (what a terminal is, the
- Shell-history verification (`src-tauri/src/shell.rs`, `src/lib/shell.ts`,
- Sidebar redesigned: modules render as a rail-based track with a
- In-app self-update from GitHub Releases (`src/lib/updater.ts`,
- Fully automatic changelog and release notes (`scripts/generate-changelog.mjs`,
- Release packaging fixed: AppImage was named with Debian's `amd64` instead

### Fixed

- Verifying a challenge and moving to the next one showed the previous
- Inline tips rendered as broken half-boxes: they are `<span>` elements
- Multi-line sample output (an `ls -l` listing, a directory tree)
- The directory picker asked for "the repository folder" on every

## [0.1.0] - 2026-09-19

Initial release of Git Gud, a desktop app for learning Git and GitHub
(Tauri v2 port of git-it-electron).

### Added

- 11 interactive challenges: get Git, make a repository, commit to it,
  GitHubbin, remote control, forks and clones, branches, small world,
  pull never out of date, requesting you pull please, merge finale
- Real verification engine that checks your work against actual Git and
  GitHub state, plus a live end-to-end harness
- 9 locales: en-US, es-CO, es-ES, fr-FR, ja-JP, ko-KR, pt-BR, uk-UA, zh-TW
- Mascot picker, command palette, tutorial pages (about, dictionary,
  resources) and offline-friendly bundled content
- Installers for Linux (.deb, .AppImage), macOS universal (.dmg) and
  Windows (NSIS .exe, .msi)
