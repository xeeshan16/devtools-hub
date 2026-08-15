import type { ToolContent } from "@/content/types";
import { base64Content } from "./base64-encoder-decoder";
import { cronParserContent } from "./cron-parser";
import { jsonFormatterContent } from "./json-formatter";
import { jwtDecoderContent } from "./jwt-decoder";
import { regexTesterContent } from "./regex-tester";
import { timestampConverterContent } from "./timestamp-converter";
import { uuidGeneratorContent } from "./uuid-generator";
import { yamlJsonContent } from "./yaml-json-converter";

/** Keyed by tool slug — a tool without content is caught by the registry test. */
export const TOOL_CONTENT: Record<string, ToolContent> = {
  "json-formatter": jsonFormatterContent,
  "base64-encoder-decoder": base64Content,
  "uuid-generator": uuidGeneratorContent,
  "timestamp-converter": timestampConverterContent,
  "jwt-decoder": jwtDecoderContent,
  "regex-tester": regexTesterContent,
  "cron-parser": cronParserContent,
  "yaml-json-converter": yamlJsonContent,
};

export function getToolContent(slug: string): ToolContent {
  const content = TOOL_CONTENT[slug];
  if (!content) throw new Error(`No explainer content for tool: ${slug}`);
  return content;
}
