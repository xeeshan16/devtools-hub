import { describe, expect, it } from "vitest";
import { NAMED_ENTITIES, decodeHtml, encodeHtml } from "./html-entities";

function value(result: { ok: true; value: string } | { ok: false; error: string }) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

describe("encodeHtml", () => {
  it("escapes the five markup-significant characters", () => {
    expect(value(encodeHtml(`<a href="x?a=1&b=2">it's</a>`))).toBe(
      "&lt;a href=&quot;x?a=1&amp;b=2&quot;&gt;it&#39;s&lt;/a&gt;",
    );
  });

  it("leaves non-ASCII text alone in essential scope", () => {
    expect(value(encodeHtml("Zoë — 5 €"))).toBe("Zoë — 5 €");
  });

  it("uses named entities for non-ASCII when one exists, hex otherwise", () => {
    expect(value(encodeHtml("Zoë — 5 € ✅", { scope: "non-ascii" }))).toBe(
      "Zo&euml; &mdash; 5 &euro; &#x2705;",
    );
  });

  it("writes decimal or hex references on request", () => {
    expect(value(encodeHtml("é€", { scope: "non-ascii", format: "decimal" }))).toBe("&#233;&#8364;");
    expect(value(encodeHtml("é€", { scope: "non-ascii", format: "hex" }))).toBe("&#xE9;&#x20AC;");
  });

  it("encodes an astral character as one reference, not two surrogates", () => {
    expect(value(encodeHtml("😀", { scope: "non-ascii", format: "hex" }))).toBe("&#x1F600;");
  });

  it("escapes DEL and C1 controls in non-ascii scope but keeps ASCII whitespace", () => {
    expect(value(encodeHtml("a\tb\n\u007f\u0085", { scope: "non-ascii", format: "hex" }))).toBe(
      "a\tb\n&#x7F;&#x85;",
    );
  });

  it("still escapes markup characters when every format is numeric", () => {
    expect(value(encodeHtml("<é>", { scope: "non-ascii", format: "decimal" }))).toBe("&lt;&#233;&gt;");
  });

  it("treats empty input as empty output", () => {
    expect(encodeHtml("")).toEqual({ ok: true, value: "" });
  });

  it("reports an unpaired surrogate instead of emitting an invalid reference", () => {
    const result = encodeHtml("bad \uD800 char");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unpaired surrogate/);
  });
});

describe("decodeHtml", () => {
  it("decodes named, decimal and hex references", () => {
    expect(decodeHtml("&lt;p&gt;caf&eacute; &#8364;5 &#x1F600;&lt;/p&gt;")).toEqual({
      text: "<p>café €5 😀</p>",
      warnings: [],
    });
  });

  it("accepts an uppercase X and mixed-case hex digits", () => {
    expect(decodeHtml("&#X41;&#xe9;&#xE9;").text).toBe("Aéé");
  });

  it("decodes &apos; and the HTML5 values of &lang; and &rang;", () => {
    expect(decodeHtml("&apos;&lang;&rang;").text).toBe("'⟨⟩");
  });

  it("is case-sensitive, as entity names are", () => {
    expect(decodeHtml("&Eacute;&eacute;").text).toBe("Éé");
  });

  it("round-trips every encoding mode", () => {
    const input = `<b class="x">Zoë & 'Ωμέγα'</b> — 5 € ✅ 😀`;
    for (const scope of ["essential", "non-ascii"] as const) {
      for (const format of ["named", "decimal", "hex"] as const) {
        expect(decodeHtml(value(encodeHtml(input, { scope, format }))).text).toBe(input);
      }
    }
  });

  it("decodes every named entity in the table to its own code point", () => {
    for (const [name, cp] of NAMED_ENTITIES) {
      expect(decodeHtml(`&${name};`).text, name).toBe(String.fromCodePoint(cp));
    }
  });

  it("leaves an unknown entity in place and says where it was", () => {
    expect(decodeHtml("a &bogus; b")).toEqual({
      text: "a &bogus; b",
      warnings: ["Unknown entity &bogus; at position 3 was left as-is."],
    });
  });

  it("leaves text without a terminating semicolon untouched", () => {
    expect(decodeHtml("AT&T; R&D &amp").text).toBe("AT&T; R&D &amp");
  });

  it("replaces invalid code points with U+FFFD and warns", () => {
    const result = decodeHtml("&#0;&#xD800;&#x110000;");
    expect(result.text).toBe("���");
    expect(result.warnings).toHaveLength(3);
    expect(result.warnings[1]).toMatch(/&#xD800; at position 5 is not a valid character/);
  });

  it("remaps Windows-1252 control codes the way browsers do", () => {
    const result = decodeHtml("&#150;&#x93;hi&#147;");
    expect(result.text).toBe("–“hi“");
    expect(result.warnings[0]).toMatch(/&#150; at position 1 is a Windows-1252 control code/);
  });

  it("keeps unassigned Windows-1252 slots as their C1 code point", () => {
    expect(decodeHtml("&#x81;").text).toBe("\u0081");
  });

  it("ignores over-long numeric references rather than misreading them", () => {
    expect(decodeHtml("&#123456789012;").text).toBe("&#123456789012;");
  });
});
