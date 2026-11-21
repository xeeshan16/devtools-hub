import { describe, expect, it } from "vitest";
import { buildForwarded, parseForwarded, parseNode, type ForwardedResult } from "./forwarded-header";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<ForwardedResult | null>): ForwardedResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

function warningsFor(input: string): string[] {
  return parsed(parseForwarded(input)).warnings;
}

describe("parseForwarded", () => {
  it("returns null for empty input", () => {
    expect(parseForwarded(" \n ")).toEqual({ ok: true, value: null });
  });

  it("errors when there are no pairs", () => {
    const result = parseForwarded("Forwarded: , ;");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/No forwarded elements found/);
  });

  it("parses the RFC 7239 example with the prefix", () => {
    const result = parsed(parseForwarded("Forwarded: for=192.0.2.60;proto=http;by=203.0.113.43"));
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0]).toEqual({
      pairs: [
        { name: "for", value: "192.0.2.60" },
        { name: "proto", value: "http" },
        { name: "by", value: "203.0.113.43" },
      ],
      for: { raw: "192.0.2.60", kind: "ipv4", address: "192.0.2.60", port: null, scope: "public" },
      by: { raw: "203.0.113.43", kind: "ipv4", address: "203.0.113.43", port: null, scope: "public" },
      host: null,
      proto: "http",
    });
    expect(result.client?.address).toBe("192.0.2.60");
    expect(result.warnings).toEqual([]);
  });

  it("splits a proxy chain into elements, client first", () => {
    const result = parsed(parseForwarded('for=192.0.2.43, for="[2001:db8:cafe::17]", for=unknown'));
    expect(result.elements.map((element) => element.for?.kind)).toEqual(["ipv4", "ipv6", "unknown"]);
    expect(result.elements[1].for).toMatchObject({ address: "2001:db8:cafe::17", port: null });
    expect(result.client?.raw).toBe("192.0.2.43");
    expect(result.warnings).toEqual([]);
  });

  it("combines repeated header lines and curl -v markers", () => {
    const result = parsed(parseForwarded("< Forwarded: for=192.0.2.43\n< forwarded: for=198.51.100.17;by=_proxy1"));
    expect(result.elements).toHaveLength(2);
    expect(result.elements[1].by).toMatchObject({ kind: "obfuscated", address: "_proxy1" });
  });

  it("lowercases names and proto, unescapes quoted values and keeps semicolons and commas inside quotes", () => {
    const result = parsed(parseForwarded('For="192.0.2.43:4711"; Proto=HTTPS; Host="example.com:8443"; x-note="a;b,c \\"d\\""'));
    const [element] = result.elements;
    expect(element.for).toMatchObject({ kind: "ipv4", address: "192.0.2.43", port: "4711" });
    expect(element.proto).toBe("https");
    expect(element.host).toBe("example.com:8443");
    expect(element.pairs[3]).toEqual({ name: "x-note", value: 'a;b,c "d"' });
  });

  it("reads bracketed IPv6 with ports and obfuscated ports", () => {
    const result = parsed(parseForwarded('for="[2001:db8::1]:443";by="10.0.0.1:_eth0"'));
    expect(result.elements[0].for).toMatchObject({ kind: "ipv6", address: "2001:db8::1", port: "443" });
    expect(result.elements[0].by).toMatchObject({ kind: "ipv4", port: "_eth0", scope: "private" });
  });

  describe("warnings", () => {
    it("flags an unquoted IPv6 node", () => {
      expect(warningsFor("for=[2001:db8::1]")[0]).toMatch(/must be in double quotes: for="\[2001:db8::1\]"/);
    });

    it("flags an IPv6 address without brackets", () => {
      expect(warningsFor('for="2001:db8::1"')[0]).toMatch(/must be in square brackets and quoted/);
    });

    it("flags an unquoted port", () => {
      expect(warningsFor("for=192.0.2.43:8080")[0]).toMatch(/must be in double quotes/);
    });

    it("flags an out-of-range port", () => {
      expect(warningsFor('for="192.0.2.43:70000"')[0]).toMatch(/invalid port/);
    });

    it("flags a host name in for", () => {
      expect(warningsFor("for=client.example.com")[0]).toMatch(/is not an IPv4 address/);
    });

    it("flags repeated parameters in one element", () => {
      expect(warningsFor("for=192.0.2.1;for=192.0.2.2")).toEqual([
        "Element 1 has more than one for parameter; RFC 7239 forbids repeating a parameter within one element.",
      ]);
    });

    it("allows the same parameter in different elements", () => {
      expect(warningsFor("for=192.0.2.1, for=192.0.2.2")).toEqual([]);
    });

    it("flags non-standard parameters", () => {
      expect(warningsFor("for=192.0.2.1;secret=1")[0]).toMatch(/"secret" is not a standard parameter/);
    });

    it("flags an invalid proto", () => {
      expect(warningsFor('proto="1http"')[0]).toMatch(/is not a URI scheme/);
    });

    it("flags pairs without a value or name", () => {
      expect(warningsFor("for;proto=https")[0]).toMatch(/"for" is not a name=value pair/);
      expect(warningsFor("for=192.0.2.1;=https")[0]).toMatch(/has no parameter name/);
    });

    it("flags an unterminated quote", () => {
      expect(warningsFor('for="192.0.2.1')[0]).toMatch(/no closing quote/);
    });
  });
});

