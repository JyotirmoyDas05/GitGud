mod git;
mod menu;
mod shell;
mod store;

use tauri::{AppHandle, Manager, Runtime};

/// Run a Git command. The only path from the frontend to Git.
#[tauri::command]
fn run_git(args: Vec<String>, cwd: Option<String>) -> Result<git::GitOutput, String> {
    git::run(&args, cwd.as_deref())
}

/// `git version 2.54.0` or `None`. Used on boot to tell the user Git is
/// missing before they hit a verify button and get a confusing failure.
#[tauri::command]
fn git_version() -> Option<String> {
    git::version()
}

/// Immediate children of a folder. The terminal challenges check the result of
/// `mkdir` and `touch` with this, the way the Git ones check `git status`.
#[tauri::command]
fn list_dir(path: String) -> Result<Vec<shell::Entry>, String> {
    shell::list_dir(&path)
}

/// The learner's own home directory — what `~` is short for, and what
/// challenge 3 checks their folder pick against.
#[tauri::command]
fn home_dir<R: Runtime>(app: AppHandle<R>) -> Option<String> {
    app.path()
        .home_dir()
        .ok()
        .map(|p| p.to_string_lossy().into_owned())
}

/// Recent commands from the user's shell history.
///
/// `pwd`, `ls` and `cd` leave nothing on disk, so this is the only honest way
/// to check that they were actually run. Local only; each verifier names the
/// file it read. See `shell.rs` for what is and is not collected.
#[tauri::command]
fn shell_history<R: Runtime>(app: AppHandle<R>) -> Vec<shell::HistoryFile> {
    match app.path().home_dir() {
        Ok(home) => shell::history(&home),
        Err(_) => Vec::new(),
    }
}

#[tauri::command]
fn read_progress<R: Runtime>(app: AppHandle<R>) -> Result<Option<store::Progress>, String> {
    store::read(&app)
}

#[tauri::command]
fn write_progress<R: Runtime>(
    app: AppHandle<R>,
    progress: store::Progress,
) -> Result<(), String> {
    store::write(&app, &progress)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Self-update from GitHub Releases. Both plugins are desktop-only:
        // `updater` fetches and verifies the signed bundle, `process` performs
        // the relaunch afterwards.
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle();
            store::init(handle)?;

            // Windows and Linux get no menu bar: everything it held is in the
            // interface. macOS keeps one because that is where the standard
            // editing shortcuts are bound.
            #[cfg(target_os = "macos")]
            handle.set_menu(menu::build(handle)?)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_git,
            git_version,
            list_dir,
            home_dir,
            shell_history,
            read_progress,
            write_progress
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
