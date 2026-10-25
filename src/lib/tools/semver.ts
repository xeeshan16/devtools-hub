import { err, ok, type ToolResult } from "./result";

export type SemVer = {
  major: number;
  minor: number;
  patch: number;
  /** Dot-separated pre-release identifiers, e.g. ["beta", "2"]. */
  prerelease: string[];
  /** Build metadata identifiers. Kept for display, ignored for precedence. */
  build: string[];
};

export type Operator = "<" | "<=" | ">" | ">=" | "=";

export type Comparator = { op: Operator; version: SemVer };

/**
 * A range is a list of alternatives joined by `||`; each alternative is a list
 * of comparators that must all hold. An empty alternative matches any release.
 */
export type Range = Comparator[][];

const NUMERIC = "0|[1-9]\\d*";
const PRE_IDENT = `(?:${NUMERIC}|\\d*[a-zA-Z-][0-9a-zA-Z-]*)`;
const BUILD_IDENT = "[0-9a-zA-Z-]+";
const PRERELEASE = `(?:-(${PRE_IDENT}(?:\\.${PRE_IDENT})*))`;
const BUILD = `(?:\\+(${BUILD_IDENT}(?:\\.${BUILD_IDENT})*))`;

/** Strict semver 2.0.0, plus the leading `v` or `=` that npm also accepts. */
const VERSION_RE = new RegExp(`^[=v]?(${NUMERIC})\\.(${NUMERIC})\\.(${NUMERIC})${PRERELEASE}?${BUILD}?$`);

/** A possibly partial version inside a range: 1, 1.2, 1.x, 1.2.*, 1.2.3-rc.1. */
const XR = `${NUMERIC}|[xX*]`;
const PARTIAL_RE = new RegExp(
  `^v?(${XR})(?:\\.(${XR})(?:\\.(${XR})${PRERELEASE}?${BUILD}?)?)?$`,
);

function toNumber(part: string, name: string): ToolResult<number> {
  const n = Number(part);
  if (!Number.isSafeInteger(n)) return err(`The ${name} version ${part} is too large`);
  return ok(n);
}

export function parseVersion(input: string): ToolResult<SemVer> {
  const text = input.trim();
  if (!text) return err("Enter a version, e.g. 1.4.2");
  const m = VERSION_RE.exec(text);
  if (!m) {
    return err(
      `"${text}" is not a valid semantic version. Expected MAJOR.MINOR.PATCH with an optional -prerelease and +build, e.g. 1.4.2 or 2.0.0-rc.1`,
    );
  }
  const parts: number[] = [];
  for (const [i, name] of (["major", "minor", "patch"] as const).entries()) {
    const n = toNumber(m[i + 1], name);
    if (!n.ok) return n;
    parts.push(n.value);
  }
  return ok({
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
    prerelease: m[4] ? m[4].split(".") : [],
    build: m[5] ? m[5].split(".") : [],
  });
}

export function formatVersion(v: SemVer, withBuild = false): string {
  let out = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease.length) out += `-${v.prerelease.join(".")}`;
  if (withBuild && v.build.length) out += `+${v.build.join(".")}`;
  return out;
}

