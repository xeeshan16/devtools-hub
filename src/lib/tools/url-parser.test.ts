import { describe, expect, it } from "vitest";
import type { ToolResult } from "./result";
import { parseUrl, type ParsedUrl } from "./url-parser";

function parsed(result: ToolResult<ParsedUrl | null>): ParsedUrl {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a parsed URL, got null");
  return result.value;
}

describe("parseUrl", () => {
  it("splits a full URL into every part", () => {
    const url = parsed(
      parseUrl("https://alice:s3cret@api.example.com:8443/v1/users/42?sort=name&page=2#details"),
    );
    expect(url).toMatchObject({
      scheme: "https",
      assumedScheme: false,
      username: "alice",
      password: "s3cret",
      hostname: "api.example.com",
      port: "8443",
      effectivePort: "8443",
      origin: "https://api.example.com:8443",
      pathname: "/v1/users/42",
      pathSegments: ["v1", "users", "42"],
      query: "sort=name&page=2",
      params: [
        { key: "sort", value: "name" },
        { key: "page", value: "2" },
      ],
      fragment: "details",
    });
  });

  it("fills in the scheme's default port and drops it when written out", () => {
    const url = parsed(parseUrl("https://example.com:443/"));
    expect(url.port).toBe("");
    expect(url.effectivePort).toBe("443");
    expect(url.href).toBe("https://example.com/");
    expect(parsed(parseUrl("http://example.com")).effectivePort).toBe("80");
    expect(parsed(parseUrl("wss://example.com/socket")).effectivePort).toBe("443");
  });

  it("assumes https for a bare host and flags it", () => {
    const url = parsed(parseUrl("example.com/docs?q=1"));
    expect(url.assumedScheme).toBe(true);
    expect(url.href).toBe("https://example.com/docs?q=1");
  });

  it("reads host:port without a scheme as a host, not as a scheme", () => {
    const local = parsed(parseUrl("localhost:3000/api"));
    expect(local).toMatchObject({ assumedScheme: true, hostname: "localhost", port: "3000" });
    expect(parsed(parseUrl("127.0.0.1:8080")).hostname).toBe("127.0.0.1");
  });

  it("treats a protocol-relative URL as https", () => {
    const url = parsed(parseUrl("//cdn.example.com/lib.js"));
    expect(url).toMatchObject({ assumedScheme: true, hostname: "cdn.example.com", pathname: "/lib.js" });
  });

  it("keeps opaque URLs such as mailto and tel as written", () => {
    const mail = parsed(parseUrl("mailto:someone@example.com?subject=Hi%20there"));
    expect(mail).toMatchObject({ scheme: "mailto", assumedScheme: false, hostname: "", origin: null });
    expect(mail.params).toEqual([{ key: "subject", value: "Hi there" }]);

    const tel = parsed(parseUrl("tel:5551234"));
    expect(tel).toMatchObject({ scheme: "tel", assumedScheme: false, effectivePort: "" });
  });

  it("decodes query values with form rules, keeping repeated keys in order", () => {
    const url = parsed(parseUrl("https://example.com/search?q=caf%C3%A9+au+lait&tag=a&tag=b&empty="));
    expect(url.params).toEqual([
      { key: "q", value: "café au lait" },
      { key: "tag", value: "a" },
      { key: "tag", value: "b" },
      { key: "empty", value: "" },
    ]);
  });

  it("decodes path segments and the fragment, but keeps the raw pathname", () => {
    const url = parsed(parseUrl("https://example.com/files/r%C3%A9sum%C3%A9%20final.pdf#page%202"));
    expect(url.pathname).toBe("/files/r%C3%A9sum%C3%A9%20final.pdf");
    expect(url.pathSegments).toEqual(["files", "résumé final.pdf"]);
    expect(url.fragment).toBe("page 2");
  });

  it("leaves a malformed escape as written instead of failing", () => {
    expect(parsed(parseUrl("https://example.com/100%25/50%zz")).pathSegments).toEqual([
      "100%",
      "50%zz",
    ]);
  });

  it("normalizes the host to lowercase punycode like a browser does", () => {
    const url = parsed(parseUrl("https://BÜCHER.example/"));
    expect(url.hostname).toBe("xn--bcher-kva.example");
  });

  it("keeps the brackets on an IPv6 host", () => {
    const url = parsed(parseUrl("http://[::1]:8080/health"));
    expect(url).toMatchObject({ hostname: "[::1]", port: "8080", origin: "http://[::1]:8080" });
  });

  it("returns null for empty input", () => {
    expect(parseUrl("   ")).toEqual({ ok: true, value: null });
  });

  it("rejects whitespace inside the URL with a hint", () => {
    const result = parseUrl("https://example.com/a b");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/%20/);
  });

  it("reports an out-of-range port or broken IPv6 host instead of throwing", () => {
    for (const input of ["https://example.com:99999/", "http://[::1/x"]) {
      const result = parseUrl(input);
      expect(result.ok, input).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/not a valid URL/);
    }
  });
});

