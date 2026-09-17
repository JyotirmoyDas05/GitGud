/**
 * Interface strings, per locale.
 *
 * These are recovered from git-it-electron's translated `partials/`, so every
 * non-English value here was written by a human translator for this project.
 * Nothing is machine-translated: a locale with no entry falls back to English,
 * which is what the original did too — only `es-CO`, `es-ES`, `fr-FR` and
 * `uk-UA` ever shipped translated partials; `ja-JP`, `ko-KR`, `pt-BR` and
 * `zh-TW` always showed English chrome around translated challenge text.
 *
 * The challenge and page content is fully translated for all nine locales;
 * that is the bulk of the words a learner reads. Translating the rest of the
 * interface needs real translators, not a model guessing.
 */

export interface UiStrings {
  challenges: string;
  verify: string;
  selectDirectory: string;
  changeDirectory: string;
  clearStatus: string;
  pathRequired: string;
  checking: string;
  checkAgain: string;
}

const EN: UiStrings = {
  challenges: "Challenges",
  verify: "Verify",
  selectDirectory: "Select directory",
  changeDirectory: "Change directory",
  clearStatus: "Clear completed status",
  pathRequired: "Select the repository folder this challenge is about.",
  // No recovered translations for these two: the original had no such
  // strings, so they stay English everywhere rather than being guessed.
  checking: "Checking…",
  checkAgain: "Check again",
};

// Values are recovered verbatim except for case: the original rendered the
// buttons in capitals (VERIFICAR, VÉRIFIER, ПЕРЕВІРИТИ) and this interface does
// not shout. There is deliberately no translation for changeDirectory — the
// original had no such string, and inventing one would be exactly the guessing
// this table exists to avoid.
const TRANSLATIONS: Record<string, Partial<UiStrings>> = {
  "es-CO": {
    challenges: "Retos",
  },
  "es-ES": {
    challenges: "Retos",
    verify: "Verificar",
    selectDirectory: "Selecciona la carpeta",
    clearStatus: "Reiniciar el estado de completado",
  },
  "fr-FR": {
    challenges: "Défis",
    verify: "Vérifier",
    selectDirectory: "Sélectionner un répertoire",
    clearStatus: "Effacer le statut terminé",
  },
  "uk-UA": {
    challenges: "Завдання",
    verify: "Перевірити",
    selectDirectory: "Оберіть директорію",
    clearStatus: "Скинути статуси завдань",
  },
};

export function strings(locale: string): UiStrings {
  return { ...EN, ...(TRANSLATIONS[locale] ?? {}) };
}
