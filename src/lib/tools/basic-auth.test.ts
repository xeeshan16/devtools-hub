import { describe, expect, it } from "vitest";
import { decodeBasicAuth, encodeBasicAuth } from "./basic-auth";
import type { ToolResult } from "./result";

function value<T>(result: ToolResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error(`expected an error, got: ${JSON.stringify(result.value)}`);
  return result.error;
}

describe("encodeBasicAuth", () => {
  it("matches the RFC 7617 example", () => {
    const encoded = value(encodeBasicAuth("Aladdin", "open sesame"));
    expect(encoded.token).toBe("QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
    expect(encoded.value).toBe("Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
    expect(encoded.header).toBe("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
    expect(encoded.warnings).toEqual([]);
  });

  it("encodes non-ASCII characters as UTF-8 and says so", () => {
    // The RFC 7617 section 2.1 example: "test" / "123£" with charset UTF-8.
    const encoded = value(encodeBasicAuth("test", "123£"));
    expect(encoded.token).toBe("dGVzdDoxMjPCow==");
    expect(encoded.warnings.join(" ")).toMatch(/UTF-8/);
  });

  it("allows a colon in the password", () => {
    expect(value(encodeBasicAuth("user", "pa:ss")).token).toBe(btoa("user:pa:ss"));
  });

  it("rejects a colon in the username", () => {
    expect(error(encodeBasicAuth("us:er", "pass"))).toMatch(/colon at position 3/);
  });

  it("rejects control characters", () => {
    expect(error(encodeBasicAuth("user", "pass\n"))).toMatch(/password contains a line break at position 5/);
    expect(error(encodeBasicAuth("u\u0000", "pass"))).toMatch(/username contains U\+0000/);
  });

  it("warns about an empty username or password", () => {
    expect(value(encodeBasicAuth("", "key")).warnings.join(" ")).toMatch(/username is empty/);
    expect(value(encodeBasicAuth("api_key", "")).warnings.join(" ")).toMatch(/password is empty/);
  });
});

describe("decodeBasicAuth", () => {
  it("decodes a full header line, a header value and a bare token", () => {
    for (const input of [
      "Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==",
      "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==",
      "QWxhZGRpbjpvcGVuIHNlc2FtZQ==",
      "  basic   QWxhZGRpbjpvcGVuIHNlc2FtZQ==  \n",
    ]) {
      const decoded = value(decodeBasicAuth(input));
      expect(decoded.username, input).toBe("Aladdin");
      expect(decoded.password, input).toBe("open sesame");
      expect(decoded.charset).toBe("UTF-8");
    }
  });

  it("reports the header name, including Proxy-Authorization", () => {
    expect(value(decodeBasicAuth("Authorization: Basic dXNlcjpwYXNz")).headerName).toBe("Authorization");
    expect(value(decodeBasicAuth("proxy-authorization:Basic dXNlcjpwYXNz")).headerName).toBe("proxy-authorization");
    expect(value(decodeBasicAuth("Basic dXNlcjpwYXNz")).headerName).toBeNull();
  });

  it("splits at the first colon only", () => {
    const decoded = value(decodeBasicAuth(`Basic ${btoa("user:pa:ss")}`));
    expect(decoded).toMatchObject({ username: "user", password: "pa:ss" });
  });

  it("round-trips UTF-8 credentials", () => {
    const { value: header } = value(encodeBasicAuth("zoë", "pässwörd 👋"));
    expect(value(decodeBasicAuth(header))).toMatchObject({ username: "zoë", password: "pässwörd 👋", charset: "UTF-8" });
  });

  it("falls back to ISO-8859-1 for bytes that are not UTF-8", () => {
    // "test:123£" with £ as the single ISO-8859-1 byte 0xA3.
    const decoded = value(decodeBasicAuth("Basic dGVzdDoxMjOj"));
    expect(decoded).toMatchObject({ username: "test", password: "123£", charset: "ISO-8859-1" });
    expect(decoded.warnings.join(" ")).toMatch(/ISO-8859-1/);
  });

  it("accepts missing padding with a warning", () => {
    const decoded = value(decodeBasicAuth("Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ"));
    expect(decoded.password).toBe("open sesame");
    expect(decoded.warnings.join(" ")).toMatch(/padding/);
  });

  it("warns about unusual scheme casing and a missing scheme", () => {
    expect(value(decodeBasicAuth("BASIC dXNlcjpwYXNz")).warnings.join(" ")).toMatch(/case-insensitive/);
    expect(value(decodeBasicAuth("Authorization: dXNlcjpwYXNz")).warnings.join(" ")).toMatch(/no scheme/);
  });

  it("points Bearer tokens at the JWT Decoder", () => {
    expect(error(decodeBasicAuth("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.e30.x"))).toMatch(/JWT Decoder/);
  });

  it("rejects other schemes", () => {
    expect(error(decodeBasicAuth('Digest username="u", realm="r"'))).toMatch(/"Digest" scheme/);
  });

  it("explains malformed values", () => {
    expect(error(decodeBasicAuth(""))).toMatch(/Paste/);
    expect(error(decodeBasicAuth("Basic"))).toMatch(/no credentials after Basic/);
    expect(error(decodeBasicAuth("Basic dXNl cjpwYXNz"))).toMatch(/whitespace/);
    expect(error(decodeBasicAuth("Basic dXNlcj_wYXNz"))).toMatch(/base64url/);
    expect(error(decodeBasicAuth("Basic dXNlcjpw!XNz"))).toMatch(/Unexpected character "!" at position 9/);
    expect(error(decodeBasicAuth("Basic dXNlc"))).toMatch(/5 base64 characters cannot be decoded/);
    expect(error(decodeBasicAuth("Basic dXNlcjpwYXNz="))).toMatch(/need none/);
    expect(error(decodeBasicAuth("Basic dXNl=cjpw"))).toMatch(/only appear at the end/);
  });

  it("rejects values without a colon", () => {
    expect(error(decodeBasicAuth(`Basic ${btoa("justatoken")}`))).toMatch(/"justatoken", which has no colon/);
  });
});
