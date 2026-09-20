import type { Verifier } from "./types";
import { verifyGetGit } from "./get_git";
import {
  verifyCommandPerformance,
  verifyMakeItSo,
  verifyMeetTheTerminal,
  verifyThereAndBackAgain,
  verifyYouAreHere,
} from "./shell";
import {
  verifyBranches,
  verifyCommitToIt,
  verifyForksAndClones,
  verifyGitHubbin,
  verifyMergeTada,
  verifyPull,
  verifyPullRequest,
  verifyRemoteControl,
  verifyRepository,
  verifySmallWorld,
} from "./challenges";

/** Challenge id → verifier. Keys match `user-data.json` and `challenges.ts`. */
export const VERIFIERS: Partial<Record<string, Verifier>> = {
  meet_the_terminal: verifyMeetTheTerminal,
  command_performance: verifyCommandPerformance,
  you_are_here: verifyYouAreHere,
  there_and_back_again: verifyThereAndBackAgain,
  make_it_so: verifyMakeItSo,
  get_git: verifyGetGit,
  repository: verifyRepository,
  commit_to_it: verifyCommitToIt,
  githubbin: verifyGitHubbin,
  remote_control: verifyRemoteControl,
  forks_and_clones: verifyForksAndClones,
  branches_arent_just_for_birds: verifyBranches,
  its_a_small_world: verifySmallWorld,
  pull_never_out_of_date: verifyPull,
  requesting_you_pull_please: verifyPullRequest,
  merge_tada: verifyMergeTada,
};

export function verifierFor(id: string): Verifier | undefined {
  return VERIFIERS[id];
}

export * from "./types";
