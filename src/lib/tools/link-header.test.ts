import { describe, expect, it } from "vitest";
import { decodeExtValue, parseLinkHeader, type LinkHeaderResult } from "./link-header";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<LinkHeaderResult | null>): LinkHeaderResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

const GITHUB =
  'link: <https://api.github.com/repositories/1/issues?page=2>; rel="prev", <https://api.github.com/repositories/1/issues?page=4>; rel="next", <https://api.github.com/repositories/1/issues?page=9>; rel="last", <https://api.github.com/repositories/1/issues?page=1>; rel="first"';

describe("parseLinkHeader", () => {
  it("returns null for empty input", () => {
    expect(parseLinkHeader(" \n ")).toEqual({ ok: true, value: null });
  });

  it("errors when there are no links", () => {
    const result = parseLinkHeader("Link: rel=next");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/No links found/);
  });

  it("parses GitHub-style pagination with the prefix", () => {
    const result = parsed(parseLinkHeader(GITHUB));
    expect(result.links).toHaveLength(4);
    expect(result.links[0]).toMatchObject({
      target: "https://api.github.com/repositories/1/issues?page=2",
      absolute: true,
      params: [{ name: "rel", value: "prev" }],
    });
    expect(result.links[0].relations[0]).toMatchObject({ name: "prev", known: true });
    expect(result.pagination).toEqual({
      first: { url: "https://api.github.com/repositories/1/issues?page=1", page: 1 },
      prev: { url: "https://api.github.com/repositories/1/issues?page=2", page: 2 },
      next: { url: "https://api.github.com/repositories/1/issues?page=4", page: 4 },
      last: { url: "https://api.github.com/repositories/1/issues?page=9", page: 9 },
    });
    expect(result.warnings).toEqual([]);
  });

  it("combines repeated header lines and curl -v markers", () => {
    const result = parsed(parseLinkHeader("< Link: </style.css>; rel=preload; as=style\n< link: <https://cdn.example.com>; rel=preconnect"));
    expect(result.links.map((link) => link.target)).toEqual(["/style.css", "https://cdn.example.com"]);
    expect(result.links[0].absolute).toBe(false);
    expect(result.links[0].params).toEqual([
      { name: "rel", value: "preload" },
      { name: "as", value: "style" },
    ]);
    expect(result.pagination).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it("keeps commas and semicolons inside quotes and URIs", () => {
    const result = parsed(parseLinkHeader('<https://example.com/a;b,c>; rel="alternate"; title="Hello, world; again", <https://example.com/d>; rel=next'));
    expect(result.links).toHaveLength(2);
    expect(result.links[0].target).toBe("https://example.com/a;b,c");
    expect(result.links[0].title).toBe("Hello, world; again");
  });

  it("splits multiple relation types and lowercases registered ones", () => {
    const result = parsed(parseLinkHeader('<https://example.com/>; REL="Canonical https://example.com/rels/Home"'));
    expect(result.links[0].relations.map(({ name, known }) => ({ name, known }))).toEqual([
      { name: "canonical", known: true },
      { name: "https://example.com/rels/Home", known: true },
    ]);
  });

  it("unescapes quoted strings and keeps bare parameters", () => {
    const result = parsed(parseLinkHeader('<https://fonts.example.com/a.woff2>; rel=preload; as=font; crossorigin; title="say \\"hi\\""'));
    expect(result.links[0].params).toContainEqual({ name: "crossorigin", value: null });
    expect(result.links[0].title).toBe('say "hi"');
  });

  it("prefers a decoded title* over title", () => {
    const result = parsed(parseLinkHeader("</rates>; rel=alternate; title=\"EUR rates\"; title*=UTF-8'de'%E2%82%AC%20Kurse"));
    expect(result.links[0].title).toBe("€ Kurse");
  });

  it("reads type and anchor", () => {
    const result = parsed(parseLinkHeader('</feed>; rel=alternate; type="application/atom+xml"; anchor="#comments"'));
    expect(result.links[0]).toMatchObject({ type: "application/atom+xml", anchor: "#comments" });
  });

  it("treats previous as prev and ignores page values that aren't numbers", () => {
    const result = parsed(parseLinkHeader("</items?cursor=abc>; rel=next, </items?page=x>; rel=previous"));
    expect(result.pagination).toEqual({
      first: null,
      prev: { url: "/items?page=x", page: null },
      next: { url: "/items?cursor=abc", page: null },
      last: null,
    });
  });

  describe("warnings", () => {
    const warningsFor = (header: string) => parsed(parseLinkHeader(header)).warnings;

    it("flags a link without rel", () => {
      expect(warningsFor("<https://example.com/>")).toEqual([
        "<https://example.com/> has no rel parameter, so clients can't tell what the link means.",
      ]);
    });

    it("flags an empty rel", () => {
      expect(warningsFor('</a>; rel=""')[0]).toMatch(/empty rel parameter/);
    });

    it("ignores repeated single-use parameters after the first", () => {
      const result = parsed(parseLinkHeader("</a>; rel=next; rel=prev"));
      expect(result.links[0].relations.map((relation) => relation.name)).toEqual(["next"]);
      expect(result.warnings[0]).toMatch(/more than one rel parameter/);
    });

    it("flags unregistered relation types", () => {
      expect(warningsFor("</a>; rel=nxt")).toEqual([
        '</a>: "nxt" is not a registered relation type; custom types should be absolute URIs.',
      ]);
    });

    it("flags a target without angle brackets and still parses the rest", () => {
      const result = parsed(parseLinkHeader('https://example.com/2; rel="next", </3>; rel=last'));
      expect(result.links.map((link) => link.target)).toEqual(["/3"]);
      expect(result.warnings[0]).toMatch(/must be in angle brackets/);
    });

    it("flags a missing closing angle bracket", () => {
      const result = parsed(parseLinkHeader("</a>; rel=next, </b; rel=last"));
      expect(result.links).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/no closing ">"/);
    });

    it("flags an unterminated quote", () => {
      expect(warningsFor('</a>; rel="next')[0]).toMatch(/no closing quote/);
    });

    it("flags unquoted values with spaces", () => {
      expect(warningsFor("</a>; rel=next prev")).toContain('The rel value "next prev" contains spaces, so it must be in double quotes.');
    });

    it("flags text between the target and the first parameter", () => {
      expect(warningsFor("</a> rel=next")[0]).toMatch(/parameters must start with a semicolon/);
    });

    it("flags preload without as", () => {
      expect(warningsFor("</app.js>; rel=preload")).toEqual([
        "</app.js> is a preload without an as parameter (e.g. as=style or as=script); browsers ignore it.",
      ]);
    });

    it("flags the deprecated rev parameter", () => {
      expect(warningsFor("</a>; rel=next; rev=prev")[0]).toMatch(/rev, which RFC 8288 deprecates/);
    });

    it("flags a malformed title*", () => {
      expect(warningsFor("</a>; rel=next; title*=hello")[0]).toMatch(/title\* that isn't in the charset'lang'value form/);
    });
  });
});

describe("decodeExtValue", () => {
  it("decodes UTF-8 and ISO-8859-1", () => {
    expect(decodeExtValue("UTF-8''caf%C3%A9")).toBe("café");
    expect(decodeExtValue("iso-8859-1'en'caf%E9")).toBe("café");
  });

  it("returns null for malformed or unsupported values", () => {
    expect(decodeExtValue("caf%C3%A9")).toBeNull();
    expect(decodeExtValue("UTF-8''%E2%82")).toBeNull();
    expect(decodeExtValue("UTF-16''abc")).toBeNull();
  });
});
