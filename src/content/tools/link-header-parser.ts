import type { ToolContent } from "@/content/types";

export const linkHeaderParserContent: ToolContent = {
  howToUse: [
    "Paste a Link header value, with or without the Link: prefix. Lines copied from curl -v or DevTools work as they are, and several Link lines are combined into one list, as HTTP does.",
    "Each link shows its target URI, what every relation type means, and all of its parameters with quotes and escapes removed. When the header carries first, prev, next or last links, a pagination summary lists them with their page numbers.",
    "Warnings flag links clients can't use, such as a missing rel, a target without angle brackets, a preload without as, or an unquoted value containing spaces.",
  ],
  examples: [
    {
      title: "REST API pagination",
      note: "The style GitHub and many other APIs use to point at other pages of results.",
      input:
        'Link: <https://api.example.com/items?page=2>; rel="prev", <https://api.example.com/items?page=4>; rel="next", <https://api.example.com/items?page=12>; rel="last"',
      output: "Pagination: previous page 2 · next page 4 · last page 12.",
    },
    {
      title: "Preload and preconnect hints",
      note: "Resource hints a server or CDN sends so the browser starts fetching early.",
      input: "Link: </styles/main.css>; rel=preload; as=style, <https://fonts.example.com>; rel=preconnect; crossorigin",
      output: "rel=preload as=style for /styles/main.css · rel=preconnect for https://fonts.example.com.",
    },
    {
      title: "Canonical URL",
      note: "Tells search engines which URL to index, e.g. for a PDF that can't carry a <link> tag.",
      input: 'Link: <https://www.example.com/whitepaper.pdf>; rel="canonical"',
      output: "rel=canonical — the preferred URL for this content.",
    },
    {
      title: "Preload without as",
      note: "A common mistake that makes browsers skip the hint.",
      input: "Link: </app.js>; rel=preload",
      output: "Warning: </app.js> is a preload without an as parameter; browsers ignore it.",
    },
  ],
  faq: [
    {
      question: "What is the Link header?",
      answer:
        "Link is an HTTP response header, defined in RFC 8288, that carries the same information as an HTML <link> element: a target URI and its relation to the current resource. It works for any response, including JSON and PDFs, so APIs use it for pagination and servers use it for resource hints such as preload and preconnect.",
    },
    {
      question: "How do I paginate with the Link header?",
      answer:
        "Read the link whose rel is next and request its URL; stop when there is no next link. The first, prev and last links let you jump around or show a page count. Use the URLs exactly as given rather than building them yourself, because some APIs paginate with opaque cursors instead of page numbers.",
    },
    {
      question: "How are multiple links separated?",
      answer:
        "Links are separated by commas, and each link's parameters by semicolons. Commas and semicolons inside a quoted value or inside the angle brackets of a URI don't count. A response can also send several Link header lines; they mean the same as one header with the values joined by commas.",
    },
    {
      question: "Does rel need quotes?",
      answer:
        "Not for a single relation type: rel=next and rel=\"next\" are equivalent. Quotes are required when the value contains spaces or other characters that aren't allowed in a token, for example rel=\"prev first\" to give one link two relation types.",
    },
    {
      question: "What is title* in a Link header?",
      answer:
        "title* is a version of title that can carry non-ASCII text using the RFC 8187 encoding, for example title*=UTF-8'de'%E2%82%AC%20Kurse. Clients that understand it prefer it over title, so servers usually send both: a plain ASCII title as a fallback and title* for the exact text.",
    },
  ],
};
