import type { ToolFaq } from "@/content/types";
import { absoluteUrl, site } from "@/lib/site";
import { toolPath, type Tool } from "@/lib/tools/registry";

/**
 * `JSON.stringify` does not escape `<`, so a stray tag in copy would break out
 * of the script element. All content here is authored, but escaping keeps that
 * true regardless of what future content adds.
 */
function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function ToolStructuredData({
  tool,
  faq,
}: {
  tool: Tool;
  faq: ToolFaq[];
}) {
  const url = absoluteUrl(toolPath(tool.slug));

  const graph: Record<string, unknown>[] = [
    {
      "@type": "SoftwareApplication",
      "@id": `${url}#app`,
      name: tool.name,
      url,
      description: tool.description,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      // Free tools still need an Offer node, otherwise Google treats the
      // SoftwareApplication markup as incomplete.
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      publisher: {
        "@type": "Organization",
        name: site.name,
        url: site.url,
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tools", item: site.url },
        { "@type": "ListItem", position: 2, name: tool.name, item: url },
      ],
    },
  ];

  if (faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faq.map((entry) => ({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: { "@type": "Answer", text: entry.answer },
      })),
    });
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serialize({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
