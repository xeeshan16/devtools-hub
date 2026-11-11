import type { ToolContent } from "@/content/types";

export const cookieParserContent: ToolContent = {
  howToUse: [
    "Paste a Cookie request header to list every cookie the browser sent, with percent-encoded values decoded. Names that appear more than once are marked, because two cookies with the same name set for different paths or domains are a common cause of stale-session bugs.",
    "Paste one or more Set-Cookie response headers, one per line, to see each cookie's lifetime, domain, path and flags. The Set-Cookie: prefix is optional, and lines copied from curl -v output work as they are.",
    "Auto mode treats input with a Set-Cookie: prefix or attributes such as Path, Secure or Max-Age as Set-Cookie headers. Warnings explain when a browser would ignore an attribute or reject the cookie outright.",
  ],
  examples: [
    {
      title: "A Cookie request header",
      note: "Values are decoded and a repeated name is flagged.",
      input: "Cookie: session=8f3a2c; cart=%7B%22items%22%3A2%7D; session=old",
      output: 'session = 8f3a2c (repeated) · cart = {"items":2} · session = old (repeated)',
    },
    {
      title: "A secure session cookie",
      note: "Every attribute is valid, so there are no warnings.",
      input: "Set-Cookie: __Host-session=8f3a2c; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400",
      output: "Persistent · Max-Age 86,400s (1 day) · Host-only · Path / · Secure · HttpOnly · SameSite Lax",
    },
    {
      title: "A third-party cookie a browser will reject",
      note: "SameSite=None only works together with Secure.",
      input: "Set-Cookie: tracking=abc; Domain=.example.com; SameSite=None",
      output: "Warning: SameSite=None requires Secure; browsers reject this cookie.",
    },
    {
      title: "Deleting a cookie",
      note: "An Expires date in the past, or Max-Age=0, removes an existing cookie.",
      input: "Set-Cookie: theme=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/",
      output: "Lifetime: Deletes the cookie",
    },
  ],
  faq: [
    {
      question: "What is the difference between Cookie and Set-Cookie?",
      answer:
        "Set-Cookie is a response header: the server sends one per cookie, with attributes such as Expires, Path and Secure that tell the browser how to store it. Cookie is a request header: the browser sends back only the name=value pairs that match the request, joined with semicolons, and never the attributes.",
    },
    {
      question: "Why did the browser ignore my cookie?",
      answer:
        "The usual reasons are SameSite=None without Secure, a __Host- cookie with a Domain attribute or a path other than /, a __Secure- cookie without Secure, or a Secure cookie set over plain http. A Domain that does not match the current site is also rejected. This parser flags the ones visible in the header itself; the scheme and site of the response are up to you to check.",
    },
    {
      question: "Which wins, Expires or Max-Age?",
      answer:
        "Max-Age. When both are present, browsers use Max-Age and ignore Expires. Max-Age is a number of seconds from now, so it does not depend on the client's clock, while Expires is an absolute date. A cookie with neither is a session cookie, and current browsers cap any lifetime at 400 days.",
    },
    {
      question: "What does SameSite do?",
      answer:
        "It controls whether the cookie is sent on cross-site requests. Strict sends it only on same-site requests, Lax also sends it when the user follows a top-level link to your site, and None sends it everywhere but requires Secure. Without the attribute, Chromium-based browsers treat the cookie as Lax.",
    },
    {
      question: "What are __Host- and __Secure- cookies?",
      answer:
        "They are name prefixes browsers enforce. A __Secure- cookie must be set with Secure. A __Host- cookie must also have Path=/ and no Domain, which locks it to the exact host that set it so a subdomain cannot overwrite it. A cookie that breaks these rules is rejected rather than stored.",
    },
  ],
};
