import { describe, expect, it } from "vitest";
import { DEFAULT_SLUG_OPTIONS, slugify, slugifyLines, type SlugOptions } from "./slug";

function opts(overrides: Partial<SlugOptions>): SlugOptions {
  return { ...DEFAULT_SLUG_OPTIONS, ...overrides };
}

describe("slugify", () => {
  it("lower-cases and joins words with hyphens by default", () => {
    expect(slugify("Hello World").slug).toBe("hello-world");
  });

  it("collapses runs of punctuation and whitespace into one separator", () => {
    expect(slugify("  Release notes:  v2.0 -- final!  ").slug).toBe("release-notes-v2-0-final");
  });

  it("strips accents from letters that decompose", () => {
    expect(slugify("Crème brûlée à São Paulo").slug).toBe("creme-brulee-a-sao-paulo");
  });

  it("transliterates letters that have no decomposition", () => {
    expect(slugify("Straße Æsir Øresund Łódź Þór").slug).toBe("strasse-aesir-oresund-lodz-thor");
  });

  it("drops apostrophes inside words instead of splitting them", () => {
    expect(slugify("Don't stop — it’s fine").slug).toBe("dont-stop-its-fine");
  });

  it("spells out an ampersand", () => {
    expect(slugify("Tips & Tricks").slug).toBe("tips-and-tricks");
  });

  it("folds compatibility characters such as ligatures and full-width digits", () => {
    expect(slugify("ﬁle １２３").slug).toBe("file-123");
  });

  it("reports characters with no ASCII form instead of silently losing them", () => {
    const result = slugify("Tokyo 東京 guide 東");
    expect(result.slug).toBe("tokyo-guide");
    expect(result.dropped).toEqual(["東", "京"]);
  });

  it("does not report punctuation or emoji as dropped letters", () => {
    expect(slugify("Launch 🚀 day!").dropped).toEqual([]);
  });

  it("returns an empty slug for input with no letters or digits", () => {
    expect(slugify("").slug).toBe("");
    expect(slugify(" -- !! ").slug).toBe("");
  });

  it("uses the chosen separator", () => {
    expect(slugify("My Blog Post", opts({ separator: "_" })).slug).toBe("my_blog_post");
    expect(slugify("My Blog Post", opts({ separator: "." })).slug).toBe("my.blog.post");
  });

  it("keeps the original case when lower-casing is off", () => {
    expect(slugify("My Blog Post", opts({ lowercase: false })).slug).toBe("My-Blog-Post");
  });

  it("truncates at a word boundary when a maximum length is set", () => {
    const result = slugify("The quick brown fox jumps", opts({ maxLength: 15 }));
    expect(result.slug).toBe("the-quick-brown");
    expect(result.truncated).toBe(true);
  });

  it("keeps a word that ends exactly at the limit", () => {
    expect(slugify("the quick brown fox", opts({ maxLength: 9 })).slug).toBe("the-quick");
  });

  it("cuts mid-word only when the first word alone exceeds the limit", () => {
    expect(slugify("Supercalifragilistic word", opts({ maxLength: 5 })).slug).toBe("super");
  });

  it("does not flag truncation when the slug already fits", () => {
    const result = slugify("short title", opts({ maxLength: 50 }));
    expect(result.slug).toBe("short-title");
    expect(result.truncated).toBe(false);
  });
});

describe("slugifyLines", () => {
  it("slugifies each line and keeps blank lines so rows stay aligned", () => {
    const result = slugifyLines("First Post\n\nSecond Post\r\nThird & Last");
    expect(result.output).toBe("first-post\n\nsecond-post\nthird-and-last");
  });

  it("collects dropped characters and truncated lines across all lines", () => {
    const result = slugifyLines("北 one two three\nshort\n京 alpha beta gamma", opts({ maxLength: 8 }));
    expect(result.output).toBe("one-two\nshort\nalpha");
    expect(result.dropped).toEqual(["北", "京"]);
    expect(result.truncatedLines).toBe(2);
  });
});
