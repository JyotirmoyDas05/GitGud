//! Self-update for package-managed Linux installs (`.deb` / `.rpm`).
//!
//! Tauri's updater can only replace an AppImage: it rewrites that one file in
//! place and finds it through `$APPIMAGE`. A `.deb`/`.rpm` install has no such
//! file, so the plugin simply cannot apply an update to it.
//!
//! Rather than tell those learners to go and run `dnf` themselves — which
//! would make Linux the one platform where updating is a chore — this
//! reimplements the two steps the plugin cannot do, in the same two beats the
//! rest of the app already drives: **download** (with progress), then
//! **install and relaunch**. The button, the ring, the confirmation dialog and
//! the restart are all the existing ones; only what happens underneath here
//! differs.
//!
//! Two things are deliberate:
//!
//! * **The package is verified before it is installed.** It is about to be
//!   handed to a package manager running as root, so "it came over HTTPS" is
//!   not enough on its own. It carries a minisign signature made with the same
//!   key as every other bundle, checked here against the same public key
//!   already compiled into `tauri.conf.json`.
//! * **The download shells out to `curl`/`wget` rather than linking an HTTP
//!   client.** `install.sh` already downloads this exact file the same way, so
//!   this adds no dependency and no second notion of how a download works.
//!   Progress comes from polling the partially-written file, which is what
//!   that script does too.

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Runtime};

/// Emitted while the package downloads, so the button's ring can fill exactly
/// as it does for an AppImage update.
pub const PROGRESS_EVENT: &str = "linux-update://progress";

#[derive(Clone, Serialize)]
struct Progress {
    received: u64,
    /// 0 when the server sent no length — the UI shows an indeterminate
    /// spinner rather than inventing a percentage.
    total: u64,
}

/// How this copy was installed, which decides how it can update itself:
/// `appimage`, `rpm`, `deb`, or `other` for anything unrecognised (a
/// hand-copied binary, a distro package we did not build).
///
/// Everything outside Linux reports `bundled`: the Tauri updater handles it
/// and none of this module applies.
#[tauri::command]
pub fn install_kind() -> String {
    #[cfg(not(target_os = "linux"))]
    {
        "bundled".to_string()
    }

    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("APPIMAGE").is_some() {
            return "appimage".to_string();
        }

        // Ask the package managers whether they own this executable, rather
        // than guessing from the path: /usr/bin/git-gud could equally have
        // been dropped there by hand, and reinstalling a package over that
        // would be wrong.
        let exe = match std::env::current_exe() {
            Ok(p) => p,
            Err(_) => return "other".to_string(),
        };

        if owns_file("rpm", &["-qf"], &exe) {
            "rpm".to_string()
        } else if owns_file("dpkg", &["-S"], &exe) {
            "deb".to_string()
        } else {
            "other".to_string()
        }
    }
}

/// The architecture slug used in release asset names. `std::env::consts::ARCH`
/// already spells these the way `assetNamePattern` does (`x86_64`,
/// `aarch64`), so the two stay aligned without a lookup table.
#[tauri::command]
pub fn update_arch() -> String {
    std::env::consts::ARCH.to_string()
}

