import { err, ok, type ToolResult } from "./result";

/**
 * `essential` escapes only the five characters that can change how markup is
 * parsed, which is all that text or an attribute value needs. `non-ascii` also
 * escapes every character outside ASCII, for pipelines that cannot be trusted
 * to keep UTF-8 intact (old email templates, Latin-1 databases, source files
 * with an unknown encoding).
 */
export type EncodeScope = "essential" | "non-ascii";

/** How a non-ASCII character is written when `scope` is `non-ascii`. */
export type EntityFormat = "named" | "decimal" | "hex";

export type EncodeOptions = {
  scope?: EncodeScope;
  /** `named` falls back to hex for characters that have no named entity. */
  format?: EntityFormat;
};

export type DecodeResult = {
  text: string;
  /** Entities that were left as-is or replaced, one line each, in input order. */
  warnings: string[];
};

/**
 * The named character references of HTML 4.01 (Latin-1, symbols and Greek,
 * and the special set), plus `apos`, with the values HTML5 gives them (only
 * `lang` and `rang` changed). HTML5 defines over 2,000 names; this subset
 * covers what real documents use. Anything else is reported, not guessed.
 */
const LATIN1_NAMES =
  "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr " +
  "deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest " +
  "Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml " +
  "ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig " +
  "agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml " +
  "eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml";

/** Name → code point for everything outside the contiguous Latin-1 block. */
const OTHER_ENTITIES: Record<string, number> = {
  quot: 0x22, amp: 0x26, apos: 0x27, lt: 0x3c, gt: 0x3e,
  OElig: 0x152, oelig: 0x153, Scaron: 0x160, scaron: 0x161, Yuml: 0x178, fnof: 0x192,
  circ: 0x2c6, tilde: 0x2dc,
  Alpha: 0x391, Beta: 0x392, Gamma: 0x393, Delta: 0x394, Epsilon: 0x395, Zeta: 0x396,
  Eta: 0x397, Theta: 0x398, Iota: 0x399, Kappa: 0x39a, Lambda: 0x39b, Mu: 0x39c, Nu: 0x39d,
  Xi: 0x39e, Omicron: 0x39f, Pi: 0x3a0, Rho: 0x3a1, Sigma: 0x3a3, Tau: 0x3a4, Upsilon: 0x3a5,
  Phi: 0x3a6, Chi: 0x3a7, Psi: 0x3a8, Omega: 0x3a9,
  alpha: 0x3b1, beta: 0x3b2, gamma: 0x3b3, delta: 0x3b4, epsilon: 0x3b5, zeta: 0x3b6,
  eta: 0x3b7, theta: 0x3b8, iota: 0x3b9, kappa: 0x3ba, lambda: 0x3bb, mu: 0x3bc, nu: 0x3bd,
  xi: 0x3be, omicron: 0x3bf, pi: 0x3c0, rho: 0x3c1, sigmaf: 0x3c2, sigma: 0x3c3, tau: 0x3c4,
  upsilon: 0x3c5, phi: 0x3c6, chi: 0x3c7, psi: 0x3c8, omega: 0x3c9,
  thetasym: 0x3d1, upsih: 0x3d2, piv: 0x3d6,
  ensp: 0x2002, emsp: 0x2003, thinsp: 0x2009, zwnj: 0x200c, zwj: 0x200d, lrm: 0x200e, rlm: 0x200f,
  ndash: 0x2013, mdash: 0x2014, lsquo: 0x2018, rsquo: 0x2019, sbquo: 0x201a,
  ldquo: 0x201c, rdquo: 0x201d, bdquo: 0x201e, dagger: 0x2020, Dagger: 0x2021, bull: 0x2022,
  hellip: 0x2026, permil: 0x2030, prime: 0x2032, Prime: 0x2033, lsaquo: 0x2039, rsaquo: 0x203a,
  oline: 0x203e, frasl: 0x2044, euro: 0x20ac,
  image: 0x2111, weierp: 0x2118, real: 0x211c, trade: 0x2122, alefsym: 0x2135,
  larr: 0x2190, uarr: 0x2191, rarr: 0x2192, darr: 0x2193, harr: 0x2194, crarr: 0x21b5,
  lArr: 0x21d0, uArr: 0x21d1, rArr: 0x21d2, dArr: 0x21d3, hArr: 0x21d4,
  forall: 0x2200, part: 0x2202, exist: 0x2203, empty: 0x2205, nabla: 0x2207, isin: 0x2208,
  notin: 0x2209, ni: 0x220b, prod: 0x220f, sum: 0x2211, minus: 0x2212, lowast: 0x2217,
  radic: 0x221a, prop: 0x221d, infin: 0x221e, ang: 0x2220, and: 0x2227, or: 0x2228,
  cap: 0x2229, cup: 0x222a, int: 0x222b, there4: 0x2234, sim: 0x223c, cong: 0x2245,
  asymp: 0x2248, ne: 0x2260, equiv: 0x2261, le: 0x2264, ge: 0x2265, sub: 0x2282, sup: 0x2283,
  nsub: 0x2284, sube: 0x2286, supe: 0x2287, oplus: 0x2295, otimes: 0x2297, perp: 0x22a5,
  sdot: 0x22c5, lceil: 0x2308, rceil: 0x2309, lfloor: 0x230a, rfloor: 0x230b,
  lang: 0x27e8, rang: 0x27e9, loz: 0x25ca, spades: 0x2660, clubs: 0x2663, hearts: 0x2665,
  diams: 0x2666,
};

