import type { ToolContent } from "@/content/types";

export const httpStatusCodesContent: ToolContent = {
  howToUse: [
    "Type a status code such as 404 to see what it means, which class it belongs to and which specification defines it. Type part of a code (41) or a class (5xx) to list every code that starts with it.",
    "Search by words instead to find the right code for a situation: rate limit, gateway, validation or not modified. Codes whose name matches come first, then codes whose description does. Older names such as Payload Too Large and Unprocessable Entity still find their code.",
    "Use the class switch to narrow the list to one family. A three-digit code that is not registered, such as 499 or 520, is explained by its class, since clients treat an unknown code like the x00 code of its class.",
  ],
  examples: [
    {
      title: "Look up a single code",
      input: "404",
      output: "404 Not Found · Client error · RFC 9110 §15.5.5 · cacheable by default",
    },
    {
      title: "Find the code for a situation",
      note: "Every word has to match the name, an alias or the description.",
      input: "too many",
      output: "429 Too Many Requests",
    },
    {
      title: "An unregistered code",
      note: "499 is used by nginx when the client closes the connection, but it is not in the IANA registry.",
      input: "499",
      output: "Not registered · 4xx client error · treated as 400 Bad Request",
    },
  ],
  faq: [
    {
      question: "What is the difference between 401 and 403?",
      answer:
        "401 Unauthorized means the request has no valid credentials, so the client should log in or refresh its token and try again; the response must include a WWW-Authenticate header. 403 Forbidden means the server knows, or does not need to know, who is asking and refuses anyway, so sending the same credentials again will not help.",
    },
    {
      question: "Should I use 301, 302, 307 or 308 for a redirect?",
      answer:
        "Use 301 or 308 when the move is permanent and 302 or 307 when it is temporary. The difference within each pair is the method: with 301 and 302 clients may turn a POST into a GET when following the redirect, while 307 and 308 require the same method and body. For a plain page move 301 is fine; for an API endpoint that accepts POST, use 308 or 307.",
    },
    {
      question: "Is 422 or 400 the right code for a validation error?",
      answer:
        "Both are used. 400 Bad Request suits a request the server cannot parse at all, such as invalid JSON. 422 Unprocessable Content, standardised for all of HTTP in RFC 9110, suits a request that parses but fails validation, such as a missing required field or an email address in the wrong format. Pick one convention and use it across the API.",
    },
    {
      question: "What is the difference between 502, 503 and 504?",
      answer:
        "All three usually come from a proxy or load balancer rather than your application. 502 Bad Gateway means the upstream server answered with something invalid or dropped the connection. 503 Service Unavailable means the server is overloaded or down for maintenance and may say when to retry. 504 Gateway Timeout means the upstream server did not answer in time.",
    },
    {
      question: "Why are 413 and 422 called different names in different places?",
      answer:
        "RFC 9110, published in 2022, renamed 413 Payload Too Large to Content Too Large and 422 Unprocessable Entity to Unprocessable Content. The numbers and meanings did not change, so libraries and documentation written earlier still use the old reason phrases. This tool shows the current name and finds the code by either.",
    },
    {
      question: "What does it mean when a code is not registered?",
      answer:
        "Servers, proxies and CDNs sometimes send codes that are not in the IANA registry, such as 499 from nginx or 520 to 527 from Cloudflare. They only have meaning for that product. RFC 9110 requires a client to understand the class of any code, so an unrecognised 4xx is handled like 400 Bad Request and an unrecognised 5xx like 500 Internal Server Error.",
    },
  ],
};
