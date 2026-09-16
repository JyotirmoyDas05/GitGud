mod git;
mod menu;
mod store;

use tauri::{AppHandle, Runtime};

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
            read_progress,
            write_progress
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
