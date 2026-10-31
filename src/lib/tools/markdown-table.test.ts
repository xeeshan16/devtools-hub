import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKDOWN_TABLE_OPTIONS,
  detectDelimiter,
  escapeCell,
  toMarkdownTable,
  type MarkdownTableOptions,
} from "./markdown-table";

function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function table(input: string, options: Partial<MarkdownTableOptions> = {}): string {
  return value(toMarkdownTable(input, { ...DEFAULT_MARKDOWN_TABLE_OPTIONS, ...options }));
}

describe("detectDelimiter", () => {
  it("prefers tabs, as pasted from a spreadsheet", () => {
    expect(detectDelimiter("a\tb, c\n1\t2")).toBe("\t");
  });

  it("picks semicolons when they outnumber commas", () => {
    expect(detectDelimiter("a;b;c\n1,5;2;3")).toBe(";");
  });

  it("defaults to commas", () => {
    expect(detectDelimiter("a,b\n1;2;3;4")).toBe(",");
    expect(detectDelimiter("single column")).toBe(",");
  });

  it("ignores delimiters inside quotes", () => {
    expect(detectDelimiter('"x;y;z",b\n1,2')).toBe(",");
  });
});

describe("escapeCell", () => {
  it("escapes pipes and turns line breaks into <br>", () => {
    expect(escapeCell("a|b")).toBe("a\\|b");
    expect(escapeCell("line 1\r\nline 2\nline 3")).toBe("line 1<br>line 2<br>line 3");
  });

  it("trims surrounding whitespace", () => {
    expect(escapeCell("  padded  ")).toBe("padded");
  });
});

describe("toMarkdownTable", () => {
  it("returns an empty string for empty input", () => {
    expect(table("")).toBe("");
    expect(table("  \n\n")).toBe("");
  });

  it("pads columns so the raw Markdown lines up", () => {
    expect(table("id,name\n1,Ada Lovelace\n2,Grace")).toBe(
      [
        "| id  | name         |",
        "| --- | ------------ |",
        "| 1   | Ada Lovelace |",
        "| 2   | Grace        |",
      ].join("\n"),
    );
  });

  it("writes compact rows when pretty printing is off", () => {
    expect(table("id,name\n1,Ada Lovelace", { pretty: false })).toBe(
      ["| id | name |", "| --- | --- |", "| 1 | Ada Lovelace |"].join("\n"),
    );
  });

  it("applies alignment to the delimiter row and the padding", () => {
    const input = "item,qty\napple,10\nfig,2";
    expect(table(input, { alignment: "right" })).toBe(
      [
        "|  item | qty |",
        "| ----: | --: |",
        "| apple |  10 |",
        "|   fig |   2 |",
      ].join("\n"),
    );
    expect(table(input, { alignment: "center" })).toBe(
      [
        "| item  | qty |",
        "| :---: | :-: |",
        "| apple | 10  |",
        "|  fig  |  2  |",
      ].join("\n"),
    );
    expect(table(input, { alignment: "left", pretty: false })).toBe(
      ["| item | qty |", "| :-- | :-- |", "| apple | 10 |", "| fig | 2 |"].join("\n"),
    );
  });

  it("parses tab-separated input automatically", () => {
    expect(table("a\tb\n1\t2", { pretty: false })).toBe(
      ["| a | b |", "| --- | --- |", "| 1 | 2 |"].join("\n"),
    );
  });

  it("uses an explicit delimiter instead of guessing", () => {
    expect(table("a;b\n1,5;2", { delimiter: ",", pretty: false })).toBe(
      ["| a;b |  |", "| --- | --- |", "| 1 | 5;2 |"].join("\n"),
    );
  });

  it("keeps quoted delimiters, escapes pipes and converts embedded newlines", () => {
    expect(table('cmd,note\n"a | b","Hopper, Grace\nsecond line"', { pretty: false })).toBe(
      [
        "| cmd | note |",
        "| --- | --- |",
        "| a \\| b | Hopper, Grace<br>second line |",
      ].join("\n"),
    );
  });

  it("pads short rows, including the header, to the widest row", () => {
    expect(table("a,b\n1\n1,2,3", { pretty: false })).toBe(
      [
        "| a | b |  |",
        "| --- | --- | --- |",
        "| 1 |  |  |",
        "| 1 | 2 | 3 |",
      ].join("\n"),
    );
  });

  it("skips blank lines and a byte-order mark", () => {
    expect(table("﻿a,b\n\n1,2\n", { pretty: false })).toBe(
      ["| a | b |", "| --- | --- |", "| 1 | 2 |"].join("\n"),
    );
  });

  it("outputs a header-only table for a single row", () => {
    expect(table("a,b", { pretty: false })).toBe("| a | b |\n| --- | --- |");
  });

  it("measures width in code points", () => {
    expect(table("név,x\nZoë 🙂,1")).toBe(
      ["| név   | x   |", "| ----- | --- |", "| Zoë 🙂 | 1   |"].join("\n"),
    );
  });

  it("reports CSV syntax errors with their line", () => {
    const result = toMarkdownTable('a,b\n1,"unterminated');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/line 2/);
  });
});