function compareNumbers(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

function compareIdentifiers(a: string, b: string): number {
  const aNum = /^\d+$/.test(a);
  const bNum = /^\d+$/.test(b);
  // Pre-release numbers can exceed 2^53, so compare them as BigInt.
  if (aNum && bNum) {
    const x = BigInt(a);
    const y = BigInt(b);
    return x === y ? 0 : x < y ? -1 : 1;
  }
  if (aNum) return -1;
  if (bNum) return 1;
  return a === b ? 0 : a < b ? -1 : 1;
}

/** Semver precedence (spec §11): build metadata is ignored. */
export function compareVersions(a: SemVer, b: SemVer): number {
  const main =
    compareNumbers(a.major, b.major) || compareNumbers(a.minor, b.minor) || compareNumbers(a.patch, b.patch);
  if (main) return main;

  // A release outranks any of its pre-releases.
  if (!a.prerelease.length && !b.prerelease.length) return 0;
  if (!a.prerelease.length) return 1;
  if (!b.prerelease.length) return -1;

  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i++) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    const c = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (c) return c;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Ranges, following npm's desugaring rules (node-semver).

type Partial = { major: number | null; minor: number | null; patch: number | null; prerelease: string[] };

function v(major: number, minor: number, patch: number, prerelease: string[] = []): SemVer {
  return { major, minor, patch, prerelease, build: [] };
}

function c(op: Operator, version: SemVer): Comparator {
  return { op, version };
}

/** `<x.y.z-0` is the lowest possible version of x.y.z, so it excludes its pre-releases. */
function below(major: number, minor: number, patch: number): Comparator {
  return c("<", v(major, minor, patch, ["0"]));
}

const NOTHING: Comparator[] = [below(0, 0, 0)];

function parsePartial(text: string): ToolResult<Partial> {
  const m = PARTIAL_RE.exec(text);
  if (!m) return err(`"${text}" is not a valid version or range`);
  const nums: (number | null)[] = [];
  let wild = false;
  for (const [i, name] of (["major", "minor", "patch"] as const).entries()) {
    const part = m[i + 1];
    // A number after a wildcard (1.x.3) has no sensible meaning, so npm rejects it.
    if (wild && part !== undefined && !/^[xX*]$/.test(part)) {
      return err(`"${text}" has a number after a wildcard. Write 1.x rather than 1.x.3`);
    }
    if (wild || part === undefined || /^[xX*]$/.test(part)) {
      wild = true;
      nums.push(null);
      continue;
    }
    const n = toNumber(part, name);
    if (!n.ok) return n;
    nums.push(n.value);
  }
  return ok({
    major: nums[0],
    minor: nums[1],
    patch: nums[2],
    prerelease: !wild && m[4] ? m[4].split(".") : [],
  });
}

function full(p: Partial): SemVer {
  return v(p.major ?? 0, p.minor ?? 0, p.patch ?? 0, p.prerelease);
}

function primitive(op: Operator, p: Partial): Comparator[] {
  const { major: M, minor: m, patch } = p;
  if (M !== null && m !== null && patch !== null) return [c(op, full(p))];
  switch (op) {
    case "=":
      if (M === null) return [];
      if (m === null) return [c(">=", v(M, 0, 0)), below(M + 1, 0, 0)];
      return [c(">=", v(M, m, 0)), below(M, m + 1, 0)];
    case ">=":
      return M === null ? [] : [c(">=", v(M, m ?? 0, 0))];
    case ">":
      if (M === null) return NOTHING;
      return [c(">=", m === null ? v(M + 1, 0, 0) : v(M, m + 1, 0))];
    case "<":
      return M === null ? NOTHING : [below(M, m ?? 0, 0)];
    case "<=":
      if (M === null) return [];
      return [m === null ? below(M + 1, 0, 0) : below(M, m + 1, 0)];
  }
}

function tilde(p: Partial): Comparator[] {
  const { major: M, minor: m } = p;
  if (M === null) return [];
  if (m === null) return [c(">=", v(M, 0, 0)), below(M + 1, 0, 0)];
  return [c(">=", full(p)), below(M, m + 1, 0)];
}

function caret(p: Partial): Comparator[] {
  const { major: M, minor: m, patch } = p;
  if (M === null) return [];
  if (m === null) return [c(">=", v(M, 0, 0)), below(M + 1, 0, 0)];
  let upper: Comparator;
  if (M > 0) upper = below(M + 1, 0, 0);
  else if (m > 0 || patch === null) upper = below(0, m + 1, 0);
  else upper = below(0, 0, patch + 1);
  return [c(">=", full(p)), upper];
}

function hyphen(from: Partial, to: Partial): Comparator[] {
  const out: Comparator[] = [];
  if (from.major !== null) out.push(c(">=", full(from)));
  if (to.major !== null) {
    if (to.minor === null) out.push(below(to.major + 1, 0, 0));
    else if (to.patch === null) out.push(below(to.major, to.minor + 1, 0));
    else out.push(c("<=", full(to)));
  }
  return out;
}

const OPERATOR_RE = /^(<=|>=|<|>|=|~>|~|\^)?(.*)$/;

function parseSet(text: string): ToolResult<Comparator[]> {
  // "> 1.2.3" and ">1.2.3" mean the same thing.
  const set = text.trim().replace(/(<=|>=|<|>|=|~>?|\^)\s+/g, "$1");
  if (!set) return ok([]);

  const range = /^(\S+)\s+-\s+(\S+)$/.exec(set);
  if (range) {
    const from = parsePartial(range[1]);
    if (!from.ok) return from;
    const to = parsePartial(range[2]);
    if (!to.ok) return to;
    return ok(hyphen(from.value, to.value));
  }

  const out: Comparator[] = [];
  for (const token of set.split(/\s+/)) {
    const [, op = "", rest] = OPERATOR_RE.exec(token)!;
    if (!rest) return err(`"${token}" is missing a version after the operator`);
    const partial = parsePartial(rest);
    if (!partial.ok) return partial;
    if (op === "^") out.push(...caret(partial.value));
    else if (op === "~" || op === "~>") out.push(...tilde(partial.value));
    else out.push(...primitive((op || "=") as Operator, partial.value));
  }
  return ok(out);
}

/** Parses an npm-style range: ^1.2.3, ~1.2, 1.x, >=1.0.0 <2, 1.2 - 1.4, a || b. */
export function parseRange(input: string): ToolResult<Range> {
  const text = input.trim();
  const sets: Range = [];
  for (const part of (text || "*").split("||")) {
    const set = parseSet(part);
    if (!set.ok) return set;
    sets.push(set.value);
  }
  return ok(sets);
}

/** The range written out as plain comparators, the way npm evaluates it. */
export function formatRange(range: Range): string {
  return range
    .map((set) => (set.length ? set.map((x) => `${x.op === "=" ? "" : x.op}${formatVersion(x.version)}`).join(" ") : "*"))
    .join(" || ");
}

function test(version: SemVer, comparator: Comparator): boolean {
  const cmp = compareVersions(version, comparator.version);
  switch (comparator.op) {
    case "<":
      return cmp < 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case ">=":
      return cmp >= 0;
    case "=":
      return cmp === 0;
  }
}

function testSet(version: SemVer, set: Comparator[]): boolean {
  if (!set.every((comparator) => test(version, comparator))) return false;
  if (!version.prerelease.length) return true;
  // npm only lets a pre-release through when the range itself names a
  // pre-release of the same major.minor.patch, so ^1.2.3 never picks 1.3.0-beta.
  return set.some(
    ({ version: cv }) =>
      cv.prerelease.length > 0 &&
      cv.major === version.major &&
      cv.minor === version.minor &&
      cv.patch === version.patch,
  );
}

export function satisfies(version: SemVer, range: Range): boolean {
  return range.some((set) => testSet(version, set));
}

export type VersionCheck = {
  /** The version as written, normalized (leading v dropped). */
  text: string;
  version: SemVer;
  satisfies: boolean;
};

export type RangeReport = {
  /** The range expanded into plain comparators. */
  expanded: string;
  /** Every valid version, newest first, without exact duplicates. */
  versions: VersionCheck[];
  /** Entries that are not valid semantic versions. */
  invalid: string[];
  matches: number;
  /** Highest version that satisfies the range, as `npm install` would pick. */
  highest: string | null;
};

/**
 * Splits a pasted list into version strings. Accepts one per line, but also
 * a JSON array or the output of `npm view <pkg> versions`, so brackets,
 * quotes and commas are treated as separators.
 */
export function splitVersions(input: string): string[] {
  return input
    .split(/[\s,[\]'"`]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function checkRange(rangeInput: string, versionsInput: string): ToolResult<RangeReport> {
  const range = parseRange(rangeInput);
  if (!range.ok) return range;

  const seen = new Set<string>();
  const versions: VersionCheck[] = [];
  const invalid: string[] = [];
  for (const entry of splitVersions(versionsInput)) {
    const parsed = parseVersion(entry);
    if (!parsed.ok) {
      if (!invalid.includes(entry)) invalid.push(entry);
      continue;
    }
    const text = formatVersion(parsed.value, true);
    if (seen.has(text)) continue;
    seen.add(text);
    versions.push({ text, version: parsed.value, satisfies: satisfies(parsed.value, range.value) });
  }

  versions.sort((a, b) => compareVersions(b.version, a.version) || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
  const matching = versions.filter((x) => x.satisfies);

  return ok({
    expanded: formatRange(range.value),
    versions,
    invalid,
    matches: matching.length,
    highest: matching[0]?.text ?? null,
  });
}
