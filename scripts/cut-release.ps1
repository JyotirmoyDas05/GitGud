# Cut a release for the Git Gud Tauri app.
#
# Usage:
#   powershell -File scripts/cut-release.ps1 -Version 0.2.0        # commit + tag locally
#   powershell -File scripts/cut-release.ps1 -Version 0.2.0 -Push  # also push commit + tag
#
# This syncs the version across package.json, src-tauri/tauri.conf.json
# and src-tauri/Cargo.toml, commits it, and tags v<version>.
# Pushing the tag triggers .github/workflows/release.yml, which builds
# Linux, macOS and Windows installers and opens a DRAFT GitHub Release.
#
# CHANGELOG.md: nobody writes an entry for this by hand. This script (and,
# independently, the Release workflow itself) derives one from `git log`
# since the previous tag via scripts/generate-changelog.mjs — the commit
# message *is* the changelog entry now. See CONTRIBUTING.md for the commit
# convention that makes the generated bullets read well.
#
# A `## [<version>]` section written ahead of time by hand is left exactly as
# written. Anything under `## [Unreleased]` is left in place too, untouched
# and unread — it is a free scratch space above the generated section for a
# note with no corresponding commit (a known issue, a heads-up), not an input
# this script depends on.
#
# site/changelog.html: also nothing to hand-edit. scripts/generate-changelog-html.mjs
# re-renders its release list from CHANGELOG.md every time this script runs,
# so the public site page tracks whatever CHANGELOG.md says without a second
# manual step.

param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [switch]$Push
)

$ErrorActionPreference = "Stop"

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
  throw "Version must look like 0.2.0, got: $Version"
}

$dirty = (git status --porcelain | Measure-Object -Line).Lines
if ($dirty -gt 0) {
  throw "Working tree is not clean. Commit or stash your changes first."
}

if ((git rev-parse --abbrev-ref HEAD) -ne "main") {
  throw "Releases are cut from main. You are on: $(git rev-parse --abbrev-ref HEAD)"
}

# Windows PowerShell 5.1's `Get-Content -Raw` / `Set-Content` guess an
# encoding, and on a BOM-less UTF-8 file that guess is wrong often enough to
# matter: this project has already lost a real file to it once (the
# `user-data.json` BOM incident in PLAN.md). CHANGELOG.md's prose is full of
# em-dashes, which is exactly the kind of byte a wrong guess mangles.
# `File.ReadAllText(path, encoding)` honours a BOM if one is present and
# trusts the given encoding otherwise, so it is correct either way; writing
# back explicitly as UTF-8 **without** a BOM keeps every file in this repo on
# the same footing — nothing else here carries one.
function Read-Utf8Text([string]$path) {
  return [System.IO.File]::ReadAllText($path, [System.Text.UTF8Encoding]::new($false))
}

function Write-Utf8Text([string]$path, [string]$text) {
  [System.IO.File]::WriteAllText($path, $text, [System.Text.UTF8Encoding]::new($false))
}

# Writes a "## [<version>] - <date>" section generated from git history. A
# no-op when the heading already exists (someone wrote it ahead of time, or
# this is a second run) — whoever wrote it by hand gets the final word.
# CHANGELOG.md does not have to exist at all; this only touches it if present.
function Add-GeneratedChangelogEntry([string]$path, [string]$version) {
  if (-not (Test-Path $path)) { return }

  $text = Read-Utf8Text $path
  $versionHeading = "(?m)^## \[$([regex]::Escape($version))\]"
  if ($text -match $versionHeading) {
    Write-Output "## [$version] already in CHANGELOG.md - leaving it as written."
    return
  }

  $notes = (node scripts/generate-changelog.mjs --to HEAD) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "scripts/generate-changelog.mjs failed" }

  $date = Get-Date -Format "yyyy-MM-dd"
  # No trailing newline baked in here on purpose - both insertion points below
  # trim whatever padding already surrounds them and add exactly one blank
  # line of their own, so the result is the same one-blank-line spacing this
  # file already uses everywhere else, regardless of how much (or how little)
  # blank space happened to precede the next heading beforehand.
  $entryBody = "## [$version] - $date`r`n`r`n$notes"

  if ($text -match '(?m)^## \[Unreleased\][ \t]*\r?\n') {
    # Inserted right after the Unreleased heading and whatever sits under
    # it, i.e. immediately before the next "## " (or EOF). That content is
    # never read or required — Unreleased is free-form scratch space, not
    # this function's input.
    $afterUnreleased = [regex]'(?ms)(^## \[Unreleased\][ \t]*\r?\n.*?)(?=^## |\z)'
    $evaluator = [System.Text.RegularExpressions.MatchEvaluator] {
      param($m)
      $before = $m.Groups[1].Value.TrimEnd("`r", "`n")
      "$before`r`n`r`n$entryBody`r`n`r`n"
    }
    $updated = $afterUnreleased.Replace($text, $evaluator, 1)
  } else {
    # No Unreleased heading to anchor on (unusual - not required). Add the
    # new section at the end instead of guessing where the prose intro ends.
    $updated = $text.TrimEnd() + "`r`n`r`n$entryBody`r`n"
  }

  Write-Utf8Text $path $updated
  Write-Output "Wrote ## [$version] - $date to CHANGELOG.md from git history."
}

Add-GeneratedChangelogEntry "CHANGELOG.md" $Version

# The site's changelog page (site/changelog.html) is rendered straight from
# CHANGELOG.md, same principle as CHANGELOG.md itself: nothing to hand-edit
# per release. Regenerated unconditionally, not just when a new entry was
# just written above, so a hand-edited CHANGELOG.md still gets reflected.
node scripts/generate-changelog-html.mjs
if ($LASTEXITCODE -ne 0) { throw "scripts/generate-changelog-html.mjs failed" }

function Set-JsonVersion([string]$path, [string]$version) {
  $text = Read-Utf8Text $path
  $updated = $text -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$version`""
  if ($updated -eq $text) { throw "Could not find a version field in $path" }
  Write-Utf8Text $path $updated
}

function Set-CargoVersion([string]$path, [string]$version) {
  $text = Read-Utf8Text $path
  $updated = $text -replace '(?m)^version\s*=\s*"[^"]+"', "version = `"$version`""
  if ($updated -eq $text) { throw "Could not find a version field in $path" }
  Write-Utf8Text $path $updated
}

Set-JsonVersion "package.json" $Version
Set-JsonVersion "src-tauri/tauri.conf.json" $Version
Set-CargoVersion "src-tauri/Cargo.toml" $Version

git add -- package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md site/changelog.html
git commit -m "chore(release): v$Version"
git tag "v$Version"

Write-Output "Tagged v$Version."

if ($Push) {
  git push origin main
  if (-not $?) { throw "git push of main failed" }
  git push origin "v$Version"
  if (-not $?) { throw "git push of tag v$Version failed" }
  Write-Output "Pushed main and v$Version - the Release workflow is now building."
} else {
  Write-Output "Review with: git show v$Version"
  Write-Output "Then push with: git push origin main v$Version"
}
