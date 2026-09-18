/**
 * Syntax colouring for the shell snippets in the challenges.
 *
 * Every snippet in the content is one line of the shape
 * `command [subcommand] [flags] [args]`, with `"quoted strings"` and
 * `<PLACEHOLDERS>`. A full grammar engine (shiki, ~300KB with the bash
 * grammar) would produce the same five colours; this tokenizer produces them
 * in forty lines and no dependency.
 *
 * ponytail: single-line, no pipes/redirects/subshells. Extend the regex or swap
 * for shiki if the content ever grows multi-line scripts.
 */

export type TokenKind =
  | "command"
  | "subcommand"
  | "flag"
  | "string"
  | "placeholder"
  | "text";

export interface Token {
  kind: TokenKind;
  text: string;
}

const TOKEN = /("[^"]*"?|'[^']*'?)|(<[^>\s]+>)|(--?[\w-]+)|(\S+)|(\s+)/g;

/** Commands whose second word is a subcommand worth colouring (git commit …). */
const HAS_SUBCOMMAND = new Set(["git", "gh", "npm", "cargo"]);

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let words = 0;
  let command = "";

  for (const m of source.matchAll(TOKEN)) {
    const [, str, placeholder, flag, word, space] = m;
    if (space !== undefined) {
      tokens.push({ kind: "text", text: space });
      continue;
    }
    if (str !== undefined) {
      tokens.push({ kind: "string", text: str });
      words++;
      continue;
    }
    if (placeholder !== undefined) {
      tokens.push({ kind: "placeholder", text: placeholder });
      words++;
      continue;
    }
    if (flag !== undefined) {
      tokens.push({ kind: "flag", text: flag });
      words++;
      continue;
    }
    const text = word ?? "";
    if (words === 0) {
      command = text;
      tokens.push({ kind: "command", text });
    } else if (words === 1 && HAS_SUBCOMMAND.has(command)) {
      tokens.push({ kind: "subcommand", text });
    } else {
      tokens.push({ kind: "text", text });
    }
    words++;
  }

  return tokens;
}

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** HTML for a snippet: plain text stays plain, everything else gets a span. */
export function highlight(source: string): string {
  return tokenize(source)
    .map((t) =>
      t.kind === "text"
        ? escape(t.text)
        : `<span class="gg-tok-${t.kind}">${escape(t.text)}</span>`,
    )
    .join("");
}
