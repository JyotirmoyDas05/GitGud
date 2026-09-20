//! Filesystem and shell-history probes, for the terminal challenges.
//!
//! The Git challenges can check their work by asking Git. The terminal ones
//! cannot: `pwd`, `ls` and `cd` change nothing on disk, so there is no state
//! to inspect afterwards. Two probes cover the gap.
//!
//! `list_dir` checks the *result* of `mkdir` and `touch`.
//!
//! `history` checks the *act* of running a command, by reading the history
//! file the user's own shell keeps. That is what makes "run `pwd`" a real
//! challenge rather than a checkbox — and it also closes the hole where a
//! learner creates the folders in Explorer and never opens a terminal at all.
//!
//! Only the last few hundred commands are returned, they never leave the
//! machine, and every challenge that reads them names the file in its results.
//! The challenge text says so before the button is pressed.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

/// How far back a verifier can see. Enough for a long session, short enough
/// that an unrelated `pwd` from last month cannot pass a challenge.
const MAX_COMMANDS: usize = 300;

#[derive(Debug, Clone, Serialize)]
pub struct Entry {
    pub name: String,
    pub is_dir: bool,
}

/// Immediate children of `path`. Not recursive — a verifier that needs a
/// nested path calls again, which keeps this from ever walking a home
/// directory.
pub fn list_dir(path: &str) -> Result<Vec<Entry>, String> {
    let read = fs::read_dir(path).map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => format!("That folder does not exist: {path}"),
        std::io::ErrorKind::PermissionDenied => format!("No permission to read {path}"),
        _ => format!("Could not read {path}: {e}"),
    })?;

    let mut entries = Vec::new();
    for item in read.flatten() {
        // `file_type()` rather than `metadata()`: it does not follow symlinks,
        // so a link pointing at a directory is not reported as one.
        let is_dir = item.file_type().map(|t| t.is_dir()).unwrap_or(false);
        entries.push(Entry {
            name: item.file_name().to_string_lossy().into_owned(),
            is_dir,
        });
    }

    Ok(entries)
}

#[derive(Debug, Clone, Serialize)]
pub struct HistoryFile {
    /// `bash`, `zsh`, `fish` or `powershell` — named in the verify results so
    /// the learner knows which file was read.
    pub shell: String,
    pub path: String,
    pub commands: Vec<String>,
}

/// Every shell history file we can find under `home`.
///
/// An empty list means no supported shell has written one yet, which is a
/// different answer from "the command was not run" — the verifiers say so.
pub fn history(home: &Path) -> Vec<HistoryFile> {
    let mut found = Vec::new();

    for (shell, path) in candidates(home) {
        let Ok(bytes) = fs::read(&path) else { continue };
        // A history file is in whatever encoding the terminal used. A stray
        // non-UTF-8 byte must not cost the learner the whole file.
        let text = String::from_utf8_lossy(&bytes);
        let commands = parse(&shell, &text);
        if commands.is_empty() {
            continue;
        }
        found.push(HistoryFile {
            shell,
            path: path.to_string_lossy().into_owned(),
            commands,
        });
    }

    found
}

fn candidates(home: &Path) -> Vec<(String, PathBuf)> {
    let mut list = vec![
        ("bash".to_string(), home.join(".bash_history")),
        ("zsh".to_string(), home.join(".zsh_history")),
        (
            "fish".to_string(),
            home.join(".local/share/fish/fish_history"),
        ),
        (
            "powershell".to_string(),
            home.join(".local/share/powershell/PSReadLine/ConsoleHost_history.txt"),
        ),
    ];

    // PSReadLine on Windows writes under APPDATA, which is not below the home
    // directory on a roaming profile, so it has to be resolved separately.
    if let Some(appdata) = std::env::var_os("APPDATA") {
        list.push((
            "powershell".to_string(),
            PathBuf::from(appdata)
                .join("Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt"),
        ));
    }

    list
}

