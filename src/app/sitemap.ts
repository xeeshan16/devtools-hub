import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { TOOLS, toolPath } from "@/lib/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...TOOLS.map((tool) => ({
      url: absoluteUrl(toolPath(tool.slug)),
      lastModified,
      changeFrequency: "monthly" as const,
      // Phase 1 tools target the highest-volume terms, so they lead the sitemap.
      priority: tool.phase === 1 ? 0.9 : 0.8,
    })),
    ...["/about", "/privacy", "/terms"].map((path) => ({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
