import type { ToolContent } from "@/content/types";

export const htmlEntitiesContent: ToolContent = {
  howToUse: [
    "Choose Encode to escape text so it can be placed inside HTML, or Decode to turn entities such as &amp;, &eacute; and &#x1F600; back into the characters they stand for. The conversion runs as you type, entirely in your browser.",
    "Markup only escapes the five characters that can change how HTML is parsed: &, <, >, the double quote and the apostrophe. That is all a UTF-8 page needs, for both element text and quoted attribute values.",
    "Pick Also non-ASCII when the text has to survive a system that may not keep UTF-8 intact, such as an old email template or a Latin-1 database. Every character outside ASCII becomes a reference, written as a named entity where one exists, or as decimal or hex.",
    "When decoding, unknown entity names are left exactly as they are and listed below the output, and invalid or Windows-1252 numeric references are decoded the way browsers do, with a note so you can spot mojibake at its source.",
  ],
  examples: [
    {
      title: "Escape a snippet of HTML to show it as text",
      note: "Markup only: the tags and the quoted attribute can no longer be parsed as markup.",
      input: `<a href="/search?q=1&lang=en">Tom's</a>`,
      output: "&lt;a href=&quot;/search?q=1&amp;lang=en&quot;&gt;Tom&#39;s&lt;/a&gt;",
    },
    {
      title: "Escape non-ASCII characters too",
      note: "Named format: é, — and € have names; ✅ does not, so it gets a hex reference.",
      input: "Café — 5 € ✅",
      output: "Caf&eacute; &mdash; 5 &euro; &#x2705;",
    },
    {
      title: "Decode mixed entities",
      note: "Named, decimal and hex references can appear side by side.",
      input: "Caf&eacute; &#8220;cr&egrave;me&#8221; &amp; &#x1F370;",
      output: "Café “crème” & 🍰",
    },
  ],
  faq: [
    {
      question: "What are HTML entities?",
      answer:
        "HTML entities, or character references, are a way to write a character using only plain ASCII. A named reference such as &lt; stands for <, and a numeric reference gives the Unicode code point directly, in decimal (&#60;) or hex (&#x3C;). The browser replaces each reference with its character when it parses the page.",
    },
    {
      question: "Which characters do I have to escape in HTML?",
      answer:
        "In element text, & and < are the ones that matter, and > is escaped by convention. Inside an attribute value, also escape the quote character that delimits it. Escaping all five of & < > \" and ' covers both cases, which is what the Markup only option does. Everything else, including accented letters and emoji, can be written directly in a UTF-8 page.",
    },
    {
      question: "Is escaping HTML enough to prevent XSS?",
      answer:
        "Only for the contexts it was designed for: element text and quoted attribute values. It does not make a value safe inside a <script> block, an unquoted attribute, a style attribute, or a URL such as href=\"javascript:…\", each of which needs its own encoding or validation. Use your framework's built-in escaping, which picks the right encoding for each context, rather than escaping by hand.",
    },
    {
      question: "Why is the apostrophe written as &#39; instead of &apos;?",
      answer:
        "&apos; comes from XML and was only added to HTML in HTML5, so some older parsers and email clients do not recognise it. &#39; means the same thing and works everywhere. The decoder accepts both.",
    },
    {
      question: "Why was an entity left undecoded?",
      answer:
        "The decoder knows the 253 named entities of HTML 4 plus &apos;, using the values HTML5 gives them, which covers the names in common use. HTML5 defines over 2,000 more; rather than guess, an unknown name is left as it is and listed under the output. A reference also needs its terminating semicolon: browsers accept a few legacy names such as &amp without one, but this tool deliberately does not.",
    },
    {
      question: "Why did &#150; turn into a dash?",
      answer:
        "Code points 128 to 159 are invisible control characters in Unicode, but in Windows-1252 they hold curly quotes, dashes and the euro sign. Text converted from Windows-1252 often ends up with references like &#150; or &#147;, so the HTML standard tells browsers to read them as the Windows-1252 characters. This tool does the same, and flags each one so you can fix the source.",
    },
  ],
};
