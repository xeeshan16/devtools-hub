import { describe, expect, it } from "vitest";
import { parseCsp, type CspPolicy, type CspResult } from "./csp";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<CspResult | null>): CspResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

function policy(input: string): CspPolicy {
  const result = parsed(parseCsp(input));
  expect(result.policies).toHaveLength(1);
  return result.policies[0];
}

function messages(p: CspPolicy, severity?: string): string[] {
  return p.findings.filter((f) => !severity || f.severity === severity).map((f) => f.message);
}

const STRICT = "script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'";

describe("parseCsp", () => {
  it("returns null for empty input", () => {
    expect(parseCsp("  \n ")).toEqual({ ok: true, value: null });
  });

  it("errors when there are no directives", () => {
    const result = parseCsp("Content-Security-Policy: ;");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/No directives found/);
  });

  it("parses directives, lower-cases names and keeps source values as written", () => {
    const p = policy("Content-Security-Policy: Default-Src 'self'; IMG-SRC 'self' data: https://cdn.example.com");
    expect(p.reportOnly).toBe(false);
    expect(p.directives.map(({ name, values, known }) => ({ name, values, known }))).toEqual([
      { name: "default-src", values: ["'self'"], known: true },
      { name: "img-src", values: ["'self'", "data:", "https://cdn.example.com"], known: true },
    ]);
    expect(p.directives[1].description).toMatch(/Images/);
  });

  it("accepts curl -v prefixes and detects report-only headers", () => {
    const p = policy("< content-security-policy-report-only: default-src 'self'; report-to csp");
    expect(p.reportOnly).toBe(true);
    expect(p.directives.map((d) => d.name)).toEqual(["default-src", "report-to"]);
  });

  it("joins a policy formatted one directive per line", () => {
    const p = policy("default-src 'self';\n  img-src *;\nscript-src 'self'");
    expect(p.directives.map((d) => d.name)).toEqual(["default-src", "img-src", "script-src"]);
  });

  it("treats each prefixed header line as its own policy", () => {
    const result = parsed(
      parseCsp("Content-Security-Policy: default-src 'self'\nContent-Security-Policy-Report-Only: script-src 'none'; report-uri /csp"),
    );
    expect(result.policies.map((p) => p.reportOnly)).toEqual([false, true]);
    expect(result.warnings).toEqual([]);
  });

  it("splits on commas into separate policies and warns", () => {
    const result = parsed(parseCsp("default-src 'self', img-src *"));
    expect(result.policies).toHaveLength(2);
    expect(result.warnings[0]).toMatch(/enforces 2 separate policies/);
  });

  it("ignores duplicate directives after the first", () => {
    const p = policy("script-src 'self'; script-src *");
    expect(p.directives.map((d) => d.values)).toEqual([["'self'"]]);
    expect(messages(p, "medium")).toContain("script-src appears more than once; browsers use the first and ignore the rest.");
  });

  it("flags unknown directives with a suggestion", () => {
    const p = policy("script_src 'self'; scriptsrc 'self'; foo-src 'self'");
    expect(messages(p)).toContain('"script_src" is not a valid directive name, so browsers ignore "script_src \'self\'".');
    expect(messages(p)).toContain('Unknown directive "scriptsrc"; browsers ignore it. Did you mean script-src?');
    expect(messages(p)).toContain('Unknown directive "foo-src"; browsers ignore it.');
    expect(p.directives.find((d) => d.name === "foo-src")?.known).toBe(false);
  });

  it("flags deprecated directives", () => {
    const p = policy("default-src 'self'; block-all-mixed-content; report-uri /csp; plugin-types application/pdf");
    expect(messages(p, "low").some((m) => m.startsWith("block-all-mixed-content is deprecated"))).toBe(true);
    expect(messages(p, "low").some((m) => m.startsWith("report-uri is deprecated"))).toBe(true);
    expect(messages(p, "low").some((m) => m.startsWith("plugin-types was removed"))).toBe(true);
  });

  describe("source expressions", () => {
    it("accepts keywords, nonces, hashes, schemes and hosts without warnings", () => {
      const p = policy(
        `${STRICT}; img-src 'self' data: blob: *.example.com https://cdn.example.com:443/assets/ localhost:3000; style-src 'sha256-abc+/=' 'report-sample'; connect-src wss://ws.example.com`,
      );
      expect(p.findings).toEqual([]);
    });

    it("flags keywords missing their quotes", () => {
      const p = policy("default-src self; script-src 'self' unsafe-inline");
      expect(messages(p, "high")).toContain(
        `self in default-src is missing its single quotes, so browsers read it as a host named "self". Write 'self'.`,
      );
      expect(messages(p, "high")).toContain(
        `unsafe-inline in script-src is missing its single quotes, so browsers read it as a host named "unsafe-inline". Write 'unsafe-inline'.`,
      );
    });

    it("flags unquoted nonces, unknown quoted values and invalid sources", () => {
      const p = policy("script-src nonce-abc 'unsafe' https://exa mple.com/ ht!tp://x");
      expect(messages(p)).toContain("nonce-abc in script-src must be wrapped in single quotes, e.g. 'nonce-abc'.");
      expect(messages(p)).toContain("'unsafe' in script-src is not a recognized keyword, nonce or hash, so browsers ignore it.");
      expect(messages(p)).toContain("ht!tp://x in script-src is not a valid source expression, so browsers ignore it.");
    });

    it("flags 'none' combined with other sources", () => {
      const p = policy("img-src 'none' https://example.com");
      expect(messages(p)).toContain("img-src combines 'none' with other sources; 'none' is ignored and the other sources apply.");
    });

    it("flags unknown sandbox tokens and values on valueless directives", () => {
      const p = policy("sandbox allow-scripts allow-everything; upgrade-insecure-requests yes");
      expect(messages(p)).toContain('sandbox token "allow-everything" is not recognized, so that restriction stays in place.');
      expect(messages(p)).toContain('upgrade-insecure-requests does not take a value; "yes" is ignored.');
    });
  });

  describe("effective sources", () => {
    it("resolves fallbacks through child-src, script-src and default-src", () => {
      const p = policy("default-src 'self'; script-src 'self' https://js.example.com; child-src https://embed.example.com");
      const effective = Object.fromEntries(p.effective.map((e) => [e.directive, e.from]));
      expect(effective).toMatchObject({
        "script-src": "script-src",
        "img-src": "default-src",
        "frame-src": "child-src",
        "worker-src": "child-src",
        "base-uri": null,
        "form-action": null,
        "frame-ancestors": null,
      });
    });

    it("falls back from worker-src to script-src when child-src is absent", () => {
      const p = policy("default-src 'none'; script-src 'self'");
      expect(p.effective.find((e) => e.directive === "worker-src")).toEqual({
        directive: "worker-src",
        from: "script-src",
        values: ["'self'"],
      });
    });

    it("reports unrestricted resource types as null", () => {
      const p = policy("img-src 'self'");
      expect(p.effective.find((e) => e.directive === "script-src")).toEqual({ directive: "script-src", from: null, values: null });
    });
  });

  describe("findings", () => {
    it("reports nothing for a strict nonce-based policy", () => {
      expect(policy(STRICT).findings).toEqual([]);
    });

    it("warns when scripts are unrestricted", () => {
      const p = policy("img-src 'self'");
      expect(messages(p, "high")[0]).toMatch(/There is no script-src or default-src/);
    });

    it("flags 'unsafe-inline' and 'unsafe-eval', naming default-src when it governs scripts", () => {
      const p = policy("default-src 'self' 'unsafe-inline' 'unsafe-eval'");
      expect(messages(p, "high")).toContain(
        "'unsafe-inline' in default-src (used for scripts because script-src is not set) lets injected inline scripts and event handlers run, which defeats most XSS protection. Use nonces or hashes instead.",
      );
      expect(messages(p, "medium").some((m) => m.startsWith("'unsafe-eval' in default-src"))).toBe(true);
    });

    it("downgrades 'unsafe-inline' when a nonce or hash makes browsers ignore it", () => {
      const p = policy(`${STRICT.replace("'strict-dynamic'", "'strict-dynamic' 'unsafe-inline' https:")}`);
      expect(messages(p, "high")).toEqual([]);
      expect(messages(p, "low")[0]).toMatch(/'unsafe-inline' in script-src is ignored by modern browsers/);
    });

    it("flags wildcard and scheme-wide script sources unless 'strict-dynamic' is set", () => {
      expect(messages(policy("script-src * 'self'"), "high")[0]).toMatch(/^\* in script-src lets scripts load from almost any origin/);
      expect(messages(policy("script-src 'self' data:"), "high")[0]).toMatch(/^data: in script-src lets scripts load from attacker-controlled URLs/);
    });

    it("flags 'strict-dynamic' without a nonce or hash", () => {
      const p = policy("script-src 'strict-dynamic' 'self'");
      expect(messages(p, "medium").some((m) => m.includes("no script can load"))).toBe(true);
    });

    it("recommends object-src 'none', base-uri, frame-ancestors and form-action when missing", () => {
      const p = policy("default-src 'self'");
      expect(messages(p, "medium")).toContain(
        "Set object-src 'none' to block plugin content in <object> and <embed>, which can bypass script-src.",
      );
      expect(messages(p, "medium").some((m) => m.startsWith("No base-uri"))).toBe(true);
      expect(messages(p, "low").some((m) => m.startsWith("No frame-ancestors"))).toBe(true);
      expect(messages(p, "low").some((m) => m.startsWith("No form-action"))).toBe(true);
    });

    it("accepts object-src 'none' inherited from default-src", () => {
      const p = policy("default-src 'none'; script-src 'self'");
      expect(messages(p).some((m) => m.includes("object-src"))).toBe(false);
    });

    it("flags plain http sources", () => {
      const p = policy(`${STRICT}; img-src http://images.example.com; connect-src http:`);
      expect(messages(p, "medium")).toContain("img-src, connect-src allow plain http:// sources, which a network attacker can tamper with.");
    });

    it("flags a report-only policy that reports nowhere", () => {
      const p = policy(`Content-Security-Policy-Report-Only: ${STRICT}`);
      expect(messages(p, "medium")).toContain(
        "This is a report-only policy with no report-uri or report-to, so it neither blocks nor reports anything.",
      );
    });
  });
});
