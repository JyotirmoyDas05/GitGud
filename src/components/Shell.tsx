import type { ReactNode } from "react";
import { BookMarked, Check, Home, Info, LibraryBig, Moon, Sun } from "lucide-react";

import { CHALLENGES } from "~/challenges";
import { CommandPalette } from "~/components/CommandPalette";
import { LocaleMenu } from "~/components/LocaleMenu";
import { SidebarArt } from "~/components/SidebarArt";
import { useHeaderTitle } from "~/lib/headerTitle";
import { WindowControls } from "~/components/WindowControls";
import { availableLocales } from "~/lib/content";
import { strings } from "~/strings";
import { useProgress } from "~/lib/progress";
import { href, navigate, useRoute, type Route } from "~/lib/router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const NAV: { page: "dictionary" | "resources" | "about"; label: string; icon: typeof Info }[] = [
  { page: "dictionary", label: "Dictionary", icon: BookMarked },
  { page: "resources", label: "Resources", icon: LibraryBig },
  { page: "about", label: "About", icon: Info },
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

        <nav className="surface-grain relative z-10 min-h-0 flex-1 overflow-y-auto p-2">
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
            Home
          </a>

          <p className="px-2 py-1.5 font-medium text-sidebar-muted-foreground text-xs uppercase tracking-wide">
            {t.challenges}
          </p>

          <ol className="space-y-px">
            {CHALLENGES.map((challenge, i) => {
              const current = route.name === "challenge" && route.id === challenge.id;
              const done = isComplete(challenge.id);

              return (
                <li key={challenge.id}>
                  <a
                    href={href({ name: "challenge", id: challenge.id })}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      current
                        ? "bg-sidebar-row-selected font-medium text-sidebar-foreground shadow-xs"
                        : "text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums",
                        done
                          ? "border-success bg-success text-white"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-3" /> : i + 1}
                    </span>
                    <span className="truncate">{challenge.title}</span>
                  </a>
                </li>
              );
            })}
          </ol>

          <div className="mt-4 border-t pt-2">
            {NAV.map(({ page, label, icon: Icon }) => (
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
                {label}
              </a>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* No bottom border: content dissolves under the glass rather than
            stopping at a hard line. */}
        <header
          data-tauri-drag-region
          className="surface-glass z-20 flex h-[52px] shrink-0 items-stretch gap-3"
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

export function PrevNext({ current }: { current: number }) {
  const prev = CHALLENGES[current - 1];
  const next = CHALLENGES[current + 1];

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
        ? to({ name: "challenge", id: prev.id }, prev.title, "left")
        : to({ name: "home" }, "All challenges", "left")}
      {next
        ? to({ name: "challenge", id: next.id }, next.title, "right")
        : to({ name: "finale" }, "Done!", "right")}
    </div>
  );
}
