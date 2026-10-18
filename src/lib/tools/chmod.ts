import { err, ok, type ToolResult } from "./result";

export type PermissionClass = "user" | "group" | "other";

export type ClassBits = { read: boolean; write: boolean; execute: boolean };

export type SpecialBits = { setuid: boolean; setgid: boolean; sticky: boolean };

export type Permissions = Record<PermissionClass, ClassBits> & { special: SpecialBits };

export const PERMISSION_CLASSES: readonly { key: PermissionClass; name: string; letter: string }[] = [
  { key: "user", name: "Owner", letter: "u" },
  { key: "group", name: "Group", letter: "g" },
  { key: "other", name: "Others", letter: "o" },
];

/** `ls -l` file-type characters that may precede the nine permission characters. */
const FILE_TYPES = "-dlcbps";

export function emptyPermissions(): Permissions {
  const none = () => ({ read: false, write: false, execute: false });
  return {
    user: none(),
    group: none(),
    other: none(),
    special: { setuid: false, setgid: false, sticky: false },
  };
}

/** The numeric mode, 0 to 0o7777. */
export function toMode(p: Permissions): number {
  const digit = (b: ClassBits) => (b.read ? 4 : 0) | (b.write ? 2 : 0) | (b.execute ? 1 : 0);
  const special =
    (p.special.setuid ? 4 : 0) | (p.special.setgid ? 2 : 0) | (p.special.sticky ? 1 : 0);
  return (special << 9) | (digit(p.user) << 6) | (digit(p.group) << 3) | digit(p.other);
}

export function fromMode(mode: number): Permissions {
  const bits = (d: number): ClassBits => ({
    read: (d & 4) !== 0,
    write: (d & 2) !== 0,
    execute: (d & 1) !== 0,
  });
  const special = (mode >> 9) & 7;
  return {
    user: bits((mode >> 6) & 7),
    group: bits((mode >> 3) & 7),
    other: bits(mode & 7),
    special: {
      setuid: (special & 4) !== 0,
      setgid: (special & 2) !== 0,
      sticky: (special & 1) !== 0,
    },
  };
}

/**
 * Parses an octal mode as passed to `chmod`: three digits (`755`), or four with
 * the special bits first (`4755`). A leading `0` or `0o` is accepted, so `0755`
 * and `0o755` from code read as 755. Blank input parses to `null`.
 */
export function parseOctal(input: string): ToolResult<Permissions | null> {
  const trimmed = input.trim();
  if (!trimmed) return ok(null);

  let digits = trimmed.toLowerCase().startsWith("0o") ? trimmed.slice(2) : trimmed;
  const offset = trimmed.length - digits.length;
  for (let i = 0; i < digits.length; i++) {
    if (!/[0-7]/.test(digits[i])) {
      return err(`"${digits[i]}" at position ${offset + i + 1} is not an octal digit (0–7).`);
    }
  }
  if (digits.length === 5 && digits[0] === "0") digits = digits.slice(1);
  if (digits.length < 3 || digits.length > 4) {
    return err(`An octal mode has 3 or 4 digits, such as 644 or 4755; got ${digits.length}.`);
  }
  return ok(fromMode(Number.parseInt(digits, 8)));
}

/**
 * Parses the permission string printed by `ls -l`: nine characters
 * (`rwxr-xr-x`), optionally preceded by a file-type character (`drwxr-xr-x`)
 * and followed by an ACL or extended-attribute marker (`+`, `@`, `.`).
 * Execute positions may hold `s`/`S` (setuid, setgid) or `t`/`T` (sticky),
 * lowercase when the execute bit is also set.
 */
