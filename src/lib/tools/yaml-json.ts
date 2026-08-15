// js-yaml v5 ships named exports only — there is no default export to import.
import { dump, load } from "js-yaml";
import { err, messageOf, ok, type ToolResult } from "./result";

export type ConvertDirection = "yaml-to-json" | "json-to-yaml";

export function yamlToJson(input: string, indent = 2): ToolResult<string> {
  if (!input.trim()) return ok("");

  let parsed: unknown;
  try {
    parsed = load(input);
  } catch (e) {
    return err(messageOf(e, "Invalid YAML."));
  }

  if (parsed === undefined) return ok("");

  try {
    return ok(JSON.stringify(parsed, null, indent));
  } catch (e) {
    // Anchors that produce cycles parse fine but cannot be serialized to JSON.
    return err(
      messageOf(e, "The YAML parsed, but it cannot be represented as JSON."),
    );
  }
}

export function jsonToYaml(input: string): ToolResult<string> {
  if (!input.trim()) return ok("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return err(messageOf(e, "Invalid JSON."));
  }

  try {
    return ok(
      dump(parsed, {
        indent: 2,
        lineWidth: 100,
        // Without this, repeated objects come back as YAML anchors/aliases,
        // which is correct but confusing for a copy-paste conversion tool.
        noRefs: true,
      }),
    );
  } catch (e) {
    return err(messageOf(e, "Could not convert that value to YAML."));
  }
}

export function convert(
  input: string,
  direction: ConvertDirection,
): ToolResult<string> {
  return direction === "yaml-to-json" ? yamlToJson(input) : jsonToYaml(input);
}
