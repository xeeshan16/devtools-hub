import type { ToolContent } from "@/content/types";

export const basicAuthContent: ToolContent = {
  howToUse: [
    "Choose Encode and type a username and password to get the Authorization header line, the header value and the base64 credentials on their own, each with a copy button. Everything is computed in your browser as you type.",
    "Choose Decode and paste a full header line such as Authorization: Basic …, just the Basic … value, or the bare base64 token to see the username and password. Proxy-Authorization headers work too, and the scheme name is case-insensitive.",
    "Mistakes that make a server answer 401 are reported specifically: a colon in the username, control characters, a Bearer or Digest header instead of Basic, base64url characters, wrong padding, a truncated value or credentials with no colon. Non-ASCII credentials are encoded as UTF-8, and decoded bytes that are not UTF-8 are read as ISO-8859-1.",
  ],
  examples: [
    {
      title: "Build a header",
      note: "The example from RFC 7617, username Aladdin and password open sesame.",
      input: "Aladdin / open sesame",
      output: "Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==",
    },
    {
      title: "Decode a header",
      note: "The value splits at the first colon, so a password may contain colons.",
      input: "Basic dXNlcjpwYTpzcw==",
      output: "Username: user\nPassword: pa:ss",
    },
    {
      title: "Non-ASCII password",
      note: "£ is encoded as its two UTF-8 bytes, C2 A3, as RFC 7617 recommends.",
      input: "test / 123£",
      output: "Authorization: Basic dGVzdDoxMjPCow==",
    },
  ],
  faq: [
    {
      question: "Are my credentials sent anywhere?",
      answer:
        "No. The header is built and decoded with plain JavaScript in your browser. Nothing you type is uploaded, logged or stored. Even so, prefer test credentials over real production passwords in any online tool.",
    },
    {
      question: "Is Basic authentication secure?",
      answer:
        "Base64 is an encoding, not encryption: anyone who sees the header can read the password, as this tool shows. Basic auth is only safe over HTTPS, and because the browser or client resends the credentials with every request, long-lived API keys or tokens are usually a better fit than a user's real password.",
    },
    {
      question: "Why can't the username contain a colon?",
      answer:
        "The header encodes username:password as one string, and servers split it at the first colon. A colon in the username would move part of it into the password, so RFC 7617 forbids it. A colon in the password is fine, since everything after the first colon belongs to the password.",
    },
    {
      question: "Which character encoding does Basic auth use?",
      answer:
        "RFC 7617 lets a server ask for UTF-8 with charset=\"UTF-8\" in its WWW-Authenticate challenge, and modern clients use UTF-8. Older clients often sent ISO-8859-1, so a password with accented letters or symbols such as £ can produce different bytes and fail on legacy servers. Plain ASCII credentials encode the same either way.",
    },
    {
      question: "How does curl -u relate to this header?",
      answer:
        "curl -u user:password builds exactly this header: it base64-encodes user:password and sends Authorization: Basic followed by the result. Pasting the header line from this tool into curl with -H sends the same request. Either way the credentials end up in your shell history, and base64 is as easy to read as plain text, so use a test account or clear the history afterwards.",
    },
  ],
};
