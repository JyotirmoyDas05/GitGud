//! The single place Git is invoked.
//!
//! Replaces git-it-electron's `lib/spawn-git.js`, minus the bundled PortableGit
//! (190 MB to avoid a one-time install is a bad trade, and challenge 1 is
//! literally "install Git", so requiring it on PATH is correct by design).
//!
//! Every verifier goes through `run` so the environment is normalized in one
//! spot. `git-it` set `LANG=C` in `lib/helpers.js` for the same reason: the
//! verifiers match on English output like "On branch" and "nothing to commit",
//! which silently break under a localized Git.

use std::process::Command;

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct GitOutput {
    pub stdout: String,
    pub stderr: String,
    /// `None` when the process was killed by a signal.
    pub code: Option<i32>,
}

impl GitOutput {
    pub fn ok(&self) -> bool {
        self.code == Some(0)
    }
}

/// Run `git` with `args`, optionally inside `cwd`.
///
/// A non-zero exit is *not* an error — `git status` outside a repo exits 128
/// and that is a meaningful answer for a verifier, not a failure to report.
/// Only a failure to spawn (Git missing, cwd gone) returns `Err`.
pub fn run(args: &[String], cwd: Option<&str>) -> Result<GitOutput, String> {
    let mut cmd = Command::new("git");
    cmd.args(args);

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    // Force English, machine-stable output. LC_ALL outranks LANG and any
    // LC_* already in the environment, so set both.
    cmd.env("LANG", "C");
    cmd.env("LC_ALL", "C");
    // Git must never block on an interactive credential or passphrase prompt:
    // the app has no terminal attached, so a prompt would hang the verify
    // button forever instead of failing.
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    cmd.env("GIT_OPTIONAL_LOCKS", "0");

    #[cfg(windows)]
    {
        // Suppress the console window that would otherwise flash on each spawn.
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|e| match e.kind() {
        std::io::ErrorKind::NotFound => {
            "Git was not found on your PATH. Complete challenge 1 to install it.".to_string()
        }
        _ => format!("Could not run Git: {e}"),
    })?;

    Ok(GitOutput {
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        code: output.status.code(),
    })
}

/// Convenience: run and return trimmed stdout, or `None` if the command failed.
pub fn stdout_of(args: &[String], cwd: Option<&str>) -> Option<String> {
    let out = run(args, cwd).ok()?;
    out.ok().then(|| out.stdout.trim().to_string())
}

/// The remote's default branch, e.g. `main` or `master`.
///
/// git-it hardcoded `master` in `remote_control.js`, which means every user
/// created after GitHub's 2020 default flip fails challenge 5. Resolve it
/// instead of assuming.
#[allow(dead_code)] // used from Phase 6 verifiers
pub fn default_branch(cwd: &str, remote: &str) -> String {
    // `origin/HEAD` is set by clone, but a repo created with `git init` +
    // `git remote add` never has it, so fall back through the options.
    let head_ref = format!("refs/remotes/{remote}/HEAD");
    if let Some(full) = stdout_of(
        &[
            "symbolic-ref".into(),
            "--short".into(),
            head_ref,
        ],
        Some(cwd),
    ) {
        if let Some((_, branch)) = full.split_once('/') {
            if !branch.is_empty() {
                return branch.to_string();
            }
        }
    }

    // Ask the remote directly. Costs a network round trip, so it is the
    // second choice, not the first.
    if let Some(out) = stdout_of(
        &["ls-remote".into(), "--symref".into(), remote.into(), "HEAD".into()],
        Some(cwd),
    ) {
        for line in out.lines() {
            if let Some(rest) = line.strip_prefix("ref: refs/heads/") {
                if let Some(branch) = rest.split_whitespace().next() {
                    return branch.to_string();
                }
            }
        }
    }

    // Whatever the user is standing on beats a hardcoded guess.
    //
    // `branch --show-current` rather than `rev-parse --abbrev-ref HEAD`: the
    // latter errors on an unborn branch, which is exactly the state a repo is
    // in right after `git init` — i.e. during challenge 2.
    stdout_of(&["branch".into(), "--show-current".into()], Some(cwd))
        .filter(|b| !b.is_empty())
        .unwrap_or_else(|| "main".to_string())
}

/// `git --version` string, or `None` when Git is not installed.
pub fn version() -> Option<String> {
    stdout_of(&["--version".into()], None).filter(|v| v.starts_with("git version"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn version_looks_like_git() {
        let v = version().expect("Git must be installed to run this test suite");
        assert!(v.starts_with("git version"), "got: {v}");
    }

    #[test]
    fn output_is_english_regardless_of_system_locale() {
        // The verifiers match English substrings. If this breaks, every
        // challenge that reads `git status` breaks with it.
        let dir = std::env::temp_dir().join("gitgud-locale-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.to_str().unwrap();

        run(&args(&["init"]), Some(path)).unwrap();
        let out = run(&args(&["status"]), Some(path)).unwrap();

        assert!(out.ok(), "status failed: {}", out.stderr);
        assert!(
            out.stdout.contains("On branch"),
            "expected English output, got: {}",
            out.stdout
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn nonzero_exit_is_not_an_error() {
        // `git status` outside a repo exits 128. That is an answer, not a
        // spawn failure, so it must come back as Ok with code 128.
        let dir = std::env::temp_dir().join("gitgud-notrepo-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let out = run(&args(&["status"]), dir.to_str()).expect("spawn should succeed");
        assert!(!out.ok());
        assert_ne!(out.code, Some(0));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn default_branch_resolves_without_assuming_master() {
        let dir = std::env::temp_dir().join("gitgud-branch-test");
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.to_str().unwrap();

        run(&args(&["init", "--initial-branch=trunk"]), Some(path)).unwrap();
        assert_eq!(default_branch(path, "origin"), "trunk");

        let _ = std::fs::remove_dir_all(&dir);
    }
}