/// One command per entry, in the file's own order, most recent last.
///
/// Each shell writes its own dialect, and all of the non-bash ones would
/// otherwise come back as unmatchable noise: zsh prefixes `: <epoch>:<n>;`,
/// fish writes a YAML-ish record, and bash writes bare `#<epoch>` lines once
/// `HISTTIMEFORMAT` is set.
fn parse(shell: &str, text: &str) -> Vec<String> {
    let mut commands: Vec<String> = Vec::new();

    for line in text.lines() {
        let line = line.trim_end_matches('\r');

        let command = match shell {
            "fish" => match line.strip_prefix("- cmd: ") {
                Some(rest) => rest,
                None => continue,
            },
            "zsh" => match line.strip_prefix(": ") {
                // `: 1700000000:0;ls -la` — the command follows the first `;`.
                Some(rest) => match rest.split_once(';') {
                    Some((_, command)) => command,
                    None => continue,
                },
                None => line,
            },
            // A bare `#1700000000` is bash's timestamp record, not a command.
            _ => {
                if line.starts_with('#') {
                    continue;
                }
                line
            }
        };

        let command = command.trim();
        if !command.is_empty() {
            commands.push(command.to_string());
        }
    }

    if commands.len() > MAX_COMMANDS {
        commands.drain(..commands.len() - MAX_COMMANDS);
    }
    commands
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zsh_extended_history_is_unwrapped() {
        let text = ": 1700000000:0;ls -la\n: 1700000001:0;pwd\n";
        assert_eq!(parse("zsh", text), vec!["ls -la", "pwd"]);
    }

    #[test]
    fn plain_zsh_history_still_parses() {
        // `EXTENDED_HISTORY` is off by default, so the same file may hold bare
        // lines. Treating those as unparseable would fail every macOS learner
        // who never set the option.
        assert_eq!(parse("zsh", "pwd\nls\n"), vec!["pwd", "ls"]);
    }

    #[test]
    fn bash_timestamp_records_are_not_commands() {
        let text = "#1700000000\npwd\n#1700000001\nls -a\n";
        assert_eq!(parse("bash", text), vec!["pwd", "ls -a"]);
    }

    #[test]
    fn fish_records_yield_only_the_command() {
        let text = "- cmd: pwd\n  when: 1700000000\n- cmd: ls\n  when: 1700000001\n";
        assert_eq!(parse("fish", text), vec!["pwd", "ls"]);
    }

    #[test]
    fn only_the_most_recent_commands_are_returned() {
        // Without the cap, a `pwd` typed months ago would pass challenge 3
        // forever — the same "passes without doing the work" failure the Git
        // verifiers had to be fixed for.
        let text = (0..MAX_COMMANDS + 50)
            .map(|i| format!("echo {i}"))
            .collect::<Vec<_>>()
            .join("\n");
        let parsed = parse("bash", &text);
        assert_eq!(parsed.len(), MAX_COMMANDS);
        assert_eq!(
            parsed.last().unwrap(),
            &format!("echo {}", MAX_COMMANDS + 49)
        );
    }

    #[test]
    fn history_finds_and_labels_each_shells_file() {
        // The parsing is covered above; this covers discovery — the paths and
        // the shell labels, which are what the verify results quote back to
        // the learner. A typo in one of those paths would silently make every
        // terminal challenge unpassable on that platform.
        let home = std::env::temp_dir().join("gitgud-history-test");
        let _ = fs::remove_dir_all(&home);
        fs::create_dir_all(home.join(".local/share/fish")).unwrap();

        fs::write(home.join(".bash_history"), "pwd\nls -a\n").unwrap();
        fs::write(home.join(".zsh_history"), ": 1700000000:0;whoami\n").unwrap();
        fs::write(
            home.join(".local/share/fish/fish_history"),
            "- cmd: date\n  when: 1700000000\n",
        )
        .unwrap();

        let found = history(&home);
        let by_shell = |name: &str| found.iter().find(|f| f.shell == name);

        assert_eq!(by_shell("bash").unwrap().commands, vec!["pwd", "ls -a"]);
        assert_eq!(by_shell("zsh").unwrap().commands, vec!["whoami"]);
        assert_eq!(by_shell("fish").unwrap().commands, vec!["date"]);
        // The path is shown to the learner, so it has to be the real one.
        assert!(by_shell("bash").unwrap().path.ends_with(".bash_history"));

        let _ = fs::remove_dir_all(&home);
    }

    #[test]
    fn an_empty_history_file_is_not_reported_as_a_source() {
        // "Read your bash history" followed by every check failing is a worse
        // answer than "no history found", which at least names the fix.
        let home = std::env::temp_dir().join("gitgud-empty-history-test");
        let _ = fs::remove_dir_all(&home);
        fs::create_dir_all(&home).unwrap();
        fs::write(home.join(".bash_history"), "\n\n").unwrap();

        assert!(history(&home).iter().all(|f| f.shell != "bash"));

        let _ = fs::remove_dir_all(&home);
    }

    #[test]
    fn list_dir_separates_files_from_directories() {
        let root = std::env::temp_dir().join("gitgud-listdir-test");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("notes")).unwrap();
        fs::write(root.join("hello.txt"), "").unwrap();

        let mut entries = list_dir(root.to_str().unwrap()).unwrap();
        entries.sort_by(|a, b| a.name.cmp(&b.name));

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].name, "hello.txt");
        assert!(!entries[0].is_dir);
        assert_eq!(entries[1].name, "notes");
        assert!(entries[1].is_dir);

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn a_missing_folder_is_an_error_not_an_empty_listing() {
        // Empty and missing must stay distinguishable: "your folder is empty"
        // and "you never made that folder" are different lessons.
        let missing = std::env::temp_dir().join("gitgud-does-not-exist-xyz");
        let _ = fs::remove_dir_all(&missing);
        assert!(list_dir(missing.to_str().unwrap()).is_err());
    }
}
