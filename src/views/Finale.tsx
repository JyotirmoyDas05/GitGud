import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

import { COMPANION } from "~/challenges";
import {
  configuredUsername,
  fetchContributors,
  patchUrl,
  type Contributor,
} from "~/lib/github";
import { strings } from "~/strings";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * The wall of fame, rendered in the app.
 *
 * git-it sent you off to a website at this point. Everything here is already
 * public on Pages, but the payoff of eleven challenges should not be a link —
 * and the quilt is the reason the last four challenges exist.
 */
export function Finale({ locale }: { locale: string }) {
  const t = strings(locale);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; total: number; contributors: Contributor[]; me: string }
  >({ kind: "loading" });

  async function load() {
    setState({ kind: "loading" });
    try {
      const [list, me] = await Promise.all([fetchContributors(), configuredUsername()]);
      setState({
        kind: "ready",
        total: list.total,
        contributors: list.contributors,
        me: me.toLowerCase(),
      });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const mine =
    state.kind === "ready"
      ? state.contributors.find((c) => c.username.toLowerCase() === state.me)
      : undefined;

  const patches =
    state.kind === "ready" ? state.contributors.filter((c) => c.patch) : [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="font-semibold text-3xl tracking-tight">{t.finaleTitle}</h1>
      <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
        {t.finaleIntro}
      </p>

      {state.kind === "loading" && (
        <p className="mt-8 animate-status-pulse text-muted-foreground text-sm">
          {t.finaleFetching}
        </p>
      )}

      {state.kind === "error" && (
        <div className="mt-8 rounded-lg border bg-error-surface p-4">
          <p className="text-error-foreground text-sm">{state.message}</p>
          <p className="mt-1 text-muted-foreground text-sm">
            {t.finaleNeedsConn}
          </p>
          <Button
            onClick={load}
            variant="outline"
            className="mt-3"
          >
            <RefreshCw className="size-3.5" />
            {t.finaleRetry}
          </Button>
        </div>
      )}

      {state.kind === "ready" && (
        <>
          {mine?.patch && (
            <section className="mt-8 flex items-center gap-4 rounded-lg border bg-card p-4">
              <img
                src={patchUrl(mine.patch)}
                alt={`${mine.username}'s quilt patch`}
                width={96}
                height={96}
                className="size-24 shrink-0 rounded-md border"
              />
              <div>
                <h2 className="font-medium text-sm">{t.finaleYourPatch}</h2>
                <p className="mt-1 text-muted-foreground text-sm">
                  {renderPatchDesc(t.finalePatchDesc, mine.username)}
                </p>
              </div>
            </section>
          )}

          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="font-medium text-sm">{t.finaleQuilt}</h2>
              <span className="text-muted-foreground text-xs tabular-nums">
                {state.total.toLocaleString()}{" "}
                {state.total === 1 ? t.finalePersonOne : t.finalePeopleMany}
              </span>
            </div>

            {patches.length > 0 ? (
              // Gapless on purpose: it should read as one piece of cloth, not a
              // grid of icons.
              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] overflow-hidden rounded-lg border">
                {patches.slice(0, 120).map((c) => (
                  <button
                    key={c.username}
                    type="button"
                    title={`@${c.username}`}
                    onClick={() => void openUrl(`https://github.com/${c.username}`)}
                    className={cn(
                      "block cursor-pointer leading-none transition-[scale] duration-150 ease-out-strong hover:z-10 hover:scale-110",
                      c.username.toLowerCase() === state.me && "ring-2 ring-primary ring-inset",
                    )}
                  >
                    <img
                      src={patchUrl(c.patch as string)}
                      alt=""
                      loading="lazy"
                      className="block w-full"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
                {t.finaleEmpty}
              </p>
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-medium text-sm">{t.finaleNext}</h2>
            <ul className="mt-2 space-y-2 text-muted-foreground text-sm">
              <li>
                {t.finaleNext1}
              </li>
              <li>
                {t.finaleNext2}
              </li>
              <li>{t.finaleNext3}</li>
              <li>
                {t.finaleNext4}
              </li>
            </ul>
          </section>

          <Button
            onClick={() => void openUrl(COMPANION.pages)}
            variant="default"
            size="lg"
            className="mt-8"
          >
            {t.finaleSeeOnline}
            <ExternalLink className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Renders `finalePatchDesc` with the `{username}` placeholder replaced by the
 * learner's handle in bold. The template keeps word order per locale; the
 * split is on the placeholder, never on prose.
 */
function renderPatchDesc(template: string, username: string) {
  const [before, after] = template.split("{username}");
  return (
    <>
      {before}
      <strong className="text-foreground">@{username}</strong>
      {after ?? ""}
    </>
  );
}
