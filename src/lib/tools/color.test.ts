import { describe, expect, it } from "vitest";
import {
  BLACK,
  WHITE,
  contrastRatio,
  convertColor,
  formatHex,
  formatHsl,
  formatRgb,
  parseColor,
  wcagLevel,
  type Rgba,
} from "./color";
import type { ToolResult } from "./result";

function value<T>(result: ToolResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

function hexOf(input: string): string {
  const color = value(parseColor(input));
  if (!color) throw new Error("expected a color");
  return formatHex(color);
}

describe("parseColor", () => {
  it("reads every hex length, with or without #", () => {
    expect(value(parseColor("#1e90ff"))).toEqual({ r: 30, g: 144, b: 255, a: 1 });
    expect(value(parseColor("1E90FF"))).toEqual({ r: 30, g: 144, b: 255, a: 1 });
    expect(value(parseColor("#f80"))).toEqual({ r: 255, g: 136, b: 0, a: 1 });
    expect(value(parseColor("#0f08"))).toEqual({ r: 0, g: 255, b: 0, a: 136 / 255 });
    expect(value(parseColor("#ff000080"))).toEqual({ r: 255, g: 0, b: 0, a: 128 / 255 });
  });

  it("reads rgb() in comma and space syntax, with numbers or percentages", () => {
    expect(hexOf("rgb(30, 144, 255)")).toBe("#1e90ff");
    expect(hexOf("rgb(30 144 255)")).toBe("#1e90ff");
    expect(hexOf("RGB(100%, 0%, 0%)")).toBe("#ff0000");
  });

  it("reads alpha as a fourth value or after a slash", () => {
    expect(value(parseColor("rgba(255, 0, 0, 0.5)"))?.a).toBe(0.5);
    expect(value(parseColor("rgb(255 0 0 / 50%)"))?.a).toBe(0.5);
    expect(value(parseColor("hsl(0 100% 50% / .25)"))?.a).toBe(0.25);
  });

  it("reads hsl() with any hue unit", () => {
    expect(hexOf("hsl(120, 100%, 25%)")).toBe("#008000");
    expect(hexOf("hsl(180deg 100% 50%)")).toBe("#00ffff");
    expect(hexOf("hsl(0.5turn 100% 50%)")).toBe("#00ffff");
    expect(hexOf("hsl(200grad 100% 50%)")).toBe("#00ffff");
    expect(hexOf(`hsl(${Math.PI}rad 100% 50%)`)).toBe("#00ffff");
  });

  it("wraps hues outside 0–360", () => {
    expect(hexOf("hsl(-120, 100%, 50%)")).toBe("#0000ff");
    expect(hexOf("hsl(480, 100%, 50%)")).toBe("#00ff00");
  });

  it("returns null for blank input", () => {
    expect(parseColor("  ")).toEqual({ ok: true, value: null });
  });

  it("explains malformed input instead of guessing", () => {
    expect(error(parseColor("#12345"))).toMatch(/3, 4, 6 or 8 digits; "#12345" has 5/);
    expect(error(parseColor("rgb(300, 0, 0)"))).toMatch(/Red 300 is outside 0–255/);
    expect(error(parseColor("rgb(0, 120%, 0)"))).toMatch(/Green 120% is outside 0%–100%/);
    expect(error(parseColor("rgb(1, 2)"))).toMatch(/needs three values/);
    expect(error(parseColor("rgb(1, 2, 3 / 0.5)"))).toMatch(/mixes commas/);
    expect(error(parseColor("rgb(1, 2, 3"))).toMatch(/missing its closing parenthesis/);
    expect(error(parseColor("hsl(10, 50%, 120%)"))).toMatch(/Lightness 120% is outside/);
    expect(error(parseColor("hsl(red, 50%, 50%)"))).toMatch(/Hue "red" is not an angle/);
    expect(error(parseColor("rgba(0, 0, 0, 2)"))).toMatch(/Alpha 2 is outside/);
    expect(error(parseColor("tomato"))).toMatch(/Could not read "tomato" as a color/);
  });
});

describe("formatting", () => {
  const dodgerBlue: Rgba = { r: 30, g: 144, b: 255, a: 1 };

  it("writes hex, adding an alpha byte only when translucent", () => {
    expect(formatHex(dodgerBlue)).toBe("#1e90ff");
    expect(formatHex(dodgerBlue, { uppercase: true })).toBe("#1E90FF");
    expect(formatHex({ ...dodgerBlue, a: 0.5 })).toBe("#1e90ff80");
  });

  it("writes rgb() and rgba()", () => {
    expect(formatRgb(dodgerBlue)).toBe("rgb(30, 144, 255)");
    expect(formatRgb({ ...dodgerBlue, a: 136 / 255 })).toBe("rgba(30, 144, 255, 0.533)");
  });

  it("writes hsl() to one decimal place", () => {
    expect(formatHsl(dodgerBlue)).toBe("hsl(209.6, 100%, 55.9%)");
    expect(formatHsl(WHITE)).toBe("hsl(0, 0%, 100%)");
    expect(formatHsl({ r: 255, g: 0, b: 0, a: 0.5 })).toBe("hsla(0, 100%, 50%, 0.5)");
  });

  it("round-trips hex through its hsl() output", () => {
    for (let r = 0; r < 256; r += 17) {
      for (let g = 0; g < 256; g += 15) {
        for (let b = 0; b < 256; b += 51) {
          const color: Rgba = { r, g, b, a: 1 };
          expect(hexOf(formatHsl(color)), formatHex(color)).toBe(formatHex(color));
        }
      }
    }
  });
});

describe("contrast", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 10);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 10);
    expect(contrastRatio(WHITE, WHITE)).toBe(1);
  });

  it("puts #777 on white just under AA", () => {
    const ratio = contrastRatio({ r: 0x77, g: 0x77, b: 0x77, a: 1 }, WHITE);
    expect(ratio).toBeCloseTo(4.48, 2);
    expect(wcagLevel(ratio)).toBe("AA Large");
  });

  it("composites translucent colors over the background", () => {
    // Half-transparent black over white is seen as #808080 (rounded).
    const seen = contrastRatio({ ...BLACK, a: 0.5 }, WHITE);
    expect(seen).toBeCloseTo(contrastRatio({ r: 127.5, g: 127.5, b: 127.5, a: 1 }, WHITE), 10);
    expect(contrastRatio({ ...BLACK, a: 0 }, WHITE)).toBe(1);
  });

  it("maps ratios to WCAG levels at the thresholds", () => {
    expect(wcagLevel(7)).toBe("AAA");
    expect(wcagLevel(6.99)).toBe("AA");
    expect(wcagLevel(4.5)).toBe("AA");
    expect(wcagLevel(3)).toBe("AA Large");
    expect(wcagLevel(2.99)).toBe("Fail");
  });
});

describe("convertColor", () => {
  it("returns every format plus contrast on white and black", () => {
    const result = value(convertColor("hsl(209.6 100% 55.9%)"));
    expect(result).toMatchObject({ hex: "#1e90ff", rgb: "rgb(30, 144, 255)", hsl: "hsl(209.6, 100%, 55.9%)" });
    // Relative luminance ≈ 0.2745: about 3.24:1 on white and 6.49:1 on black.
    expect(result?.contrast.white.ratio).toBeCloseTo(3.24, 2);
    expect(result?.contrast.white.level).toBe("AA Large");
    expect(result?.contrast.black.ratio).toBeCloseTo(6.49, 2);
    expect(result?.contrast.black.level).toBe("AA");
  });

  it("passes errors and blank input through", () => {
    expect(convertColor("")).toEqual({ ok: true, value: null });
    expect(convertColor("#zz").ok).toBe(false);
  });
});
