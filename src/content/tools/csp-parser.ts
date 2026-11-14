import type { ToolContent } from "@/content/types";

export const cspParserContent: ToolContent = {
  howToUse: [
    "Paste a Content-Security-Policy or Content-Security-Policy-Report-Only header, with or without the header name. Lines copied from curl -v or DevTools work as they are, and a policy split one directive per line is joined back together.",
    "Findings are graded high, medium or low. They cover syntax mistakes that make browsers silently ignore part of the policy, such as unquoted keywords, and weaknesses such as 'unsafe-inline' scripts, wildcard sources or a missing object-src.",
    "The resource table shows which directive actually applies to scripts, styles, images, frames and the rest once fallbacks to default-src are taken into account, and flags resource types nothing restricts.",
  ],
  examples: [
    {
      title: "Inline scripts allowed",
      note: "default-src covers scripts, so 'unsafe-inline' applies to them.",
      input: "Content-Security-Policy: default-src 'self' 'unsafe-inline'",
      output: "High: 'unsafe-inline' in default-src (used for scripts because script-src is not set) lets injected inline scripts and event handlers run.",
    },
    {
      title: "Missing quotes",
      note: "Without quotes a keyword is read as a host name.",
      input: "Content-Security-Policy: script-src self",
      output: "High: self in script-src is missing its single quotes, so browsers read it as a host named \"self\". Write 'self'.",
    },
    {
      title: "Strict nonce-based policy",
      note: "The pattern recommended for XSS protection.",
      input:
        "Content-Security-Policy: script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'",
      output: "No problems found · script-src governs workers too · img-src, style-src and the rest are unrestricted.",
    },
    {
      title: "Comma instead of semicolon",
      note: "Commas separate whole policies, not directives.",
      input: "Content-Security-Policy: default-src 'self', img-src *",
      output: "Warning: the browser enforces 2 separate policies and a request must pass all of them.",
    },
  ],
  faq: [
    {
      question: "What does default-src cover?",
      answer:
        "default-src is the fallback for fetch directives that are not set explicitly: scripts, styles, images, fonts, connections, media, objects, frames, workers and manifests. It does not cover base-uri, form-action, frame-ancestors, sandbox or the reporting directives, so those have to be set on their own.",
    },
    {
      question: "Why is 'unsafe-inline' dangerous in script-src?",
      answer:
        "Most cross-site scripting attacks inject an inline script or an event handler such as onerror. 'unsafe-inline' allows exactly that, so a policy with it gives little XSS protection. Use a per-response nonce or a hash for the inline scripts you need instead. When a nonce or hash is present, modern browsers ignore 'unsafe-inline', which is why it is sometimes kept as a fallback for very old browsers.",
    },
    {
      question: "What does 'strict-dynamic' do?",
      answer:
        "It lets a script that was allowed by a nonce or hash load further scripts, without listing every host. At the same time browsers that support it ignore host sources, scheme sources and 'self' in that directive. That makes nonce-based policies practical with third-party loaders, but on its own, with no nonce or hash, it allows no scripts at all.",
    },
    {
      question: "What is the difference between Content-Security-Policy and Content-Security-Policy-Report-Only?",
      answer:
        "Content-Security-Policy enforces the policy and blocks violations. The Report-Only header only reports violations to the endpoint named by report-to or report-uri and blocks nothing, which lets you test a new policy on real traffic before enforcing it. You can send both headers at once with different policies.",
    },
    {
      question: "Why does my policy need object-src and base-uri?",
      answer:
        "Plugin content loaded through <object> or <embed> can run script outside script-src, so object-src 'none' closes that path. base-uri matters because an injected <base> tag changes where relative script URLs point, which can turn an allowed same-origin script into an attacker's script. base-uri does not fall back to default-src, so it has to be set explicitly.",
    },
  ],
};
