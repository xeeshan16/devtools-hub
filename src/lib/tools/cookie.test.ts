import { describe, expect, it } from "vitest";
import { parseCookieDate, parseCookies, parseSetCookie, type CookieParseResult, type SetCookie } from "./cookie";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<CookieParseResult | null>): CookieParseResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

function setCookie(header: string): SetCookie {
  const result = parseSetCookie(header);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

describe("parseCookies", () => {
  it("returns null for empty input", () => {
    expect(parseCookies("   \n ")).toEqual({ ok: true, value: null });
  });

  it("splits a Cookie header into pairs and decodes values", () => {
    const result = parsed(parseCookies("Cookie: session=abc123; theme=dark; greeting=caf%C3%A9"));
    expect(result).toEqual({
      kind: "cookie",
      pairs: [
        { name: "session", value: "abc123", decoded: "abc123", duplicate: false },
        { name: "theme", value: "dark", decoded: "dark", duplicate: false },
        { name: "greeting", value: "caf%C3%A9", decoded: "café", duplicate: false },
      ],
    });
  });

  it("keeps values containing = intact and tolerates stray semicolons", () => {
    const result = parsed(parseCookies("token=a=b==;; ;flag"));
    if (result.kind !== "cookie") throw new Error("expected cookie");
    expect(result.pairs.map(({ name, value }) => [name, value])).toEqual([
      ["token", "a=b=="],
      ["", "flag"],
    ]);
  });

  it("flags names sent more than once", () => {
    const result = parsed(parseCookies("id=1; theme=dark; id=2"));
    if (result.kind !== "cookie") throw new Error("expected cookie");
    expect(result.pairs.map((p) => p.duplicate)).toEqual([true, false, true]);
  });

  it("leaves malformed percent-escapes as sent", () => {
    const result = parsed(parseCookies("bad=100%"));
    if (result.kind !== "cookie") throw new Error("expected cookie");
    expect(result.pairs[0].decoded).toBe("100%");
  });

  it("detects Set-Cookie from the header name or from attributes", () => {
    expect(parsed(parseCookies("Set-Cookie: id=1")).kind).toBe("set-cookie");
    expect(parsed(parseCookies("< set-cookie: id=1")).kind).toBe("set-cookie");
    expect(parsed(parseCookies("id=1; Path=/; HttpOnly")).kind).toBe("set-cookie");
    expect(parsed(parseCookies("id=1; theme=dark")).kind).toBe("cookie");
  });

  it("honours an explicit mode over detection", () => {
    expect(parsed(parseCookies("id=1; Path=/", "cookie")).kind).toBe("cookie");
    expect(parsed(parseCookies("id=1", "set-cookie")).kind).toBe("set-cookie");
  });

  it("reads one Set-Cookie header per line", () => {
    const result = parsed(parseCookies("Set-Cookie: a=1; Path=/\nSet-Cookie: b=2; Secure"));
    if (result.kind !== "set-cookie") throw new Error("expected set-cookie");
    expect(result.cookies.map((c) => c.name)).toEqual(["a", "b"]);
  });

  it("names the line of a Set-Cookie header without a name or value", () => {
    expect(parseCookies("Set-Cookie: a=1\nSet-Cookie: ; Path=/")).toEqual({
      ok: false,
      error: expect.stringMatching(/^Line 2: The cookie has no name or value/),
    });
  });

  it("reports a Cookie header with nothing in it", () => {
    expect(parseCookies("Cookie: ;", "cookie")).toEqual({ ok: false, error: expect.stringMatching(/No cookies found/) });
  });
});

describe("parseSetCookie", () => {
  it("reads every standard attribute", () => {
    const cookie = setCookie(
      "__Secure-id=a3fWa; Expires=Wed, 21 Oct 2099 07:28:00 GMT; Domain=.Example.com; Path=/app; Secure; HttpOnly; SameSite=lax; Partitioned",
    );
    expect(cookie).toMatchObject({
      name: "__Secure-id",
      value: "a3fWa",
      expires: "2099-10-21T07:28:00.000Z",
      maxAge: null,
      lifetime: "persistent",
      domain: "example.com",
      path: "/app",
      secure: true,
      httpOnly: true,
      partitioned: true,
      sameSite: "Lax",
      unknown: [],
      warnings: [],
    });
  });

  it("treats a cookie without Expires or Max-Age as a session cookie", () => {
    expect(setCookie("id=1; Path=/")).toMatchObject({ lifetime: "session", expires: null, maxAge: null });
  });

  it("treats Max-Age=0 and a past Expires as deleting the cookie", () => {
    expect(setCookie("id=; Max-Age=0").lifetime).toBe("delete");
    expect(setCookie("id=; Max-Age=-1").lifetime).toBe("delete");
    expect(setCookie("id=; Expires=Thu, 01 Jan 1970 00:00:00 GMT").lifetime).toBe("delete");
  });

  it("prefers Max-Age over Expires and says so", () => {
    const cookie = setCookie("id=1; Max-Age=3600; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(cookie.maxAge).toBe(3600);
    expect(cookie.lifetime).toBe("persistent");
    expect(cookie.warnings).toContain("Both Max-Age and Expires are set; browsers use Max-Age.");
  });

  it("ignores an invalid Max-Age and warns", () => {
    const cookie = setCookie("id=1; Max-Age=1h");
    expect(cookie.maxAge).toBeNull();
    expect(cookie.lifetime).toBe("session");
    expect(cookie.warnings[0]).toMatch(/Max-Age "1h" is not a whole number/);
  });

  it("warns when Max-Age exceeds the 400-day cap", () => {
    expect(setCookie("id=1; Max-Age=40000000").warnings).toContain(
      "Max-Age is longer than 400 days; browsers cap cookie lifetimes at 400 days.",
    );
    expect(setCookie("id=1; Max-Age=34560000").warnings).toEqual([]);
  });

  it("ignores an unparseable Expires but keeps an earlier valid one", () => {
    const cookie = setCookie("id=1; Expires=Wed, 21 Oct 2099 07:28:00 GMT; Expires=next tuesday");
    expect(cookie.expires).toBe("2099-10-21T07:28:00.000Z");
    expect(cookie.warnings.some((w) => w.startsWith('Expires "next tuesday" is not a valid date'))).toBe(true);
    expect(cookie.warnings).toContain("Expires is set more than once; browsers use the last one.");
  });

  it("ignores a Path that does not start with /", () => {
    const cookie = setCookie("id=1; Path=app");
    expect(cookie.path).toBeNull();
    expect(cookie.warnings[0]).toMatch(/does not start with \//);
  });

  it("rejects SameSite=None without Secure", () => {
    expect(setCookie("id=1; SameSite=None").warnings).toContain(
      "SameSite=None requires Secure; browsers reject this cookie.",
    );
    expect(setCookie("id=1; SameSite=None; Secure").warnings).toEqual([]);
  });

  it("ignores an unknown SameSite value", () => {
    const cookie = setCookie("id=1; SameSite=Relaxed");
    expect(cookie.sameSite).toBeNull();
    expect(cookie.warnings[0]).toMatch(/not Strict, Lax or None/);
  });

  it("requires Secure for Partitioned and __Secure- cookies", () => {
    expect(setCookie("id=1; Partitioned").warnings).toContain("Partitioned requires Secure; browsers reject this cookie.");
    expect(setCookie("__Secure-id=1").warnings[0]).toMatch(/__Secure-… must be set with Secure/);
  });

  it("enforces the __Host- prefix rules", () => {
    expect(setCookie("__Host-id=1; Secure; Path=/").warnings).toEqual([]);
    for (const header of ["__Host-id=1; Path=/", "__Host-id=1; Secure", "__Host-id=1; Secure; Path=/; Domain=example.com"]) {
      expect(setCookie(header).warnings, header).toContain(
        "Cookies named __Host-… need Secure, Path=/ and no Domain; browsers reject this cookie.",
      );
    }
  });

  it("lists attributes browsers do not recognize", () => {
    expect(setCookie("id=1; Priority=High; Version=1").unknown).toEqual([
      { name: "Priority", value: "High" },
      { name: "Version", value: "1" },
    ]);
  });

  it("flags names with characters a cookie name cannot contain", () => {
    expect(setCookie("my id=1").warnings[0]).toMatch(/contains spaces or separator characters/);
  });

  it("accepts a value without a name", () => {
    expect(setCookie("justavalue; Path=/")).toMatchObject({ name: "", value: "justavalue" });
  });
});

describe("parseCookieDate", () => {
  it("parses the IMF-fixdate and the old dashed form", () => {
    expect(parseCookieDate("Wed, 21 Oct 2026 07:28:00 GMT")).toBe(Date.UTC(2026, 9, 21, 7, 28));
    expect(parseCookieDate("Wednesday, 21-Oct-26 07:28:00 GMT")).toBe(Date.UTC(2026, 9, 21, 7, 28));
    expect(parseCookieDate("Thu, 01-Jan-70 00:00:00 GMT")).toBe(0);
  });

  it("returns null for anything else", () => {
    expect(parseCookieDate("")).toBeNull();
    expect(parseCookieDate("soon")).toBeNull();
  });
});
