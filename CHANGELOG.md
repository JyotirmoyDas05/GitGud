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

## [0.2.3] - 2026-09-22

### Added

- Every matched word in a result is highlighted now, not just the first
- Challenge titles are searchable, so "forks and clones" or "githubbin" finds their challenge; titles were scored but never actually reachable before
- Plurals match both ways ("repositories" finds "repository"), guarded to terms of four or more characters so short commands like `ls` are untouched
- A query with one unknown word falls back to the words it does know instead of returning nothing, and a query that is entirely a typo falls back to a one-edit match — each pass only runs if the one before it found nothing
- Stopwords drop out of a query that also has a real word, so "what is a branch" ranks on "branch" instead of on whichever section has the most "a"s
- Accent folding, so the eight translated locales can be searched in their own spelling; length-preserving, so highlight offsets stay valid
- Terms sitting next to each other in the text now outrank the same terms scattered across a page, and one challenge can contribute at most three rows so it cannot fill the whole result list

### Fixed

- `bulletsIn` now tracks whether it is still inside a bullet's wrapped continuation, and a blank line clears that instead of being ignored
- `bulletsIn` is exported and `main()` only runs when the file is executed directly, so this logic can be unit tested without shelling out to git
- The result snippet opened on the first query word rather than on the phrase, and was trimmed after its highlight offset was computed, which could slide the highlight off the word entirely
- A satisfied optional check now gets a tick, in a quieter success colour so it still reads as encouragement rather than a gate
- The suffix is just "optional" now, in every locale, instead of the self-contradicting "optional, not checked"

## [0.2.2] - 2026-09-22

### Added

- `curl ... | sh` prefers the native package for the distribution it finds (`dnf` → `.rpm`, `apt` → `.deb`) and installs it through the package manager so dependencies resolve, falling back to the AppImage where there is no usable sudo. `GITGUD_FORMAT` overrides the choice
- In-app updates work on `.deb`/`.rpm` installs, with the same button, ring, confirmation dialog and restart as every other platform (`src-tauri/src/linux_update.rs`). Tauri's updater can only rewrite an AppImage, so the download, signature check and `pkexec dnf/apt install` are done here instead — the learner sees no difference. The package is verified against the same minisign key as every other bundle before it is handed to a package manager running as root, and the release workflow now signs the `.rpm`/`.deb` and publishes `<asset>.sig` beside them
- `install_kind` asks `rpm -qf`/`dpkg -S` whether a package really owns the running binary rather than guessing from its path, so a hand-copied copy is told honestly that it cannot be updated in place
- A themed confirmation dialog replaces `@tauri-apps/plugin-dialog`'s native OS message box, which rendered as a light-grey system alert in the middle of a dark app. Used by both "restart to update" and "clear all progress"
- Release notes in the update popover render as Markdown rather than raw `###` and backticks

### Fixed

- The AppImage white-screens on current distributions, and v0.2.1's fix could not have worked. It bundles its own `libwebkit2gtk-4.1.so.0` (90 MB), `libgtk-3.so.0` and `libepoxy.so.0` built on Ubuntu 22.04, and those shadow whatever the host ships. Extracting the published AppImage shows the abort string `Could not create default EGL display: %s. Aborting...` *inside the bundled WebKit* — so on Fedora 44 the host's own healthy WebKitGTK 2.52.5 and Mesa 26 are never loaded. That is also why no environment variable helped: `WEBKIT_DISABLE_DMABUF_RENDERER` only switches off a renderer after WebKit starts, and this fails during start-up. v0.2.1 set that same variable from inside `run()`, which was the same thing, only earlier
- Linux now ships `.rpm` and `.deb`, which link against the WebKitGTK the distribution installed and tested, removing the entire class of failure. Verified by building the packages in an ubuntu:22.04 container and installing them in a fedora:44 one: dependencies resolve to webkit2gtk4.1-2.52.5 and gtk3-3.24.52, nothing is bundled, and the installed binary resolves libwebkit2gtk, libgtk-3 and libepoxy from /lib64 with no unresolved libraries
- The site's hero "Download for Linux" button deep-linked the AppImage — the busiest path on the page, handing Fedora visitors the one build that cannot start. A browser cannot tell which distribution it is looking at, so the button now leads to the download page instead of guessing
- The terminal-install note claimed Linux "installs the AppImage — the same single file on every distribution, so there is no apt, dnf, pacman or zypper branch to get wrong", which is now the opposite of what happens

## [0.2.1] - 2026-09-21

### Added

- Install from a terminal: `curl -fsSL .../install.sh | sh` (macOS + Linux, one AppImage/`.app.tar.gz` path for every distro, no per-distro branch) and `irm .../install.ps1 | iex` (Windows, silent NSIS install). Both resolve the current release from the updater's own `latest.json` manifest rather than the GitHub API, so there is no unauthenticated rate limit to hit
- Hero background: a ported, dimmed version of animate-ui's stars background (three parallax star layers, no visible loop seam), with a glow repositioned behind the screenshot instead of the empty page floor, and a hover tilt on the screenshot itself
- A blurred crossfade (not a flat opacity swap) between a terminal-install row's command and its "Copied" confirmation
- Hero shows the current home screen (16 challenges, welcome, quilt art) instead of the old challenge screenshot.
- Floating Git, GitHub, terminal and FCS marks with the t3.codes entrance/drift/pointer-parallax motion, reduced-motion aware.
- Download CTAs carry Windows/macOS/Linux icons and follow the visitor's OS (icon, label, direct asset link); Linux header uses the real Tux artwork. All icon SVG paths byte-identical to the t3code marketing source.

