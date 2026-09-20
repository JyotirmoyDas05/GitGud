import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { Check, Circle, FolderOpen, Loader2, RotateCcw, X } from "lucide-react";

import type { Challenge } from "~/challenges";
import { useProgress } from "~/lib/progress";
import { passed, verifierFor, type CheckResult } from "~/lib/verify";
import { strings, type UiStrings } from "~/strings";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * The directory prompt in the learner's language. The English fallback lives
 * on the challenge itself; these two terminal challenges are the only ones
 * that override the default "repository folder" wording.
 */
function localizedDirPrompt(id: string, t: UiStrings): string | undefined {
  if (id === "you_are_here") return t.dirPromptHome;
  if (id === "make_it_so") return t.dirPromptPractice;
  return undefined;
}

/**
 * The verify box. Replaces git-it-electron's `verify-button.html` /
 * `verify-directory-button.html` partials plus `challenge.js` and
 * `challenge-completed.js`.
 *
 * The original disabled the verify button permanently once a challenge passed
 * and re-enabled it only via "clear status", which meant a user who fixed
 * something could not simply re-check. Here the button stays live; completion
 * is a result, not a lock.
 */
export function VerifyBlock({ challenge, locale }: { challenge: Challenge; locale: string }) {
  const t = strings(locale);
  const { progress, isComplete, setCompleted, setSavedDir } = useProgress();

  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathWarning, setPathWarning] = useState(false);

  const verifier = verifierFor(challenge.id);
  const done = isComplete(challenge.id);
  const dir = progress.savedDir;

  async function pickDirectory() {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string") {
      setSavedDir(picked);
      setPathWarning(false);
    }
  }

  async function runVerify() {
    if (challenge.needsDirectory && !dir) {
      setPathWarning(true);
      return;
    }

    setRunning(true);
    setError(null);
    setResults(null);

    try {
      const out = await verifier!({
        path: dir ?? undefined,
        invitedFriend: progress.invitedFriend,
      });
      setResults(out);
      // Only ever set completion to true here. A previously-passed challenge
      // must not silently un-complete because the user moved a folder.
      if (passed(out)) setCompleted(challenge.id, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  if (!verifier) {
    return (
      <div className="my-6 rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
        {t.noCheck}
      </div>
    );
  }

  return (
    <section
      data-variant={done ? "success" : undefined}
      className={cn(
        "alert-glass my-6 rounded-lg border p-4 transition-colors",
        done ? "border-success/32" : "border-primary/32",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {challenge.needsDirectory && (
          <Button
            onClick={pickDirectory}
            disabled={running}
            variant="outline"
          >
            <FolderOpen className="size-4" />
            {dir ? t.changeDirectory : t.selectDirectory}
          </Button>
        )}

        <Button
          onClick={runVerify}
          disabled={running}
          variant="default"
        >
          {running && <Loader2 className="size-4 animate-spin" />}
          {running ? t.checking : done ? t.checkAgain : t.verify}
        </Button>

        {done && (
          <Button
            onClick={() => {
              setCompleted(challenge.id, false);
              setResults(null);
            }}
            variant="ghost"
          >
            <RotateCcw className="size-3.5" />
            {t.clearStatus}
          </Button>
        )}
      </div>

      {challenge.needsDirectory && (
        <p
          className={cn(
            "mt-2 break-all font-mono text-xs",
            pathWarning ? "text-error-foreground" : "text-muted-foreground",
          )}
        >
          {dir ?? localizedDirPrompt(challenge.id, t) ?? challenge.dirPrompt ?? t.pathRequired}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-error-surface px-2 py-1.5 text-error-foreground text-sm">
          {error}
        </p>
      )}

      {results && (
        <ul className="mt-3 space-y-1">
          {results.map((result, i) => (
            <li
              key={`${result.message}-${i}`}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                result.optional
                  ? "text-muted-foreground"
                  : result.passed
                    ? "text-success-foreground"
                    : "bg-error-surface text-error-foreground",
              )}
            >
              {result.optional ? (
                <Circle className="mt-0.5 size-4 shrink-0" />
              ) : result.passed ? (
                <Check className="mt-0.5 size-4 shrink-0" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0" />
              )}
              <span>
                {result.message}
                {result.optional && ` ${t.optionalSuffix}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
