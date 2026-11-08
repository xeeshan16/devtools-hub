import type { ToolContent } from "@/content/types";
import { base64Content } from "./base64-encoder-decoder";
import { caseConverterContent } from "./case-converter";
import { chmodCalculatorContent } from "./chmod-calculator";
import { colorConverterContent } from "./color-converter";
import { cronParserContent } from "./cron-parser";
import { csvJsonContent } from "./csv-json-converter";
import { curlToFetchContent } from "./curl-to-fetch";
import { dataSizeConverterContent } from "./data-size-converter";
import { diffCheckerContent } from "./diff-checker";
import { envJsonContent } from "./env-json-converter";
import { hashGeneratorContent } from "./hash-generator";
import { hmacGeneratorContent } from "./hmac-generator";
import { htmlEntitiesContent } from "./html-entity-encoder-decoder";
import { httpStatusCodesContent } from "./http-status-codes";
import { isoDurationConverterContent } from "./iso-duration-converter";
import { jsonEscapeContent } from "./json-escape-unescape";
import { jsonFormatterContent } from "./json-formatter";
import { jsonToTypescriptContent } from "./json-to-typescript";
import { jwtDecoderContent } from "./jwt-decoder";
import { jwtEncoderContent } from "./jwt-encoder";
import { loremIpsumGeneratorContent } from "./lorem-ipsum-generator";
import { markdownTableContent } from "./markdown-table-generator";
import { numberBaseContent } from "./number-base-converter";
import { passwordGeneratorContent } from "./password-generator";
import { queryStringJsonContent } from "./query-string-json-converter";
import { regexTesterContent } from "./regex-tester";
import { semverCheckerContent } from "./semver-checker";
import { slugGeneratorContent } from "./slug-generator";
import { sortLinesContent } from "./sort-lines";
import { subnetCalculatorContent } from "./subnet-calculator";
import { textHexContent } from "./text-hex-converter";
import { timestampConverterContent } from "./timestamp-converter";
import { tokenCounterContent } from "./token-counter";
import { ulidGeneratorContent } from "./ulid-generator";
import { unicodeInspectorContent } from "./unicode-inspector";
import { urlEncoderContent } from "./url-encoder-decoder";
import { urlParserContent } from "./url-parser";
import { uuidGeneratorContent } from "./uuid-generator";
import { yamlJsonContent } from "./yaml-json-converter";

/** Keyed by tool slug — a tool without content is caught by the registry test. */
export const TOOL_CONTENT: Record<string, ToolContent> = {
  "json-formatter": jsonFormatterContent,
  "base64-encoder-decoder": base64Content,
  "uuid-generator": uuidGeneratorContent,
  "ulid-generator": ulidGeneratorContent,
  "timestamp-converter": timestampConverterContent,
  "jwt-decoder": jwtDecoderContent,
  "regex-tester": regexTesterContent,
  "cron-parser": cronParserContent,
  "yaml-json-converter": yamlJsonContent,
  "case-converter": caseConverterContent,
  "slug-generator": slugGeneratorContent,
  "password-generator": passwordGeneratorContent,
  "diff-checker": diffCheckerContent,
  "jwt-encoder": jwtEncoderContent,
  "token-counter": tokenCounterContent,
  "url-encoder-decoder": urlEncoderContent,
  "hash-generator": hashGeneratorContent,
  "hmac-generator": hmacGeneratorContent,
  "number-base-converter": numberBaseContent,
  "text-hex-converter": textHexContent,
  "html-entity-encoder-decoder": htmlEntitiesContent,
  "color-converter": colorConverterContent,
  "csv-json-converter": csvJsonContent,
  "chmod-calculator": chmodCalculatorContent,
  "url-parser": urlParserContent,
  "subnet-calculator": subnetCalculatorContent,
  "sort-lines": sortLinesContent,
  "json-to-typescript": jsonToTypescriptContent,
  "json-escape-unescape": jsonEscapeContent,
  "semver-checker": semverCheckerContent,
  "unicode-inspector": unicodeInspectorContent,
  "data-size-converter": dataSizeConverterContent,
  "http-status-codes": httpStatusCodesContent,
  "curl-to-fetch": curlToFetchContent,
  "iso-duration-converter": isoDurationConverterContent,
  "markdown-table-generator": markdownTableContent,
  "env-json-converter": envJsonContent,
  "query-string-json-converter": queryStringJsonContent,
  "lorem-ipsum-generator": loremIpsumGeneratorContent,
};

export function getToolContent(slug: string): ToolContent {
  const content = TOOL_CONTENT[slug];
  if (!content) throw new Error(`No explainer content for tool: ${slug}`);
  return content;
}
