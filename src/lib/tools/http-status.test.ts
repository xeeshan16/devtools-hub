import { describe, expect, it } from "vitest";
import {
  STATUS_CLASSES,
  STATUS_CODES,
  formatStatusLine,
  getStatusCode,
  isHeuristicallyCacheable,
  lookupStatus,
  statusClassOf,
  type StatusClass,
  type StatusLookup,
} from "./http-status";

function lookup(query: string, classFilter?: StatusClass): StatusLookup {
  const result = lookupStatus(query, classFilter);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function codes(query: string, classFilter?: StatusClass): number[] {
  return lookup(query, classFilter).matches.map((s) => s.code);
}

function error(query: string): string {
  const result = lookupStatus(query);
  if (result.ok) throw new Error(`expected an error for ${query}`);
  return result.error;
}

describe("STATUS_CODES", () => {
  it("is sorted, unique and within 100–599", () => {
    const all = STATUS_CODES.map((s) => s.code);
    expect(all).toEqual([...all].sort((a, b) => a - b));
    expect(new Set(all).size).toBe(all.length);
    for (const code of all) {
      expect(code).toBeGreaterThanOrEqual(100);
      expect(code).toBeLessThanOrEqual(599);
    }
  });

  it("has a name, description and spec for every code", () => {
    for (const s of STATUS_CODES) {
      expect(s.name, String(s.code)).not.toBe("");
      expect(s.description.length, String(s.code)).toBeGreaterThan(20);
      expect(s.spec, String(s.code)).toMatch(/^RFC \d+/);
    }
  });

  it("registers the x00 of every class, which unknown codes fall back to", () => {
    for (const cls of STATUS_CLASSES) {
      expect(getStatusCode(cls.class * 100)).toBeDefined();
    }
  });

  it("uses the current RFC 9110 reason phrases", () => {
    expect(getStatusCode(413)?.name).toBe("Content Too Large");
    expect(getStatusCode(422)?.name).toBe("Unprocessable Content");
    expect(getStatusCode(418)?.name).toBe("(Unused)");
  });
});

describe("statusClassOf", () => {
  it("maps codes to their class", () => {
    expect(statusClassOf(101).label).toBe("Informational");
    expect(statusClassOf(204).label).toBe("Success");
    expect(statusClassOf(308).label).toBe("Redirection");
    expect(statusClassOf(499).label).toBe("Client error");
    expect(statusClassOf(599).label).toBe("Server error");
  });
});

describe("isHeuristicallyCacheable", () => {
  it("follows the RFC 9110 list", () => {
    expect(isHeuristicallyCacheable(200)).toBe(true);
    expect(isHeuristicallyCacheable(404)).toBe(true);
    expect(isHeuristicallyCacheable(410)).toBe(true);
    expect(isHeuristicallyCacheable(201)).toBe(false);
    expect(isHeuristicallyCacheable(302)).toBe(false);
    expect(isHeuristicallyCacheable(500)).toBe(false);
  });
});

describe("lookupStatus", () => {
  it("returns every code for an empty query", () => {
    expect(lookup("").matches).toHaveLength(STATUS_CODES.length);
    expect(lookup("   ").matches).toHaveLength(STATUS_CODES.length);
  });

  it("finds a code by its number", () => {
    expect(codes("404")).toEqual([404]);
    expect(codes(" 503 ")).toEqual([503]);
  });

  it("lists codes starting with a prefix", () => {
    expect(codes("41")).toEqual([410, 411, 412, 413, 414, 415, 416, 417, 418]);
    expect(codes("1")).toEqual([100, 101, 102, 103]);
  });

  it("lists a whole class written as 3xx", () => {
    expect(codes("3xx")).toEqual([300, 301, 302, 303, 304, 305, 306, 307, 308]);
    expect(codes("5XX")).toEqual(codes("5"));
  });

  it("explains an unregistered code by its class", () => {
    const result = lookup("499");
    expect(result.matches).toEqual([]);
    expect(result.unregistered?.code).toBe(499);
    expect(result.unregistered?.class.label).toBe("Client error");
    expect(result.unregistered?.treatAs.code).toBe(400);
    expect(lookup("520").unregistered?.treatAs.code).toBe(500);
  });

  it("rejects numbers that cannot be status codes", () => {
    expect(error("600")).toMatch(/100 to 599/);
    expect(error("099")).toMatch(/100 to 599/);
    expect(error("4040")).toMatch(/100 to 599/);
  });

  it("searches names case-insensitively, ignoring punctuation", () => {
    expect(codes("not found")).toEqual([404]);
    expect(codes("GATEWAY")).toEqual([502, 504]);
    expect(codes("too-many")).toEqual([429]);
  });

  it("finds codes by their older names", () => {
    expect(codes("payload too large")).toEqual([413]);
    expect(codes("unprocessable entity")).toEqual([422]);
    expect(codes("im a teapot")).toEqual([418]);
    expect(codes("I'm a teapot")).toEqual([418]);
  });

  it("ranks name matches before description matches", () => {
    const found = codes("proxy");
    expect(found.slice(0, 3)).toEqual([305, 306, 407]);
    expect(found).toContain(502);
    expect(found.indexOf(502)).toBeGreaterThan(2);
  });

  it("requires every word to match", () => {
    expect(codes("retry after")).toContain(429);
    expect(codes("retry after")).toContain(503);
    expect(codes("retry after")).not.toContain(404);
    expect(codes("zzzz")).toEqual([]);
  });

  it("narrows results to a class", () => {
    expect(codes("", 2)).toEqual(STATUS_CODES.filter((s) => s.code >= 200 && s.code < 300).map((s) => s.code));
    expect(codes("timeout", 5)).toEqual([504]);
    expect(codes("timeout", 4)).toEqual([408]);
    expect(codes("404", 5)).toEqual([]);
    expect(lookup("499", 5).unregistered).toBeUndefined();
  });
});

describe("formatStatusLine", () => {
  it("joins code and reason phrase", () => {
    expect(formatStatusLine(getStatusCode(404)!)).toBe("404 Not Found");
  });
});
