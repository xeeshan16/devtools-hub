import { err, ok, type ToolResult } from "./result";

/** Red, green and blue on a 0–255 scale (fractional values allowed), alpha 0–1. */
export type Rgba = { r: number; g: number; b: number; a: number };

/** Hue in degrees [0, 360), saturation and lightness as percentages, alpha 0–1. */
export type Hsla = { h: number; s: number; l: number; a: number };

export type WcagLevel = "AAA" | "AA" | "AA Large" | "Fail";

export type ContrastResult = { ratio: number; level: WcagLevel };

export type ColorConversions = {
  hex: string;
  rgb: string;
  hsl: string;
  /** Contrast of the color as text on a white and on a black background. */
  contrast: { white: ContrastResult; black: ContrastResult };
};

export type HexOptions = { uppercase?: boolean };

export const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
export const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 1 };

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

const FORMAT_HINT = "Enter a hex code such as #1e90ff, or an rgb() or hsl() value.";

/**
 * Parses the color notations developers copy out of stylesheets and design
 * tools: hex (#rgb, #rgba, #rrggbb, #rrggbbaa, with or without the #),
 * rgb()/rgba() and hsl()/hsla() in both the comma and the space-separated
 * CSS syntax, with an optional alpha. Out-of-range channels are reported
 * rather than silently clamped, so a typo is not mistaken for a valid color.
 * Blank input parses to `null` so the UI can show placeholders.
 */
export function parseColor(input: string): ToolResult<Rgba | null> {
  const trimmed = input.trim();
  if (!trimmed) return ok(null);
  const lower = trimmed.toLowerCase();

  const fn = /^(rgba?|hsla?)\s*\(([^)]*)(\)?)$/.exec(lower);
  if (fn) {
    if (!fn[3]) return err(`${fn[1]}() is missing its closing parenthesis.`);
    return fn[1].startsWith("rgb") ? parseRgbArgs(fn[2]) : parseHslArgs(fn[2]);
  }
  if (/^#?[0-9a-f]+$/.test(lower)) return parseHex(lower);
  return err(`Could not read "${trimmed}" as a color. ${FORMAT_HINT}`);
}

function parseHex(text: string): ToolResult<Rgba> {
  const digits = text.startsWith("#") ? text.slice(1) : text;
  if (![3, 4, 6, 8].includes(digits.length)) {
    return err(`A hex color has 3, 4, 6 or 8 digits; "#${digits}" has ${digits.length}.`);
  }
  const full = digits.length <= 4 ? [...digits].map((d) => d + d).join("") : digits;
  const byte = (i: number) => Number.parseInt(full.slice(i * 2, i * 2 + 2), 16);
  return ok({ r: byte(0), g: byte(1), b: byte(2), a: full.length === 8 ? byte(3) / 255 : 1 });
}

/** Splits `a, b, c[, d]` or `a b c[ / d]` into three channels and an optional alpha. */
function splitArgs(body: string, fn: string): ToolResult<{ channels: string[]; alpha: string | null }> {
  const text = body.trim();
  if (text.includes(",")) {
    if (text.includes("/")) return err(`${fn}() mixes commas with a "/" alpha; use one syntax.`);
    const parts = text.split(",").map((p) => p.trim());
    if (parts.some((p) => !p) || (parts.length !== 3 && parts.length !== 4)) {
      return err(`${fn}() needs three values, plus an optional alpha.`);
    }
    return ok({ channels: parts.slice(0, 3), alpha: parts[3] ?? null });
  }

  const [main, alpha, ...rest] = text.split("/");
  const channels = main.trim().split(/\s+/).filter(Boolean);
  if (rest.length > 0 || channels.length !== 3 || (alpha !== undefined && !alpha.trim())) {
    return err(`${fn}() needs three values, plus an optional alpha.`);
  }
  return ok({ channels, alpha: alpha === undefined ? null : alpha.trim() });
}

/** Reads `token` as a number, or as a percentage when it ends in `%`. */
function readValue(token: string): { value: number; percent: boolean } | null {
  const percent = token.endsWith("%");
  const body = percent ? token.slice(0, -1) : token;
  return NUMBER.test(body) ? { value: Number(body), percent } : null;
}

function parseAlpha(token: string | null): ToolResult<number> {
  if (token === null) return ok(1);
  const read = readValue(token);
  if (!read) return err(`Alpha "${token}" is not a number or percentage.`);
  const alpha = read.percent ? read.value / 100 : read.value;
  if (alpha < 0 || alpha > 1) return err(`Alpha ${token} is outside 0–1 (or 0%–100%).`);
  return ok(alpha);
}

const RGB_NAMES = ["Red", "Green", "Blue"] as const;

