//! The application menu — macOS only.
//!
//! On Windows and Linux there is no menu bar. Everything it held lives in the
//! interface: Home, Dictionary, Resources and About are in the sidebar, the
//! project and issue links are on the About page, and full screen is a button
//! in the header. A menu bar carrying six items that are all one click away
//! already is just chrome.
//!
//! macOS is different, and not for taste reasons: without an application menu
//! the standard editing shortcuts (Cmd+C, Cmd+V, Cmd+A) and Cmd+Q simply do
//! not work, because on that platform the menu is what binds them. So macOS
//! keeps a minimal menu — the app menu and Edit — and nothing else.

#[cfg(target_os = "macos")]
use tauri::menu::{AboutMetadata, Menu, MenuBuilder, SubmenuBuilder};
#[cfg(target_os = "macos")]
use tauri::{AppHandle, Runtime};

#[cfg(target_os = "macos")]
pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let app_menu = SubmenuBuilder::new(app, "Git Gud")
        .about(Some(AboutMetadata {
            name: Some("Git Gud".into()),
            version: Some(env!("CARGO_PKG_VERSION").into()),
            comments: Some("Learn Git and GitHub by doing.".into()),
            ..Default::default()
        }))
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    // These are the reason this menu exists at all.
    let edit = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    MenuBuilder::new(app).items(&[&app_menu, &edit]).build()
}
