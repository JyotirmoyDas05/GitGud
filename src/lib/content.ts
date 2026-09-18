/**
 * Loads challenge and page HTML out of `src/content/`.
 *
 * Vite inlines every match at build time, so the content ships inside the
 * bundle — no runtime fetch, no file:// paths, and a missing locale is a build
 * error rather than a blank page in front of a learner.
 */

const challengeHtml = import.meta.glob("../content/*/challenges/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const pageHtml = import.meta.glob("../content/*/pages/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const FALLBACK_LOCALE = "en-US";

export const LOCALES: Record<string, string> = {
  "en-US": "English",
  "ja-JP": "日本語",
  "zh-TW": "中文(臺灣)",
  "ko-KR": "한국어",
  "pt-BR": "Português Brasileiro",
  "uk-UA": "Українська",
  "es-CO": "Español (Colombia)",
  "es-ES": "Español (España)",
  "fr-FR": "Français",
};

/** Marker left by `scripts/prepare-content.mjs` where the verify block goes. */
const VERIFY_MARKER = "<!--VERIFY-->";

export interface ChallengeBody {
  /** HTML before the verify block. */
  before: string;
  /** HTML after it — the original put tips below the button, so this matters. */
  after: string;
}

function pick(
  map: Record<string, string>,
  locale: string,
  kind: "challenges" | "pages",
  file: string,
): string | undefined {
  return (
    map[`../content/${locale}/${kind}/${file}`] ??
    map[`../content/${FALLBACK_LOCALE}/${kind}/${file}`]
  );
}

/**
 * Split a challenge body around the verify marker.
 *
 * A translated file that predates the marker simply has no split point; render
 * the verify block at the end rather than dropping it, which would leave the
 * challenge impossible to complete.
 */
export function loadChallenge(locale: string, file: string): ChallengeBody {
  const html = pick(challengeHtml, locale, "challenges", file) ?? "";
  const at = html.indexOf(VERIFY_MARKER);

  if (at === -1) return { before: html, after: "" };

  return {
    before: html.slice(0, at),
    after: html.slice(at + VERIFY_MARKER.length),
  };
}

export function loadPage(locale: string, name: string): string {
  return pick(pageHtml, locale, "pages", `${name}.html`) ?? "";
}

/** Locales that actually shipped content, for the language picker. */
export function availableLocales(): string[] {
  const found = new Set<string>();
  for (const path of Object.keys(challengeHtml)) {
    const match = path.match(/\.\.\/content\/([^/]+)\//);
    if (match) found.add(match[1]);
  }
  return Object.keys(LOCALES).filter((l) => found.has(l));
}

/** Map a system locale like `en-GB` or `ja` onto one we ship. */
export function resolveLocale(requested: string): string {
  if (requested in LOCALES) return requested;
  const base = requested.split("-")[0];
  const match = Object.keys(LOCALES).find((l) => l.split("-")[0] === base);
  return match ?? FALLBACK_LOCALE;
}
