import { describe, expect, it } from "vitest";

import { highlight, tokenize } from "./shellHighlight";

describe("shell tokenizer", () => {
  it("colours command, subcommand, flag, string and placeholder", () => {
    const kinds = tokenize('git config --global user.name "Your Name"')
      .filter((t) => t.kind !== "text" || t.text.trim())
      .map((t) => `${t.kind}:${t.text}`);
    expect(kinds).toEqual([
      "command:git",
      "subcommand:config",
      "flag:--global",
      "text:user.name",
      'string:"Your Name"',
    ]);
  });

  it("treats the second word of non-git commands as an argument", () => {
    const kinds = tokenize("mkdir <FOLDERNAME>").map((t) => t.kind);
    expect(kinds).toEqual(["command", "text", "placeholder"]);
  });

  it("round-trips the text exactly and escapes HTML", () => {
    const src = "git push <REMOTENAME> --delete <BRANCHNAME>";
    expect(tokenize(src).map((t) => t.text).join("")).toBe(src);
    expect(highlight(src)).not.toContain("<REMOTENAME>");
    expect(highlight(src)).toContain("&lt;REMOTENAME&gt;");
  });
});