describe("parseNode", () => {
  it("classifies address scopes", () => {
    expect(parseNode("8.8.8.8").scope).toBe("public");
    expect(parseNode("10.1.2.3").scope).toBe("private");
    expect(parseNode("172.20.0.1").scope).toBe("private");
    expect(parseNode("172.32.0.1").scope).toBe("public");
    expect(parseNode("192.168.1.1").scope).toBe("private");
    expect(parseNode("100.64.0.1").scope).toBe("private");
    expect(parseNode("127.0.0.1").scope).toBe("loopback");
    expect(parseNode("169.254.10.1").scope).toBe("link-local");
    expect(parseNode("[::1]").scope).toBe("loopback");
    expect(parseNode("[fd00::1]").scope).toBe("private");
    expect(parseNode("[fe80::1]").scope).toBe("link-local");
    expect(parseNode("[2001:db8::1]").scope).toBe("public");
    expect(parseNode("[::ffff:192.168.0.1]").scope).toBe("private");
  });

  it("accepts unknown with a port, case-insensitively", () => {
    expect(parseNode("UNKNOWN:80")).toMatchObject({ kind: "unknown", address: null, port: "80" });
  });

  it("rejects malformed nodes", () => {
    for (const raw of ["256.1.1.1", "01.2.3.4", "1.2.3", "[2001:db8::1", "[::1]x", "[zz::1]", "192.0.2.1:0", "_", ""]) {
      expect(parseNode(raw).kind, raw).toBe("invalid");
    }
  });
});

describe("buildForwarded", () => {
  it("returns null when every input is empty", () => {
    expect(buildForwarded({ forwardedFor: " ", proto: "", host: "" })).toEqual({ ok: true, value: null });
  });

  it("converts X-Forwarded-* headers, putting proto and host on the client's element", () => {
    expect(buildForwarded({ forwardedFor: "203.0.113.195, 2001:db8::1, 198.51.100.178", proto: "HTTPS", host: "example.com" })).toEqual({
      ok: true,
      value: 'for=203.0.113.195;host=example.com;proto=https, for="[2001:db8::1]", for=198.51.100.178',
    });
  });

  it("quotes ports, hosts with ports and keeps unknown", () => {
    expect(buildForwarded({ forwardedFor: "192.0.2.1:4711, unknown", proto: "", host: "example.com:8443" })).toEqual({
      ok: true,
      value: 'for="192.0.2.1:4711";host="example.com:8443", for=unknown',
    });
  });

  it("builds an element from proto and host alone", () => {
    expect(buildForwarded({ forwardedFor: "", proto: "http", host: "" })).toEqual({ ok: true, value: "proto=http" });
  });

  it("rejects entries that aren't addresses", () => {
    const result = buildForwarded({ forwardedFor: "192.0.2.1, client.example.com", proto: "", host: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/"client.example.com" in X-Forwarded-For/);
  });

  it("rejects an invalid proto or host", () => {
    expect(buildForwarded({ forwardedFor: "", proto: "ht tp", host: "" }).ok).toBe(false);
    expect(buildForwarded({ forwardedFor: "", proto: "", host: "example.com/path" }).ok).toBe(false);
  });

  it("round-trips through the parser without warnings", () => {
    const built = buildForwarded({ forwardedFor: "203.0.113.195:51000, 2001:db8::1", proto: "https", host: "example.com:8443" });
    if (!built.ok || !built.value) throw new Error("expected a header");
    const result = parsed(parseForwarded(built.value));
    expect(result.warnings).toEqual([]);
    expect(result.elements.map((element) => element.for?.address)).toEqual(["203.0.113.195", "2001:db8::1"]);
    expect(result.elements[0]).toMatchObject({ host: "example.com:8443", proto: "https" });
  });
});