export function parseSymbolic(input: string): ToolResult<Permissions | null> {
  const trimmed = input.trim();
  if (!trimmed) return ok(null);

  let body = trimmed;
  let offset = 0;
  if (body.length >= 10 && FILE_TYPES.includes(body[0])) {
    body = body.slice(1);
    offset = 1;
  }
  if (body.length === 10 && "+@.".includes(body[9])) body = body.slice(0, 9);
  if (body.length !== 9) {
    return err(`A permission string has 9 characters, such as rwxr-xr-x; got ${body.length}.`);
  }

  const p = emptyPermissions();
  const specialChars = { user: "s", group: "s", other: "t" } as const;
  const specialKey = { user: "setuid", group: "setgid", other: "sticky" } as const;

  for (const [index, { key }] of PERMISSION_CLASSES.entries()) {
    const start = index * 3;
    const [r, w, x] = body.slice(start, start + 3);
    const position = (k: number) => offset + start + k + 1;

    if (r !== "r" && r !== "-") return err(`Expected "r" or "-" at position ${position(0)}, got "${r}".`);
    if (w !== "w" && w !== "-") return err(`Expected "w" or "-" at position ${position(1)}, got "${w}".`);

    const special = specialChars[key];
    const allowed = ["x", "-", special, special.toUpperCase()];
    if (!allowed.includes(x)) {
      return err(
        `Expected "x", "-", "${special}" or "${special.toUpperCase()}" at position ${position(2)}, got "${x}".`,
      );
    }

    p[key] = { read: r === "r", write: w === "w", execute: x === "x" || x === special };
    p.special[specialKey[key]] = x.toLowerCase() === special;
  }
  return ok(p);
}

/** The `ls -l` file-type character at the start of `input`, or "" when there is none. */
export function fileTypeOf(input: string): string {
  const trimmed = input.trim();
  return trimmed.length >= 10 && FILE_TYPES.includes(trimmed[0]) ? trimmed[0] : "";
}

/** True when the input looks like an octal mode rather than `ls -l` symbols. */
export function isOctalInput(input: string): boolean {
  return /^\d/.test(input.trim());
}

/**
 * Accepts either form: input starting with a digit is read as an octal mode
 * (so a typo like `75x` is reported as a bad octal digit), anything else as
 * `ls -l` symbols.
 */
export function parsePermissions(input: string): ToolResult<Permissions | null> {
  const trimmed = input.trim();
  return isOctalInput(trimmed) ? parseOctal(trimmed) : parseSymbolic(trimmed);
}

/** Three digits, or four when any special bit is set. */
export function toOctal(p: Permissions): string {
  const mode = toMode(p);
  return mode > 0o777 ? mode.toString(8).padStart(4, "0") : mode.toString(8).padStart(3, "0");
}

/**
 * The nine characters `ls -l` prints after the file type. Pass `fileType`
 * (such as `-` or `d`) to get the full ten-character form.
 */
export function toSymbolic(p: Permissions, fileType = ""): string {
  const specialChars = { user: "s", group: "s", other: "t" } as const;
  const specialSet = { user: p.special.setuid, group: p.special.setgid, other: p.special.sticky };
  const body = PERMISSION_CLASSES.map(({ key }) => {
    const b = p[key];
    const special = specialChars[key];
    const x = specialSet[key] ? (b.execute ? special : special.toUpperCase()) : b.execute ? "x" : "-";
    return `${b.read ? "r" : "-"}${b.write ? "w" : "-"}${x}`;
  }).join("");
  return fileType + body;
}

/**
 * The equivalent symbolic `chmod` argument, such as `u=rwx,g=rx,o=rx`. Each
 * class is assigned with `=`, so applying it gives the same result as the
 * octal mode regardless of the file's current permissions.
 */
export function toSymbolicMode(p: Permissions): string {
  const specialSet = { user: p.special.setuid, group: p.special.setgid, other: p.special.sticky };
  const specialChars = { user: "s", group: "s", other: "t" } as const;
  return PERMISSION_CLASSES.map(({ key, letter }) => {
    const b = p[key];
    const perms =
      (b.read ? "r" : "") +
      (b.write ? "w" : "") +
      (b.execute ? "x" : "") +
      (specialSet[key] ? specialChars[key] : "");
    return `${letter}=${perms}`;
  }).join(",");
}

/** One line per class, e.g. "Owner: read, write, execute". */
export function describePermissions(p: Permissions): string[] {
  const lines = PERMISSION_CLASSES.map(({ key, name }) => {
    const b = p[key];
    const granted = [b.read && "read", b.write && "write", b.execute && "execute"].filter(Boolean);
    return `${name}: ${granted.length ? granted.join(", ") : "no access"}`;
  });
  if (p.special.setuid) lines.push("Setuid: runs with the owner's privileges");
  if (p.special.setgid) lines.push("Setgid: runs with the group's privileges; new files in a directory inherit its group");
  if (p.special.sticky) lines.push("Sticky: in a directory, only a file's owner can delete or rename it");
  return lines;
}
