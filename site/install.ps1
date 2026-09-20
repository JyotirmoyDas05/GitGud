# Installs Git Gud from its GitHub Releases. Windows PowerShell 5.1 or newer.
#
#   irm https://jyotirmoydas05.github.io/GitGud/install.ps1 | iex
#
# Environment:
#   $env:GITGUD_VERSION   exact version to install (default: latest release)
#
# Downloads the NSIS installer for this machine's architecture and runs it
# silently. Git Gud installs per-user by default, so nothing here needs
# administrator rights.
#
# Everything lives in a function because `iex` runs this in the caller's
# scope: a bare `exit` on an error path would close the user's shell, while
# `return` inside a function just stops the install.

function Install-GitGud {
    [CmdletBinding()]
    param()

    $repo = 'JyotirmoyDas05/GitGud'
    # The updater's own manifest, published with every release. No API rate
    # limit, and the version it names is the one the release actually shipped.
    $manifest = "https://github.com/$repo/releases/latest/download/latest.json"

    # Deliberately ASCII, unlike install.sh's block art: this file is fetched
    # as text and `iex`-ed, and Windows PowerShell 5.1 decodes a response with
    # no charset in its Content-Type as ANSI, which turns box-drawing
    # characters into mojibake on the very first line a user sees.
    Write-Host ''
    Write-Host '    ____ _ _      ____           _ ' -ForegroundColor Magenta
    Write-Host '   / ___(_) |_   / ___|_   _  __| |' -ForegroundColor Magenta
    Write-Host '  | |  _| | __| | |  _| | | |/ _` |' -ForegroundColor Magenta
    Write-Host '  | |_| | | |_  | |_| | |_| | (_| |' -ForegroundColor Magenta
    Write-Host '   \____|_|\__|  \____|\__,_|\__,_|' -ForegroundColor Magenta
    Write-Host '  Learn Git by actually using it.' -ForegroundColor DarkGray
    Write-Host ''

    # RuntimeInformation reports the OS architecture rather than the host
    # process's, so a 32-bit PowerShell on an arm64 machine still resolves to
    # arm64 instead of quietly installing the x64 build under emulation.
    $osArch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
    switch ($osArch) {
        'X64'   { $arch = 'x64' }
        'Arm64' { $arch = 'arm64' }
        default {
            Write-Host "  git gud install: no build for $osArch. Git Gud ships x64 and arm64." -ForegroundColor Red
            Write-Host ''
            return
        }
    }

    $version = $env:GITGUD_VERSION
    if (-not $version) {
        Write-Host '  Finding the latest release...' -ForegroundColor DarkGray
        try {
            $version = (Invoke-RestMethod -Uri $manifest -UseBasicParsing).version
        } catch {
            Write-Host '  git gud install: could not read the release manifest.' -ForegroundColor Red
            Write-Host '  Check your connection, or set $env:GITGUD_VERSION = "x.y.z".' -ForegroundColor DarkGray
            Write-Host ''
            return
        }
    }
    $version = $version -replace '^v', ''

    $asset = "Git-Gud_${version}_${arch}-setup.exe"
    $url   = "https://github.com/$repo/releases/download/v$version/$asset"
    $out   = Join-Path ([System.IO.Path]::GetTempPath()) $asset

    Write-Host "  Installing Git Gud $version ($arch)" -ForegroundColor White
    Write-Host ''

    # Invoke-WebRequest's progress bar makes a large download roughly an order
    # of magnitude slower on PowerShell 5.1 (it repaints per byte block), so
    # it goes off for the duration and comes back afterwards.
    $priorProgress = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    try {
        Write-Host "  Downloading $asset..." -ForegroundColor DarkGray
        Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    } catch {
        Write-Host "  git gud install: could not download $asset." -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor DarkGray
        Write-Host ''
        return
    } finally {
        $ProgressPreference = $priorProgress
    }

    Write-Host '  Running the installer...' -ForegroundColor DarkGray
    # /S is NSIS silent mode. Git Gud installs per-user, so this needs no
    # elevation and shows no wizard.
    $proc = Start-Process -FilePath $out -ArgumentList '/S' -Wait -PassThru
    Remove-Item $out -ErrorAction SilentlyContinue

    if ($proc.ExitCode -ne 0) {
        Write-Host "  git gud install: the installer exited with code $($proc.ExitCode)." -ForegroundColor Red
        Write-Host ''
        return
    }

    Write-Host ''
    Write-Host "  [ok] Git Gud $version is installed." -ForegroundColor Green
    Write-Host '  Find it in the Start menu, or run: git-gud' -ForegroundColor DarkGray
    Write-Host ''
}

Install-GitGud
