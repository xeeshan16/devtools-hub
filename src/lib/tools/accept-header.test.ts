import { describe, expect, it } from "vitest";
import { negotiate, parseAcceptHeader, type AcceptHeaderResult, type AcceptMode } from "./accept-header";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<AcceptHeaderResult | null>): AcceptHeaderResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

function parse(input: string, mode: AcceptMode = "auto"): AcceptHeaderResult {
  return parsed(parseAcceptHeader(input, mode));
}

const BROWSER_ACCEPT =
  "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

describe("parseAcceptHeader", () => {
  it("returns null for empty input", () => {
    expect(parseAcceptHeader(" \n ")).toEqual({ ok: true, value: null });
  });

  it("parses a browser Accept header and sorts by weight, then specificity, then order", () => {
    const result = parse(BROWSER_ACCEPT);
    expect(result.kind).toBe("accept");
    expect(result.ranges.map(({ value, q }) => `${value};${q}`)).toEqual([
      "text/html;1",
      "application/xhtml+xml;1",
      "image/avif;1",
      "image/webp;1",
      "application/xml;0.9",
      "*/*;0.8",
    ]);
    expect(result.refused).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("ranks more specific ranges first when weights tie", () => {
    const result = parse("*/*, text/*, text/plain;format=flowed, text/plain", "accept");
    expect(result.ranges.map((range) => [range.value, range.specificity])).toEqual([
      ["text/plain", 3],
      ["text/plain", 2],
      ["text/*", 1],
      ["*/*", 0],
    ]);
    expect(result.ranges[0].params).toEqual([{ name: "format", value: "flowed" }]);
    expect(result.ranges.find((range) => range.value === "text/*")?.description).toBe("Any text type.");
  });

  it("detects the header from its prefix and combines repeated lines and curl -v markers", () => {
    const result = parse("> Accept-Language: de-CH, de;q=0.9\n> accept-language: en;q=0.5");
    expect(result.kind).toBe("accept-language");
    expect(result.ranges.map((range) => range.value)).toEqual(["de-ch", "de", "en"]);
    expect(result.ranges[0].description).toMatch(/German/);
    expect(result.ranges[0].specificity).toBe(2);
  });

  it("guesses the header kind from the values when there is no prefix", () => {
    expect(parse("gzip, deflate, br, zstd").kind).toBe("accept-encoding");
    expect(parse("en-US,en;q=0.9").kind).toBe("accept-language");
    expect(parse("utf-8, iso-8859-1;q=0.5").kind).toBe("accept-charset");
    expect(parse("application/json").kind).toBe("accept");
  });

  it("separates refused ranges with q=0", () => {
    const result = parse("Accept-Encoding: gzip;q=1.0, identity; q=0.5, *;q=0");
    expect(result.ranges.map(({ value, q }) => [value, q])).toEqual([
      ["gzip", 1],
      ["identity", 0.5],
    ]);
    expect(result.refused.map((range) => range.value)).toEqual(["*"]);
  });

  it("warns about invalid weights and treats them as q=1", () => {
    const result = parse("text/html;q=1.5, application/json;q=0.1234", "accept");
    expect(result.ranges.map((range) => range.q)).toEqual([1, 1]);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toMatch(/q=1\.5.*between 0 and 1/);
  });

  it("skips invalid ranges with a hint", () => {
    const result = parse("Accept: */html, json, text/html");
    expect(result.ranges.map((range) => range.value)).toEqual(["text/html"]);
    expect(result.warnings[0]).toMatch(/"\*\/html".*wildcard subtype/);
    expect(result.warnings[1]).toMatch(/"json".*type\/subtype/);
    expect(parse("Accept-Language: en_US, fr").warnings[0]).toMatch(/hyphens: en-US/);
  });

  it("warns about duplicates, parameters after q and parameters where only q is allowed", () => {
    expect(parse("Accept: text/html, text/html;q=0.5").warnings[0]).toMatch(/more than once/);
    expect(parse("Accept: text/html;q=0.5;level=1").warnings[0]).toMatch(/level after q/);
    expect(parse("Accept-Encoding: gzip;level=9").warnings[0]).toMatch(/only allows q/);
  });

  it("keeps quoted parameter values intact", () => {
    const result = parse('Accept: application/ld+json;profile="https://www.w3.org/ns/activitystreams, extra"');
    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0].params).toEqual([{ name: "profile", value: "https://www.w3.org/ns/activitystreams, extra" }]);
  });

  it("describes encodings and flags unknown ones", () => {
    const result = parse("Accept-Encoding: br, snappy");
    expect(result.ranges[0].description).toMatch(/Brotli/);
    expect(result.ranges[1].description).toMatch(/Not a registered content coding/);
  });

  it("notes that Accept-Charset is obsolete", () => {
    expect(parse("Accept-Charset: utf-8").warnings).toContainEqual(expect.stringMatching(/stopped sending Accept-Charset/));
  });

  it("explains an empty Accept-Encoding header", () => {
    const result = parse("Accept-Encoding:");
    expect(result.ranges).toEqual([]);
    expect(result.warnings[0]).toMatch(/only identity is acceptable/);
  });

  it("errors when nothing valid remains or the lines are different headers", () => {
    const empty = parseAcceptHeader("Accept: ,");
    expect(empty.ok).toBe(false);
    const invalid = parseAcceptHeader("Accept: nonsense");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error).toMatch(/No valid values/);
    const mixed = parseAcceptHeader("Accept: text/html\nAccept-Language: en");
    expect(mixed.ok).toBe(false);
    if (!mixed.ok) expect(mixed.error).toMatch(/different headers/);
  });

  it("warns when a forced mode disagrees with the pasted prefix", () => {
    const result = parse("Accept-Language: en", "accept-encoding");
    expect(result.kind).toBe("accept-encoding");
    expect(result.warnings[0]).toMatch(/is Accept-Language, but it is being read as Accept-Encoding/);
  });
});

