import type { ToolContent } from "@/content/types";

export const acceptHeaderParserContent: ToolContent = {
  howToUse: [
    "Paste an Accept, Accept-Language, Accept-Encoding or Accept-Charset request header, with or without its name. Lines copied from curl -v or DevTools work as they are. Auto mode reads the header name, or guesses from the values; pick a header type to override it.",
    "The values are listed most preferred first: by q weight, then by how specific they are, then in header order. Values with q=0 are listed separately, because they mean the client refuses them.",
    "Under Negotiate, list what your server can send to see which one it should pick, and the weight and matching range behind every option. Warnings flag invalid weights, malformed values, duplicates and parameters servers ignore.",
  ],
  examples: [
    {
      title: "A browser's Accept header",
      note: "What a browser sends when navigating to a page.",
      input: "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      output: "text/html, application/xhtml+xml, image/avif, image/webp (q=1) · application/xml (0.9) · */* (0.8). Offering application/json and text/html picks text/html.",
    },
    {
      title: "Language preferences",
      note: "A Swiss German speaker who also reads English.",
      input: "Accept-Language: de-CH, de;q=0.9, en;q=0.7",
      output: "de-CH (1) · de (0.9) · en (0.7). Offering en-GB and fr picks en-GB via en;q=0.7; fr is not acceptable.",
    },
    {
      title: "Compression",
      note: "Every coding a modern browser can decompress.",
      input: "Accept-Encoding: gzip, deflate, br, zstd",
      output: "All four at q=1, so the server picks its own favourite, e.g. br; identity stays acceptable unless refused.",
    },
    {
      title: "An invalid weight",
      note: "q is limited to 0–1 with three decimals.",
      input: "Accept: application/json;q=1.5",
      output: "Warning: q=1.5 is out of range and is treated as q=1.",
    },
  ],
  faq: [
    {
      question: "What does q mean in an Accept header?",
      answer:
        "q is the weight, or quality value: a number from 0 to 1 with up to three decimals that says how much the client prefers that value. A missing q means 1, and q=0 means \"not acceptable\". Weights are relative, so text/html;q=0.9 only matters compared with the other values in the same header.",
    },
    {
      question: "How does a server choose a response with Accept?",
      answer:
        "For each representation it can produce, the server finds the most specific range in the header that matches it (text/html beats text/* beats */*, and a range with parameters beats one without) and takes that range's weight. It then sends the representation with the highest weight, using its own preference to break ties. If nothing is acceptable it can send a default anyway or respond with 406 Not Acceptable.",
    },
    {
      question: "How does Accept-Language matching work?",
      answer:
        "A language range matches a tag that is equal to it or starts with it followed by a hyphen, so en matches en, en-US and en-GB, but en-US does not match en. The * range matches any language. Language tags are case-insensitive and use hyphens, not underscores: en-US, not en_US.",
    },
    {
      question: "What if Accept-Encoding doesn't list identity?",
      answer:
        "identity (no compression) is always acceptable unless the header refuses it with identity;q=0, or with *;q=0 without listing identity. An empty Accept-Encoding header means the client wants no compression at all. Any other coding is acceptable only if it, or *, is listed with a weight above 0.",
    },
    {
      question: "Should I still use Accept-Charset?",
      answer:
        "No. Browsers stopped sending Accept-Charset because UTF-8 is supported everywhere, and RFC 9110 deprecates it. Serve UTF-8 and declare it in the Content-Type header, e.g. text/html; charset=utf-8.",
    },
  ],
};
