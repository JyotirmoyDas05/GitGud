import type { ReactNode } from "react";
import { BookMarked, Check, Home, Info, LibraryBig, Moon, Sun } from "lucide-react";

import { CHALLENGES, challengeTitle, grouped, moduleBlurb, moduleTitle } from "~/challenges";
import { CommandPalette } from "~/components/CommandPalette";
import { HomeScene } from "~/components/HomeScene";
import { LocaleMenu } from "~/components/LocaleMenu";
import { SidebarArt } from "~/components/SidebarArt";
import { UpdateButton } from "~/components/UpdateButton";
import { useUpdateState } from "~/lib/updater";
import { useHeaderTitle } from "~/lib/headerTitle";
import { WindowControls } from "~/components/WindowControls";
import { availableLocales } from "~/lib/content";
import { strings } from "~/strings";
import { useProgress } from "~/lib/progress";
import { href, navigate, useRoute, type Route } from "~/lib/router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const NAV: { page: "dictionary" | "resources" | "about"; key: "navDictionary" | "navResources" | "navAbout"; icon: typeof Info }[] = [
  { page: "dictionary", key: "navDictionary", icon: BookMarked },
  { page: "resources", key: "navResources", icon: LibraryBig },
  { page: "about", key: "navAbout", icon: Info },
];

