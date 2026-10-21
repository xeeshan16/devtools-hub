import { describe, expect, it } from "vitest";
import {
  DEFAULT_LINE_OPTIONS,
  orderHasDirection,
  processLines,
  splitLines,
  type LineOptions,
} from "./line-tools";

function run(input: string, options: Partial<LineOptions> = {}) {
  return processLines(input, { ...DEFAULT_LINE_OPTIONS, ...options });
}

function lines(input: string, options: Partial<LineOptions> = {}): string[] {
  return splitLines(run(input, options).output);
}

describe("splitLines", () => {
  it("returns no lines for empty input", () => {
    expect(splitLines("")).toEqual([]);
  });

  it("treats one trailing line break as the end of the last line", () => {
    expect(splitLines("a\nb\n")).toEqual(["a", "b"]);
    expect(splitLines("a\nb\n\n")).toEqual(["a", "b", ""]);
  });

  it("accepts CRLF line endings", () => {
    expect(splitLines("a\r\nb\r\nc")).toEqual(["a", "b", "c"]);
  });
});

describe("ordering", () => {
  const sample = "banana\nApple\ncherry\napple";

  it("keeps the original order when asked to", () => {
    expect(lines(sample, { order: "original", dedupe: false })).toEqual([
      "banana",
      "Apple",
      "cherry",
      "apple",
    ]);
  });

  it("sorts alphabetically with upper case first on ties", () => {
    expect(lines(sample, { dedupe: false })).toEqual(["Apple", "apple", "banana", "cherry"]);
  });

  it("sorts alphabetically in descending order", () => {
    expect(lines(sample, { dedupe: false, descending: true })).toEqual([
      "cherry",
      "banana",
      "apple",
      "Apple",
    ]);
  });

  it("keeps the original relative order of lines that differ only in case when ignoring case", () => {
    expect(lines("b\nA\na\nB", { dedupe: false, ignoreCase: true })).toEqual(["A", "a", "b", "B"]);
  });

  it("orders accented letters next to their base letter", () => {
    expect(lines("zebra\nécole\neagle", { dedupe: false })).toEqual(["eagle", "école", "zebra"]);
  });

  it("compares digit runs as numbers in natural order", () => {
    const files = "file10.txt\nfile2.txt\nfile1.txt";
    expect(lines(files, { order: "alphabetical" })).toEqual([
      "file1.txt",
      "file10.txt",
      "file2.txt",
    ]);
    expect(lines(files, { order: "natural" })).toEqual(["file1.txt", "file2.txt", "file10.txt"]);
  });

  it("sorts by code point like the C locale, capitals before lower case", () => {
    expect(lines("b\nB\na\nA\n_\n1", { order: "codepoint" })).toEqual([
      "1",
      "A",
      "B",
      "_",
      "a",
      "b",
    ]);
  });

  it("folds case in code point order when ignoring case", () => {
    expect(lines("b\nB\na\nA", { order: "codepoint", ignoreCase: true, dedupe: false })).toEqual([
      "a",
      "A",
      "b",
      "B",
    ]);
  });

  it("sorts by length, keeping ties in their original order", () => {
    expect(lines("ccc\na\nbb\nzz\nd", { order: "length" })).toEqual(["a", "d", "bb", "zz", "ccc"]);
    expect(lines("ccc\na\nbb\nzz\nd", { order: "length", descending: true })).toEqual([
      "ccc",
      "bb",
      "zz",
      "a",
      "d",
    ]);
  });

  it("counts characters, not UTF-16 code units, for length", () => {
    expect(lines("ab\n😀", { order: "length" })).toEqual(["😀", "ab"]);
  });

  it("reverses the line order and ignores the direction flag", () => {
    expect(lines("1\n2\n3", { order: "reverse" })).toEqual(["3", "2", "1"]);
    expect(lines("1\n2\n3", { order: "reverse", descending: true })).toEqual(["3", "2", "1"]);
  });

  it("knows which orders have a direction", () => {
    expect(orderHasDirection("alphabetical")).toBe(true);
    expect(orderHasDirection("length")).toBe(true);
    expect(orderHasDirection("original")).toBe(false);
    expect(orderHasDirection("reverse")).toBe(false);
  });
});

describe("deduplication", () => {
  it("keeps the first occurrence of each line", () => {
    const result = run("b\na\nb\nc\na", { order: "original" });
    expect(splitLines(result.output)).toEqual(["b", "a", "c"]);
    expect(result.duplicatesRemoved).toBe(2);
  });

  it("treats lines that differ in case as distinct by default", () => {
    expect(lines("Error\nerror", { order: "original" })).toEqual(["Error", "error"]);
  });

  it("ignores case when asked to, keeping the first spelling", () => {
    const result = run("Error\nerror\nERROR", { order: "original", ignoreCase: true });
    expect(splitLines(result.output)).toEqual(["Error"]);
    expect(result.duplicatesRemoved).toBe(2);
  });

  it("only treats lines with different surrounding whitespace as duplicates once trimmed", () => {
    expect(lines("a\n a\na ", { order: "original" })).toEqual(["a", " a", "a "]);
    expect(lines("a\n a\na ", { order: "original", trim: true })).toEqual(["a"]);
  });

  it("leaves duplicates in place when turned off", () => {
    const result = run("a\na", { dedupe: false });
    expect(result.output).toBe("a\na");
    expect(result.duplicatesRemoved).toBe(0);
  });
});

describe("blank lines", () => {
  it("removes empty and whitespace-only lines", () => {
    const result = run("a\n\n  \n\tb\n", { order: "original", removeBlank: true });
    expect(result.output).toBe("a\n\tb\n");
    expect(result.blankRemoved).toBe(2);
  });

  it("collapses repeated blank lines into one when only deduplicating", () => {
    expect(run("a\n\nb\n\nc", { order: "original" }).output).toBe("a\n\nb\nc");
  });
});

describe("output formatting", () => {
  it("returns empty output for empty input", () => {
    expect(run("")).toEqual({
      output: "",
      inputLines: 0,
      outputLines: 0,
      duplicatesRemoved: 0,
      blankRemoved: 0,
    });
  });

  it("keeps a trailing line break when the input had one", () => {
    expect(run("b\na\n").output).toBe("a\nb\n");
    expect(run("b\na").output).toBe("a\nb");
  });

  it("does not leave a lone line break when every line was removed", () => {
    expect(run("  \n\n", { removeBlank: true }).output).toBe("");
  });

  it("keeps CRLF line endings", () => {
    expect(run("b\r\na\r\n").output).toBe("a\r\nb\r\n");
  });

  it("reports line counts before and after", () => {
    const result = run("c\nb\n\nb\na\n", { removeBlank: true });
    expect(result.inputLines).toBe(5);
    expect(result.outputLines).toBe(3);
    expect(result.blankRemoved).toBe(1);
    expect(result.duplicatesRemoved).toBe(1);
  });
});
