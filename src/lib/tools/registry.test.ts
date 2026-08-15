import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOOL_CONTENT } from "@/content/tools";
import { TOOLS, TOOLS_BY_SLUG, relatedTools, toolsByCategory } from "./registry";

/**
 * These guard the wiring rather than any single tool: adding a tool to the
 * registry without a route, without explainer content, or with a typo in its
 * related-tools list should fail here rather than at build time.
 */
describe("tool registry", () => {
  it("has unique slugs", () => {
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(TOOLS.length);
  });

  it("uses URL-safe slugs", () => {
    for (const tool of TOOLS) {
      expect(tool.slug, tool.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("points every related slug at a real tool, and never at itself", () => {
    for (const tool of TOOLS) {
      for (const slug of tool.related) {
        expect(TOOLS_BY_SLUG[slug], `${tool.slug} → ${slug}`).toBeDefined();
        expect(slug).not.toBe(tool.slug);
      }
      expect(relatedTools(tool.slug).length).toBe(tool.related.length);
    }
  });

  it("has explainer content for every tool", () => {
    for (const tool of TOOLS) {
      const content = TOOL_CONTENT[tool.slug];
      expect(content, tool.slug).toBeDefined();
      expect(content.howToUse.length).toBeGreaterThanOrEqual(2);
      expect(content.examples.length).toBeGreaterThanOrEqual(2);
      // Google's FAQ rich result needs a few genuine entries to be worth having.
      expect(content.faq.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("has no orphaned content entries", () => {
    for (const slug of Object.keys(TOOL_CONTENT)) {
      expect(TOOLS_BY_SLUG[slug], `content without a tool: ${slug}`).toBeDefined();
    }
  });

  it("has a route for every tool", () => {
    for (const tool of TOOLS) {
      const page = join(process.cwd(), "src/app/tools", tool.slug, "page.tsx");
      expect(existsSync(page), page).toBe(true);
    }
  });

  it("keeps SEO metadata within the lengths search results render", () => {
    for (const tool of TOOLS) {
      expect(tool.seoTitle.length, tool.slug).toBeLessThanOrEqual(60);
      expect(tool.description.length, tool.slug).toBeLessThanOrEqual(180);
      expect(tool.description.length, tool.slug).toBeGreaterThanOrEqual(80);
    }
  });

  it("assigns every tool to a rendered category", () => {
    const grouped = toolsByCategory().flatMap((group) => group.tools);
    expect(grouped).toHaveLength(TOOLS.length);
  });
});
