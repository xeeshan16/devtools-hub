import { describe, expect, it } from "vitest";
import type { ToolResult } from "./result";
import {
  checkRange,
  compareVersions,
  formatRange,
  formatVersion,
  parseRange,
  parseVersion,
  satisfies,
  splitVersions,
  type Range,
  type SemVer,
} from "./semver";

function value<T>(result: ToolResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

const ver = (text: string): SemVer => value(parseVersion(text));
const range = (text: string): Range => value(parseRange(text));
const expand = (text: string) => formatRange(range(text));
const matches = (version: string, r: string) => satisfies(ver(version), range(r));

describe("parseVersion", () => {
  it("reads major, minor, patch, pre-release and build", () => {
    expect(ver("1.24.3-rc.1+build.42")).toEqual({
      major: 1,
      minor: 24,
      patch: 3,
      prerelease: ["rc", "1"],
      build: ["build", "42"],
    });
  });

  it("accepts the leading v or = that npm allows", () => {
    expect(formatVersion(ver("v2.0.0"))).toBe("2.0.0");
    expect(formatVersion(ver(" =3.1.4 "))).toBe("3.1.4");
  });

  it("rejects versions that are not semver 2.0.0", () => {
    for (const bad of ["1.2", "1.2.3.4", "01.2.3", "1.02.3", "1.2.3-01", "1.2.3-", "1.2.3+", "1.2.x", "latest"]) {
      expect(parseVersion(bad).ok, bad).toBe(false);
    }
    expect(error(parseVersion("1.2"))).toMatch(/not a valid semantic version/);
  });

  it("rejects numbers too large to compare exactly", () => {
    expect(error(parseVersion("9007199254740992.0.0"))).toMatch(/too large/);
  });

  it("keeps build metadata only when asked", () => {
    expect(formatVersion(ver("1.0.0-beta+exp.sha.5114f85"))).toBe("1.0.0-beta");
    expect(formatVersion(ver("1.0.0-beta+exp.sha.5114f85"), true)).toBe("1.0.0-beta+exp.sha.5114f85");
  });
});

describe("compareVersions", () => {
  it("follows the precedence example from the semver spec", () => {
    const ordered = [
      "1.0.0-alpha",
      "1.0.0-alpha.1",
      "1.0.0-alpha.beta",
      "1.0.0-beta",
      "1.0.0-beta.2",
      "1.0.0-beta.11",
      "1.0.0-rc.1",
      "1.0.0",
      "1.0.1",
      "1.10.0",
      "2.0.0",
    ];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(compareVersions(ver(ordered[i]), ver(ordered[i + 1])), `${ordered[i]} < ${ordered[i + 1]}`).toBe(-1);
      expect(compareVersions(ver(ordered[i + 1]), ver(ordered[i]))).toBe(1);
    }
  });

  it("ignores build metadata", () => {
    expect(compareVersions(ver("1.0.0+a"), ver("1.0.0+b"))).toBe(0);
  });

  it("compares long numeric pre-release identifiers exactly", () => {
    expect(compareVersions(ver("1.0.0-90071992547409910"), ver("1.0.0-90071992547409911"))).toBe(-1);
  });
});

describe("parseRange", () => {
  it("expands caret ranges, which allow changes left of the first non-zero part", () => {
    expect(expand("^1.2.3")).toBe(">=1.2.3 <2.0.0-0");
    expect(expand("^0.2.3")).toBe(">=0.2.3 <0.3.0-0");
    expect(expand("^0.0.3")).toBe(">=0.0.3 <0.0.4-0");
    expect(expand("^1.x")).toBe(">=1.0.0 <2.0.0-0");
    expect(expand("^0.0")).toBe(">=0.0.0 <0.1.0-0");
  });

  it("expands tilde ranges, which allow patch changes", () => {
    expect(expand("~1.2.3")).toBe(">=1.2.3 <1.3.0-0");
    expect(expand("~1.2")).toBe(">=1.2.0 <1.3.0-0");
    expect(expand("~1")).toBe(">=1.0.0 <2.0.0-0");
    expect(expand("~>1.2.3")).toBe(">=1.2.3 <1.3.0-0");
  });

  it("expands wildcards and partial versions", () => {
    expect(expand("1.x")).toBe(">=1.0.0 <2.0.0-0");
    expect(expand("1.2.*")).toBe(">=1.2.0 <1.3.0-0");
    expect(expand("1.2")).toBe(">=1.2.0 <1.3.0-0");
    expect(expand("*")).toBe("*");
    expect(expand("")).toBe("*");
  });

  it("expands partial versions after a comparison operator", () => {
    expect(expand(">1.2")).toBe(">=1.3.0");
    expect(expand(">=1.2")).toBe(">=1.2.0");
    expect(expand("<1.2")).toBe("<1.2.0-0");
    expect(expand("<=1.2")).toBe("<1.3.0-0");
    expect(expand("<*")).toBe("<0.0.0-0");
  });

  it("expands hyphen ranges, inclusive at both ends", () => {
    expect(expand("1.2.3 - 2.3.4")).toBe(">=1.2.3 <=2.3.4");
    expect(expand("1.2 - 2.3.4")).toBe(">=1.2.0 <=2.3.4");
    expect(expand("1.2.3 - 2.3")).toBe(">=1.2.3 <2.4.0-0");
    expect(expand("1.2.3 - 2")).toBe(">=1.2.3 <3.0.0-0");
  });

  it("joins alternatives with || and tolerates spaces after operators", () => {
    expect(expand("^1.0.0 || >= 2.5.0 < 3")).toBe(">=1.0.0 <2.0.0-0 || >=2.5.0 <3.0.0-0");
  });

  it("reports what it cannot read", () => {
    expect(error(parseRange("^1.2.q"))).toBe('"1.2.q" is not a valid version or range');
    expect(error(parseRange(">="))).toMatch(/missing a version/);
    expect(error(parseRange("1.x.3"))).toMatch(/number after a wildcard/);
    expect(error(parseRange("latest"))).toMatch(/not a valid version or range/);
  });
});

