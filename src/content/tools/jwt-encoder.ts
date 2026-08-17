import type { ToolContent } from "@/content/types";

export const jwtEncoderContent: ToolContent = {
  howToUse: [
    "This is an educational and testing tool, not a place to sign tokens with a real production secret — see the warning above the fields for why.",
    "Edit the header and payload as JSON, choose an algorithm, and enter a secret key. The signed token appears in the output panel automatically once a payload and a secret are both present — there is no sign button to press.",
    "Changing the algorithm updates the header's alg claim to match, as long as you have not hand-edited the header yourself. If you have — to add a kid claim, for example — your edit is left alone.",
    "Signing runs entirely in your browser using the Web Crypto API's HMAC implementation, the same primitive a server-side JWT library calls. Nothing you type — header, payload, or secret — is transmitted, logged or stored anywhere.",
  ],
  examples: [
    {
      title: "The canonical jwt.io example",
      note: "HS256, secret \"your-256-bit-secret\" — a widely-known reference token.",
      input: '{"sub":"1234567890","name":"John Doe","iat":1516239022}',
      output:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    },
    {
      title: "Same payload, a different secret",
      note: "Changing only the secret produces a completely different signature.",
      input: 'Same header and payload · secret "a-different-secret"',
      output:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.NmiVtilivmBRledPcmm5nD_NWDy1rYX8v1ce8f2r4dA",
    },
    {
      title: "Same payload, a stronger algorithm",
      note: "HS512 produces a longer signature than HS256 for identical input.",
      input: 'Same payload and secret "your-256-bit-secret" · algorithm HS512',
      output:
        "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.pazba9Pj009HgANP4pTCQAHpXNU7pVbjIGff_plktSzsa9rXTGzFngaawzXGEO6Q0Hx5dtGi-dMDlIadV81o3Q",
    },
  ],
  faq: [
    {
      question: "Is it safe to type a real secret key into this page?",
      answer:
        "Treat any secret you paste anywhere as potentially compromised — that includes here. Signing happens entirely in your browser and the secret is never transmitted, but this tool exists for testing and learning, not for producing tokens meant for a real system. Use a disposable value, and rotate any real secret you accidentally paste into any web tool.",
    },
    {
      question: "Why is there no RS256 or other asymmetric algorithm option?",
      answer:
        "Only the HMAC family (HS256, HS384, HS512) is offered, because those need only a single shared secret. RS256 and similar algorithms need a full public/private key pair — generating and importing one safely is real added complexity that is out of scope for a lightweight testing tool like this one.",
    },
    {
      question: "How is the signature actually computed?",
      answer:
        "The header and payload are each JSON-serialized and Base64URL-encoded, joined with a dot, and that string is signed with HMAC using your chosen hash (SHA-256, SHA-384 or SHA-512) and your secret as the key, via the browser's native Web Crypto API. The signature is Base64URL-encoded and appended as the third segment — exactly the process any JWT library follows.",
    },
    {
      question: "I changed the algorithm but the header still says the old one.",
      answer:
        "That only happens after you have hand-edited the header yourself — the tool assumes a manual edit was deliberate and stops auto-updating it, in case you added something like a kid claim you don't want overwritten. Edit the alg field in the header directly, or clear it back to the default and switch algorithms again.",
    },
  ],
};
