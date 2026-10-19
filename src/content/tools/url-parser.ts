import type { ToolContent } from "@/content/types";

export const urlParserContent: ToolContent = {
  howToUse: [
    "Paste a URL to see its scheme, host, port, path, query string and fragment as separate, copyable parts. Parsing uses the same WHATWG URL rules as browsers and fetch, so what you see is what your code will get.",
    "Query parameters are listed in order with their values decoded, including repeated keys such as tag=a&tag=b. Path segments and the fragment are decoded too, while the Path card keeps the encoded form that goes on the wire.",
    "A bare host such as example.com/docs or localhost:3000 is read as https:// and marked as such. Spaces and invalid hosts or ports are reported inline rather than silently fixed.",
  ],
  examples: [
    {
      title: "An API call with a port and query string",
      note: "Each part is shown separately; the query value is decoded.",
      input: "https://api.example.com:8443/v1/search?q=caf%C3%A9+au+lait",
      output: "Host api.example.com · Port 8443 · Path /v1/search · q = café au lait",
    },
    {
      title: "The default port",
      note: "An https URL with no port connects to 443, and an explicit :443 is dropped when normalized.",
      input: "https://example.com:443/",
      output: "Port 443 (default) · Normalized https://example.com/",
    },
    {
      title: "A local dev server without a scheme",
      note: "Read as a host and port rather than a scheme called localhost.",
      input: "localhost:3000/api/health",
      output: "Scheme https (assumed) · Host localhost · Port 3000 · Path /api/health",
    },
  ],
  faq: [
    {
      question: "What are the parts of a URL?",
      answer:
        "In https://user@example.com:8080/path/page?key=value#section, https is the scheme, user is the optional user info, example.com is the host, 8080 is the port, /path/page is the path, key=value is the query string and section is the fragment. Together the scheme, host and port make up the origin, which browsers use for same-origin and CORS checks.",
    },
    {
      question: "Why is the port empty or marked as default?",
      answer:
        "Each scheme has a default port: 80 for http and ws, 443 for https and wss, and 21 for ftp. A URL that leaves the port out connects to that default, and one that spells out the default port is normalized without it, so https://example.com:443/ and https://example.com/ are the same URL.",
    },
    {
      question: "Is the fragment sent to the server?",
      answer:
        "No. Everything after # stays in the browser and is never part of the HTTP request, which is why single-page apps use it for client-side state and OAuth implicit flows put tokens there. The query string, by contrast, is sent with every request and often ends up in server and proxy logs.",
    },
    {
      question: "Why does a + in the query string become a space?",
      answer:
        "Query strings follow HTML form encoding, where + stands for a space. A literal plus sign has to be written as %2B. This is how URLSearchParams and most server frameworks read query values, so the decoded values shown here match what your backend receives.",
    },
    {
      question: "Why does an international domain name turn into xn--?",
      answer:
        "Hosts are converted to their ASCII form, called Punycode, before a request is made. A name such as bücher.example becomes xn--bcher-kva.example. Seeing the converted form is useful for spotting look-alike domains that mix characters from different scripts.",
    },
  ],
};
