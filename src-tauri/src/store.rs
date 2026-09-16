//! Persisted learner progress.
//!
//! git-it-electron kept this in `user-data.json` under the Electron userData
//! directory. Git Gud does the same, and for the same reason: a webview's
//! localStorage can be cleared by the OS, by a webview update, or by the user
//! clearing browser data — none of which should cost someone eleven completed
//! challenges. The file is the source of truth; the frontend keeps a
//! localStorage copy only as a fallback for first read.

use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Progress {
    #[serde(default)]
    pub completed: std::collections::BTreeMap<String, bool>,
    #[serde(default)]
    pub saved_dir: Option<String>,
    #[serde(default)]
    pub invited_friend: Option<String>,
}

fn progress_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("user-data.json"))
}

/// Strip a UTF-8 byte-order mark.
///
/// `serde_json` refuses to parse a document that starts with one, and plenty
/// of Windows tools write one by default — PowerShell's `Set-Content -Encoding
/// utf8` among them. A BOM must not read as a corrupt file.
fn without_bom(text: &str) -> &str {
    text.strip_prefix('\u{feff}').unwrap_or(text)
}

/// Read progress.
///
/// `Ok(None)` means there is genuinely nothing saved yet — a fresh install.
/// `Err` means a file exists but could not be understood, which is emphatically
/// **not** the same thing: treating the two alike is how a caller ends up
/// overwriting real progress with an empty slate. The unreadable file is moved
/// aside first so it stays recoverable.
pub fn read<R: Runtime>(app: &AppHandle<R>) -> Result<Option<Progress>, String> {
    let path = progress_path(app)?;

    let Ok(raw) = fs::read_to_string(&path) else {
        return Ok(None);
    };

    let text = without_bom(&raw).trim();
    if text.is_empty() {
        return Ok(None);
    }

    match serde_json::from_str::<Progress>(text) {
        Ok(progress) => Ok(Some(progress)),
        Err(e) => {
            let aside = path.with_extension("corrupt.json");
            let _ = fs::rename(&path, &aside);
            Err(format!(
                "Saved progress could not be read ({e}). The old file has been kept as {}.",
                aside.display()
            ))
        }
    }
}

/// Write progress, atomically.
///
/// Writing in place risks a half-written file if the process dies mid-write,
/// which would lose everything rather than the last change. Write beside it
/// and rename, which is atomic on every platform we ship.
pub fn write<R: Runtime>(app: &AppHandle<R>, progress: &Progress) -> Result<(), String> {
    let path = progress_path(app)?;
    let tmp = path.with_extension("json.tmp");
    let text = serde_json::to_string_pretty(progress).map_err(|e| e.to_string())?;
    fs::write(&tmp, text).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

pub fn init<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let path = progress_path(app)?;
    if !path.exists() {
        write(app, &Progress::default())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The 11 challenges in order, mirroring `src/challenges.ts`. Only the
    /// drift guard below needs this, so it lives in the test module rather
    /// than sitting in the binary as dead code.
    const CHALLENGES: [&str; 11] = [
        "get_git",
        "repository",
        "commit_to_it",
        "githubbin",
        "remote_control",
        "forks_and_clones",
        "branches_arent_just_for_birds",
        "its_a_small_world",
        "pull_never_out_of_date",
        "requesting_you_pull_please",
        "merge_tada",
    ];

    #[test]
    fn challenge_list_matches_the_frontend() {
        // The keys in this list are the keys the frontend writes. If they ever
        // drift, progress silently stops being readable by one side.
        let ts = std::fs::read_to_string("../src/challenges.ts").expect("challenges.ts");
        for id in CHALLENGES {
            assert!(
                ts.contains(&format!("id: \"{id}\"")),
                "challenge '{id}' is missing from src/challenges.ts"
            );
        }
        assert_eq!(CHALLENGES.len(), 11);
    }

    #[test]
    fn progress_round_trips_through_json() {
        let mut p = Progress::default();
        p.completed.insert("get_git".into(), true);
        p.saved_dir = Some("D:/repos/hello".into());

        let text = serde_json::to_string(&p).unwrap();
        let back: Progress = serde_json::from_str(&text).unwrap();

        assert_eq!(back.completed.get("get_git"), Some(&true));
        assert_eq!(back.saved_dir.as_deref(), Some("D:/repos/hello"));
        assert_eq!(back.invited_friend, None);
    }

    #[test]
    fn a_byte_order_mark_does_not_break_parsing() {
        // PowerShell's `Set-Content -Encoding utf8` writes one by default, and
        // serde_json will not parse past it.
        let text = "\u{feff}{\"completed\":{\"get_git\":true}}";
        assert!(serde_json::from_str::<Progress>(text).is_err(), "BOM breaks serde");

        let parsed: Progress =
            serde_json::from_str(without_bom(text)).expect("should parse once stripped");
        assert_eq!(parsed.completed.get("get_git"), Some(&true));
    }

    #[test]
    fn unparseable_is_distinguishable_from_empty() {
        // The whole point: "cannot read this" must never be mistaken for
        // "nothing saved yet". The caller reacts to them differently, and one
        // of those reactions overwrites the file.
        assert!(serde_json::from_str::<Progress>("{ not json").is_err());

        let empty: Progress = serde_json::from_str("{}").expect("empty object is valid");
        assert!(empty.completed.is_empty());
    }
}