#[cfg(target_os = "linux")]
fn owns_file(program: &str, args: &[&str], path: &Path) -> bool {
    Command::new(program)
        .args(args)
        .arg(path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Downloads the package and its signature, and verifies one against the other.
///
/// Returns the path it landed on, which is then handed straight back to
/// [`install_package`]. Splitting the two keeps the app's existing shape: one
/// press downloads, a second press installs and restarts.
///
/// The signature is fetched here, not by the frontend. It used to be a
/// `fetch()` from the web view, and GitHub serves release assets without an
/// `Access-Control-Allow-Origin` header, so WebKitGTK refused the response
/// ("Load failed") and no `.rpm`/`.deb` install could ever update itself.
/// A native request is not subject to CORS, and it now travels the same way
/// as the package it vouches for.
#[tauri::command]
pub async fn download_package<R: Runtime>(
    app: AppHandle<R>,
    url: String,
) -> Result<String, String> {
    // The public key is read from this app's own compiled-in config rather
    // than accepted as an argument. A key the caller supplies is no check at
    // all — anything able to call this could pass the key matching its own
    // package. This is the same key, from the same place, that the Tauri
    // updater verifies every other bundle against.
    let public_key = app
        .config()
        .plugins
        .0
        .get("updater")
        .and_then(|v| v.get("pubkey"))
        .and_then(|v| v.as_str())
        .ok_or("no update public key is configured, so nothing can be verified")?
        .to_string();

    tauri::async_runtime::spawn_blocking(move || download_and_verify(&app, &url, &public_key))
    .await
    .map_err(|e| format!("download task failed: {e}"))?
}

fn download_and_verify<R: Runtime>(
    app: &AppHandle<R>,
    url: &str,
    public_key: &str,
) -> Result<String, String> {
    let name = url.rsplit('/').next().unwrap_or("git-gud-update");
    if !(name.ends_with(".rpm") || name.ends_with(".deb")) {
        return Err(format!("refusing to download {name}: not a .rpm or .deb"));
    }

    // Fetched first: it is a few hundred bytes, and if it is missing there is
    // no point spending a minute on a package that could never be installed.
    let signature = fetch_text(&format!("{url}.sig"))
        .map_err(|e| format!("could not download the signature for {name}: {e}"))?;

    let dir = std::env::temp_dir().join("git-gud-update");
    std::fs::create_dir_all(&dir).map_err(|e| format!("could not create {}: {e}", dir.display()))?;
    let target = dir.join(name);
    let _ = std::fs::remove_file(&target);

    let total = content_length(url).unwrap_or(0);

    let mut child = downloader(url, &target)?;

    // Poll the file as it is written. No output parsing, no second request —
    // the same technique install.sh uses for its progress bar.
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if !status.success() {
                    let _ = std::fs::remove_file(&target);
                    return Err(format!("download of {name} failed"));
                }
                break;
            }
            Ok(None) => {
                let received = std::fs::metadata(&target).map(|m| m.len()).unwrap_or(0);
                let _ = app.emit(PROGRESS_EVENT, Progress { received, total });
                std::thread::sleep(Duration::from_millis(200));
            }
            Err(e) => return Err(format!("could not wait for the download: {e}")),
        }
    }

    let received = std::fs::metadata(&target).map(|m| m.len()).unwrap_or(0);
    let _ = app.emit(PROGRESS_EVENT, Progress { received, total: received });

    verify(&target, &signature, public_key).inspect_err(|_| {
        // A package that fails verification is never left on disk where a
        // later step — or a curious learner — could install it anyway.
        let _ = std::fs::remove_file(&target);
    })?;

    Ok(target.to_string_lossy().into_owned())
}

