import { describe, expect, it } from "vitest";
import { parseHsts, type HstsResult } from "./hsts";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<HstsResult | null>): HstsResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

describe("parseHsts", () => {
  it("returns null for empty input", () => {
    expect(parseHsts(" \n  ")).toEqual({ ok: true, value: null });
  });

  it("errors when there are no directives", () => {
    const result = parseHsts("Strict-Transport-Security: ;;");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/No directives found/);
  });

  it("parses a preload-ready header with the prefix and mixed case", () => {
    const result = parsed(parseHsts("Strict-Transport-Security: MAX-AGE=63072000; includeSubdomains; Preload"));
    expect(result.directives.map(({ name, value, known }) => ({ name, value, known }))).toEqual([
      { name: "MAX-AGE", value: "63072000", known: true },
      { name: "includeSubdomains", value: null, known: true },
      { name: "Preload", value: null, known: true },
    ]);
    expect(result).toMatchObject({ valid: true, maxAge: 63072000, includeSubDomains: true, preload: true });
    expect(result.directives[0].description).toContain("730 days");
    expect(result.preloadChecks.every((check) => check.passed)).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("accepts curl -v markers, a quoted max-age and stray semicolons", () => {
    const result = parsed(parseHsts('< strict-transport-security: max-age="31536000";; includeSubDomains;'));
    expect(result.valid).toBe(true);
    expect(result.maxAge).toBe(31536000);
    expect(result.includeSubDomains).toBe(true);
  });

  it("summarizes what the browser does", () => {
    const result = parsed(parseHsts("max-age=86400"));
    expect(result.summary).toEqual([
      "For 1 day after receiving this header over HTTPS, the browser rewrites http:// links and requests to https:// before sending them.",
      "Only this exact host is covered; subdomains are not.",
      "Certificate errors become fatal: users cannot click through the warning page.",
      "Browsers ignore the header on plain-HTTP responses, and the very first visit is unprotected unless the domain is preloaded.",
    ]);
  });

  it("explains max-age=0 as removing the policy", () => {
    const result = parsed(parseHsts("max-age=0; includeSubDomains"));
    expect(result.valid).toBe(true);
    expect(result.summary[0]).toBe("Removes any stored HSTS policy for this host and its subdomains (max-age=0).");
    expect(result.directives[0].description).toMatch(/delete any HSTS policy/);
  });

  describe("headers browsers ignore", () => {
    it("requires max-age", () => {
      const result = parsed(parseHsts("includeSubDomains; preload"));
      expect(result.valid).toBe(false);
      expect(result.maxAge).toBeNull();
      expect(result.summary).toEqual(["Browsers ignore this header, so no HSTS policy is set or updated."]);
      expect(result.warnings).toContain("max-age is missing; it is required, so browsers ignore the whole header.");
      expect(result.preloadChecks[0].passed).toBe(false);
    });

    it("rejects a max-age without a whole number of seconds", () => {
      for (const header of ["max-age=", "max-age=1y", "max-age=-1", "max-age=3.5"]) {
        const result = parsed(parseHsts(header));
        expect(result.valid, header).toBe(false);
        expect(result.maxAge, header).toBeNull();
      }
    });

    it("points out comma-separated directives", () => {
      const result = parsed(parseHsts("max-age=31536000, includeSubDomains"));
      expect(result.valid).toBe(false);
      expect(result.includeSubDomains).toBe(false);
      expect(result.warnings.some((w) => w.includes("Separate directives with semicolons, not commas"))).toBe(true);
    });

    it("ignores the whole header when a directive repeats, case-insensitively", () => {
      const result = parsed(parseHsts("max-age=31536000; includeSubDomains; INCLUDESUBDOMAINS"));
      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toMatch(/INCLUDESUBDOMAINS appears more than once/);
      expect(result.preloadChecks[0].passed).toBe(false);
    });
  });

  describe("warnings", () => {
    it("flags unknown directives and suggests the intended one", () => {
      const result = parsed(parseHsts("max-age=31536000; include-subdomains"));
      expect(result.valid).toBe(true);
      expect(result.includeSubDomains).toBe(false);
      expect(result.directives[1]).toMatchObject({ name: "include-subdomains", known: false });
      expect(result.warnings).toContain(
        'Unknown directive "include-subdomains"; browsers ignore directives they don\'t recognize. Did you mean includeSubDomains?',
      );
    });

    it("flags values on directives that take none", () => {
      const result = parsed(parseHsts("max-age=31536000; includeSubDomains=true"));
      expect(result.includeSubDomains).toBe(true);
      expect(result.warnings).toEqual([
        "includeSubDomains does not take a value; some browsers reject the whole header when it has one.",
      ]);
    });

    it("lists the preload requirements a header with preload misses", () => {
      const result = parsed(parseHsts("max-age=10886400; preload"));
      expect(result.preloadChecks.map((check) => check.passed)).toEqual([false, false, true]);
      expect(result.warnings).toEqual([
        "preload is set, but the preload list also requires: max-age is at least 365 days (31536000); includeSubDomains is set.",
      ]);
    });

    it("does not nag about preload when it isn't requested", () => {
      const result = parsed(parseHsts("max-age=86400"));
      expect(result.preload).toBe(false);
      expect(result.warnings).toEqual([]);
    });

    it("flags preload with max-age=0", () => {
      const result = parsed(parseHsts("max-age=0; includeSubDomains; preload"));
      expect(result.warnings[0]).toMatch(/contradicts itself/);
    });

    it("flags a max-age under a day", () => {
      const result = parsed(parseHsts("max-age=300"));
      expect(result.warnings[0]).toMatch(/^max-age=300 is under a day/);
      expect(result.summary[0]).toContain("5 minutes");
    });

    it("uses only the first header line", () => {
      const result = parsed(parseHsts("max-age=31536000\nmax-age=0"));
      expect(result.maxAge).toBe(31536000);
      expect(result.warnings).toContain(
        "Only the first Strict-Transport-Security header is processed; browsers ignore any later ones.",
      );
    });
  });
});
