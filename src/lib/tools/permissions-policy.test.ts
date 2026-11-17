import { describe, expect, it } from "vitest";
import { parsePermissionsPolicy, type PermissionsPolicyResult } from "./permissions-policy";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<PermissionsPolicyResult | null>): PermissionsPolicyResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

describe("parsePermissionsPolicy", () => {
  it("returns null for empty input", () => {
    expect(parsePermissionsPolicy("  \n ")).toEqual({ ok: true, value: null });
  });

  it("errors when there are no features", () => {
    const result = parsePermissionsPolicy("Permissions-Policy:");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/No features found/);
  });

  it("parses every allowlist form with the prefix and curl -v markers", () => {
    const result = parsed(
      parsePermissionsPolicy(
        '< permissions-policy: camera=(), geolocation=(self), fullscreen=*, payment=(self "https://pay.example"), autoplay=self',
      ),
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.features.map(({ name, allowlist, access, self, origins, known }) => ({ name, allowlist, access, self, origins, known }))).toEqual([
      { name: "camera", allowlist: "()", access: "none", self: false, origins: [], known: true },
      { name: "geolocation", allowlist: "(self)", access: "self", self: true, origins: [], known: true },
      { name: "fullscreen", allowlist: "*", access: "all", self: true, origins: [], known: true },
      { name: "payment", allowlist: '(self "https://pay.example")', access: "origins", self: true, origins: ["https://pay.example"], known: true },
      { name: "autoplay", allowlist: "self", access: "self", self: true, origins: [], known: true },
    ]);
    expect(result.features[0].effect).toBe("Disabled everywhere: this page and every embedded frame.");
    expect(result.features[1].effect).toMatch(/blocked in cross-origin frames/);
  });

  it("combines several header lines with commas, as HTTP does", () => {
    const result = parsed(parsePermissionsPolicy("Permissions-Policy: camera=()\nPermissions-Policy: microphone=()"));
    expect(result.features.map((f) => f.name)).toEqual(["camera", "microphone"]);
  });

  it("uses the last value when a feature repeats", () => {
    const result = parsed(parsePermissionsPolicy("camera=(), microphone=(), camera=(self)"));
    expect(result.features.map((f) => [f.name, f.access])).toEqual([
      ["microphone", "none"],
      ["camera", "self"],
    ]);
    expect(result.warnings).toEqual(["camera appears more than once; only the last value ((self)) is used."]);
  });

  it("accepts a report-to parameter", () => {
    const result = parsed(parsePermissionsPolicy('geolocation=(self);report-to="main-endpoint", camera=()'));
    expect(result.warnings).toEqual([]);
    expect(result.features).toHaveLength(2);
  });

  describe("headers browsers ignore entirely", () => {
    it.each([
      ["Camera=()", /must be lowercase/],
      ["camera=(); microphone=()", /separated by commas, not semicolons/],
      ["camera=(); microphone=*", /separated by commas, not semicolons/],
      ["camera=(self", /Missing closing parenthesis/],
      ['camera=("https://a.example)', /Unterminated string/],
      ["camera=(), ", /Trailing comma/],
      ["camera=('self')", /not single quotes/],
    ])("%s", (header, message) => {
      const result = parsed(parsePermissionsPolicy(header));
      expect(result.valid).toBe(false);
      expect(result.features).toEqual([]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(message);
      expect(result.warnings[0]).toMatch(/ignore the whole header/);
    });
  });

  describe("Feature-Policy syntax", () => {
    it("suggests the equivalent Permissions-Policy header", () => {
      const result = parsePermissionsPolicy("Feature-Policy: camera 'none'; geolocation 'self' https://maps.example; fullscreen *");
      expect(result).toEqual({
        ok: false,
        error:
          'This is Feature-Policy syntax, which Permissions-Policy does not accept. The equivalent header is: Permissions-Policy: camera=(), geolocation=(self "https://maps.example"), fullscreen=*',
      });
    });

    it("recognizes Feature-Policy values pasted without the header name", () => {
      const result = parsePermissionsPolicy("microphone 'self'");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("Permissions-Policy: microphone=(self)");
    });
  });

  describe("warnings for single features", () => {
    it("flags unknown and misspelled features", () => {
      const result = parsed(parsePermissionsPolicy("geo_location=(), made-up=()"));
      expect(result.features.map((f) => f.known)).toEqual([false, false]);
      expect(result.warnings).toEqual([
        'Unknown feature "geo_location"; browsers ignore it. Did you mean geolocation?',
        'Unknown feature "made-up"; browsers ignore it.',
      ]);
    });

    it("does not mistake object properties for features", () => {
      const result = parsed(parsePermissionsPolicy("constructor=(), camera=();tostring"));
      expect(result.features[0].known).toBe(false);
      expect(result.warnings).toEqual([
        'Unknown feature "constructor"; browsers ignore it.',
        "camera has parameters other than report-to; browsers ignore them.",
      ]);
    });

    it("flags deprecated features", () => {
      const result = parsed(parsePermissionsPolicy("interest-cohort=()"));
      expect(result.warnings[0]).toMatch(/^interest-cohort: FLoC was replaced by the Topics API/);
    });

    it("treats a feature without an allowlist as disabled", () => {
      const result = parsed(parsePermissionsPolicy("camera"));
      expect(result.features[0]).toMatchObject({ access: "none", allowlist: "" });
      expect(result.warnings[0]).toMatch(/has no allowlist/);
    });

    it("ignores unquoted origins, invalid entries and src", () => {
      const result = parsed(parsePermissionsPolicy("camera=(https://a.example none src), microphone=(\"not a url\")"));
      expect(result.features.map((f) => f.access)).toEqual(["none", "none"]);
      expect(result.warnings).toEqual([
        'camera: origins must be quoted, e.g. "https://a.example"; unquoted, https://a.example is ignored.',
        "camera: none is not a valid allowlist entry; only *, self and quoted origins are, so it is ignored.",
        "camera: src only applies to an iframe's allow attribute, not to the header; it is ignored here.",
        'microphone: "not a url" is not a valid origin, so it is ignored. Use a full origin such as "https://example.com".',
      ]);
    });

    it("warns that origins without self block the feature on the page itself", () => {
      const result = parsed(parsePermissionsPolicy('geolocation=("https://maps.example/embed")'));
      expect(result.features[0]).toMatchObject({ access: "origins", self: false, origins: ["https://maps.example"] });
      expect(result.features[0].effect).toMatch(/^Blocked on this page/);
      expect(result.warnings).toEqual([
        'geolocation: only the origin of "https://maps.example/embed" is used (https://maps.example); paths and queries are ignored.',
        "geolocation lists origins without self, so the feature is blocked on your own page and only allowed in frames from those origins.",
      ]);
    });

    it("notes that other entries are redundant next to *", () => {
      const result = parsed(parsePermissionsPolicy("fullscreen=(* self)"));
      expect(result.features[0].access).toBe("all");
      expect(result.warnings).toEqual(["fullscreen: * already allows every origin, so the other entries are redundant."]);
    });
  });
});
