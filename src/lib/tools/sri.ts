import { loneSurrogateIndex, toBase64 } from "./hash";
import { err, messageOf, ok, type ToolResult } from "./result";

/** The hash algorithms the Subresource Integrity spec lets browsers accept. */
export type SriAlgorithm = "sha256" | "sha384" | "sha512";

/** Ordered weakest to strongest; a browser only checks the strongest one present. */
export const SRI_ALGORITHMS: { id: SriAlgorithm; subtle: string; bits: number }[] = [
  { id: "sha256", subtle: "SHA-256", bits: 256 },
  { id: "sha384", subtle: "SHA-384", bits: 384 },
  { id: "sha512", subtle: "SHA-512", bits: 512 },
];

const STRENGTH: Record<SriAlgorithm, number> = { sha256: 0, sha384: 1, sha512: 2 };

/** Base64 length of each digest, with padding. */
const DIGEST_LENGTH: Record<SriAlgorithm, number> = { sha256: 44, sha384: 64, sha512: 88 };

export type SriHash = {
  algorithm: SriAlgorithm;
  /** A single integrity token, e.g. `sha384-…`. */
  token: string;
};

export type IntegrityResult = {
  hashes: SriHash[];
  /** Space-separated tokens, ready for an `integrity="…"` attribute. */
  integrity: string;
  byteLength: number;
};

function isSriAlgorithm(value: string): value is SriAlgorithm {
  return value === "sha256" || value === "sha384" || value === "sha512";
}

async function digestBase64(algorithm: SriAlgorithm, bytes: Uint8Array): Promise<string> {
  const { subtle } = SRI_ALGORITHMS.find((a) => a.id === algorithm)!;
  const digest = await crypto.subtle.digest(subtle, bytes as Uint8Array<ArrayBuffer>);
  return toBase64(new Uint8Array(digest));
}

/**
 * Computes integrity tokens for the exact bytes of a file. Tokens are listed
 * weakest first, in the order the algorithms are defined, whatever order they
 * were asked for in, so the output is stable.
 */
export async function integrityForBytes(
  bytes: Uint8Array,
  algorithms: readonly SriAlgorithm[] = ["sha384"],
): Promise<ToolResult<IntegrityResult>> {
  const chosen = SRI_ALGORITHMS.filter((a) => algorithms.includes(a.id)).map((a) => a.id);
  if (chosen.length === 0) return err("Choose at least one hash algorithm.");

  try {
    const hashes = await Promise.all(
      chosen.map(async (algorithm) => ({
        algorithm,
        token: `${algorithm}-${await digestBase64(algorithm, bytes)}`,
      })),
    );
    return ok({
      hashes,
      integrity: hashes.map((h) => h.token).join(" "),
      byteLength: bytes.length,
    });
  } catch (e) {
    return err(messageOf(e, "Hashing failed."));
  }
}

/** Encodes text as UTF-8, rejecting lone surrogates TextEncoder would silently replace. */
export function textToBytes(text: string): ToolResult<Uint8Array> {
  const surrogate = loneSurrogateIndex(text);
  if (surrogate !== -1) {
    return err(
      `Input contains an unpaired surrogate character at position ${surrogate + 1}, which cannot be represented as UTF-8.`,
    );
  }
  return ok(new TextEncoder().encode(text));
}

/** Computes integrity tokens for the UTF-8 bytes of pasted text. */
export async function integrityForText(
  text: string,
  algorithms: readonly SriAlgorithm[] = ["sha384"],
): Promise<ToolResult<IntegrityResult>> {
  const bytes = textToBytes(text);
  if (!bytes.ok) return bytes;
  return integrityForBytes(bytes.value, algorithms);
}

export type IntegrityToken = {
  raw: string;
  algorithm: SriAlgorithm | null;
  digest: string;
  /** Why a browser would ignore or never match this token; null when it is well formed. */
  problem: string | null;
};

export type ParsedIntegrity = {
  tokens: IntegrityToken[];
  /** The strongest algorithm among recognised tokens: the only one a browser checks. */
  strongest: SriAlgorithm | null;
};

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Parses an integrity attribute the way the SRI spec's "parse metadata" step
 * does: tokens are split on whitespace, `?options` suffixes are dropped, and
 * tokens with an unrecognised algorithm are ignored rather than rejected. The
 * attribute name and surrounding quotes are accepted, so a pasted
 * `integrity="sha384-…"` works too.
 */
