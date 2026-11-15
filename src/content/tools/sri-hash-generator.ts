import type { ToolContent } from "@/content/types";

export const sriHashContent: ToolContent = {
  howToUse: [
    "Paste the exact contents of a script or stylesheet, or choose the file, to get its Subresource Integrity value. sha384 is selected by default because it is the usual choice; tick sha256 or sha512 to add more tokens. Everything is hashed in your browser and nothing is uploaded.",
    "Enter the URL the file is served from to get a ready-made <script> or stylesheet <link> tag with the integrity and crossorigin attributes, each with a copy button.",
    "Paste an existing integrity value or the whole integrity=\"…\" attribute under Verify to check it the way a browser would: only the strongest algorithm counts, the content loads if any token of that algorithm matches, and tokens with unknown algorithms, base64url characters or the wrong length are pointed out.",
  ],
  examples: [
    {
      title: "Generate an integrity value",
      note: "The sha384 digest of the 23 bytes of this one-line script, as in the MDN example.",
      input: "alert('Hello, world.');",
      output: "sha384-H8BRh8j48O9oYatfu5AZzq6A9RINhZO5H16dQZngK7T62em8MUt1FLm52t+eX6xO",
    },
    {
      title: "Build a script tag",
      note: "crossorigin=\"anonymous\" is added so a CDN-hosted file can be checked at all.",
      input: "https://cdn.example.com/library.js",
      output:
        '<script src="https://cdn.example.com/library.js" integrity="sha384-H8BRh8j48O9oYatfu5AZzq6A9RINhZO5H16dQZngK7T62em8MUt1FLm52t+eX6xO" crossorigin="anonymous"></script>',
    },
    {
      title: "Spot a mislabelled digest",
      note: "A 44-character sha256 digest labelled sha384 can never match.",
      input: "sha384-qznLcsROx4GACP2dm0UCKCzCG+HiZ1guq6ZZDob/Tng=",
      output: "A sha384 digest is 64 base64 characters, but this one is 44, so it can never match.",
    },
  ],
  faq: [
    {
      question: "What is Subresource Integrity?",
      answer:
        "Subresource Integrity (SRI) lets a page say exactly which file it expects from another server. The integrity attribute holds a cryptographic hash of the file; the browser hashes what it downloads and refuses to run the script or apply the stylesheet if the hashes differ. It protects you if a CDN or third-party host is compromised or serves a modified file.",
    },
    {
      question: "Why does my integrity value not match the file?",
      answer:
        "The hash covers every byte, so any difference breaks it: a trailing newline, a byte order mark, Windows (CRLF) instead of Unix line endings, a different minified build or a new version at the same URL. Browser text boxes turn CRLF into plain newlines, so pasted text can hash differently from the real file. Choose the file, or the exact bytes the server sends, to get a reliable value.",
    },
    {
      question: "Why is crossorigin=\"anonymous\" needed?",
      answer:
        "A file from another origin fetched without CORS is opaque to the page, so the browser cannot check its hash and blocks it instead. crossorigin=\"anonymous\" makes the browser fetch it with CORS and no credentials, which lets the check run. The server must answer with an Access-Control-Allow-Origin header; public CDNs do.",
    },
    {
      question: "Which algorithm should I use, and can I list several?",
      answer:
        "SRI accepts sha256, sha384 and sha512; sha384 is the common choice. You can list several tokens separated by spaces. The browser uses only the strongest algorithm present and loads the file if any token of that algorithm matches, so listing two sha384 hashes lets you roll out a new file version without breaking the old one. A correct weaker token cannot rescue a wrong stronger one.",
    },
    {
      question: "How is this different from a CSP hash?",
      answer:
        "Both use the same algorithm-base64 format, but for different jobs. A Content-Security-Policy hash such as 'sha256-…' in script-src allows a specific inline script to run. SRI's integrity attribute checks an external file loaded with src or href. You can use both on the same page.",
    },
  ],
};
