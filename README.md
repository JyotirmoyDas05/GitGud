<div align="center">

# 🧙 Git Gud

**Learn Git by actually using it.**

Sixteen hands-on challenges in your real terminal, checked against real Git and GitHub.

[![Version](https://img.shields.io/badge/version-0.2.3-blue)](CHANGELOG.md)
[![Tauri](https://img.shields.io/badge/built%20with-Tauri-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)

[**Website**](https://jyotirmoydas05.github.io/GitGud/) · [**Download**](https://github.com/JyotirmoyDas05/GitGud/releases) · [Changelog](CHANGELOG.md)

![Git Gud home screen](assets/readme/home.png)

</div>

Git Gud teaches the terminal, Git and GitHub — not just beginner moves, but
the commands you will reach for over and over. Challenges verify with `git`
itself, never a built-in fake, so finishing one means it actually worked.

It starts from the very beginning: opening a terminal and finding your way
around your own computer. Git comes after that, once the window it lives in
is familiar. You'll need a GitHub account by the second half — the later
challenges have you fork, branch, and open genuine pull requests. The last
few walk you through forking, branching, collaborating, and merging, and
your reward is a generated patch with your name on it, hanging in a public
quilt next to everyone who finished before you.

## ✨ Highlights

- **16 challenges** across 3 modules, each checked against your real machine
- **No simulated Git** — every challenge shells out to the genuine `git` and GitHub
- **Real pull requests** — the GitHub module has you fork, branch, and PR for real
- **9 locales** — English, 日本語, 中文(臺灣), 한국어, Português Brasileiro, Українська, Español (Colombia/España), Français
- **Tiny installer** — ~2.9 MB, Tauri with no bundled browser engine

## 📚 Course

| Module | Challenges | What you'll learn |
|---|---|---|
| **The Terminal** | 1–2 | Getting around and driving a shell |
| **Files & Folders** | 3–5 | Navigating and manipulating your filesystem |
| **Git & GitHub** | 6–16 | Repos, commits, remotes, branches, forks, pull requests |

## ⬇️ Download

Prebuilt installers for Windows (x64/ARM), macOS (Universal), and Linux
(.deb/.rpm/.AppImage, x86_64/ARM64) are on the
[GitHub Releases page](https://github.com/JyotirmoyDas05/GitGud/releases).

## 🛠 Tech stack

- [Tauri](https://tauri.app/) (Rust) desktop shell
- React + TypeScript + Vite
- Tailwind CSS

## 🚀 Getting started

```bash
npm install
npm run dev        # web dev server
npm run tauri dev  # desktop app
```

### Build

```bash
npm run build
npm run tauri build
```

### Test

```bash
npm test
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — commit messages double as the changelog, so they follow a specific format.

---

<div align="center">

A refreshed port of [Git-it](https://github.com/jlord/git-it-electron).

</div>