describe("negotiate", () => {
  it("picks the most preferred media type the server offers", () => {
    const result = negotiate(parse(BROWSER_ACCEPT), ["application/json", "application/xml", "text/html"]);
    expect(result.best).toBe("text/html");
    expect(result.entries).toEqual([
      { value: "text/html", q: 1, matchedBy: "text/html" },
      { value: "application/xml", q: 0.9, matchedBy: "application/xml;q=0.9" },
      { value: "application/json", q: 0.8, matchedBy: "*/*;q=0.8" },
    ]);
  });

  it("uses the most specific matching range, including parameters", () => {
    const header = parse("text/*;q=0.3, text/plain;q=0.7, text/plain;format=flowed, */*;q=0.5", "accept");
    const result = negotiate(header, ["text/plain;format=flowed", "text/plain", "text/csv", "image/png"]);
    expect(result.entries.map(({ value, q }) => [value, q])).toEqual([
      ["text/plain;format=flowed", 1],
      ["text/plain", 0.7],
      ["image/png", 0.5],
      ["text/csv", 0.3],
    ]);
  });

  it("matches language ranges by prefix and refuses unlisted languages", () => {
    const result = negotiate(parse("Accept-Language: fr-CH, fr;q=0.9, en;q=0.8"), ["de", "en-GB", "fr-FR"]);
    expect(result.entries).toEqual([
      { value: "fr-FR", q: 0.9, matchedBy: "fr;q=0.9" },
      { value: "en-GB", q: 0.8, matchedBy: "en;q=0.8" },
      { value: "de", q: 0, matchedBy: null },
    ]);
    expect(result.best).toBe("fr-FR");
  });

  it("treats identity as acceptable unless it is refused", () => {
    expect(negotiate(parse("Accept-Encoding: br;q=0"), ["br", "identity"]).best).toBe("identity");
    expect(negotiate(parse("Accept-Encoding: gzip, *;q=0"), ["br", "identity"]).best).toBeNull();
    expect(negotiate(parse("Accept-Encoding:"), ["gzip", "identity"]).best).toBe("identity");
  });

  it("keeps the server's order for ties and ignores blank values", () => {
    const result = negotiate(parse("Accept-Encoding: gzip, br"), ["br", " ", "gzip"]);
    expect(result.entries.map((entry) => entry.value)).toEqual(["br", "gzip"]);
    expect(result.best).toBe("br");
  });
});
