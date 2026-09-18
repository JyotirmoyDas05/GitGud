/**
 * The verifier contract.
 *
 * Mirrors git-it-electron's `helpers.addToList(message, status)`: each check
 * produces one line in the results list, in the order it ran. The original
 * pushed straight to the DOM from inside nested callbacks, which is why its
 * verifiers could not be tested and why several of them double-report on
 * failure. Returning a list instead keeps the checks pure.
 */

export interface CheckResult {
  message: string;
  passed: boolean;
  /**
   * Shown but never counted. Challenge 8's "invite a friend" is encouraged,
   * not required — an optional check must never render as a failure.
   */
  optional?: boolean;
}

export interface VerifyContext {
  /** Repository directory the user picked, when the challenge needs one. */
  path?: string;
  /** Persisted extras, e.g. the friend invited in challenge 8. */
  invitedFriend?: string | null;
}

export type Verifier = (ctx: VerifyContext) => Promise<CheckResult[]>;

/** A challenge passes when every non-optional check passed. */
export function passed(results: CheckResult[]): boolean {
  const required = results.filter((r) => !r.optional);
  return required.length > 0 && required.every((r) => r.passed);
}

export const pass = (message: string): CheckResult => ({ message, passed: true });
export const fail = (message: string): CheckResult => ({ message, passed: false });
export const note = (message: string, ok: boolean): CheckResult => ({
  message,
  passed: ok,
  optional: true,
});
