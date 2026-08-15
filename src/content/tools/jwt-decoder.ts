import type { ToolContent } from "@/content/types";

export const jwtDecoderContent: ToolContent = {
  howToUse: [
    "Paste a JSON Web Token into the input panel. A leading Bearer prefix is stripped automatically, so you can paste an Authorization header straight from your network tab.",
    "The Claims panel summarises the registered claims: signing algorithm, issuer, subject, audience, and the validity window built from the iat, nbf and exp claims. An expired token is flagged in red.",
    "The three panels underneath show the decoded header, the decoded payload, and the raw signature segment, each with its own copy button.",
    "Decoding is done locally in your browser. The signature is not verified, because verification requires the issuer's secret or public key — something you should never paste into a web page.",
  ],
  examples: [
    {
      title: "Header segment",
      note: "The first dot-separated part, Base64URL-decoded.",
      input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
      output: `{
  "alg": "HS256",
  "typ": "JWT"
}`,
    },
    {
      title: "Payload segment",
      note: "The second part carries the claims.",
      input: "eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzE3MjQzMjAwfQ",
      output: `{
  "sub": "1234567890",
  "iat": 1717243200
}`,
    },
    {
      title: "Expiry check",
      note: "exp is Unix time in seconds, not milliseconds.",
      input: '"exp": 1717246800',
      output: "Expires: Sat, 01 Jun 2024 13:00:00 GMT",
    },
  ],
  faq: [
    {
      question: "Is it safe to paste a JWT here?",
      answer:
        "Decoding happens entirely in your browser — the token is never sent over the network, logged or stored. That said, a JWT is a live credential until it expires, so treat any token you paste anywhere with the same care as a password and prefer expired or test tokens when you can.",
    },
    {
      question: "Does this tool verify the signature?",
      answer:
        "No, and that is deliberate. Verifying requires the signing secret or public key, which belongs on your server and should never be pasted into a web page. This tool answers what is in the token; your backend must still answer whether the token is authentic.",
    },
    {
      question: "Why can anyone read my token's contents?",
      answer:
        "A standard JWT is signed, not encrypted. The header and payload are merely Base64URL-encoded, so anyone holding the token can read every claim in it. Never put passwords, secrets or sensitive personal data in a JWT payload — use JWE if the contents genuinely must be confidential.",
    },
    {
      question: "What do iat, nbf and exp mean?",
      answer:
        "They are registered time claims, each a Unix timestamp in seconds. iat is when the token was issued, nbf is the earliest time it may be accepted, and exp is when it stops being valid. Verifiers typically allow a small clock-skew tolerance of a minute or two around nbf and exp.",
    },
    {
      question: "Why does a token with alg set to none show an error?",
      answer:
        "The none algorithm means the token is unsigned, so anyone can forge one by editing the payload. It exists in the specification but is a well-known attack vector, and any library that accepts it in production is misconfigured. This tool flags it so you notice.",
    },
  ],
};
