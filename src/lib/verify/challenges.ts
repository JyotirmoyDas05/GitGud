import { COMPANION } from "~/challenges";
import { runGit } from "~/lib/git";
import {
  configuredUsername,
  fetchAcceptedCollaborators,
  fetchPullRequests,
  fetchUser,
} from "~/lib/github";
import {
  countAhead,
  currentBranch,
  hasCommits,
  isClean,
  isRepo,
  refExists,
  remoteUrl,
  remotes,
  tracksFile,
} from "./repo";
import { fail, note, pass, type CheckResult, type Verifier } from "./types";

const NO_PATH = fail("Select the repository folder first.");

/** Challenge 2 — the folder is a Git repository. */
export const verifyRepository: Verifier = async ({ path }) => {
  if (!path) return [NO_PATH];

  if (!(await isRepo(path))) {
    return [
      fail("This folder is not being tracked by Git. Run `git init` inside it."),
    ];
  }
  return [pass("This is a Git repository.")];
};

/** Challenge 3 — a change has been committed. */
export const verifyCommitToIt: Verifier = async ({ path }) => {
  if (!path) return [NO_PATH];
  if (!(await isRepo(path))) return [fail("This folder is not a Git repository.")];

  const results: CheckResult[] = [];

  // git-it matched the string "Initial commit", which Git 2.x replaced with
  // "No commits yet" — so this check silently stopped working. Counting
  // commits does not depend on wording.
  const committed = await hasCommits(path);
  results.push(
    committed
      ? pass("Changes have been committed.")
      : fail("No commits yet. Use `git add` then `git commit -m \"your message\"`."),
  );

  if (committed) {
    const clean = await isClean(path);
    results.push(
      clean
        ? pass("Nothing left uncommitted.")
        : fail("There are still uncommitted changes. Commit them too."),
    );
  }

  return results;
};

/** Challenge 4 — GitHub username set in Git config and matching a real account. */
export const verifyGitHubbin: Verifier = async ({ path }) => {
  const username = await configuredUsername(path);
  if (!username) {
    return [
      fail('No username found. Run: git config --global user.username "yourusername"'),
    ];
  }

  const results: CheckResult[] = [pass(`Username "${username}" is in your Git config.`)];

  const user = await fetchUser(username);
  if (!user) {
    results.push(fail(`No GitHub account called "${username}" exists.`));
    return results;
  }

  results.push(pass("That account exists on GitHub."));

  // git-it used `configUsername.match(githubUsername)`, a substring test, so
  // "jyotirmoy2" matched "jyotirmoy". Compare exactly — and case matters, because
  // later challenges build a branch name from this value.
  results.push(
    user.login === username
      ? pass("Capitalisation matches GitHub exactly.")
      : fail(`GitHub spells it "${user.login}". Update your config to match exactly.`),
  );

  return results;
};

/** Challenge 5 — work has been pushed to a remote. */
export const verifyRemoteControl: Verifier = async ({ path }) => {
  if (!path) return [NO_PATH];
  if (!(await isRepo(path))) return [fail("This folder is not a Git repository.")];

  const results: CheckResult[] = [];

  if (!(await remotes(path)).includes("origin")) {
    return [fail("No remote named 'origin'. Add one with `git remote add origin <url>`.")];
  }
  results.push(pass("Remote 'origin' is set up."));

  const branch = await currentBranch(path);
  if (!branch) return [...results, fail("No branch is checked out.")];

  // git-it hardcoded `reflog show origin/master`, so every repository created
  // after GitHub's 2020 default-branch change failed here. Use whatever
  // branch the user is actually on.
  const tracking = `origin/${branch}`;
  if (!(await refExists(path, tracking))) {
    return [
      ...results,
      fail(`Nothing pushed yet. Run \`git push -u origin ${branch}\`.`),
    ];
  }
  results.push(pass(`Branch '${branch}' exists on the remote.`));

  const ahead = await countAhead(path, tracking, "HEAD");
  results.push(
    ahead === 0
      ? pass("Everything local has been pushed.")
      : fail(`${ahead} commit(s) not pushed yet. Run \`git push\`.`),
  );

  return results;
};

/** Challenge 6 — forked and cloned, with both remotes wired up. */
export const verifyForksAndClones: Verifier = async ({ path }) => {
  if (!path) return [NO_PATH];
  if (!(await isRepo(path))) return [fail("This folder is not a Git repository.")];

  const username = await configuredUsername(path);
  if (!username) return [fail("No username in your Git config — finish challenge 4 first.")];

  const results: CheckResult[] = [];

  // git-it counted the lines of `git remote -v` and required exactly 4, which
  // breaks the moment a remote has different fetch and push URLs.
  const origin = await remoteUrl(path, "origin");
  const upstream = await remoteUrl(path, "upstream");

  const ownsOrigin = new RegExp(
    `github\\.com[:/]${username}/${COMPANION.repo}(\\.git)?/?$`,
    "i",
  ).test(origin);
  results.push(
    ownsOrigin
      ? pass("'origin' points at your fork.")
      : fail(
          origin
            ? `'origin' points at ${origin} — it should be your own fork of ${COMPANION.repo}.`
            : "No remote named 'origin'.",
        ),
  );

  const isUpstream = new RegExp(
    `github\\.com[:/]${COMPANION.owner}/${COMPANION.repo}(\\.git)?/?$`,
    "i",
  ).test(upstream);
  results.push(
    isUpstream
      ? pass("'upstream' points at the original repository.")
      : fail(
          `Add the original as upstream: \`git remote add upstream https://github.com/${COMPANION.owner}/${COMPANION.repo}.git\``,
        ),
  );

  return results;
};

