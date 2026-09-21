#!/bin/sh
# Installs Git Gud from its GitHub Releases. Needs only sh and curl or wget.
#
#   curl -fsSL https://jyotirmoydas05.github.io/GitGud/install.sh | sh
#
# Environment:
#   GITGUD_VERSION   exact version to install (default: the latest release)
#   GITGUD_FORMAT    Linux only: rpm, deb or appimage (default: whichever
#                    matches the distribution's package manager)
#   GITGUD_BIN_DIR   AppImage only, where the launcher goes (default: ~/.local/bin)
#   GITGUD_APP_DIR   macOS only, where Git Gud.app goes (default: /Applications)
#
# On Linux this prefers the native .rpm/.deb and falls back to the AppImage.
# That order is deliberate and is explained at the Linux section below: the
# AppImage bundles its own WebKitGTK, and on a current Fedora that bundle
# cannot start at all.
#
# macOS gets the universal .app out of the release's .app.tar.gz rather than
# the .dmg: no disk image to mount, and a file fetched by curl carries no
# com.apple.quarantine attribute, so Gatekeeper does not block the first
# launch the way it does for the downloaded .dmg.

set -eu

REPO="JyotirmoyDas05/GitGud"
# The updater's own manifest, already published with every release. Reusing it
# beats the GitHub API: no rate limit on an unauthenticated call, and the
# version it names is by definition the one the release actually shipped.
MANIFEST_URL="https://github.com/${REPO}/releases/latest/download/latest.json"
ICON_URL="https://raw.githubusercontent.com/${REPO}/main/src-tauri/icons/128x128@2x.png"

# ANSI and progress stay on stderr so `curl ... | sh` still shows them.
if [ -t 2 ]; then
  reset="$(printf '\033[0m')"; bold="$(printf '\033[1m')"
  muted="$(printf '\033[2m')"; accent="$(printf '\033[95m')"; green="$(printf '\033[32m')"
else
  reset=; bold=; muted=; accent=; green=
fi

say()  { printf '  %s\n' "$1" >&2; }
fail() { printf '\n  %sgit gud install: %s%s\n\n' "$bold" "$1" "$reset" >&2; exit 1; }

banner() {
  printf '\n%s' "$accent" >&2
  printf '%s\n' '   ▄████  ██ ████████      ▄████  ██    ██ ██████ ' >&2
  printf '%s\n' '  ██      ██    ██        ██      ██    ██ ██   ██' >&2
  printf '%s\n' '  ██  ███ ██    ██        ██  ███ ██    ██ ██   ██' >&2
  printf '%s\n' '  ██   ██ ██    ██        ██   ██ ██    ██ ██   ██' >&2
  printf '%s\n' '   █████  ██    ██         █████   ██████  ██████ ' >&2
  printf '%s' "$reset" >&2
  printf '  %sLearn Git by actually using it.%s\n\n' "$muted" "$reset" >&2
}

# One downloader, chosen once. `fetch` prints to stdout, `download` writes a
# file and shows a progress bar.
if command -v curl >/dev/null 2>&1; then
  fetch()    { curl -fsSL "$1"; }
  download() { curl -fL --progress-bar -o "$2" "$1" >&2; }
elif command -v wget >/dev/null 2>&1; then
  fetch()    { wget -qO- "$1"; }
  download() { wget --show-progress -qO "$2" "$1" >&2; }
else
  fail "needs curl or wget, and found neither."
fi

banner

# ── What are we installing, and for what ────────────────────────────────
os="$(uname -s)"
machine="$(uname -m)"

case "$machine" in
  x86_64 | amd64)          arch=x86_64 ;;
  aarch64 | arm64 | armv8*) arch=aarch64 ;;
  *) fail "no build for $machine. Git Gud ships x86_64 and aarch64." ;;
esac

version="${GITGUD_VERSION:-}"
if [ -z "$version" ]; then
  say "Finding the latest release..."
  # latest.json is a single line; splitting on commas turns it into fields so
  # sed can pick the version out without a JSON parser. "version" is the first
  # key Tauri writes, so the first match is the top-level one.
  version="$(fetch "$MANIFEST_URL" 2>/dev/null | tr ',' '\n' \
    | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)" || true
  [ -n "$version" ] || fail "could not read the release manifest. Check your connection, or pass GITGUD_VERSION=x.y.z."
fi
version="${version#v}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM

asset_url() {
  printf 'https://github.com/%s/releases/download/v%s/%s' "$REPO" "$version" "$1"
}

