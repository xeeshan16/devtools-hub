import { describe, expect, it } from "vitest";
import {
  buildContentDisposition,
  encodeExtValue,
  parseContentDisposition,
  type ContentDispositionResult,
} from "./content-disposition";
import type { ToolResult } from "./result";

function parsed(result: ToolResult<ContentDispositionResult | null>): ContentDispositionResult {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  if (!result.value) throw new Error("expected a result, got null");
  return result.value;
}

function errorOf<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("parseContentDisposition", () => {
  it("returns null for empty input", () => {
    expect(parseContentDisposition(" \n ")).toEqual({ ok: true, value: null });
  });

  it("parses a quoted attachment filename with the header prefix", () => {
    const result = parsed(parseContentDisposition('Content-Disposition: attachment; filename="report 2026.pdf"'));
    expect(result).toMatchObject({
      type: "attachment",
      knownType: true,
      filename: "report 2026.pdf",
      filenameSource: "filename",
      fallbackFilename: "report 2026.pdf",
      extended: null,
      name: null,
      savedAs: "report 2026.pdf",
      params: [{ name: "filename", value: "report 2026.pdf" }],
      warnings: [],
    });
  });

  it("accepts curl -v markers, case-insensitive names and token values", () => {
    const result = parsed(parseContentDisposition("< content-disposition: INLINE; FileName=photo.jpg"));
    expect(result.type).toBe("inline");
    expect(result.filename).toBe("photo.jpg");
    expect(result.params).toEqual([{ name: "filename", value: "photo.jpg" }]);
    expect(result.warnings).toEqual([]);
  });

  it("parses a bare disposition type", () => {
    const result = parsed(parseContentDisposition("inline"));
    expect(result).toMatchObject({ type: "inline", filename: null, filenameSource: null, savedAs: null, params: [], warnings: [] });
  });

  it("prefers a valid filename* over filename", () => {
    const result = parsed(
      parseContentDisposition("attachment; filename=\"resume.pdf\"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf"),
    );
    expect(result.filename).toBe("résumé.pdf");
    expect(result.filenameSource).toBe("filename*");
    expect(result.fallbackFilename).toBe("resume.pdf");
    expect(result.extended).toEqual({ charset: "UTF-8", language: "" });
    expect(result.warnings).toEqual([]);
  });

  it("keeps the language tag of filename*", () => {
    const result = parsed(parseContentDisposition("attachment; filename=EURO.txt; filename*=utf-8'en'%E2%82%AC%20rates.txt"));
    expect(result.filename).toBe("€ rates.txt");
    expect(result.extended).toEqual({ charset: "UTF-8", language: "en" });
  });

  it("decodes ISO-8859-1 filename* with a warning", () => {
    const result = parsed(parseContentDisposition("attachment; filename=a.txt; filename*=iso-8859-1''%E9t%E9.txt"));
    expect(result.filename).toBe("été.txt");
    expect(result.warnings.some((w) => w.includes("prefer UTF-8"))).toBe(true);
  });

  it("falls back to filename when filename* is malformed", () => {
    const result = parsed(parseContentDisposition("attachment; filename=plain.txt; filename*=r%C3%A9sum%C3%A9.pdf"));
    expect(result.filename).toBe("plain.txt");
    expect(result.filenameSource).toBe("filename");
    expect(result.warnings.some((w) => w.includes("charset'language'value"))).toBe(true);
  });

  it("flags unsupported charsets and bad percent-encoding in filename*", () => {
    const charset = parsed(parseContentDisposition("attachment; filename=a.txt; filename*=Shift_JIS''%82%A0.txt"));
    expect(charset.filenameSource).toBe("filename");
    expect(charset.warnings.some((w) => w.includes('"Shift_JIS"'))).toBe(true);

    const encoding = parsed(parseContentDisposition("attachment; filename=a.txt; filename*=UTF-8''%E2%82.txt"));
    expect(encoding.filenameSource).toBe("filename");
    expect(encoding.warnings.some((w) => w.includes("invalid percent-encoding"))).toBe(true);
  });

  it("warns about a quoted filename* and a missing fallback", () => {
    const result = parsed(parseContentDisposition("attachment; filename*=\"UTF-8''na%C3%AFve.txt\""));
    expect(result.filename).toBe("naïve.txt");
    expect(result.warnings.some((w) => w.includes("must not be in double quotes"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("no plain filename fallback"))).toBe(true);
  });

  it("keeps semicolons and escaped quotes inside quoted values", () => {
    const result = parsed(parseContentDisposition('attachment; filename="a; b \\"c\\".txt"'));
    expect(result.filename).toBe('a; b "c".txt');
    expect(result.savedAs).toBe("a; b _c_.txt");
    expect(result.warnings).toEqual([]);
  });

  it("strips directories from the saved name", () => {
    const result = parsed(parseContentDisposition('attachment; filename="../../etc/passwd"'));
    expect(result.savedAs).toBe("passwd");
    expect(result.warnings.some((w) => w.includes("drop the directory part"))).toBe(true);
  });

  it("warns about non-ASCII and percent-encoded plain filenames", () => {
    const unicode = parsed(parseContentDisposition('attachment; filename="café.txt"'));
    expect(unicode.warnings.some((w) => w.includes("non-ASCII"))).toBe(true);

    const encoded = parsed(parseContentDisposition('attachment; filename="caf%C3%A9.txt"'));
    expect(encoded.filename).toBe("caf%C3%A9.txt");
    expect(encoded.warnings.some((w) => w.includes("percent-encoded"))).toBe(true);
  });

  it("parses form-data parts and requires a name", () => {
    const part = parsed(parseContentDisposition('form-data; name="avatar"; filename="me.png"'));
    expect(part).toMatchObject({ type: "form-data", knownType: true, name: "avatar", filename: "me.png", warnings: [] });

    const nameless = parsed(parseContentDisposition('form-data; filename="me.png"'));
    expect(nameless.warnings.some((w) => w.includes("must have a name"))).toBe(true);
  });

  it("treats unknown types as attachment", () => {
    const result = parsed(parseContentDisposition("download; filename=x.zip"));
    expect(result.knownType).toBe(false);
    expect(result.warnings.some((w) => w.includes("treat unknown types as attachment"))).toBe(true);
  });

  it("warns about duplicates, unquoted spaces, missing values, empty names and unclosed quotes", () => {
    const duplicate = parsed(parseContentDisposition("attachment; filename=a.txt; filename=b.txt"));
    expect(duplicate.filename).toBe("a.txt");
    expect(duplicate.warnings.some((w) => w.includes("more than once"))).toBe(true);

    const spaces = parsed(parseContentDisposition("attachment; filename=my file.txt"));
    expect(spaces.filename).toBe("my file.txt");
    expect(spaces.warnings.some((w) => w.includes("must be in double quotes"))).toBe(true);

    const bare = parsed(parseContentDisposition("attachment; filename"));
    expect(bare.params).toEqual([{ name: "filename", value: null }]);
    expect(bare.warnings.some((w) => w.includes("has no value"))).toBe(true);

    const empty = parsed(parseContentDisposition('attachment; filename=""'));
    expect(empty.warnings.some((w) => w.includes("file name is empty"))).toBe(true);

    const unclosed = parsed(parseContentDisposition('attachment; filename="open.txt'));
    expect(unclosed.filename).toBe("open.txt");
    expect(unclosed.warnings.some((w) => w.includes("no closing quote"))).toBe(true);
  });

  it("parses only the first of several lines", () => {
    const result = parsed(parseContentDisposition("inline\nattachment; filename=x"));
    expect(result.type).toBe("inline");
    expect(result.warnings.some((w) => w.includes("Only the first line"))).toBe(true);
  });

  it("errors when the disposition type is missing or malformed", () => {
    expect(errorOf(parseContentDisposition('filename="a.pdf"'))).toMatch(/is a parameter, not a disposition type/);
    expect(errorOf(parseContentDisposition('; filename="a.pdf"'))).toMatch(/must start with a disposition type/);
    expect(errorOf(parseContentDisposition('attachment filename="a.pdf"'))).toMatch(/missing a semicolon/);
    expect(errorOf(parseContentDisposition('"attachment"'))).toMatch(/not a valid disposition type/);
  });
});

describe("buildContentDisposition", () => {
  it("returns null for an empty name", () => {
    expect(buildContentDisposition("")).toEqual({ ok: true, value: null });
  });

  it("quotes ASCII names and escapes quotes and backslashes", () => {
    expect(buildContentDisposition("report.pdf")).toEqual({ ok: true, value: 'attachment; filename="report.pdf"' });
    expect(buildContentDisposition('say "hi".txt', "inline")).toEqual({ ok: true, value: 'inline; filename="say \\"hi\\".txt"' });
  });

  it("adds an ASCII fallback and filename* for non-ASCII names", () => {
    expect(buildContentDisposition("résumé (final).pdf")).toEqual({
      ok: true,
      value: "attachment; filename=\"resume (final).pdf\"; filename*=UTF-8''r%C3%A9sum%C3%A9%20%28final%29.pdf",
    });
    expect(buildContentDisposition("报告.txt")).toEqual({
      ok: true,
      value: "attachment; filename=\"__.txt\"; filename*=UTF-8''%E6%8A%A5%E5%91%8A.txt",
    });
  });

  it("round-trips through the parser", () => {
    for (const name of ["plain.txt", "naïve café.md", "€ rates 'Q1'.xlsx", "emoji 🎉.png", 'say "hi".txt']) {
      const built = buildContentDisposition(name);
      if (!built.ok || !built.value) throw new Error(`could not build ${name}`);
      const result = parsed(parseContentDisposition(built.value));
      expect(result.filename, name).toBe(name);
      expect(result.warnings, name).toEqual([]);
    }
  });

  it("rejects names a header can't carry safely", () => {
    expect(errorOf(buildContentDisposition("   "))).toMatch(/only spaces/);
    expect(errorOf(buildContentDisposition("a\r\nSet-Cookie: x=1"))).toMatch(/control characters/);
    expect(errorOf(buildContentDisposition("dir/file.txt"))).toMatch(/can't contain \//);
    expect(errorOf(buildContentDisposition("dir\\file.txt"))).toMatch(/can't contain \//);
  });
});

describe("encodeExtValue", () => {
  it("encodes everything outside RFC 8187 attr-chars", () => {
    expect(encodeExtValue("a-b_c.d~e!f")).toBe("a-b_c.d~e!f");
    expect(encodeExtValue("it's (a) *test*")).toBe("it%27s%20%28a%29%20%2Atest%2A");
  });
});
