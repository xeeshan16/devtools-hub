import type { Metadata } from "next";
import { getTool, toolPath } from "@/lib/tools/registry";

/**
 * One place to build every tool page's head, so the canonical URL, OG tags and
 * title template can never drift between the eight routes.
 */
export function toolMetadata(slug: string): Metadata {
  const tool = getTool(slug);
  const path = toolPath(slug);

  return {
    title: tool.seoTitle,
    description: tool.description,
    keywords: [tool.name, ...tool.keywords],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title: tool.seoTitle,
      description: tool.description,
    },
    twitter: {
      card: "summary_large_image",
      title: tool.seoTitle,
      description: tool.description,
    },
  };
}
