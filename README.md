# Git Gud

![Git Gud home screen](.screenshots/t01-fresh-home.png)

Git Gud teaches the terminal, Git and GitHub — not just beginner moves, but the
commands you will reach for over and over. Every challenge is checked against
your real machine, so finishing one means it actually worked.

It starts from the very beginning: opening a terminal and finding your way
around your own computer. Git comes after that, once the window it lives in
is familiar. You'll need a GitHub account by the second half; a challenge
walks you through it.

## Challenges

- **The Terminal** — meet it, get comfortable driving it
- **Files & Folders** — navigate and manipulate your filesystem
- **Git & GitHub** — repos, commits, remotes, branches, forks, pull requests

## Tech stack

- [Tauri](https://tauri.app/) (Rust) desktop shell
- React + TypeScript + Vite
- Tailwind CSS

## Development

```bash
npm install
npm run dev      # web dev server
npm run tauri dev # desktop app
```

## Build

```bash
npm run build
npm run tauri build
```

## Testing

```bash
npm test
```
