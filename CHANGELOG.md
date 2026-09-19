# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The `Release` workflow copies the section matching the pushed tag
(`v<x.y.z>` -> `## [<x.y.z>]`) into the GitHub Release notes, so add an
entry here before tagging. If a tag has no section here, the release
falls back to auto-generated notes.

## [Unreleased]

## [0.1.0] - 2026-09-19

Initial release of Git Gud, a desktop app for learning Git and GitHub
(Tauri v2 port of git-it-electron).

### Added

- 11 interactive challenges: get Git, make a repository, commit to it,
  GitHubbin, remote control, forks and clones, branches, small world,
  pull never out of date, requesting you pull please, merge finale
- Real verification engine that checks your work against actual Git and
  GitHub state, plus a live end-to-end harness
- 9 locales: en-US, es-CO, es-ES, fr-FR, ja-JP, ko-KR, pt-BR, uk-UA, zh-TW
- Mascot picker, command palette, tutorial pages (about, dictionary,
  resources) and offline-friendly bundled content
- Installers for Linux (.deb, .AppImage), macOS universal (.dmg) and
  Windows (NSIS .exe, .msi)
