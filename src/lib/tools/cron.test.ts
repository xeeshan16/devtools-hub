import { describe, expect, it } from "vitest";
import { CRON_PRESETS, parseCron } from "./cron";

const FROM = new Date("2024-06-01T12:00:00Z");

describe("parseCron", () => {
  it("describes a five-field expression in plain English", () => {
    const result = parseCron("0 9 * * 1-5", "UTC", 5, FROM);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.description.toLowerCase()).toContain("09:00");
    expect(result.value.hasSeconds).toBe(false);
    expect(result.value.fields).toHaveLength(5);
  });

  it("labels the extra leading field in the six-field form", () => {
    const result = parseCron("30 0 9 * * 1-5", "UTC", 5, FROM);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.hasSeconds).toBe(true);
    expect(result.value.fields[0]).toMatchObject({ name: "Second", value: "30" });
  });

  it("expands shorthand aliases", () => {
    const result = parseCron("@daily", "UTC", 1, FROM);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.fields.map((f) => f.value)).toEqual([
      "0",
      "0",
      "*",
      "*",
      "*",
    ]);
  });

  it("computes the requested number of upcoming runs", () => {
    const result = parseCron("0 0 * * *", "UTC", 3, FROM);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.nextRuns.map((d) => d.toISOString())).toEqual([
      "2024-06-02T00:00:00.000Z",
      "2024-06-03T00:00:00.000Z",
      "2024-06-04T00:00:00.000Z",
    ]);
  });

  it("shifts run times with the selected time zone", () => {
    const utc = parseCron("0 9 * * *", "UTC", 1, FROM);
    const tokyo = parseCron("0 9 * * *", "Asia/Tokyo", 1, FROM);
    if (!utc.ok || !tokyo.ok) throw new Error("expected both to parse");
    expect(utc.value.nextRuns[0].toISOString()).not.toBe(
      tokyo.value.nextRuns[0].toISOString(),
    );
  });

  it("tolerates irregular whitespace", () => {
    expect(parseCron("  0   9  *  *  1-5 ", "UTC", 1, FROM).ok).toBe(true);
  });

  it("rejects the wrong number of fields", () => {
    const result = parseCron("0 9 * *", "UTC", 1, FROM);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/needs 5 fields/);
  });

  it("rejects blank and nonsense expressions", () => {
    expect(parseCron("", "UTC", 1, FROM).ok).toBe(false);
    expect(parseCron("99 99 99 99 99", "UTC", 1, FROM).ok).toBe(false);
  });
});

describe("CRON_PRESETS", () => {
  it("ships only expressions the parser accepts", () => {
    for (const preset of CRON_PRESETS) {
      expect(
        parseCron(preset.expression, "UTC", 1, FROM).ok,
        `${preset.label} (${preset.expression})`,
      ).toBe(true);
    }
  });
});
