import type { ToolContent } from "@/content/types";

export const hstsParserContent: ToolContent = {
  howToUse: [
    "Paste a Strict-Transport-Security header value, with or without the Strict-Transport-Security: prefix. Lines copied from curl -v or DevTools work as they are.",
    "The summary explains what a browser does after it receives the header over HTTPS: how long it remembers the policy, whether subdomains are covered, and what changes for users. The table explains every directive on its own.",
    "The preload checklist shows whether the header meets the requirements of the HSTS preload list, and the warnings flag mistakes that make browsers ignore the header, such as a missing max-age, a repeated directive or commas instead of semicolons.",
  ],
  examples: [
    {
      title: "Preload-ready header",
      note: "One year, all subdomains, and consent to preloading.",
      input: "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
      output: "Browsers use HTTPS for 365 days, including every subdomain · All preload list header requirements met.",
    },
    {
      title: "Trial rollout",
      note: "A short lifetime while checking every page works over HTTPS.",
      input: "Strict-Transport-Security: max-age=300",
      output: "Browsers use HTTPS for 5 minutes, this host only · Warning: max-age is under a day.",
    },
    {
      title: "Commas instead of semicolons",
      note: "A common copy-paste mistake that disables HSTS entirely.",
      input: "Strict-Transport-Security: max-age=31536000, includeSubDomains",
      output: "Warning: max-age is not a whole number of seconds, so browsers ignore the whole header.",
    },
    {
      title: "Turning HSTS off",
      note: "max-age=0 tells browsers to forget the stored policy.",
      input: "Strict-Transport-Security: max-age=0",
      output: "Removes any stored HSTS policy for this host (max-age=0).",
    },
  ],
  faq: [
    {
      question: "What does the Strict-Transport-Security header do?",
      answer:
        "It tells the browser to reach the site only over HTTPS for the number of seconds in max-age. During that time the browser rewrites http:// URLs to https:// before any request leaves the machine, and it does not let users click through certificate warnings. This blocks SSL-stripping attacks, where someone on the network keeps a visitor on plain HTTP.",
    },
    {
      question: "Why is my HSTS header ignored?",
      answer:
        "Browsers only honor the header on HTTPS responses with a valid certificate; it is ignored on plain HTTP. They also discard the whole header if max-age is missing or not a whole number, or if any directive appears twice. Directives must be separated by semicolons: with commas, max-age no longer parses as a number and the header has no effect.",
    },
    {
      question: "What max-age should I use?",
      answer:
        "Start with a short value such as a few minutes while you confirm every page and subdomain works over HTTPS, then raise it in steps. The HSTS preload list requires at least one year (31536000 seconds), and many sites use two years (63072000). The lifetime restarts each time the browser receives the header, so regular visitors stay protected.",
    },
    {
      question: "What is the HSTS preload list?",
      answer:
        "It is a list of domains that browsers ship with HSTS already enabled, so even the very first visit uses HTTPS. You submit a domain at hstspreload.org. The header must have a max-age of at least one year, includeSubDomains and preload, and the site must redirect HTTP to HTTPS and serve every subdomain over HTTPS. Removal takes a long time to reach users, so only preload once you are sure.",
    },
    {
      question: "Is includeSubDomains safe to turn on?",
      answer:
        "Only if every subdomain, including internal tools and old hosts, serves valid HTTPS. With includeSubDomains, browsers refuse plain-HTTP connections to any subdomain for the whole max-age, and users cannot bypass certificate errors there. Inventory your subdomains and test with a short max-age first.",
    },
  ],
};