export function parseIntegrity(input: string): ParsedIntegrity {
  const value = input
    .trim()
    .replace(/^integrity\s*=\s*/i, "")
    .replace(/^(["'])([\s\S]*)\1$/, "$2");

  const tokens: IntegrityToken[] = value
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const withoutOptions = raw.split("?", 1)[0];
      const dash = withoutOptions.indexOf("-");
      const name = (dash === -1 ? withoutOptions : withoutOptions.slice(0, dash)).toLowerCase();
      const digest = dash === -1 ? "" : withoutOptions.slice(dash + 1);

      if (!isSriAlgorithm(name)) {
        // "sha-384-…" splits at its first hyphen into "sha", so look at the raw token.
        const hyphenated = /^sha-(256|384|512)-/i.exec(withoutOptions);
        const hint = hyphenated
          ? ` Write the algorithm without the hyphen, as sha${hyphenated[1]}.`
          : /^(md5|sha1|sha)$/.test(name)
            ? " SRI only accepts sha256, sha384 and sha512."
            : "";
        return {
          raw,
          algorithm: null,
          digest,
          problem: `Unrecognised algorithm "${hyphenated ? `sha-${hyphenated[1]}` : name}", so browsers ignore this token.${hint}`,
        };
      }

      let problem: string | null = null;
      if (!digest) {
        problem = "No digest after the algorithm name.";
      } else if (/[-_]/.test(digest)) {
        problem = "The digest uses base64url characters (- or _), but SRI digests are written in standard base64 (+ and /).";
      } else if (!BASE64.test(digest)) {
        problem = "The digest is not valid base64.";
      } else if (digest.length !== DIGEST_LENGTH[name]) {
        problem = `A ${name} digest is ${DIGEST_LENGTH[name]} base64 characters, but this one is ${digest.length}, so it can never match.`;
      }
      return { raw, algorithm: name, digest, problem };
    });

  let strongest: SriAlgorithm | null = null;
  for (const token of tokens) {
    if (token.algorithm && (strongest === null || STRENGTH[token.algorithm] > STRENGTH[strongest])) {
      strongest = token.algorithm;
    }
  }
  return { tokens, strongest };
}

export type IntegrityCheck =
  /** No recognised token: browsers load the resource without any check. */
  | { status: "unchecked"; parsed: ParsedIntegrity }
  | { status: "match"; parsed: ParsedIntegrity; algorithm: SriAlgorithm; token: string }
  | { status: "mismatch"; parsed: ParsedIntegrity; algorithm: SriAlgorithm; expected: string };

/**
 * Checks content against an integrity attribute with the browser's rules:
 * only tokens using the strongest recognised algorithm count, and the
 * resource loads if any one of them matches. Weaker tokens are never
 * consulted, even if they would have matched.
 */
export async function checkIntegrity(bytes: Uint8Array, attribute: string): Promise<ToolResult<IntegrityCheck>> {
  const parsed = parseIntegrity(attribute);
  const { strongest } = parsed;
  if (!strongest) return ok({ status: "unchecked", parsed });

  try {
    const actual = await digestBase64(strongest, bytes);
    const expected = `${strongest}-${actual}`;
    const hit = parsed.tokens.find((t) => t.algorithm === strongest && t.digest === actual);
    if (hit) return ok({ status: "match", parsed, algorithm: strongest, token: hit.raw });
    return ok({ status: "mismatch", parsed, algorithm: strongest, expected });
  } catch (e) {
    return err(messageOf(e, "Hashing failed."));
  }
}

export type TagKind = "script" | "stylesheet";

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Builds a `<script>` or stylesheet `<link>` with the integrity attribute.
 * `crossorigin="anonymous"` is always included: a cross-origin resource
 * fetched without CORS is opaque, and the browser blocks it rather than
 * checking it.
 */
export function buildTag(kind: TagKind, url: string, integrity: string): string {
  const src = escapeAttribute(url.trim() || (kind === "script" ? "https://cdn.example.com/library.js" : "https://cdn.example.com/styles.css"));
  const attrs = `integrity="${escapeAttribute(integrity)}" crossorigin="anonymous"`;
  return kind === "script"
    ? `<script src="${src}" ${attrs}></script>`
    : `<link rel="stylesheet" href="${src}" ${attrs}>`;
}
