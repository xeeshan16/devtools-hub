import type { ToolContent } from "@/content/types";

export const permissionsPolicyParserContent: ToolContent = {
  howToUse: [
    "Paste a Permissions-Policy header value, with or without the Permissions-Policy: prefix. Lines copied from curl -v or DevTools work as they are, and several header lines are combined the way browsers combine them.",
    "The table lists every feature with who may use it (nobody, your own origin, listed origins or any origin) and what that means for your page and the iframes it embeds.",
    "The warnings flag mistakes that make browsers ignore the whole header, such as semicolons between features or uppercase names, and entries browsers skip, such as unquoted origins or misspelled feature names. Old Feature-Policy syntax is converted to the equivalent Permissions-Policy header.",
  ],
  examples: [
    {
      title: "Lock down powerful features",
      note: "A common baseline for sites that never use the camera, microphone or location.",
      input: "Permissions-Policy: camera=(), microphone=(), geolocation=()",
      output: "camera, microphone, geolocation · Disabled everywhere: this page and every embedded frame.",
    },
    {
      title: "Allow an embedded map",
      note: "Your page and one trusted iframe origin may ask for the location.",
      input: 'Permissions-Policy: geolocation=(self "https://maps.example.com")',
      output: "Allowed on this page and in frames from https://maps.example.com, which also need an allow attribute.",
    },
    {
      title: "Semicolons instead of commas",
      note: "Feature-Policy habits carried over break the whole header.",
      input: "Permissions-Policy: camera=(); microphone=()",
      output: "Warning: features are separated by commas, not semicolons. Browsers ignore the whole header.",
    },
    {
      title: "Old Feature-Policy header",
      note: "The legacy syntax with quoted keywords is converted for you.",
      input: "Feature-Policy: camera 'none'; geolocation 'self'",
      output: "Permissions-Policy: camera=(), geolocation=(self)",
    },
  ],
  faq: [
    {
      question: "What does the Permissions-Policy header do?",
      answer:
        "It controls which browser features, such as the camera, microphone, geolocation, fullscreen or payments, your page and the iframes it embeds may use. A feature disabled in the header cannot be turned back on by any script or iframe on the page, which limits what injected or third-party code can do.",
    },
    {
      question: "What is the difference between (), self and *?",
      answer:
        "() is an empty allowlist: the feature is disabled for your page and every frame. self allows your own origin and same-origin frames. * allows any origin, although a cross-origin iframe still needs an allow attribute on the iframe tag for most features. You can also list origins in double quotes, such as (self \"https://maps.example.com\").",
    },
    {
      question: "Why is my Permissions-Policy header ignored?",
      answer:
        "The header uses HTTP structured-field syntax, and if any part fails to parse, browsers discard the whole header. The usual causes are semicolons instead of commas between features, uppercase feature names, single-quoted keywords like 'self' copied from Feature-Policy, and missing closing parentheses. Unknown feature names and unquoted origins are skipped without breaking the rest.",
    },
    {
      question: "How is Permissions-Policy different from Feature-Policy?",
      answer:
        "Permissions-Policy replaced Feature-Policy. The old header used name 'self' https://a.example; name2 'none', while the new one uses name=(self \"https://a.example\"), name2=(). Browsers that implement Permissions-Policy do not read the old syntax in the new header, so convert it rather than renaming the header.",
    },
    {
      question: "Which features should I disable?",
      answer:
        "Disable anything your site does not use, so a compromised script or embedded ad cannot use it either. Many sites start with camera=(), microphone=(), geolocation=(), payment=(), usb=() and browsing-topics=(), then allow specific features for their own origin as pages need them.",
    },
  ],
};
