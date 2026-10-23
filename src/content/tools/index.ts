import type { ToolContent } from "@/content/types";
import { base64Content } from "./base64-encoder-decoder";
import { caseConverterContent } from "./case-converter";
import { chmodCalculatorContent } from "./chmod-calculator";
import { colorConverterContent } from "./color-converter";
import { cronParserContent } from "./cron-parser";
import { csvJsonContent } from "./csv-json-converter";
import { diffCheckerContent } from "./diff-checker";
import { hashGeneratorContent } from "./hash-generator";
import { htmlEntitiesContent } from "./html-entity-encoder-decoder";
import { jsonEscapeContent } from "./json-escape-unescape";
import { jsonFormatterContent } from "./json-formatter";
import { jsonToTypescriptContent } from "./json-to-typescript";
import { jwtDecoderContent } from "./jwt-decoder";
import { jwtEncoderContent } from "./jwt-encoder";
import { numberBaseContent } from "./number-base-converter";
import { passwordGeneratorContent } from "./password-generator";
import { regexTesterContent } from "./regex-tester";
import { sortLinesContent } from "./sort-lines";
import { subnetCalculatorContent } from "./subnet-calculator";
import { timestampConverterContent } from "./timestamp-converter";
import { tokenCounterContent } from "./token-counter";
import { urlEncoderContent } from "./url-encoder-decoder";
import { urlParserContent } from "./url-parser";
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
  "case-converter": caseConverterContent,
  "password-generator": passwordGeneratorContent,
  "diff-checker": diffCheckerContent,
  "jwt-encoder": jwtEncoderContent,
  "token-counter": tokenCounterContent,
  "url-encoder-decoder": urlEncoderContent,
  "hash-generator": hashGeneratorContent,
  "number-base-converter": numberBaseContent,
  "html-entity-encoder-decoder": htmlEntitiesContent,
  "color-converter": colorConverterContent,
  "csv-json-converter": csvJsonContent,
  "chmod-calculator": chmodCalculatorContent,
  "url-parser": urlParserContent,
  "subnet-calculator": subnetCalculatorContent,
  "sort-lines": sortLinesContent,
  "json-to-typescript": jsonToTypescriptContent,
  "json-escape-unescape": jsonEscapeContent,
};

export function getToolContent(slug: string): ToolContent {
  const content = TOOL_CONTENT[slug];
  if (!content) throw new Error(`No explainer content for tool: ${slug}`);
  return content;
}
