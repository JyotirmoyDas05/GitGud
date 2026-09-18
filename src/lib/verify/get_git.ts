import { runGit } from "~/lib/git";
import { fail, pass, type CheckResult, type Verifier } from "./types";

/**
 * Challenge 1 — Git is installed and configured with a name and email.
 *
 * The original nested three `exec` callbacks three deep and bailed out of the
 * pyramid on the first failure, so a user missing both name and email was told
 * about one of them per attempt. Running all three and reporting all three
 * means one press of Verify tells you everything that is wrong.
 */
export const verifyGetGit: Verifier = async () => {
  const results: CheckResult[] = [];

  const version = await runGit(["--version"]);
  results.push(
    version.stdout.includes("git version")
      ? pass(`Found Git installed — ${version.stdout.trim()}`)
      : fail("Git is not installed, or is not on your PATH."),
  );

  const name = await runGit(["config", "user.name"]);
  const nameValue = name.stdout.trim();
  results.push(
    nameValue
      ? pass(`Name is set to "${nameValue}".`)
      : fail('No name found. Run: git config --global user.name "Your Name"'),
  );

  const email = await runGit(["config", "user.email"]);
  const emailValue = email.stdout.trim();
  results.push(
    emailValue
      ? pass(`Email is set to "${emailValue}".`)
      : fail('No email found. Run: git config --global user.email "you@example.com"'),
  );

  return results;
};