# ── macOS ───────────────────────────────────────────────────────────────
if [ "$os" = "Darwin" ]; then
  app_dir="${GITGUD_APP_DIR:-/Applications}"
  asset="Git-Gud_${version}_universal.app.tar.gz"

  printf '  %sInstalling%s Git Gud %s%s%s  %s(universal)%s\n\n' \
    "$muted" "$reset" "$bold" "$version" "$reset" "$muted" "$reset" >&2
  download "$(asset_url "$asset")" "$tmp/app.tar.gz" \
    || fail "could not download $asset."

  tar -xzf "$tmp/app.tar.gz" -C "$tmp" || fail "the downloaded archive would not unpack."
  app="$(find "$tmp" -maxdepth 1 -name '*.app' | head -1)"
  [ -n "$app" ] || fail "no .app inside $asset."

  # Replace rather than merge: leftovers from an older version inside a
  # bundle are how you get a mystery crash six months later.
  target="$app_dir/$(basename "$app")"
  if [ -e "$target" ] && ! rm -rf "$target" 2>/dev/null; then
    say "$app_dir needs permission — asking for sudo."
    sudo rm -rf "$target" || fail "could not replace $target."
    sudo cp -R "$app" "$app_dir/" || fail "could not copy into $app_dir."
  else
    cp -R "$app" "$app_dir/" 2>/dev/null \
      || { sudo cp -R "$app" "$app_dir/" || fail "could not copy into $app_dir."; }
  fi

  printf '\n  %s✓%s Git Gud %s is in %s\n' "$green" "$reset" "$version" "$app_dir"
  printf '  %sOpen it from Launchpad, or:%s open -a "Git Gud"\n\n' "$muted" "$reset"
  exit 0
fi

# ── Linux ───────────────────────────────────────────────────────────────
[ "$os" = "Linux" ] || fail "$os is not supported. Git Gud runs on Linux, macOS and Windows."

# A native .rpm/.deb is strongly preferred over the AppImage, and the reason
# is not neatness — it is the difference between the app starting and not.
#
# The AppImage carries its own GTK 3, libepoxy and a 90 MB
# libwebkit2gtk-4.1.so.0 built on Ubuntu 22.04, and those shadow whatever the
# distribution ships. On a current Fedora (Mesa 26, WebKitGTK 2.52) that
# bundled stack cannot bring up an EGL display at all — WebKit aborts with
# "Could not create default EGL display: EGL_BAD_PARAMETER" and the window
# opens blank. The machine is fine; the bundle is the problem, and no
# environment variable fixes it because the failure is inside the bundled
# WebKit's own start-up.
#
# A .rpm or .deb links against the WebKitGTK the distribution already
# installed and tested, which sidesteps the whole class of failure.
#
# GITGUD_FORMAT=appimage forces the single-file build anyway.
detect_format() {
  if   command -v dnf    >/dev/null 2>&1 || command -v rpm   >/dev/null 2>&1; then printf 'rpm'
  elif command -v apt-get >/dev/null 2>&1 || command -v dpkg >/dev/null 2>&1; then printf 'deb'
  else printf 'appimage'
  fi
}

# Native packages need root. `sudo -n true` tests for a *usable* sudo rather
# than merely an installed one: on a locked-down or password-prompting box
# under `curl | sh` there is no TTY to type a password into, so falling back
# to the AppImage beats hanging on an invisible prompt.
as_root() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo "$@"; fi
}
can_elevate() {
  [ "$(id -u)" -eq 0 ] && return 0
  command -v sudo >/dev/null 2>&1 || return 1
  sudo -n true 2>/dev/null
}

