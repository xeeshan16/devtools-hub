import type { ToolContent } from "@/content/types";

export const forwardedHeaderParserContent: ToolContent = {
  howToUse: [
    "Paste a Forwarded header value, with or without the Forwarded: prefix. Lines copied from curl -v, server logs or DevTools work as they are, and several Forwarded lines are combined into one list, as HTTP does.",
    "Each hop shows what one proxy recorded: the address the request came from (for), the proxy's own interface (by), the Host it received and the scheme (proto). Addresses are labelled IPv4, IPv6, obfuscated or unknown, and as public, private, loopback or link-local.",
    "Warnings flag values proxies and frameworks reject, such as an IPv6 address without quotes or brackets, an unquoted port or a host name in for. The converter below turns X-Forwarded-For, X-Forwarded-Proto and X-Forwarded-Host into one standard Forwarded header.",
  ],
  examples: [
    {
      title: "Single proxy",
      note: "The example from RFC 7239: a client reached a proxy over HTTP.",
      input: "Forwarded: for=192.0.2.60;proto=http;by=203.0.113.43",
      output: "Hop 1 · for 192.0.2.60 (IPv4, public) · by 203.0.113.43 · proto http.",
    },
    {
      title: "Proxy chain with IPv6",
      note: "Each proxy appends its own element; IPv6 addresses are bracketed and quoted.",
      input: 'Forwarded: for=192.0.2.43, for="[2001:db8:cafe::17]:4711"',
      output: "Hop 1 · for 192.0.2.43 · Hop 2 · for 2001:db8:cafe::17 port 4711 (IPv6, public).",
    },
    {
      title: "Unquoted IPv6 address",
      note: "A common mistake: colons and brackets aren't allowed in a bare token.",
      input: "Forwarded: for=[2001:db8::1]",
      output: 'Warning: the for value must be in double quotes: for="[2001:db8::1]".',
    },
    {
      title: "Converting X-Forwarded-For",
      note: "Proto and host describe the client's request, so they join the first element.",
      input: "X-Forwarded-For: 203.0.113.195, 10.0.4.12 · X-Forwarded-Proto: https · X-Forwarded-Host: example.com",
      output: "Forwarded: for=203.0.113.195;host=example.com;proto=https, for=10.0.4.12",
    },
  ],
  faq: [
    {
      question: "What is the Forwarded header?",
      answer:
        "Forwarded is a request header, defined in RFC 7239, that reverse proxies and load balancers add so the server behind them can see the original request: the client address (for), the proxy's interface (by), the Host the client asked for (host) and whether it used HTTP or HTTPS (proto). It replaces the non-standard X-Forwarded-For, X-Forwarded-Proto and X-Forwarded-Host headers with one structured header.",
    },
    {
      question: "How do I get the real client IP from Forwarded?",
      answer:
        "Read the elements from the right. The rightmost one was added by the proxy closest to your server; if its for address is one of your own proxies, move one element to the left, and repeat. The first for address that isn't one of your proxies is the client. Don't simply take the leftmost element: a client can send its own Forwarded header, and proxies append to it rather than replacing it.",
    },
    {
      question: "Why must IPv6 addresses be quoted?",
      answer:
        'Unquoted values must be tokens, and tokens can\'t contain colons or square brackets. An IPv6 address has to be written in brackets so a port can follow it, and the whole value quoted: for="[2001:db8::1]:443". The same applies to an IPv4 address with a port and to a host with a port, such as host="example.com:8443".',
    },
    {
      question: "What do unknown and obfuscated identifiers mean?",
      answer:
        "A proxy can hide addresses for privacy. for=unknown means the proxy doesn't know or won't say who sent the request. An identifier starting with an underscore, such as by=_edge1, is an obfuscated name the proxy chose; it stays stable so you can tell requests from the same source apart without learning the address. Ports can be obfuscated the same way.",
    },
    {
      question: "Forwarded or X-Forwarded-For: which should I use?",
      answer:
        "Forwarded is the standard and carries for, by, host and proto in one header with a defined syntax, so it is unambiguous for IPv6 and ports. X-Forwarded-For is still more widely supported by load balancers and frameworks. Many deployments send both; whichever you read, only trust entries added by proxies you control.",
    },
  ],
};
