import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";

import { CHALLENGES, challengeTitle, grouped, moduleTitle } from "~/challenges";
import { requestConfirmDialog } from "~/lib/confirmDialog";
import { nextIncomplete, useProgress } from "~/lib/progress";
import { pixelTransition } from "~/lib/pixelTransition";
import { href, navigate } from "~/lib/router";
import { strings } from "~/strings";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function Home({ locale }: { locale: string }) {
  const { progress, completedCount, total, allDone, clearAll } = useProgress();
  const t = strings(locale);
  const started = completedCount > 0;
  const [launching, setLaunching] = useState(false);

  async function onClearAll() {
    const yes = await requestConfirmDialog(t.homeClearMsg, {
      title: t.homeClearTitle,
      variant: "destructive",
    });
    if (yes) clearAll();
  }

  // The one moment in the app that earns a flourish: the very first click.
  // Coin and plumber pop out of the button, then the screen pixelates outward
  // from it and clears on challenge one.
  async function onStart(e: React.MouseEvent<HTMLButtonElement>) {
    if (launching) return;
    setLaunching(true);
    const r = e.currentTarget.getBoundingClientRect();
    const origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    // Let the coin reach its peak before the wipe begins.
    await new Promise((res) => setTimeout(res, 420));
    await pixelTransition(origin, () => navigate({ name: "challenge", id: CHALLENGES[0].id }));
  }

  return (
    // The landscape is painted by the shell, behind the title bar as well as
    // this column, so all that is left here is the content that floats on it.
    <div className="relative mx-auto max-w-2xl px-6 py-10">
      {/* Glass, because the text sits on a bright sky in one theme and a night
          sky in the other, and neither one is a reliable backdrop for body
          copy on its own. */}
      <section className="panel-glass rounded-lg border p-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-sm">
              {t.homeProgressLabel}
              <span className="ml-2 text-muted-foreground tabular-nums">
                {completedCount} / {total}
              </span>
            </p>

            {started && (
              <Button variant="ghost" size="icon-sm" onClick={onClearAll} title={t.clearStatus}>
                <RotateCcw />
              </Button>
            )}
          </div>

          {/* One row per module rather than sixteen circles in a wrapping
              block — the wrap point moves with the window, so an ungrouped
              row would split the modules in a different place at every
              width. */}
          <div className="mt-3 space-y-2">
            {grouped().map(({ module, items }) => (
              <div key={module.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="w-24 shrink-0 text-[11px] text-muted-foreground">
                  {moduleTitle(module, locale)}
                </span>
                <ol className="flex flex-wrap gap-1.5">
                  {items.map(({ challenge, index }) => {
                    const done = Boolean(progress.completed[challenge.id]);
                    return (
                      <li key={challenge.id}>
                        <a
                          href={href({ name: "challenge", id: challenge.id })}
                          title={`${index + 1}. ${challengeTitle(challenge, locale)}`}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full border text-[11px] tabular-nums transition-colors",
                            done
                              ? "border-success bg-success text-white"
                              : "border-border bg-card/70 text-muted-foreground backdrop-blur-[2px] hover:border-primary hover:text-foreground",
                          )}
                        >
                          {done ? <Check className="size-3.5" /> : index + 1}
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!started && (
        <section className="panel-glass mt-6 rounded-lg border p-5">
          <h1 className="font-semibold text-2xl tracking-tight">{t.homeWelcome}</h1>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            {t.homeIntro1}
          </p>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
            {t.homeIntro2}
          </p>
          <span className="gg-mario-stage mt-6" data-play={launching || undefined}>
            <img className="gg-coin" src="/brand/coin.svg" alt="" width={36} height={36} />
            <img className="gg-mario" src="/brand/mario.svg" alt="" width={44} height={40} />
            <Button variant="default" size="lg" onClick={onStart}>
              {t.homeStart}
            </Button>
          </span>
        </section>
      )}

      {started && !allDone && (
        <section className="panel-glass mt-6 rounded-lg border p-5">
          <h1 className="font-semibold text-2xl tracking-tight">{t.homeOnWay}</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {t.homePickup}
          </p>
          <Button variant="default" size="lg" className="mt-6" onClick={() =>
              navigate({ name: "challenge", id: nextIncomplete(progress.completed) })}>
            {t.homeContinue}
          </Button>
        </section>
      )}

      {allDone && (
        <section className="panel-glass mt-6 rounded-lg border p-5">
          <h1 className="font-semibold text-2xl tracking-tight">{t.homeCongrats}</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            {t.homeFinished}
          </p>
          <Button variant="default" size="lg" className="mt-6" onClick={() => navigate({ name: "finale" })}>
            {t.homeSeeNext}
          </Button>
        </section>
      )}
    </div>
  );
}
