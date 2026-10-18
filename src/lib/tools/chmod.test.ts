import { describe, expect, it } from "vitest";
import {
  describePermissions,
  emptyPermissions,
  fileTypeOf,
  fromMode,
  parseOctal,
  parsePermissions,
  parseSymbolic,
  toMode,
  toOctal,
  toSymbolic,
  toSymbolicMode,
  type Permissions,
} from "./chmod";
import type { ToolResult } from "./result";

function value<T>(result: ToolResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

function perms(input: string): Permissions {
  const p = value(parsePermissions(input));
  if (!p) throw new Error("expected permissions, got null");
  return p;
}

describe("toMode and fromMode", () => {
  it("round-trips every mode from 0000 to 7777", () => {
    for (let mode = 0; mode <= 0o7777; mode++) {
      expect(toMode(fromMode(mode))).toBe(mode);
    }
  });

  it("maps bits to classes", () => {
    expect(fromMode(0o640)).toEqual({
      user: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      other: { read: false, write: false, execute: false },
      special: { setuid: false, setgid: false, sticky: false },
    });
    expect(toMode(emptyPermissions())).toBe(0);
  });
});

describe("parseOctal", () => {
  it("parses three-digit modes", () => {
    expect(toMode(value(parseOctal("755"))!)).toBe(0o755);
    expect(toMode(value(parseOctal(" 644 "))!)).toBe(0o644);
  });

  it("parses four-digit modes with special bits", () => {
    const p = value(parseOctal("4755"))!;
    expect(p.special).toEqual({ setuid: true, setgid: false, sticky: false });
    expect(toMode(value(parseOctal("1777"))!)).toBe(0o1777);
  });

  it("accepts 0 and 0o prefixes from code", () => {
    expect(toMode(value(parseOctal("0755"))!)).toBe(0o755);
    expect(toMode(value(parseOctal("0o755"))!)).toBe(0o755);
    expect(toMode(value(parseOctal("0O644"))!)).toBe(0o644);
    expect(toMode(value(parseOctal("02775"))!)).toBe(0o2775);
  });

  it("names the first non-octal digit and its position", () => {
    expect(error(parseOctal("758"))).toBe('"8" at position 3 is not an octal digit (0–7).');
    expect(error(parseOctal("0o79"))).toMatch(/"9" at position 4/);
  });

  it("rejects the wrong number of digits", () => {
    expect(error(parseOctal("75"))).toMatch(/3 or 4 digits.*got 2/);
    expect(error(parseOctal("47555"))).toMatch(/got 5/);
  });

  it("returns null for blank input", () => {
    expect(parseOctal("  ")).toEqual({ ok: true, value: null });
  });
});

describe("parseSymbolic", () => {
  it("parses nine-character strings", () => {
    expect(toMode(value(parseSymbolic("rwxr-xr-x"))!)).toBe(0o755);
    expect(toMode(value(parseSymbolic("rw-r-----"))!)).toBe(0o640);
    expect(toMode(value(parseSymbolic("---------"))!)).toBe(0);
  });

  it("accepts the file-type prefix and ACL markers from ls -l", () => {
    expect(toMode(value(parseSymbolic("-rw-r--r--"))!)).toBe(0o644);
    expect(toMode(value(parseSymbolic("drwxr-xr-x"))!)).toBe(0o755);
    expect(toMode(value(parseSymbolic("lrwxrwxrwx"))!)).toBe(0o777);
    expect(toMode(value(parseSymbolic("drwxr-xr-x+"))!)).toBe(0o755);
    expect(toMode(value(parseSymbolic("-rw-r--r--@"))!)).toBe(0o644);
  });

  it("reads lowercase special bits as set with execute", () => {
    expect(toMode(value(parseSymbolic("-rwsr-xr-x"))!)).toBe(0o4755);
    expect(toMode(value(parseSymbolic("drwxrwsr-x"))!)).toBe(0o2775);
    expect(toMode(value(parseSymbolic("drwxrwxrwt"))!)).toBe(0o1777);
  });

  it("reads uppercase special bits as set without execute", () => {
    expect(toMode(value(parseSymbolic("-rwSr--r--"))!)).toBe(0o4644);
    expect(toMode(value(parseSymbolic("drwxrwxrwT"))!)).toBe(0o1776);
  });

  it("rejects a special character in the wrong class", () => {
    expect(error(parseSymbolic("rwtr-xr-x"))).toBe(
      'Expected "x", "-", "s" or "S" at position 3, got "t".',
    );
    expect(error(parseSymbolic("rwxr-xr-s"))).toMatch(/"t" or "T" at position 9/);
  });

  it("reports positions counting the file-type character", () => {
    expect(error(parseSymbolic("-rwxr-xw-x"))).toBe('Expected "r" or "-" at position 8, got "w".');
  });

  it("rejects the wrong length", () => {
    expect(error(parseSymbolic("rwxr-x"))).toMatch(/9 characters.*got 6/);
  });
});

describe("parsePermissions", () => {
  it("detects octal and symbolic input", () => {
    expect(toMode(perms("750"))).toBe(0o750);
    expect(toMode(perms("rwxr-x---"))).toBe(0o750);
  });

  it("reports a typo after a leading digit as a bad octal digit", () => {
    expect(error(parsePermissions("75x"))).toBe('"x" at position 3 is not an octal digit (0–7).');
  });

  it("returns null for blank input", () => {
    expect(parsePermissions("")).toEqual({ ok: true, value: null });
  });
});

describe("formatting", () => {
  it("prints three octal digits unless a special bit is set", () => {
    expect(toOctal(fromMode(0o644))).toBe("644");
    expect(toOctal(fromMode(0o7))).toBe("007");
    expect(toOctal(fromMode(0))).toBe("000");
    expect(toOctal(fromMode(0o4755))).toBe("4755");
    expect(toOctal(fromMode(0o1000))).toBe("1000");
  });

  it("prints ls -l symbols, including special bits", () => {
    expect(toSymbolic(fromMode(0o755))).toBe("rwxr-xr-x");
    expect(toSymbolic(fromMode(0o4755))).toBe("rwsr-xr-x");
    expect(toSymbolic(fromMode(0o4644))).toBe("rwSr--r--");
    expect(toSymbolic(fromMode(0o2770))).toBe("rwxrws---");
    expect(toSymbolic(fromMode(0o1777))).toBe("rwxrwxrwt");
    expect(toSymbolic(fromMode(0o1776))).toBe("rwxrwxrwT");
  });

  it("prefixes the file-type character when given", () => {
    expect(toSymbolic(fromMode(0o755), "d")).toBe("drwxr-xr-x");
    expect(fileTypeOf(" drwxr-xr-x+ ")).toBe("d");
    expect(fileTypeOf("-rw-r--r--")).toBe("-");
    expect(fileTypeOf("rwxr-xr-x")).toBe("");
  });

  it("round-trips every mode through the symbolic form", () => {
    for (let mode = 0; mode <= 0o7777; mode++) {
      expect(toMode(value(parseSymbolic(toSymbolic(fromMode(mode))))!)).toBe(mode);
    }
  });

  it("prints a symbolic chmod argument", () => {
    expect(toSymbolicMode(fromMode(0o755))).toBe("u=rwx,g=rx,o=rx");
    expect(toSymbolicMode(fromMode(0o600))).toBe("u=rw,g=,o=");
    expect(toSymbolicMode(fromMode(0o4755))).toBe("u=rwxs,g=rx,o=rx");
    expect(toSymbolicMode(fromMode(0o3775))).toBe("u=rwx,g=rwxs,o=rxt");
  });

  it("describes each class in plain English", () => {
    expect(describePermissions(fromMode(0o640))).toEqual([
      "Owner: read, write",
      "Group: read",
      "Others: no access",
    ]);
    expect(describePermissions(fromMode(0o1777))).toHaveLength(4);
  });
});
