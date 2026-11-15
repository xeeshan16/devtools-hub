import { describe, expect, it } from "vitest";
import {
  buildTag,
  checkIntegrity,
  integrityForBytes,
  integrityForText,
  parseIntegrity,
  type IntegrityCheck,
  type IntegrityResult,
} from "./sri";

// Digests below were computed with `openssl dgst -sha384 -binary | openssl base64`,
// not with this module, so the tests check against an independent implementation.
const HELLO = "alert('Hello, world.');";
const HELLO_256 = "sha256-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng=";
const HELLO_384 = "sha384-H8BRh8j48O9oYatfu5AZzq6A9RINhZO5H16dQZngK7T62em8MUt1FLm52t+eX6xO";
const HELLO_512 =
  "sha512-Q2bFTOhEALkN8hOms2FKTDLy7eugP2zFZ1T8LCvX42Fp3WoNr3bjZSAHeOsHrbV1Fu9/A0EzCinRE7Af1ofPrw==";
const OTHER_384 = "sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb";

const bytes = (text: string) => new TextEncoder().encode(text);

async function integrity(...args: Parameters<typeof integrityForText>): Promise<IntegrityResult> {
  const result = await integrityForText(...args);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

async function check(content: string, attribute: string): Promise<IntegrityCheck> {
  const result = await checkIntegrity(bytes(content), attribute);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

describe("integrityForText", () => {
  it("defaults to sha384, the algorithm most CDNs publish", async () => {
    const result = await integrity(HELLO);
    expect(result.integrity).toBe(HELLO_384);
    expect(result.byteLength).toBe(23);
  });

  it("lists several algorithms weakest first, whatever order they were asked for in", async () => {
    const result = await integrity(HELLO, ["sha512", "sha256", "sha384"]);
    expect(result.hashes.map((h) => h.algorithm)).toEqual(["sha256", "sha384", "sha512"]);
    expect(result.integrity).toBe(`${HELLO_256} ${HELLO_384} ${HELLO_512}`);
  });

  it("hashes the UTF-8 bytes of non-ASCII text", async () => {
    const result = await integrity("Zoë");
    expect(result.integrity).toBe("sha384-Z46ckAIy3gfj4gFmyZypMt4HzThFEK47bViASOR564PczTdvZS/DDdHLuoAzESji");
    expect(result.byteLength).toBe(4);
  });

  it("hashes empty input to the digest of zero bytes", async () => {
    const result = await integrity("");
    expect(result.integrity).toBe(OTHER_384);
  });

  it("rejects an empty algorithm list", async () => {
    const result = await integrityForText(HELLO, []);
    expect(result).toEqual({ ok: false, error: "Choose at least one hash algorithm." });
  });

  it("rejects text with an unpaired surrogate instead of hashing a replacement character", async () => {
    const result = await integrityForText("ab\uD800c");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("position 3");
  });
});

describe("integrityForBytes", () => {
  it("distinguishes CRLF from LF line endings, which pasted text cannot preserve", async () => {
    const crlf = await integrityForBytes(bytes("a\r\nb"), ["sha256"]);
    const lf = await integrityForBytes(bytes("a\nb"), ["sha256"]);
    expect(crlf.ok && crlf.value.integrity).toBe("sha256-GHRfNqBeKQcnCQQtYGLOVPGwj/NsJ7qAw5+B+wEMjOI=");
    expect(lf.ok && lf.value.integrity).toBe("sha256-fhj3NzEbLcOy8mndeDlrA1HxT7Zu+oefdoyyMYGIPHg=");
  });
});

describe("parseIntegrity", () => {
  it("accepts a bare value, a quoted value or a whole attribute", () => {
    for (const input of [HELLO_384, `"${HELLO_384}"`, `integrity="${HELLO_384}"`, `  integrity = '${HELLO_384}' `]) {
      const parsed = parseIntegrity(input);
      expect(parsed.tokens, input).toEqual([
        { raw: HELLO_384, algorithm: "sha384", digest: HELLO_384.slice(7), problem: null },
      ]);
      expect(parsed.strongest).toBe("sha384");
    }
  });

  it("drops ?options and reads the algorithm name case-insensitively", () => {
    const parsed = parseIntegrity(`SHA384-${HELLO_384.slice(7)}?foo=bar`);
    expect(parsed.tokens[0]).toMatchObject({ algorithm: "sha384", problem: null });
  });

  it("picks the strongest recognised algorithm", () => {
    expect(parseIntegrity(`${HELLO_512} ${HELLO_256}`).strongest).toBe("sha512");
    expect(parseIntegrity("").strongest).toBeNull();
  });

  it("explains tokens that browsers ignore", () => {
    const [md5, hyphenated, unknown] = parseIntegrity("md5-abc sha-384-abc blake3-abc").tokens;
    expect(md5.algorithm).toBeNull();
    expect(md5.problem).toContain("only accepts sha256, sha384 and sha512");
    expect(hyphenated.problem).toContain('"sha-384"');
    expect(hyphenated.problem).toContain("as sha384");
    expect(unknown.problem).toContain('Unrecognised algorithm "blake3"');
    expect(parseIntegrity("md5-abc").strongest).toBeNull();
  });

  it("flags digests that can never match", () => {
    const [missing, url, invalid, short] = parseIntegrity(
      "sha256 sha256-ab_c sha256-ab*c sha384-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng=",
    ).tokens;
    expect(missing.problem).toBe("No digest after the algorithm name.");
    expect(url.problem).toContain("base64url");
    expect(invalid.problem).toBe("The digest is not valid base64.");
    // A sha256 digest labelled sha384: the classic copy-paste slip.
    expect(short.problem).toContain("64 base64 characters, but this one is 44");
  });
});

describe("checkIntegrity", () => {
  it("matches content against its own digest", async () => {
    const result = await check(HELLO, HELLO_384);
    expect(result).toMatchObject({ status: "match", algorithm: "sha384", token: HELLO_384 });
  });

  it("matches when any token of the strongest algorithm matches, as during a key rotation", async () => {
    const result = await check(HELLO, `${OTHER_384} ${HELLO_384}`);
    expect(result.status).toBe("match");
  });

  it("reports the digest browsers expected on a mismatch", async () => {
    const result = await check(`${HELLO}\n`, HELLO_384);
    expect(result.status).toBe("mismatch");
    if (result.status === "mismatch") {
      expect(result.algorithm).toBe("sha384");
      expect(result.expected).toMatch(/^sha384-/);
      expect(result.expected).not.toBe(HELLO_384);
    }
  });

  it("ignores a matching weaker token when a stronger one does not match", async () => {
    // Browsers only consult the strongest algorithm, so a correct sha256
    // cannot rescue a stale sha384.
    const result = await check(HELLO, `${HELLO_256} ${OTHER_384}`);
    expect(result).toMatchObject({ status: "mismatch", algorithm: "sha384", expected: HELLO_384 });
  });

  it("reports content as unchecked when no token is recognised", async () => {
    expect((await check(HELLO, "md5-abc")).status).toBe("unchecked");
    expect((await check(HELLO, "   ")).status).toBe("unchecked");
  });
});

describe("buildTag", () => {
  it("builds a script tag with crossorigin set", () => {
    expect(buildTag("script", "https://cdn.example.com/lib.js", HELLO_384)).toBe(
      `<script src="https://cdn.example.com/lib.js" integrity="${HELLO_384}" crossorigin="anonymous"></script>`,
    );
  });

  it("builds a stylesheet link, with a placeholder URL when none is given", () => {
    expect(buildTag("stylesheet", "  ", HELLO_384)).toBe(
      `<link rel="stylesheet" href="https://cdn.example.com/styles.css" integrity="${HELLO_384}" crossorigin="anonymous">`,
    );
  });

  it("escapes quotes and ampersands in the URL", () => {
    expect(buildTag("script", 'https://x.test/a.js?v=1&q="', "sha384-x")).toContain(
      'src="https://x.test/a.js?v=1&amp;q=&quot;"',
    );
  });
});
