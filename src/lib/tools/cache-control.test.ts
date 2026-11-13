import { describe, expect, it } from "vitest";
import { formatSeconds, parseCacheControl, type CacheControlResult } from "./cache-control";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<CacheControlResult | null>): CacheControlResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

describe("parseCacheControl", () => {
  it("returns null for empty input", () => {
    expect(parseCacheControl("  \n ")).toEqual({ ok: true, value: null });
  });

  it("errors when there are no directives", () => {
    const result = parseCacheControl("Cache-Control:");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/No directives found/);
  });

  it("parses directives, lower-cases names and reads delta-seconds", () => {
    const result = parsed(parseCacheControl("Cache-Control: Public, MAX-AGE=3600"));
    expect(result.directives.map(({ name, value, appliesTo, seconds }) => ({ name, value, appliesTo, seconds }))).toEqual([
      { name: "public", value: null, appliesTo: "response", seconds: null },
      { name: "max-age", value: "3600", appliesTo: "both", seconds: 3600 },
    ]);
    expect(result.directives[1].description).toContain("1 hour");
    expect(result.context).toBe("response");
    expect(result.warnings).toEqual([]);
  });

  it("accepts curl -v prefixes and combines several header lines", () => {
    const result = parsed(parseCacheControl("< cache-control: private\n< Cache-Control: no-cache"));
    expect(result.directives.map((d) => d.name)).toEqual(["private", "no-cache"]);
  });

  it("keeps commas inside quoted field lists and unquotes them", () => {
    const result = parsed(parseCacheControl('no-cache="Set-Cookie, ETag", max-age=60'));
    expect(result.directives.map(({ name, value }) => [name, value])).toEqual([
      ["no-cache", "Set-Cookie, ETag"],
      ["max-age", "60"],
    ]);
    expect(result.directives[0].description).toContain("Set-Cookie, ETag");
    // A field-limited no-cache does not force revalidation of the whole response.
    expect(result.summary.some((line) => line.includes("Every reuse must be revalidated"))).toBe(false);
  });

  it("tolerates stray commas and whitespace", () => {
    const result = parsed(parseCacheControl(" , max-age=10 ,, "));
    expect(result.directives.map((d) => d.name)).toEqual(["max-age"]);
  });

  describe("summary", () => {
    it("explains no-store and warns about directives it overrides", () => {
      const result = parsed(parseCacheControl("no-store, max-age=3600"));
      expect(result.summary).toEqual([
        "Not stored by browsers or shared caches (CDNs, proxies); every request goes to the origin.",
      ]);
      expect(result.warnings).toContain("no-store overrides max-age; nothing is cached.");
    });

    it("separates browser and shared-cache lifetimes", () => {
      const result = parsed(parseCacheControl("public, max-age=60, s-maxage=86400"));
      expect(result.summary).toEqual([
        "Browsers and shared caches (CDNs, proxies) may store it.",
        "Browsers treat it as fresh for 1 minute (max-age=60).",
        "Shared caches treat it as fresh for 1 day (s-maxage=86400).",
        "Once stale, shared caches must not serve it without revalidating.",
      ]);
    });

    it("limits private responses to the browser and ignores s-maxage", () => {
      const result = parsed(parseCacheControl("private, max-age=600, s-maxage=60"));
      expect(result.summary).toEqual([
        "Browsers may store it; shared caches (CDNs, proxies) must not.",
        "Caches treat it as fresh for 10 minutes (max-age=600).",
      ]);
      expect(result.warnings).toContain("s-maxage has no effect with private, because shared caches do not store the response.");
    });

    it("describes no-cache, must-revalidate and the RFC 5861 extensions", () => {
      expect(parsed(parseCacheControl("no-cache")).summary).toContain(
        "Every reuse must be revalidated with the origin first (no-cache), typically with a conditional request.",
      );
      const result = parsed(parseCacheControl("max-age=0, must-revalidate, stale-while-revalidate=30, stale-if-error=86400"));
      expect(result.summary).toEqual([
        "Browsers and shared caches (CDNs, proxies) may store it.",
        "Stale immediately (max-age=0), so caches revalidate before reusing it.",
        "Once stale, it must not be served without revalidating, even if the origin is down.",
        "After it goes stale, caches may keep serving it for 30 seconds while refreshing in the background.",
        "If the origin errors, caches may serve the stale copy for up to 1 day.",
      ]);
    });

    it("mentions heuristic freshness when no lifetime is given", () => {
      expect(parsed(parseCacheControl("public")).summary).toContain(
        "No explicit lifetime: caches fall back to an Expires header or a heuristic freshness lifetime.",
      );
    });

    it("explains immutable for versioned assets", () => {
      const result = parsed(parseCacheControl("public, max-age=31536000, immutable"));
      expect(result.summary).toContain("Caches treat it as fresh for 365 days (max-age=31536000).");
      expect(result.summary).toContain("While fresh, browsers do not revalidate it even when the user reloads the page.");
      expect(result.warnings).toEqual([]);
    });

    it("treats a header of only request directives as a request", () => {
      const result = parsed(parseCacheControl("max-stale, min-fresh=30, only-if-cached"));
      expect(result.context).toBe("request");
      expect(result.summary).toEqual([]);
      expect(result.directives[0].description).toBe("The client accepts a stale response, however stale.");
      expect(result.warnings).toEqual([]);
    });
  });

  describe("warnings", () => {
    it("flags invalid, missing and quoted delta-seconds", () => {
      expect(parsed(parseCacheControl("max-age=-1")).warnings).toEqual([
        'max-age "-1" is not a whole number of seconds; caches are encouraged to treat the response as stale.',
      ]);
      expect(parsed(parseCacheControl("stale-if-error=soon")).warnings).toEqual([
        'stale-if-error "soon" is not a whole number of seconds, so caches ignore it.',
      ]);
      expect(parsed(parseCacheControl("max-age")).warnings).toEqual([
        "max-age needs a number of seconds, e.g. max-age=3600; without one caches ignore it.",
      ]);
      const quoted = parsed(parseCacheControl('max-age="60"'));
      expect(quoted.directives[0].seconds).toBe(60);
      expect(quoted.warnings[0]).toMatch(/should not be quoted/);
    });

    it("flags duplicates, values on flag directives and conflicts", () => {
      expect(parsed(parseCacheControl("max-age=60, max-age=120")).warnings).toContain(
        "max-age appears more than once; caches either use the first one or treat the response as stale.",
      );
      expect(parsed(parseCacheControl("no-store=true")).warnings).toContain(
        'no-store does not take a value; "no-store=true" may be ignored by some caches.',
      );
      expect(parsed(parseCacheControl("public, private")).warnings[0]).toMatch(/public and private are both set/);
      expect(parsed(parseCacheControl("immutable")).warnings).toContain(
        "immutable has no effect without max-age; it only applies while the response is fresh.",
      );
    });

    it("flags request directives sent in a response", () => {
      expect(parsed(parseCacheControl("public, max-age=60, only-if-cached")).warnings).toContain(
        "only-if-cached is a request directive and has no effect in a response.",
      );
    });

    it("flags unknown directives and suggests the likely intended one", () => {
      const result = parsed(parseCacheControl("max_age=60, x-custom"));
      expect(result.directives[0]).toMatchObject({ name: "max_age", appliesTo: null, seconds: null });
      expect(result.warnings).toEqual([
        `Unknown directive "max_age"; caches ignore directives they don't recognize. Did you mean max-age?`,
        `Unknown directive "x-custom"; caches ignore directives they don't recognize.`,
      ]);
    });
  });
});

describe("formatSeconds", () => {
  it("uses the largest unit that divides exactly", () => {
    expect(formatSeconds(0)).toBe("0 seconds");
    expect(formatSeconds(1)).toBe("1 second");
    expect(formatSeconds(90)).toBe("90 seconds");
    expect(formatSeconds(5400)).toBe("90 minutes");
    expect(formatSeconds(7200)).toBe("2 hours");
    expect(formatSeconds(31536000)).toBe("365 days");
  });
});
