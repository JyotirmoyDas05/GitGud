/**
 * The eleven challenges, in order.
 *
 * Replaces git-it-electron's `empty-data.json` plus the numeric filename
 * prefixes its build script parsed (`7_branches_arent_just_for_birds.html`).
 * Order lives here; prev/next is derived, not stored, so the two can never
 * disagree the way they could in the original.
 */

export interface Challenge {
  /** Stable key. Matches the `user-data.json` key and the verify module name. */
  id: string;
  /** Display title, hand-written — the original derived these from filenames
   *  and then had a `grammarize()` function to undo the damage. */
  title: string;
  /** Source filename under `content/<locale>/challenges/`. */
  file: string;
  /** Whether the challenge asks the user to pick a repository directory. */
  needsDirectory: boolean;
}

export const CHALLENGES: Challenge[] = [
  { id: "get_git", title: "Get Git", file: "1_get_git.html", needsDirectory: false },
  { id: "repository", title: "Repository", file: "2_repository.html", needsDirectory: true },
  { id: "commit_to_it", title: "Commit to It", file: "3_commit_to_it.html", needsDirectory: true },
  { id: "githubbin", title: "GitHubbin", file: "4_githubbin.html", needsDirectory: false },
  {
    id: "remote_control",
    title: "Remote Control",
    file: "5_remote_control.html",
    needsDirectory: true,
  },
  {
    id: "forks_and_clones",
    title: "Forks and Clones",
    file: "6_forks_and_clones.html",
    needsDirectory: true,
  },
  {
    id: "branches_arent_just_for_birds",
    title: "Branches Aren't Just for Birds",
    file: "7_branches_arent_just_for_birds.html",
    needsDirectory: true,
  },
  {
    id: "its_a_small_world",
    title: "It's a Small World",
    file: "8_its_a_small_world.html",
    needsDirectory: false,
  },
  {
    id: "pull_never_out_of_date",
    title: "Pull, Never Out of Date",
    file: "9_pull_never_out_of_date.html",
    needsDirectory: true,
  },
  {
    id: "requesting_you_pull_please",
    title: "Requesting You Pull, Please",
    file: "10_requesting_you_pull_please.html",
    needsDirectory: false,
  },
  { id: "merge_tada", title: "Merge, Tada!", file: "11_merge_tada.html", needsDirectory: true },
];

export const CHALLENGE_IDS = CHALLENGES.map((c) => c.id);

export function challengeAt(index: number): Challenge | undefined {
  return CHALLENGES[index];
}

export function indexOf(id: string): number {
  return CHALLENGES.findIndex((c) => c.id === id);
}

export function byId(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}

/** The companion repo every fork-based challenge points at. */
export const COMPANION = {
  owner: "JyotirmoyDas05",
  repo: "git-gud-verifywork",
  bot: "gitgud-verifybot",
  pages: "https://jyotirmoydas05.github.io/git-gud-verifywork",
} as const;
