import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { confirm } from "@tauri-apps/plugin-dialog";

import { CHALLENGES } from "~/challenges";
import { nextIncomplete, useProgress } from "~/lib/progress";
import { pixelTransition } from "~/lib/pixelTransition";
import { href, navigate } from "~/lib/router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function Home() {
  const { progress, completedCount, total, allDone, clearAll } = useProgress();
  const started = completedCount > 0;
  const [launching, setLaunching] = useState(false);

  async function onClearAll() {
    const yes = await confirm(
      "This clears the completed status for every challenge. Your repositories are not touched.",
      { title: "Clear all progress?", kind: "warning" },
    );
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
    <div className="mx-auto max-w-2xl px-6 py-10">
      <section className="relative overflow-hidden rounded-lg border bg-card p-4">
        {/* The same sky as the sidebar. A scrim fades it out under the text
            so the numbers stay legible and the clouds keep the right half. */}
        <img
          src="/brand/home-art.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full select-none object-cover dark:opacity-80 dark:saturate-75"
          style={{ imageRendering: "pixelated" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-card/85 via-card/35 to-transparent"
        />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-sm">
              Challenges completed
              <span className="ml-2 text-muted-foreground tabular-nums">
                {completedCount} / {total}
              </span>
            </p>

            {started && (
              <Button variant="ghost" size="icon-sm" onClick={onClearAll} title="Clear status">
                <RotateCcw />
              </Button>
            )}
          </div>

          <ol className="mt-3 flex flex-wrap gap-1.5">
            {CHALLENGES.map((challenge, i) => {
              const done = Boolean(progress.completed[challenge.id]);
              return (
                <li key={challenge.id}>
                  <a
                    href={href({ name: "challenge", id: challenge.id })}
                    title={`${i + 1}. ${challenge.title}`}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border text-[11px] tabular-nums transition-colors",
                      done
                        ? "border-success bg-success text-white"
                        : "border-border bg-card/70 text-muted-foreground backdrop-blur-[2px] hover:border-primary hover:text-foreground",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {!started && (
        <section className="mt-8">
          <h1 className="font-semibold text-2xl tracking-tight">Welcome</h1>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            Git Gud teaches the basics of Git and GitHub — not just beginner moves, but the
            commands you will reach for over and over. Every challenge is checked against your
            real repositories, so finishing one means it actually worked.
          </p>
          <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
            You will need Git installed and a GitHub account. The first two challenges cover
            both.
          </p>
          <span className="gg-mario-stage mt-6" data-play={launching || undefined}>
            <img className="gg-coin" src="/brand/coin.svg" alt="" width={36} height={36} />
            <img className="gg-mario" src="/brand/mario.svg" alt="" width={44} height={40} />
            <Button variant="default" size="lg" onClick={onStart}>
              Start challenge one
            </Button>
          </span>
        </section>
      )}

      {started && !allDone && (
        <section className="mt-8">
          <h1 className="font-semibold text-2xl tracking-tight">On your way</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Pick up where you left off.
          </p>
          <Button variant="default" size="lg" className="mt-6" onClick={() =>
              navigate({ name: "challenge", id: nextIncomplete(progress.completed) })}>
            Continue
          </Button>
        </section>
      )}

      {allDone && (
        <section className="mt-8">
          <h1 className="font-semibold text-2xl tracking-tight">Congratulations</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            You finished every challenge and are primed for social coding.
          </p>
          <Button variant="default" size="lg" className="mt-6" onClick={() => navigate({ name: "finale" })}>
            See what is next
          </Button>
        </section>
      )}
    </div>
  );
}
