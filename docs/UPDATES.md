# In-app updates

Git Gud updates itself from its own GitHub Releases. This is the operator's
side of that: how it works, what has to be set up once, and how to cut a
release that existing installs will actually accept.

Modelled on T3 Code's desktop updater — one derived control in the sidebar,
check / download / install as three distinct steps, release notes shown before
anything is downloaded — on top of Tauri's updater rather than Electron's.

---

## How it works

1. Four seconds after launch, and every six hours after that, the app fetches
   `https://github.com/JyotirmoyDas05/GitGud/releases/latest/download/latest.json`.
2. That manifest lists a version, per-platform download URLs, the release
   notes, and a **signature** for each bundle.
3. If the listed version is newer than the running one, the update control at
   the bottom-right of the sidebar lights up. Nothing downloads on its own.
4. The learner presses it to download, and presses it again to install. The
   second press asks for confirmation, because installing restarts the app.
5. Before installing anything, Tauri verifies the bundle against the public key
   compiled into the app. A bundle signed with any other key is refused.

A background check that fails is deliberately silent — an unreachable release
feed is not something a learner opened this app to hear about. A check they
pressed reports its error, because somebody is waiting for the answer.

| Piece | Where |
|---|---|
| Update state and actions | `src/lib/updater.ts` |
| The sidebar control | `src/components/UpdateButton.tsx` |
| Launch and interval checks | `src/App.tsx` |
| Endpoint and public key | `src-tauri/tauri.conf.json` → `plugins.updater` |
| Signing and publishing | `.github/workflows/release.yml` |

---

## One-time setup

### 1. The signing keypair

Already generated, currently living **in the repo root, gitignored**:

```
.gitgud-release-keys/gitgud.key       <- private, secret
.gitgud-release-keys/gitgud.key.pub   <- public, already in tauri.conf.json
```

`.gitignore` keeps this folder out of git (verify with `git check-ignore -v
.gitgud-release-keys/gitgud.key` — it should print a match). That only
protects it from being committed, not from being swept up by anything else
that touches the project folder: an IDE index, a zipped bug report, a backup
tool, `git add -f`. **This is a holding spot, not the final one** — move
`gitgud.key` to a password manager or an encrypted drive outside any project
folder, then delete it here. The public half is harmless to leave in place; it
is also committed in `src-tauri/tauri.conf.json` on purpose, since that is
what lets an installed app reject a bundle it did not come from.

To regenerate (only if the private key is lost or leaked):

```bash
npx tauri signer generate -w <path-outside-any-project-folder>/gitgud.key
```

> Regenerating invalidates every installed copy's ability to update. They keep
> working; they just stop seeing new releases and have to be reinstalled by
> hand. Back the private key up somewhere you will still have it in a year.

### 2. The GitHub secret

Repository → Settings → Secrets and variables → Actions → **New repository secret**

| Name | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | The entire contents of `gitgud.key` |

