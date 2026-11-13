import type { ToolContent } from "@/content/types";

export const cacheControlParserContent: ToolContent = {
  howToUse: [
    "Paste a Cache-Control header value, with or without the Cache-Control: prefix. Lines copied from curl -v or DevTools work as they are, and several header lines are combined the way caches combine them.",
    "The summary explains what browsers and shared caches such as CDNs do with the response: whether they may store it, how long it stays fresh for each, and what happens once it goes stale. The table explains every directive on its own.",
    "Warnings flag directives caches ignore or that contradict each other, such as an invalid max-age, no-store next to a lifetime, public with private, or immutable without max-age.",
  ],
  examples: [
    {
      title: "Fingerprinted static asset",
      note: "Long-lived and never revalidated on reload while fresh.",
      input: "Cache-Control: public, max-age=31536000, immutable",
      output: "Caches treat it as fresh for 365 days · Browsers do not revalidate it even when the user reloads the page.",
    },
    {
      title: "CDN-cached API response",
      note: "Short browser lifetime, longer CDN lifetime, with background refresh.",
      input: "Cache-Control: public, max-age=60, s-maxage=86400, stale-while-revalidate=30",
      output: "Browsers: fresh for 1 minute · Shared caches: fresh for 1 day · Served stale for 30 seconds while refreshing.",
    },
    {
      title: "Per-user HTML page",
      note: "Stored only by the browser, and checked with the server on every use.",
      input: "Cache-Control: private, no-cache",
      output: "Browsers may store it; shared caches must not · Every reuse must be revalidated with the origin first.",
    },
    {
      title: "Conflicting directives",
      note: "no-store wins, so the lifetime is dead weight.",
      input: "Cache-Control: no-store, max-age=3600",
      output: "Warning: no-store overrides max-age; nothing is cached.",
    },
  ],
  faq: [
    {
      question: "What is the difference between no-cache and no-store?",
      answer:
        "no-cache lets caches store the response but requires them to revalidate it with the server before every reuse, usually with a conditional request that returns 304 Not Modified when nothing changed. no-store forbids storing the response at all, so every request downloads it again. Use no-store for sensitive data and no-cache for content that must always be current.",
    },
    {
      question: "What is the difference between max-age and s-maxage?",
      answer:
        "max-age sets the freshness lifetime for every cache. s-maxage applies only to shared caches such as CDNs and proxies, overrides max-age there, and also means a shared cache must revalidate once the response is stale. A common pattern is a short max-age for browsers and a long s-maxage for the CDN, which you purge on deploy.",
    },
    {
      question: "What does stale-while-revalidate do?",
      answer:
        "It lets a cache keep serving a response for the given number of seconds after it goes stale, while it fetches a fresh copy in the background. Users get an instant response and the next request sees the updated content. stale-if-error is similar but only applies when the origin returns a 5xx error or cannot be reached.",
    },
    {
      question: "When should I use immutable?",
      answer:
        "Use it on assets whose URL changes whenever the content changes, such as bundles with a content hash in the filename. It tells browsers not to revalidate the response while it is fresh, even when the user reloads, which saves a round trip per asset. It has no effect without a max-age, and should not be used on URLs whose content can change.",
    },
    {
      question: "What happens when there is no Cache-Control header?",
      answer:
        "Caches look for an Expires header. If there is none, they may still cache responses with cacheable status codes such as 200 and 301 using a heuristic, typically a fraction of the time since the Last-Modified date. Setting Cache-Control explicitly avoids depending on that guess.",
    },
  ],
};
