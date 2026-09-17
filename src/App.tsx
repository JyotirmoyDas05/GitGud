import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { TriangleAlert } from "lucide-react";

import { Shell } from "~/components/Shell";
import { FALLBACK_LOCALE, resolveLocale } from "~/lib/content";
import { gitVersion } from "~/lib/git";
import { hydrate, useProgressUnreadable } from "~/lib/progress";
import { useRoute } from "~/lib/router";
import { ChallengeView } from "~/views/ChallengeView";
import { Finale } from "~/views/Finale";
import { Home } from "~/views/Home";
import { PageView } from "~/views/PageView";

const LOCALE_KEY = "git-gud:locale";
const THEME_KEY = "git-gud:theme";

export default function App() {
  const route = useRoute();

  const [locale, setLocale] = useState(
    () =>
      localStorage.getItem(LOCALE_KEY) ??
      resolveLocale(navigator.language ?? FALLBACK_LOCALE),
  );

  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [gitMissing, setGitMissing] = useState(false);
  const saveUnreadable = useProgressUnreadable();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  // The native menu emits routes rather than loading URLs: the app is a single
  // page, so navigation belongs to the router, not the window.
  useEffect(() => {
    const stop = listen<string>("menu://navigate", (event) => {
      window.location.hash = event.payload;
      window.scrollTo({ top: 0 });
    });
    return () => {
      void stop.then((unlisten) => unlisten());
    };
  }, []);

  // Progress lives in a file, not localStorage. Load it before the first
  // paint settles so a returning learner never sees a zeroed sidebar.
  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    gitVersion()
      .then((v) => setGitMissing(!v))
      .catch(() => setGitMissing(true));
  }, []);

  return (
    <Shell locale={locale} onLocaleChange={setLocale} dark={dark} onDarkChange={setDark}>
      {gitMissing && (
        <div data-variant="warning"
          className="alert-glass flex items-start gap-2 border-b px-6 py-2.5 text-sm text-warning-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Git was not found on your PATH. Challenge 1 walks you through installing it — the
            other challenges cannot be verified until it is.
          </span>
        </div>
      )}

      {saveUnreadable && (
        <div data-variant="warning"
          className="alert-glass flex items-start gap-2 border-b px-6 py-2.5 text-sm text-warning-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Your saved progress could not be read, so this session is not being saved to
            disk. The old file was kept as <code className="font-mono text-xs">user-data.corrupt.json</code> in
            the app data folder.
          </span>
        </div>
      )}

      {route.name === "home" && <Home />}
      {route.name === "challenge" && <ChallengeView id={route.id} locale={locale} />}
      {route.name === "page" && <PageView page={route.page} locale={locale} />}
      {route.name === "finale" && <Finale />}
    </Shell>
  );
}
