import { describe, expect, it } from "vitest";
import { CASES, convertAllCases, convertCase, splitWords } from "./case-converter";

describe("splitWords", () => {
  it("splits on spaces, underscores and hyphens", () => {
    expect(splitWords("hello world")).toEqual(["hello", "world"]);
    expect(splitWords("hello_world")).toEqual(["hello", "world"]);
    expect(splitWords("hello-world")).toEqual(["hello", "world"]);
  });

  it("splits camelCase and PascalCase at word boundaries", () => {
    expect(splitWords("helloWorld")).toEqual(["hello", "World"]);
    expect(splitWords("HelloWorld")).toEqual(["Hello", "World"]);
  });

  it("keeps an acronym together and splits it from the following word", () => {
    expect(splitWords("XMLHttpRequest")).toEqual(["XML", "Http", "Request"]);
  });

  it("returns an empty array for empty or whitespace-only input", () => {
    expect(splitWords("")).toEqual([]);
    expect(splitWords("   ")).toEqual([]);
  });
});

describe("convertCase", () => {
  it("upper/lower are exact character maps, not word-boundary aware", () => {
    expect(convertCase("Hello World", "upper")).toBe("HELLO WORLD");
    expect(convertCase("Hello World", "lower")).toBe("hello world");
  });

  it("converts a snake_case identifier into every other case", () => {
    expect(convertCase("user_first_name", "title")).toBe("User First Name");
    expect(convertCase("user_first_name", "sentence")).toBe("User first name");
    expect(convertCase("user_first_name", "camel")).toBe("userFirstName");
    expect(convertCase("user_first_name", "pascal")).toBe("UserFirstName");
    expect(convertCase("user_first_name", "kebab")).toBe("user-first-name");
  });

  it("converts a camelCase identifier into every other case", () => {
    expect(convertCase("userFirstName", "snake")).toBe("user_first_name");
    expect(convertCase("userFirstName", "kebab")).toBe("user-first-name");
    expect(convertCase("userFirstName", "pascal")).toBe("UserFirstName");
  });

  it("returns an empty string for empty input, for every case", () => {
    for (const { id } of CASES) {
      expect(convertCase("", id)).toBe("");
    }
  });
});

describe("convertAllCases", () => {
  it("returns every case keyed by id", () => {
    const result = convertAllCases("hello world");
    expect(Object.keys(result).sort()).toEqual(
      CASES.map((c) => c.id).sort(),
    );
    expect(result.snake).toBe("hello_world");
  });
});