/** Challenge 7 — branch created, file added, branch pushed. */
export const verifyBranches: Verifier = async ({ path }) => {
  if (!path) return [NO_PATH];
  if (!(await isRepo(path))) return [fail("This folder is not a Git repository.")];

  const username = await configuredUsername(path);
  if (!username) return [fail("No username in your Git config — finish challenge 4 first.")];

  const expected = `add-${username}`;
  const branch = await currentBranch(path);
  const results: CheckResult[] = [];

  results.push(
    branch.toLowerCase() === expected.toLowerCase()
      ? pass(`On branch '${branch}'.`)
      : fail(`Expected to be on branch '${expected}', but you are on '${branch}'.`),
  );

  const file = `contributors/add-${username}.txt`;
  results.push(
    (await tracksFile(path, file))
      ? pass(`Found ${file}.`)
      : fail(`No ${file} committed yet. Create it and commit it.`),
  );

  const tracking = `origin/${branch}`;
  if (await refExists(path, tracking)) {
    const ahead = await countAhead(path, tracking, "HEAD");
    results.push(
      ahead === 0
        ? pass("Branch has been pushed to your fork.")
        : fail(`${ahead} commit(s) not pushed. Run \`git push\`.`),
    );
  } else {
    results.push(fail(`Branch not pushed yet. Run \`git push -u origin ${branch}\`.`));
  }

  return results;
};

/** Challenge 8 — the bot has collaborator access; a friend is optional. */
export const verifySmallWorld: Verifier = async ({ path, invitedFriend }) => {
  const username = await configuredUsername(path);
  if (!username) return [fail("No username in your Git config — finish challenge 4 first.")];

  const accepted = await fetchAcceptedCollaborators();
  const results: CheckResult[] = [];

  results.push(
    accepted.includes(username.toLowerCase())
      ? pass(`@${COMPANION.bot} has access to your fork.`)
      : fail(
          `@${COMPANION.bot} has not accepted yet. It checks for invitations every 10 minutes — if you have just sent it, give it a moment and check again.`,
        ),
  );

  // Never counted, never shown as a failure: a beginner with no GitHub friends
  // yet must not be blocked, and we cannot verify a friend's acceptance anyway
  // (the collaborators API needs push access).
  if (invitedFriend) {
    results.push(note(`You also invited @${invitedFriend}`, true));
  }

  return results;
};

/** Challenge 9 — pulled the collaborator's work down. */
export const verifyPull: Verifier = async ({ path }) => {
  if (!path) return [NO_PATH];
  if (!(await isRepo(path))) return [fail("This folder is not a Git repository.")];

  const branch = await currentBranch(path);
  const tracking = `origin/${branch}`;

  // Refresh the remote refs first, otherwise "up to date" only means "up to
  // date with what we last heard", which is exactly the state before a pull.
  await runGit(["fetch", "origin"], path);

  if (!(await refExists(path, tracking))) {
    return [fail(`No '${tracking}' to pull from. Push the branch first.`)];
  }

  const behind = await countAhead(path, "HEAD", tracking);
  return [
    behind === 0
      ? pass("Up to date with your fork.")
      : fail(`${behind} commit(s) waiting. Run \`git pull\` to bring them in.`),
  ];
};

/** Challenge 10 — pull request opened against the companion repo. */
export const verifyPullRequest: Verifier = async ({ path }) => {
  const username = await configuredUsername(path);
  if (!username) return [fail("No username in your Git config — finish challenge 4 first.")];

  const branch = `add-${username}`;
  const prs = await fetchPullRequests(username, branch);

  if (prs.length === 0) {
    return [
      fail(
        `No pull request found from ${username}:${branch}. Open one against ${COMPANION.owner}/${COMPANION.repo}.`,
      ),
    ];
  }

  const merged = prs.find((pr) => pr.merged_at);
  return [
    pass(`Found your pull request (#${prs[0].number}).`),
    merged
      ? pass("It has been merged.")
      : fail(
          "Not merged yet. The bot checks every pull request — if something is off it comments on the pull request telling you what to fix.",
        ),
  ];
};

/** Challenge 11 — merge pulled down and the branch cleaned up. */
export const verifyMergeTada: Verifier = async ({ path }) => {
  if (!path) return [NO_PATH];
  if (!(await isRepo(path))) return [fail("This folder is not a Git repository.")];

  const username = await configuredUsername(path);
  if (!username) return [fail("No username in your Git config — finish challenge 4 first.")];

  const results: CheckResult[] = [];
  const branch = `add-${username}`;

  // The merged pull request added their file upstream; pulling it down is what
  // this challenge is about.
  await runGit(["fetch", "upstream"], path);
  const file = `contributors/add-${username}.txt`;
  results.push(
    (await tracksFile(path, file))
      ? pass("Your file is in the repository history.")
      : fail("Cannot find your contributor file yet — pull from upstream."),
  );

  const branches = await runGit(["branch", "--list", branch], path);
  const stillThere = branches.stdout.trim().length > 0;
  results.push(
    stillThere
      ? fail(`Branch '${branch}' is still here. Delete it with \`git branch -d ${branch}\`.`)
      : pass("Branch deleted."),
  );

  return results;
};