install_appimage() {
  bin_dir="${GITGUD_BIN_DIR:-$HOME/.local/bin}"
  target="$bin_dir/git-gud"
  asset="Git-Gud_${version}_${arch}.AppImage"

  printf '  %sInstalling%s Git Gud %s%s%s  %s(%s AppImage)%s\n\n' \
    "$muted" "$reset" "$bold" "$version" "$reset" "$muted" "$arch" "$reset" >&2

  download "$(asset_url "$asset")" "$tmp/git-gud" || fail "could not download $asset."
  chmod +x "$tmp/git-gud"

  mkdir -p "$bin_dir"
  # mv across filesystems can fail where cp succeeds ($TMPDIR is often tmpfs).
  mv "$tmp/git-gud" "$target" 2>/dev/null || {
    cp "$tmp/git-gud" "$target" || fail "could not write $target."
    chmod +x "$target"
  }

  # Desktop entry, so it shows up in the launcher like an installed app rather
  # than only working from a shell. Failing here is not fatal: the binary runs.
  apps="$HOME/.local/share/applications"
  icon_dir="$HOME/.local/share/icons/hicolor/128x128/apps"
  if mkdir -p "$apps" "$icon_dir" 2>/dev/null; then
    download "$ICON_URL" "$icon_dir/git-gud.png" 2>/dev/null || true
    cat > "$apps/git-gud.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Git Gud
Comment=Learn Git by actually using it
Exec=$target
Icon=git-gud
Terminal=false
Categories=Development;Education;
DESKTOP
    command -v update-desktop-database >/dev/null 2>&1 \
      && update-desktop-database "$apps" >/dev/null 2>&1 || true
  fi

  printf '\n  %s✓%s Git Gud %s is at %s%s%s\n' "$green" "$reset" "$version" "$bold" "$target" "$reset"

  # An AppImage is a FUSE mount. Plenty of distros stopped shipping libfuse2
  # by default (Ubuntu 22.04+, Fedora), and the failure is a bare "dlopen():
  # error loading libfuse.so.2" that says nothing about what to install.
  if ! { [ -e /usr/lib/libfuse.so.2 ] || [ -e /usr/lib64/libfuse.so.2 ] \
      || ldconfig -p 2>/dev/null | grep -q 'libfuse\.so\.2'; }; then
    printf '\n  %slibfuse2 is missing — an AppImage needs it to run.%s\n' "$bold" "$reset"
    if   command -v apt-get >/dev/null 2>&1; then say "sudo apt install libfuse2"
    elif command -v dnf     >/dev/null 2>&1; then say "sudo dnf install fuse-libs"
    elif command -v pacman  >/dev/null 2>&1; then say "sudo pacman -S fuse2"
    elif command -v zypper  >/dev/null 2>&1; then say "sudo zypper install libfuse2"
    elif command -v apk     >/dev/null 2>&1; then say "sudo apk add fuse"
    else say "Install your distribution's libfuse2 / fuse2 package."
    fi
  fi

  # ~/.local/bin is on PATH by default on most distros but not all, and an
  # install that says "done" then "command not found" is worse than none.
  case ":${PATH}:" in
    *":$bin_dir:"*) printf '  %sRun it:%s git-gud\n\n' "$muted" "$reset" ;;
    *)
      printf '\n  %s%s is not on your PATH.%s Add it:\n' "$bold" "$bin_dir" "$reset"
      say "echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.profile"
      printf '  %sOr launch it from your applications menu.%s\n\n' "$muted" "$reset"
      ;;
  esac
}

install_native() {
  asset="Git-Gud_${version}_${arch}.$1"

  printf '  %sInstalling%s Git Gud %s%s%s  %s(%s .%s)%s\n\n' \
    "$muted" "$reset" "$bold" "$version" "$reset" "$muted" "$arch" "$1" "$reset" >&2

  download "$(asset_url "$asset")" "$tmp/$asset" || fail "could not download $asset."

  # dnf/apt rather than rpm/dpkg: the package declares a dependency on the
  # distribution's WebKitGTK, and only the higher-level tool will go and
  # fetch it. `rpm -i` would just refuse with an unresolved-dependency error.
  if [ "$1" = "rpm" ]; then
    if   command -v dnf    >/dev/null 2>&1; then as_root dnf install -y "$tmp/$asset"
    elif command -v zypper >/dev/null 2>&1; then as_root zypper --non-interactive install --allow-unsigned-rpm "$tmp/$asset"
    else as_root rpm -i "$tmp/$asset"
    fi
  else
    if command -v apt-get >/dev/null 2>&1; then as_root apt-get install -y "$tmp/$asset"
    else as_root dpkg -i "$tmp/$asset"
    fi
  fi || fail "the package manager refused to install $asset."

  printf '\n  %s✓%s Git Gud %s is installed.\n' "$green" "$reset" "$version"
  printf '  %sFind it in your applications menu, or run:%s git-gud\n\n' "$muted" "$reset"
}

format="${GITGUD_FORMAT:-$(detect_format)}"

case "$format" in
  rpm | deb)
    if can_elevate; then
      install_native "$format"
    else
      say "No usable sudo here, so falling back to the single-file AppImage."
      say "For the more reliable native package: sudo -v, then re-run this."
      printf '\n' >&2
      install_appimage
    fi
    ;;
  appimage) install_appimage ;;
  *) fail "GITGUD_FORMAT must be rpm, deb or appimage — got '$format'." ;;
esac