export function Shell({
  children,
  locale,
  onLocaleChange,
  dark,
  onDarkChange,
}: {
  children: ReactNode;
  locale: string;
  onLocaleChange: (next: string) => void;
  dark: boolean;
  onDarkChange: (next: boolean) => void;
}) {
  const route = useRoute();
  const { isComplete, completedCount, total } = useProgress();
  const locales = availableLocales();
  const t = strings(locale);
  const promoted = useHeaderTitle();
  const groups = grouped();
  const update = useUpdateState();

  return (
    // The sidebar is a full-height column, title-bar row included, so its
    // divider runs from the very top. That is what stops the window reading as
    // "OS bar on top of app" — the app's own structure is the only structure.
    <div className="flex h-screen bg-background text-foreground">
      <aside className="relative hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <SidebarArt />

        {/* Branding, not navigation — Home is its own row below, so the mark
            can simply be the mark. */}
        <div
          data-tauri-drag-region
          className="relative z-10 flex h-[52px] shrink-0 items-center gap-2 px-4"
        >
          <img
            src="/brand/mark.png"
            alt=""
            aria-hidden="true"
            width={22}
            height={22}
            className="size-[22px] shrink-0"
          />
          <span className="font-semibold text-sm tracking-tight">Git Gud</span>
          <span className="ml-auto text-muted-foreground text-xs tabular-nums">
            {completedCount} / {total}
          </span>
        </div>

        <div className="relative z-10 px-2 pb-2">
          <CommandPalette locale={locale} />
        </div>

        {/* The fade is a sibling overlay rather than a mask on the scroller,
            and the wrapper exists to anchor it. See the note on
            `.sidebar-scroll` in `index.css` for why the mask had to go. */}
        <div className="relative z-10 min-h-0 flex-1">
        <nav
          aria-label={t.challenges}
          className="surface-grain sidebar-scroll h-full p-2 pb-4"
        >
          <a
            href={href({ name: "home" })}
            aria-current={route.name === "home" ? "page" : undefined}
            className={cn(
              "mb-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              route.name === "home"
                ? "bg-sidebar-row-selected font-medium text-sidebar-foreground shadow-xs"
                : "text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
            )}
          >
            <Home className="size-4" />
            {t.navHome}
          </a>

          {/* Grouped by module, as a track per module rather than three
              labels floating over one long list.

              The rail down the left is the grouping: it starts and stops with
              the module, and each row owns its own segment, so completed rows
              fuse into a solid run of progress you can read without counting
              ticks. That is also why the group heading can be one word plus a
              count instead of a sentence — the rail says the rest. */}
          {groups.map(({ module, items }) => {
            const doneCount = items.filter((i) => isComplete(i.challenge.id)).length;
            const moduleDone = doneCount === items.length;

            return (
              <section key={module.id} className="mt-3 first:mt-0">
                <div className="flex items-baseline gap-2 px-2 pb-1.5" title={moduleBlurb(module, locale)}>
                  <h3
                    className={cn(
                      "font-medium text-[11px] uppercase tracking-[0.07em]",
                      moduleDone ? "text-success-foreground" : "text-sidebar-muted-foreground",
                    )}
                  >
                    {moduleTitle(module, locale)}
                  </h3>
                  <span
                    className={cn(
                      "ml-auto shrink-0 text-[10px] tabular-nums",
                      moduleDone ? "text-success-foreground" : "text-sidebar-muted-foreground/70",
                    )}
                  >
                    {moduleDone ? <Check className="size-3" /> : `${doneCount}/${items.length}`}
                  </span>
                </div>

                <ol>
                  {items.map(({ challenge, index }) => {
                    const current = route.name === "challenge" && route.id === challenge.id;
                    const done = isComplete(challenge.id);

                    return (
                      // The rail lives on the `li`, not the `a`: rows sit flush
                      // against each other, so their segments join into one
                      // unbroken line instead of a dashed ladder.
                      <li
                        key={challenge.id}
                        className={cn(
                          "border-l-2 pl-2",
                          current
                            ? "border-primary"
                            : done
                              ? "border-success/55"
                              : "border-sidebar-border",
                        )}
                      >
                        <a
                          href={href({ name: "challenge", id: challenge.id })}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md py-1.5 pr-2 pl-1.5 text-sm transition-colors",
                            current
                              ? "bg-sidebar-row-selected font-medium text-sidebar-foreground shadow-xs"
                              : "text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
                          )}
                        >
                          {/* A fixed-width slot rather than a bordered pill:
                              sixteen outlined circles competing with sixteen
                              titles was the heaviest thing in the column, and
                              the rail already draws the track they sat on. */}
                          <span
                            className={cn(
                              "flex w-4 shrink-0 justify-center text-[10px] tabular-nums",
                              done
                                ? "text-success-foreground"
                                : current
                                  ? "text-foreground"
                                  : "text-sidebar-muted-foreground/60",
                            )}
                          >
                            {done ? <Check className="size-3.5" /> : index + 1}
                          </span>
                          <span className="truncate">{challengeTitle(challenge, locale)}</span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })}

        </nav>

          {/* Without a scrollbar the list has to say for itself that it
              continues, so the bottom edge dissolves instead of cutting a row
              in half. The scroller's matching `pb-4` is what keeps this off
              the last row's text once you have scrolled all the way down: at
              the end of the travel the faded strip is padding. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-sidebar to-transparent"
          />
        </div>

        {/* Reference links are pinned below the scroll area, not parked at the
            end of it. The challenge list is the only thing long enough to
            scroll, and with the scrollbar gone these three would otherwise sit
            off the bottom edge of a short window with nothing to say so. */}
        <div className="relative z-10 shrink-0 border-t p-2">
          {NAV.map(({ page, key, icon: Icon }) => (
            <a
              key={page}
              href={href({ name: "page", page })}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                route.name === "page" && route.page === page
                  ? "bg-sidebar-row-selected font-medium text-sidebar-foreground"
                  : "text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-4" />
              {t[key]}
            </a>
          ))}

          {/* Version readout and the update control, bottom-right, where T3
              Code puts theirs. The version earns its place beside the button:
              "up to date" means nothing unless you can see what you are on,
              and it is the first thing to ask for in a bug report. */}
          {update.status !== "unsupported" && (
            <div className="mt-1 flex h-7 items-center gap-2 px-2">
              <span className="truncate text-[11px] text-sidebar-muted-foreground/70 tabular-nums">
                {update.currentVersion ? `v${update.currentVersion}` : ""}
              </span>
              <span className="ml-auto">
                <UpdateButton />
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* `relative` so the home scene can sit behind the header as well as the
          content. Painting it inside `main` left the title bar as a flat slab
          of app colour above the sky, and put the artwork inside the scroll
          fade's mask — whose opaque scrollbar lane showed up as an unfaded
          column at the top right. */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {route.name === "home" && <HomeScene dark={dark} />}

        {/* No bottom border: content dissolves under the glass rather than
            stopping at a hard line. */}
        <header
          data-tauri-drag-region
          className={cn(
            "z-20 flex h-[52px] shrink-0 items-stretch gap-3",
            // On the home route the sky runs the full height of the pane, so
            // the bar stays out of its way; everywhere else it is the glass
            // that content dissolves under.
            route.name === "home" ? "bg-transparent" : "surface-glass",
          )}
        >
          {/* The promoted heading slides up into the bar as the real one
              leaves the viewport, blurring through the handover so the two
              never read as two separate things. */}
          <div className="my-auto min-w-0 flex-1 pl-4" data-tauri-drag-region>
            <div
              className={cn(
                "flex min-w-0 items-center gap-2.5",
                "transition-[opacity,translate,filter] duration-200 ease-out-strong",
                promoted
                  ? "translate-y-0 opacity-100 blur-0"
                  : "pointer-events-none translate-y-1.5 opacity-0 blur-[3px]",
              )}
            >
              {promoted?.mascotId && (
                <img
                  src={`/mascots/${promoted.mascotId}.svg`}
                  alt=""
                  aria-hidden="true"
                  width={28}
                  height={28}
                  className="size-7 shrink-0 rounded-full border bg-card p-px"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-muted-foreground text-[11px] leading-tight">
                  {promoted?.eyebrow}
                </p>
                <p className="truncate font-semibold text-sm leading-tight tracking-tight">
                  {promoted?.title}
                </p>
              </div>
            </div>
          </div>

          {locales.length > 1 && (
            <div className="my-auto">
              <LocaleMenu locale={locale} locales={locales} onChange={onLocaleChange} />
            </div>
          )}

          <Button
            onClick={() => onDarkChange(!dark)}
            aria-label="Toggle theme"
            variant="ghost"
            size="icon"
            className="my-auto"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <WindowControls />
        </header>

        <main className="@container topbar-scroll-fade min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PrevNext({ current, locale }: { current: number; locale: string }) {
  const prev = CHALLENGES[current - 1];
  const next = CHALLENGES[current + 1];
  const t = strings(locale);

  const to = (route: Route, label: string, side: "left" | "right") => (
    <Button
      onClick={() => navigate(route)}
      variant="outline"
    >
      {side === "left" ? `← ${label}` : `${label} →`}
    </Button>
  );

  return (
    <div className="mt-10 flex items-center justify-between border-t pt-4">
      {prev
        ? to({ name: "challenge", id: prev.id }, challengeTitle(prev, locale), "left")
        : to({ name: "home" }, t.navAllChallenges, "left")}
      {next
        ? to({ name: "challenge", id: next.id }, challengeTitle(next, locale), "right")
        : to({ name: "finale" }, t.navDone, "right")}
    </div>
  );
}