export const NAMED_ENTITIES: ReadonlyMap<string, number> = new Map([
  ...LATIN1_NAMES.split(" ").map((name, i): [string, number] => [name, 0xa0 + i]),
  ...Object.entries(OTHER_ENTITIES),
]);

/** Reverse lookup for encoding; `'` is handled by ESSENTIAL, so `apos` is skipped. */
const NAME_FOR_CODE_POINT: ReadonlyMap<number, string> = new Map(
  [...NAMED_ENTITIES].filter(([name]) => name !== "apos").map(([name, cp]) => [cp, name]),
);

/** `'` gets the numeric form: `&apos;` is not an HTML 4 entity and old parsers miss it. */
const ESSENTIAL: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function encodeHtml(input: string, options: EncodeOptions = {}): ToolResult<string> {
  const { scope = "essential", format = "named" } = options;
  let out = "";

  // for…of walks code points, so an emoji becomes one reference, not two surrogates.
  for (const char of input) {
    const cp = char.codePointAt(0)!;
    if (cp >= 0xd800 && cp <= 0xdfff) {
      return err(
        "Input contains an unpaired surrogate character, which has no valid HTML representation.",
      );
    }
    const essential = ESSENTIAL[char];
    if (essential) {
      out += essential;
    } else if (scope === "non-ascii" && cp > 0x7e) {
      out += reference(cp, format);
    } else {
      out += char;
    }
  }
  return ok(out);
}

function reference(cp: number, format: EntityFormat): string {
  if (format === "named") {
    const name = NAME_FOR_CODE_POINT.get(cp);
    if (name) return `&${name};`;
  }
  return format === "decimal" ? `&#${cp};` : `&#x${cp.toString(16).toUpperCase()};`;
}

/**
 * Code points 0x80–0x9F in a numeric reference are almost always Windows-1252
 * bytes mislabelled as Latin-1, and HTML parsers remap them. Unassigned slots
 * (0x81, 0x8D, 0x8F, 0x90, 0x9D) are kept as-is, as the HTML spec does.
 */
const WINDOWS_1252: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020,
  0x87: 0x2021, 0x88: 0x2c6, 0x89: 0x2030, 0x8a: 0x160, 0x8b: 0x2039, 0x8c: 0x152,
  0x8e: 0x17d, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022,
  0x96: 0x2013, 0x97: 0x2014, 0x98: 0x2dc, 0x99: 0x2122, 0x9a: 0x161, 0x9b: 0x203a,
  0x9c: 0x153, 0x9e: 0x17e, 0x9f: 0x178,
};

/** A run of decimal digits is capped so `&#99999999999;` cannot lose precision. */
const REFERENCE = /&(?:#(\d{1,8})|#[xX]([0-9A-Fa-f]{1,8})|([A-Za-z][A-Za-z0-9]{0,31}));/g;

export function decodeHtml(input: string): DecodeResult {
  const warnings: string[] = [];

  const text = input.replace(REFERENCE, (match, dec?: string, hex?: string, name?: string, offset?: number) => {
    const position = (offset ?? 0) + 1;

    if (name !== undefined) {
      const cp = NAMED_ENTITIES.get(name);
      if (cp !== undefined) return String.fromCodePoint(cp);
      warnings.push(`Unknown entity ${match} at position ${position} was left as-is.`);
      return match;
    }

    const cp = dec !== undefined ? Number.parseInt(dec, 10) : Number.parseInt(hex!, 16);
    if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) {
      warnings.push(
        `${match} at position ${position} is not a valid character and was replaced with U+FFFD.`,
      );
      return "�";
    }
    const remapped = WINDOWS_1252[cp];
    if (remapped !== undefined) {
      warnings.push(
        `${match} at position ${position} is a Windows-1252 control code; decoded as "${String.fromCodePoint(remapped)}" as browsers do.`,
      );
      return String.fromCodePoint(remapped);
    }
    return String.fromCodePoint(cp);
  });

  return { text, warnings };
}