### Fixed

- WebKitGTK's DMA-BUF renderer aborts with `Could not create default EGL display: EGL_BAD_PARAMETER` on a good number of Linux machines, and there is no fallback after that line — the window opens, paints nothing, and the only trace is on a terminal the learner was never told to launch from. It hits hardest inside the AppImage (whose bundled GTK stack shadows the host's real Mesa drivers), but the same abort is reported from ordinary installs on Wayland, VMs and hybrid graphics too, so the fix sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` before the window is created on every Linux launch rather than in an AppImage-only wrapper
- The download page carried a "Debian / Ubuntu — .deb package" card from v0.1.0. `bundle.targets` has shipped no `.deb` since v0.2.0, so the card matched no release asset and silently fell back to the releases page — a download button advertising a file nobody builds
- The OS icon tooltips on the terminal-install rows never appeared, regardless of hover duration. Two independent causes: `.cli-rows` had `overflow: hidden` to round its outer corners, clipping the tooltip entirely since it renders above its row; and `.cli-feedback` (the copied-confirmation overlay) covers the full row at all times, hidden only by opacity, with no `pointer-events: none` — it silently owned every hover across the row before it ever reached the icons underneath
- `.btn-ghost` used an invented `rgba(255,255,255,.06)` + blur wash instead of T3 Code's actual app-UI glass (the chat composer surface): more opaque, colour-mixed from the real surface tone rather than a white tint, and reliant on an inset top highlight and a drop shadow for most of its "glass" read rather than blur alone

## [0.2.0] - 2026-09-20

### Added

- t3-style install website with live release download page ([`5291957`](https://github.com/JyotirmoyDas05/GitGud/commit/529195776f8bd2e4da171a4198992d9e50eefff1))
- Two new modules ahead of Git: The Terminal (what a terminal is, the prompt, command/argument/option shape, `--help`) and Files & Folders (`pwd`, `ls`, `cd`, absolute/relative paths, `mkdir`/`touch`), five challenges total, verified against the learner's real shell history and real filesystem rather than a checkbox
- Shell-history verification (`src-tauri/src/shell.rs`, `src/lib/shell.ts`, `src/lib/verify/shell.ts`): reads Bash, Zsh, Fish and PowerShell history to confirm a command was actually run, since `pwd`/`ls`/`cd` change nothing on disk to check afterwards
- Sidebar redesigned: modules render as a rail-based track with a completion count per group instead of a flat list of sixteen rows; the scrollbar is gone in favour of a bottom fade
- In-app self-update from GitHub Releases (`src/lib/updater.ts`, `src/components/UpdateButton.tsx`): check/download/install as one derived control, signed bundles, release notes shown before installing
- Fully automatic changelog and release notes (`scripts/generate-changelog.mjs`, `CONTRIBUTING.md`): derived from `git log` at tag-push time from every contributor's commits, grouped by Conventional Commits type or a commit's own `### Added`/`### Fixed` body — nothing to hand-write
- Release packaging fixed: AppImage was named with Debian's `amd64` instead of the universal `x86_64`, `productName`'s space corrupted every asset name, the `.msi` could silently become the updater's preferred Windows installer over the NSIS build actually shipped, and native arm64 builds (Linux, Windows) were added

### Fixed

- bundle.targets had dmg but not app. Tauri only treats app, appimage, msi and nsis as updater-enabled targets, so createUpdaterArtifacts silently produced no darwin-* entry in latest.json even though the .app.tar.gz + signature it needs were built on disk right next to the dmg. A learner on macOS would install a perfectly good DMG and then never be offered a single update, with no error anywhere. The build's own log names the fix: 'the bundler was configured to create updater artifacts but no updater-enabled targets were built.'
- ubuntu-22.04-arm has no xdg-open, unlike the x86_64 runner image, and Tauri's AppImage bundler refuses to run without it - the whole linux-arm64 job failed at the bundling step, after a full 4-minute compile, with 'xdg-open binary not found'. Installs xdg-utils alongside the other Linux packaging dependencies.
- bulletsIn() only matched lines starting with - or *, so a bullet written as hard-wrapped prose (this repo's own commit style) lost every line after its first the moment it wrapped past one line. Continuation lines are now appended to the previous bullet; a blank line ends one without starting another. Verified against the real v0.2.0 commit that exposed it and against the existing structured-body regression case.
- Verifying a challenge and moving to the next one showed the previous challenge's stale pass/fail list until Verify was pressed again — `VerifyBlock` had no key, so React reused its local state across navigation instead of resetting it
- Inline tips rendered as broken half-boxes: they are `<span>` elements and an inline box cannot carry a border, so a tip that wrapped onto a second line drew as two ragged fragments
- Multi-line sample output (an `ls -l` listing, a directory tree) collapsed onto one line for want of `white-space: pre-wrap`
- The directory picker asked for "the repository folder" on every challenge that needed one, including the two terminal challenges that want a home directory and a practice folder

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
