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

function Set-JsonVersion([string]$path, [string]$version) {
  $text = Get-Content $path -Raw
  $updated = $text -replace '"version"\s*:\s*"[^"]+"', "`"version`": `"$version`""
  if ($updated -eq $text) { throw "Could not find a version field in $path" }
  [System.IO.File]::WriteAllText($path, $updated)
}

function Set-CargoVersion([string]$path, [string]$version) {
  $text = Get-Content $path -Raw
  $updated = $text -replace '(?m)^version\s*=\s*"[^"]+"', "version = `"$version`""
  if ($updated -eq $text) { throw "Could not find a version field in $path" }
  [System.IO.File]::WriteAllText($path, $updated)
}

Set-JsonVersion "package.json" $Version
Set-JsonVersion "src-tauri/tauri.conf.json" $Version
Set-CargoVersion "src-tauri/Cargo.toml" $Version

git add -- package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
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
