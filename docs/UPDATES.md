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

`bundle.targets` in `src-tauri/tauri.conf.json` is pinned to exactly four:

| Platform | Bundle | Asset |
|---|---|---|
| Windows x64 | NSIS | `Git-Gud_<version>_x64-setup.exe` |
| Windows arm64 | NSIS | `Git-Gud_<version>_arm64-setup.exe` |
| Linux x86_64 | AppImage | `Git-Gud_<version>_x86_64.AppImage` |
| Linux aarch64 | AppImage | `Git-Gud_<version>_aarch64.AppImage` |
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
- **`.deb`/`.rpm` were never the plan.** `PLAN.md`: "AppImage is the single-file
  answer ... `.deb`/`.rpm` are per-distro packaging that only pays off if
  someone is running an apt or dnf repository." The old workflow uploaded a
  hand-written list of globs that happened to exclude the rpm; now that
  `tauri-action` uploads everything it builds, an untested rpm would have
  started appearing on its own.

Asset names come from `assetNamePattern` in the workflow rather than from the
bundler — see the comment on the build matrix for why the AppImage in
particular has to be renamed.

**Three places now hard-code those names**, and a change to `assetNamePattern`
has to be made in all of them or the others break silently:

| File | Builds the name for |
|---|---|
| `.github/workflows/release.yml` | every asset, via `assetNamePattern` |
| `site/install.sh` | `..._x86_64.AppImage`, `..._aarch64.AppImage`, `..._universal.app.tar.gz` |
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