The key was generated with an empty password, so `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
is not needed. The workflow passes it anyway, so adding one later needs no code
change.

Without this secret the build still succeeds, but it ships no signatures and
every client refuses the update. That is the signature doing its job, not a
bug — but it does mean a release cut before the secret exists is a release
nobody can install.

---

## Cutting a release

There is no changelog to write by hand. Release notes — both the GitHub
Release body and the text a learner reads in the update popover — are
generated from `git log` at tag-push time by `scripts/generate-changelog.mjs`.
See CONTRIBUTING.md for the commit convention that makes the generated bullets
read well; the short version is that a well-formed commit message already is
the release note.

1. Align the version in `package.json`, `src-tauri/tauri.conf.json` and
   `src-tauri/Cargo.toml` (`scripts/cut-release.ps1 -Version x.y.z` does this,
   and also mirrors the generated notes into `CHANGELOG.md` for anyone
   browsing the source — that copy is a convenience, not a dependency; the
   workflow below derives its own notes from git history independently).
2. Commit, tag, push:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. The workflow builds all three platforms, signs each bundle, generates
   `latest.json` (with notes assembled from every commit since the previous
   tag), and opens a **draft** release.
4. Review the draft, then **publish** it.

Nothing updates until step 4. GitHub does not serve assets from a draft, so
`releases/latest/download/latest.json` stays on the previous release until you
publish — which makes the draft a real staging step, not a formality.

---

## Checking it worked

After publishing, the manifest should be fetchable and name the new version:

```bash
curl -sL https://github.com/JyotirmoyDas05/GitGud/releases/latest/download/latest.json
```

Expect `version`, `notes`, `pub_date`, and a `platforms` map with a `signature`
and `url` for each of `darwin-universal`, `linux-x86_64` and `windows-x86_64`.

If `platforms` is missing entries, that platform's build failed — check the
workflow run. If `signature` is empty, `TAURI_SIGNING_PRIVATE_KEY` was not set.

---

## What ships, and why

`bundle.targets` in `src-tauri/tauri.conf.json`:

| Platform | Bundle | Asset |
|---|---|---|
| Windows x64 | NSIS | `Git-Gud_<version>_x64-setup.exe` |
| Windows arm64 | NSIS | `Git-Gud_<version>_arm64-setup.exe` |
| Linux x86_64 | **RPM (preferred)** | `Git-Gud_<version>_x86_64.rpm` |
| Linux x86_64 | **DEB (preferred)** | `Git-Gud_<version>_x86_64.deb` |
| Linux x86_64 | AppImage (fallback) | `Git-Gud_<version>_x86_64.AppImage` |
| Linux aarch64 | RPM / DEB / AppImage | `Git-Gud_<version>_aarch64.{rpm,deb,AppImage}` |
| macOS | DMG (universal), for install | `Git-Gud_<version>_universal.dmg` |
| macOS | `.app.tar.gz`, for the updater only | not a user-facing download |

Each architecture builds on a runner of its own architecture rather than
cross-compiling, as T3 Code does. `fail-fast: false` means an arm64 runner
having a bad day costs you the arm64 assets for that release, not the release.

**`"app"` has to be in `bundle.targets`, or macOS silently gets no updates.**
`createUpdaterArtifacts` produces a `.app.tar.gz` + signature as a companion
to whichever macOS target is built, but Tauri only treats `app`, `appimage`,
`msi` and `nsis` as "updater-enabled" targets — `dmg` alone doesn't count,
even though the DMG is what a person actually installs. v0.2.0's first build
had only `dmg` and shipped a real DMG that installed fine and would **never
have offered a single update to anyone who used it** — `latest.json` simply
had no `darwin-*` entries, silently, with no error anywhere a user would see.
The build log names its own fix: *"the bundler was configured to create
updater artifacts but no updater-enabled targets were built."*

It used to be `"all"`, which also produced an `.msi`, a `.deb` and an `.rpm`.
Pinning it is not tidiness:

- **The `.msi` was actively dangerous next to the NSIS installer.**
  `tauri-action`'s `updaterJsonPreferNsis` decides which of the two
  `latest.json` points at when both exist, and it **defaults to the msi**. A
  learner who installed the `-setup.exe` would have been handed an msi to
  update with. `PLAN.md` had already concluded the msi "adds nothing the NSIS
  does not, except for managed/enterprise deployment".
### `.deb`/`.rpm` came back in v0.2.2, and why that reversed

Until v0.2.1 this section argued the opposite: *"`.deb`/`.rpm` were never the
plan — AppImage is the single-file answer."* That was a packaging-convenience
argument, and it was wrong, because the AppImage does not reliably **run**.

A learner on Fedora 44 (Mesa 26.1.8, WebKitGTK 2.52.5 — a healthy, current
system) got a blank window from both v0.2.0 and v0.2.1. The AppImage was
extracted and inspected; the findings:

- It bundles its own `libwebkit2gtk-4.1.so.0` (90 MB), `libgtk-3.so.0`,
  `libepoxy.so.0` and the wayland/xcb libraries, all built on Ubuntu 22.04.
- The abort string `Could not create default EGL display: %s. Aborting...`
  is **inside that bundled WebKit**, not the host's. The host's own matched
  WebKitGTK 2.52.5 is never loaded.
- `linuxdeploy-plugin-gtk`'s AppRun hook also forces `GDK_BACKEND=x11` and
  overrides `GTK_PATH`, so the bundle controls the whole GTK environment.

So the bundled Ubuntu 22.04 graphics stack has to initialise EGL against
Fedora's Mesa 26, and cannot. This is why no environment variable fixed it:
`WEBKIT_DISABLE_DMABUF_RENDERER=1`, `GDK_BACKEND=x11` and
`LIBGL_ALWAYS_SOFTWARE=1` were all tried and all failed at the same point,
because the failure is in the bundled WebKit's own start-up, not in a
renderer that can be switched off. **v0.2.1 shipped a fix that could not
work** — it set `WEBKIT_DISABLE_DMABUF_RENDERER` from inside `run()`, which
is the same variable, only earlier.

A `.rpm`/`.deb` links against the WebKitGTK the distribution installed and
tested, which removes the entire class of failure. That is worth per-distro
packaging, which pure convenience was not. The AppImage stays as the fallback
for distributions neither package fits.

### Package-managed installs update like everything else

Tauri's Linux updater can only rewrite an AppImage in place, which it finds
through `$APPIMAGE`. A `.deb`/`.rpm` has no such file, so the plugin cannot
apply an update to one. Left there, Linux would have been the single platform
where updating meant going and running `dnf` by hand.

`src-tauri/src/linux_update.rs` closes that gap. The learner-facing flow is
identical on every platform — the same button, the same progress ring, the
same "restart to install" dialog, the same relaunch. Only the two steps
underneath differ:

| | Tauri-managed (Windows, macOS, AppImage) | Package-managed (`.deb`/`.rpm`) |
|---|---|---|
| Check | `latest.json` via the updater plugin | same |
| Download | plugin, with progress events | `curl`/`wget` to a temp file, progress polled from the partial file |
| Verify | plugin checks minisign | `linux_update.rs` checks minisign, **same key** |
| Install | plugin swaps the bundle | `pkexec dnf/apt-get install` (falls back to `sudo -n`) |
| Restart | `relaunch()` | same |

`install_kind` decides which path applies by asking `rpm -qf` / `dpkg -S`
whether a package actually owns the running executable, rather than guessing
from its path — a binary hand-copied to `/usr/bin` reports `other` and is
offered no install it cannot perform.

Three things are load-bearing:

- **The package is verified before install.** It is handed to a package
  manager running as root, so HTTPS alone is not the bar. The public key is
  read from this app's own config inside Rust, never passed in by the caller —
  a caller-supplied key would verify nothing.
- **`tauri-action` does not sign `.deb`/`.rpm`** (it signs only
  "updater-enabled" targets). The *Sign and publish the Linux packages* step
  in `release.yml` signs them with the same key and uploads `<asset>.sig`
  beside each one. Without that step the packaged update path fails closed —
  it refuses to install rather than installing something unverified.
- **The package URL is built, not read from `latest.json`.** That manifest
  only ever names the AppImage for `linux-x86_64`, because that is the only
  Linux artifact the plugin understands. The package URL therefore comes from
  the same naming contract `install.sh` and `assetNamePattern` share — which
  is why that contract is listed below as something three places depend on.

Asset names come from `assetNamePattern` in the workflow rather than from the
bundler — see the comment on the build matrix for why the AppImage in
particular has to be renamed.

**Three places now hard-code those names**, and a change to `assetNamePattern`
has to be made in all of them or the others break silently:

| File | Builds the name for |
|---|---|
| `.github/workflows/release.yml` | every asset, via `assetNamePattern` |
| `site/install.sh` | `..._<arch>.rpm`, `..._<arch>.deb`, `..._<arch>.AppImage`, `..._universal.app.tar.gz` |
| `src/lib/updater.ts` | `..._<arch>.rpm`, `..._<arch>.deb` and their `.sig`, for in-app updates |
| `site/install.ps1` | `..._x64-setup.exe`, `..._arm64-setup.exe` |

The install scripts fail loudly when an asset 404s, so a mismatch is not
silent for the person running them — but it is silent for you until somebody
reports it. `site/download.html`'s cards are the safe case: they resolve names
against the live release and quietly fall back to the releases page, which is
exactly how a `.deb` card outlived the `.deb` itself by a whole release.

## Things worth knowing

- **The draft step is the safety net.** An update that bricks the app cannot be
  recalled from the people who already took it. Install the draft's own
  installer and open it once before publishing.
- **Version numbers decide everything.** Tauri compares semver, so `0.2.0`
  offers itself to `0.1.0` and nothing offers itself to an equal or newer
  build. A tag that disagrees with `tauri.conf.json` produces a release that
  either updates nobody or, worse, offers a downgrade.
- **Progress survives an update.** Completion lives in `user-data.json` in the
  app data directory, not in the bundle, so the confirmation dialog can promise
  what it promises.
- **Windows installs in `passive` mode** (`plugins.updater.windows.installMode`),
  so the learner sees a progress dialog rather than a silent swap or a full
  installer wizard.
- **macOS builds are unsigned by Apple.** Gatekeeper still applies to the first
  install, as covered in `PLAN.md`; the updater's own signature is a separate
  mechanism and does not satisfy Gatekeeper.