function parseRgbArgs(body: string): ToolResult<Rgba> {
  const args = splitArgs(body, "rgb");
  if (!args.ok) return args;

  const values: number[] = [];
  for (const [i, token] of args.value.channels.entries()) {
    const read = readValue(token);
    if (!read) return err(`${RGB_NAMES[i]} "${token}" is not a number or percentage.`);
    const channel = read.percent ? (read.value / 100) * 255 : read.value;
    if (channel < 0 || channel > 255) {
      return err(`${RGB_NAMES[i]} ${token} is outside ${read.percent ? "0%–100%" : "0–255"}.`);
    }
    values.push(channel);
  }

  const alpha = parseAlpha(args.value.alpha);
  if (!alpha.ok) return alpha;
  return ok({ r: values[0], g: values[1], b: values[2], a: alpha.value });
}

const HUE_UNITS: Record<string, number> = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };

function parseHue(token: string): number | null {
  const match = /^(.*?)(deg|grad|rad|turn)?$/.exec(token);
  if (!match || !NUMBER.test(match[1])) return null;
  const degrees = Number(match[1]) * HUE_UNITS[match[2] ?? "deg"];
  return ((degrees % 360) + 360) % 360;
}

function parseHslArgs(body: string): ToolResult<Rgba> {
  const args = splitArgs(body, "hsl");
  if (!args.ok) return args;
  const [hueToken, satToken, lightToken] = args.value.channels;

  const h = parseHue(hueToken);
  if (h === null) return err(`Hue "${hueToken}" is not an angle (e.g. 210, 210deg or 0.5turn).`);

  const percents: number[] = [];
  for (const [name, token] of [
    ["Saturation", satToken],
    ["Lightness", lightToken],
  ] as const) {
    const read = readValue(token);
    if (!read) return err(`${name} "${token}" is not a percentage.`);
    if (read.value < 0 || read.value > 100) return err(`${name} ${token} is outside 0%–100%.`);
    percents.push(read.value);
  }

  const alpha = parseAlpha(args.value.alpha);
  if (!alpha.ok) return alpha;
  return ok(hslToRgb({ h, s: percents[0], l: percents[1], a: alpha.value }));
}

export function hslToRgb({ h, s, l, a }: Hsla): Rgba {
  const sat = s / 100;
  const light = l / 100;
  const chroma = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return (light - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return { r: f(0), g: f(8), b: f(4), a };
}

export function rgbToHsl({ r, g, b, a }: Rgba): Hsla {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100, a };
}

/** Rounds to at most `decimals` places and drops trailing zeros (and -0). */
function trim(n: number, decimals: number): string {
  return String(Number(n.toFixed(decimals)) + 0);
}

function byte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

/** `#rrggbb`, or `#rrggbbaa` when the color is not fully opaque. */
export function formatHex(color: Rgba, options: HexOptions = {}): string {
  const bytes = [color.r, color.g, color.b].map(byte);
  if (color.a < 1) bytes.push(byte(color.a * 255));
  const hex = `#${bytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  return options.uppercase ? hex.toUpperCase() : hex;
}

/** Comma syntax, which every browser and most design tools accept. */
export function formatRgb(color: Rgba): string {
  const channels = [color.r, color.g, color.b].map(byte).join(", ");
  return color.a < 1 ? `rgba(${channels}, ${trim(color.a, 3)})` : `rgb(${channels})`;
}

export function formatHsl(color: Rgba): string {
  const { h, s, l, a } = rgbToHsl(color);
  const hue = Number(h.toFixed(1)) >= 360 ? "0" : trim(h, 1);
  const body = `${hue}, ${trim(s, 1)}%, ${trim(l, 1)}%`;
  return a < 1 ? `hsla(${body}, ${trim(a, 3)})` : `hsl(${body})`;
}

/** WCAG 2 relative luminance of the (opaque part of the) color. */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * WCAG 2 contrast ratio of `foreground` drawn on an opaque `background`.
 * A translucent foreground is composited over the background first, which is
 * the color a reader actually sees.
 */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const mix = (f: number, b: number) => f * foreground.a + b * (1 - foreground.a);
  const seen: Rgba = {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1,
  };
  const [lighter, darker] = [relativeLuminance(seen), relativeLuminance(background)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** The WCAG 2 level a text/background pair meets: 7:1 AAA, 4.5:1 AA, 3:1 large text. */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

function contrast(foreground: Rgba, background: Rgba): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return { ratio, level: wcagLevel(ratio) };
}

/** Parses `input` and renders it as hex, rgb() and hsl(), with contrast on white and black. */
export function convertColor(input: string, options: HexOptions = {}): ToolResult<ColorConversions | null> {
  const parsed = parseColor(input);
  if (!parsed.ok) return parsed;
  if (parsed.value === null) return ok(null);
  const color = parsed.value;
  return ok({
    hex: formatHex(color, options),
    rgb: formatRgb(color),
    hsl: formatHsl(color),
    contrast: { white: contrast(color, WHITE), black: contrast(color, BLACK) },
  });
}
