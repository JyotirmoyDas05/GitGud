# Contributing

## Commit messages are the changelog

This project does not maintain a hand-written changelog. `CHANGELOG.md`,
the GitHub Release notes, and the text the in-app updater shows a learner
before they install anything are all generated from `git log` at tag-push
time, by `scripts/generate-changelog.mjs`. There is no separate step where
someone writes release notes — the commit message you already write to
describe your work **is** the release note, read back mechanically.

That only works if commits are written to be read back. Here is the format
that makes it work, and what happens if you skip it.

### The format

```
<type>(<scope>): <short summary>

### Added

- A bullet a learner or another contributor would actually want to read
- Another one, if there is one

### Fixed

- Same idea, for the "Fixed" group
```

- **The header is required** and must be [Conventional Commits](https://www.conventionalcommits.org/)
  shaped: `type(scope): summary`, one line, no period at the end. This repo's
  entire history already does this — match it.
- **The body is optional**, and only worth writing when the commit does more
  than one kind of thing, or the header alone doesn't say enough for someone
  reading the changelog six months from now to know what changed. A small,
  single-purpose commit needs nothing beyond its header.
- When you do write a body, group it under Keep a Changelog's own headings —
  `### Added`, `### Changed`, `### Fixed`, `### Removed`, `### Deprecated`,
  `### Security` — each followed by `-` or `*` bullets. That structure is
  lifted **verbatim** into the changelog; nothing about it is reinterpreted or
  reworded. Write the bullets exactly as you want a learner to read them.

### What happens if you don't use a body

The commit's header type still buckets it automatically:

| Type | Changelog group |
|---|---|
| `feat` | Added |
| `fix` | Fixed |
| `perf`, `refactor` | Changed |
| `revert` | Removed |
| `feat!`, `fix!` (breaking) | Changed |
| `docs`, `style`, `chore`, `ci`, `test`, `build` | *(internal — not shown)* |

A header-only `feat(i18n): localize challenges to ko-KR, pt-BR, uk-UA and
zh-TW` becomes one bullet under **Added**, worded exactly as written, linked
back to its commit. That is the current state of this entire project's
history, and it already reads fine — a body is how you go from "fine" to
"actually explains itself," not a requirement to unlock a first entry.

### What happens if you ignore this entirely

Nothing breaks. A commit that isn't Conventional-Commits-shaped is simply
invisible to the curated section above — it still shows up in GitHub's own
auto-generated commit list, which the release workflow always includes
underneath the curated notes as a complete, unfiltered fallback. Following the
convention is what makes the *readable* part of the release notes exist; not
following it costs you that, and nothing else.

### Why this exists

Work here happens in large, infrequent sessions rather than one pull request
per change, so there is no natural moment (like a PR merge) for GitHub's
native auto-generated notes to read as a real changelog on their own — they'd
show one giant commit instead of a feature list. Writing the changelog text
once, as the commit body, when the work is fresh, is strictly less effort than
writing it twice (once as a commit message, again later as a changelog entry)
and produces better prose than reconstructing it from a diff afterwards. This
applies equally to an AI agent working in this repo and to a human — an agent
finishing a task already tends to summarize what it changed; doing that
summary as the commit body instead of only as chat output is the entire ask.

See `scripts/generate-changelog.mjs` for exactly how a commit gets parsed, and
`docs/UPDATES.md` for how the result becomes a GitHub Release and reaches a
learner through the in-app updater.
