import { describe, expect, it } from "vitest";
import {
  countLines,
  countParagraphs,
  countSentences,
  countWords,
  formatDuration,
  READING_WPM,
  SPEAKING_WPM,
  textStats,
} from "./text-stats";

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("The quick brown fox")).toBe(4);
    expect(countWords("  spaced\tout\n\nwords  ")).toBe(3);
  });

  it("returns 0 for empty or whitespace-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords(" \n\t ")).toBe(0);
  });

  it("keeps hyphenated words and contractions whole", () => {
    expect(countWords("a well-known fact")).toBe(3);
    expect(countWords("don't won’t can't")).toBe(3);
  });

  it("ignores punctuation that stands on its own", () => {
    expect(countWords("wait — what ?")).toBe(2);
    expect(countWords("- * ...")).toBe(0);
  });

  it("counts numbers and words in non-Latin spaced scripts", () => {
    expect(countWords("version 2 of 3")).toBe(4);
    expect(countWords("Привет мир")).toBe(2);
    expect(countWords("안녕하세요 세계")).toBe(2);
  });

  it("splits scripts written without spaces into more than one word", () => {
    expect(countWords("我喜欢学习中文")).toBeGreaterThan(1);
    expect(countWords("hello 我喜欢学习中文")).toBeGreaterThan(2);
  });
});

describe("countSentences", () => {
  it("counts sentences ending in . ! or ?", () => {
    expect(countSentences("One. Two! Three?")).toBe(3);
  });

  it("counts a final sentence without terminal punctuation", () => {
    expect(countSentences("First sentence. Second one")).toBe(2);
  });

  it("does not end a sentence at a single line break", () => {
    expect(countSentences("This sentence is\nwrapped over\nthree lines.")).toBe(1);
  });

  it("ends a sentence at a blank line even without punctuation", () => {
    expect(countSentences("A heading\n\nThe body text.")).toBe(2);
    expect(countSentences("A heading\r\n  \r\nThe body text.")).toBe(2);
  });

  it("returns 0 when there is nothing but punctuation or whitespace", () => {
    expect(countSentences("")).toBe(0);
    expect(countSentences("  ...  ")).toBe(0);
  });
});

describe("countParagraphs", () => {
  it("splits on blank lines", () => {
    expect(countParagraphs("One\nstill one\n\nTwo\n\n\nThree")).toBe(3);
  });

  it("treats whitespace-only lines as blank", () => {
    expect(countParagraphs("One\n   \nTwo")).toBe(2);
  });

  it("handles Windows line endings and surrounding blank lines", () => {
    expect(countParagraphs("\r\n\r\nOne\r\n\r\nTwo\r\n")).toBe(2);
  });

  it("returns 0 for empty text", () => {
    expect(countParagraphs("")).toBe(0);
    expect(countParagraphs("\n\n")).toBe(0);
  });
});

describe("countLines", () => {
  it("counts lines including blank ones", () => {
    expect(countLines("a\n\nb")).toBe(3);
  });

  it("does not count a single trailing newline as a new line", () => {
    expect(countLines("a\nb\n")).toBe(2);
    expect(countLines("a\nb\n\n")).toBe(3);
  });

  it("accepts \\r\\n and \\r line endings", () => {
    expect(countLines("a\r\nb\rc")).toBe(3);
  });

  it("returns 0 for empty text and 1 for a single line", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("one line")).toBe(1);
  });
});

describe("textStats", () => {
  it("returns all zeros for empty text", () => {
    expect(textStats("")).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      codeUnits: 0,
      bytes: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      readingSeconds: 0,
      speakingSeconds: 0,
    });
  });

  it("counts characters with and without spaces", () => {
    const stats = textStats("Hello, world!\nBye.");
    expect(stats.characters).toBe(18);
    expect(stats.charactersNoSpaces).toBe(16);
    expect(stats.words).toBe(3);
    expect(stats.sentences).toBe(2);
    expect(stats.lines).toBe(2);
    expect(stats.paragraphs).toBe(1);
  });

  it("counts an emoji or accented letter as one character, unlike length and bytes", () => {
    // 👍🏽 is two code points (four UTF-16 units, eight UTF-8 bytes); e + U+0301 is
    // a decomposed é (two units, three bytes). Both read as one character.
    const stats = textStats("👍🏽é");
    expect(stats.characters).toBe(2);
    expect(stats.codeUnits).toBe(6);
    expect(stats.bytes).toBe(11);
  });

  it("estimates reading and speaking time from the word count", () => {
    const text = Array.from({ length: READING_WPM }, () => "word").join(" ");
    const stats = textStats(text);
    expect(stats.words).toBe(READING_WPM);
    expect(stats.readingSeconds).toBe(60);
    expect(stats.speakingSeconds).toBe(Math.round((READING_WPM / SPEAKING_WPM) * 60));
  });
});

describe("formatDuration", () => {
  it("shows seconds under a minute", () => {
    expect(formatDuration(0)).toBe("0 sec");
    expect(formatDuration(45)).toBe("45 sec");
  });

  it("shows minutes and seconds under an hour", () => {
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(192)).toBe("3 min 12 sec");
  });

  it("shows hours and minutes from an hour up", () => {
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(3900)).toBe("1 h 5 min");
  });

  it("rounds fractions and clamps negatives to zero", () => {
    expect(formatDuration(59.6)).toBe("1 min");
    expect(formatDuration(-5)).toBe("0 sec");
  });
});