fn downloader(url: &str, target: &Path) -> Result<std::process::Child, String> {
    let spawn = |program: &str, args: Vec<&str>| {
        Command::new(program)
            .args(args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
    };

    let target = target.to_string_lossy().into_owned();
    spawn("curl", vec!["-fsSL", "-o", &target, url])
        .or_else(|_| spawn("wget", vec!["-q", "-O", &target, url]))
        .map_err(|_| "needs curl or wget to download the update, and found neither".to_string())
}

/// A small text file, into memory, with the same curl-then-wget fallback as
/// [`downloader`] so the signature and the package can never disagree about
/// which tool is available.
fn fetch_text(url: &str) -> Result<String, String> {
    let run = |program: &str, args: &[&str]| Command::new(program).args(args).output();

    let out = run("curl", &["-fsSL", url])
        .or_else(|_| run("wget", &["-q", "-O", "-", url]))
        .map_err(|_| "needs curl or wget, and found neither".to_string())?;

    if !out.status.success() {
        return Err(format!("the server refused it ({})", out.status));
    }
    let text = String::from_utf8(out.stdout).map_err(|_| "it was not text".to_string())?;
    let text = text.trim();
    if text.is_empty() {
        return Err("it was empty".to_string());
    }
    Ok(text.to_string())
}

/// `Content-Length` of the final URL, for the progress ring. Best-effort: a
/// missing length costs the percentage, not the download.
fn content_length(url: &str) -> Option<u64> {
    let out = Command::new("curl")
        .args(["-sIL", "-o", "/dev/null", "-w", "%{size_download}\n%{header_json}", url])
        .output()
        .ok()?;
    let text = String::from_utf8_lossy(&out.stdout);
    let key = "\"content-length\":[\"";
    let at = text.to_lowercase().find(key)? + key.len();
    text[at..].split('"').next()?.trim().parse().ok()
}

fn verify(file: &Path, signature: &str, public_key: &str) -> Result<(), String> {
    // The public key is stored base64-encoded in tauri.conf.json (that is the
    // form `tauri signer` prints), so it is decoded before use. Same for the
    // signature file's contents.
    let decode = |s: &str| -> Result<String, String> {
        use base64::Engine;
        let raw = base64::engine::general_purpose::STANDARD
            .decode(s.trim())
            .map_err(|e| format!("malformed base64: {e}"))?;
        String::from_utf8(raw).map_err(|e| format!("malformed key or signature: {e}"))
    };

    let key = minisign_verify::PublicKey::decode(&decode(public_key)?)
        .map_err(|e| format!("bad update public key: {e}"))?;
    let sig = minisign_verify::Signature::decode(&decode(signature)?)
        .map_err(|e| format!("bad update signature: {e}"))?;

    let bytes = std::fs::read(file).map_err(|e| format!("could not read the download: {e}"))?;
    // `true` matches tauri-plugin-updater's own call (updater.rs: `verify(data,
    // &signature, true)`). Passing false rejects non-prehashed signatures,
    // which would refuse perfectly valid ones from `tauri signer sign`.
    key.verify(&bytes, &sig, true).map_err(|_| {
        "this update's signature does not match the key this app was built with, so it was not installed".to_string()
    })
}

/// Installs a package downloaded by [`download_package`], elevating through
/// PolicyKit so the learner gets their desktop's own password dialog rather
/// than a terminal they never opened.
///
/// `dnf`/`apt-get` rather than `rpm`/`dpkg`: the package depends on the
/// distribution's WebKitGTK, and only the higher-level tool will fetch it if
/// a release ever needs a newer one. `rpm -i` would stop at the dependency.
#[tauri::command]
pub async fn install_package(path: String, kind: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = PathBuf::from(&path);
        if !path.is_file() {
            return Err("the downloaded package is no longer on disk".to_string());
        }
        let file = path.to_string_lossy().into_owned();

        let mut attempts: Vec<Vec<String>> = Vec::new();
        let args: Vec<&str> = match kind.as_str() {
            "rpm" => vec!["dnf", "install", "-y"],
            "deb" => vec!["apt-get", "install", "-y", "--allow-downgrades"],
            other => return Err(format!("cannot install a {other} package")),
        };

        for launcher in ["pkexec", "sudo"] {
            // `sudo -n` never prompts: with no terminal attached a prompt
            // would hang forever behind the app window instead of failing.
            let mut argv: Vec<String> = vec![launcher.to_string()];
            if launcher == "sudo" {
                argv.push("-n".to_string());
            }
            argv.extend(args.iter().map(|s| s.to_string()));
            argv.push(file.clone());
            attempts.push(argv);
        }

        let mut last = String::from("no way to run the install with root privileges");
        for argv in attempts {
            match Command::new(&argv[0]).args(&argv[1..]).output() {
                Ok(out) if out.status.success() => return Ok(()),
                Ok(out) => {
                    let err = String::from_utf8_lossy(&out.stderr);
                    // 126/127 from pkexec means dismissed or not authorised,
                    // which is a decision, not a fault worth retrying under
                    // sudo and prompting twice for.
                    if argv[0] == "pkexec" && matches!(out.status.code(), Some(126) | Some(127)) {
                        return Err("the install was not authorised".to_string());
                    }
                    last = if err.trim().is_empty() {
                        format!("{} exited with {}", argv[0], out.status)
                    } else {
                        err.trim().to_string()
                    };
                }
                Err(_) => continue, // launcher not installed; try the next
            }
        }
        Err(last)
    })
    .await
    .map_err(|e| format!("install task failed: {e}"))?
}