describe("satisfies", () => {
  it("applies caret and tilde ranges the way npm does", () => {
    expect(matches("1.9.9", "^1.2.3")).toBe(true);
    expect(matches("2.0.0", "^1.2.3")).toBe(false);
    expect(matches("0.2.9", "^0.2.3")).toBe(true);
    expect(matches("0.3.0", "^0.2.3")).toBe(false);
    expect(matches("1.2.9", "~1.2.3")).toBe(true);
    expect(matches("1.3.0", "~1.2.3")).toBe(false);
  });

  it("excludes pre-releases unless the range names one with the same version core", () => {
    expect(matches("1.3.0-beta", "^1.2.3")).toBe(false);
    expect(matches("2.0.0-rc.1", "^1.2.3")).toBe(false);
    expect(matches("1.0.0-beta", "*")).toBe(false);
    expect(matches("1.2.3-beta.4", "^1.2.3-beta.2")).toBe(true);
    expect(matches("1.2.3-beta.1", "^1.2.3-beta.2")).toBe(false);
    expect(matches("1.2.4-beta.4", "^1.2.3-beta.2")).toBe(false);
    expect(matches("1.2.3", "^1.2.3-beta.2")).toBe(true);
  });

  it("matches when any alternative matches", () => {
    expect(matches("2.6.0", "^1.0.0 || >=2.5.0 <3")).toBe(true);
    expect(matches("2.4.0", "^1.0.0 || >=2.5.0 <3")).toBe(false);
  });

  it("matches nothing for <*", () => {
    expect(matches("0.0.0", "<*")).toBe(false);
  });
});

describe("splitVersions", () => {
  it("reads one version per line", () => {
    expect(splitVersions("1.0.0\n1.1.0\r\n\n2.0.0\n")).toEqual(["1.0.0", "1.1.0", "2.0.0"]);
  });

  it("reads a JSON array or npm view output", () => {
    expect(splitVersions('["1.0.0", "1.1.0"]')).toEqual(["1.0.0", "1.1.0"]);
    expect(splitVersions("[\n  '1.0.0', '1.1.0',\n  '2.0.0-rc.1'\n]")).toEqual(["1.0.0", "1.1.0", "2.0.0-rc.1"]);
  });
});

describe("checkRange", () => {
  it("sorts newest first, marks matches and picks the highest match", () => {
    const report = value(checkRange("^1.2.0", "1.2.0\n2.0.0\nv1.10.1\n1.3.0-beta\n1.9.0\n1.1.9"));
    expect(report.expanded).toBe(">=1.2.0 <2.0.0-0");
    expect(report.versions.map((v) => [v.text, v.satisfies])).toEqual([
      ["2.0.0", false],
      ["1.10.1", true],
      ["1.9.0", true],
      ["1.3.0-beta", false],
      ["1.2.0", true],
      ["1.1.9", false],
    ]);
    expect(report.matches).toBe(3);
    expect(report.highest).toBe("1.10.1");
  });

  it("drops exact duplicates and lists invalid entries once", () => {
    const report = value(checkRange("*", "1.0.0 v1.0.0 latest 1.0 latest"));
    expect(report.versions.map((v) => v.text)).toEqual(["1.0.0"]);
    expect(report.invalid).toEqual(["latest", "1.0"]);
  });

  it("has no highest match when nothing satisfies the range", () => {
    expect(value(checkRange(">=3", "1.0.0\n2.0.0")).highest).toBeNull();
  });

  it("returns the range error instead of a report", () => {
    expect(error(checkRange("^x.y", "1.0.0"))).toMatch(/not a valid version or range/);
  });
});
