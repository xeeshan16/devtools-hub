import { describe, expect, it } from "vitest";
import {
  convertCurl,
  curlUrlEncode,
  parseCurl,
  tokenizeShell,
  toFetch,
  type CurlConversion,
  type CurlRequest,
} from "./curl";

function tokens(input: string): string[] {
  const result = tokenizeShell(input);
  if (!result.ok) throw new Error(result.error);
  return result.value.tokens;
}

function convert(input: string): CurlConversion {
  const result = convertCurl(input);
  if (!result.ok) throw new Error(result.error);
  if (!result.value) throw new Error("empty");
  return result.value;
}

function request(input: string): CurlRequest {
  return convert(input).request;
}

function errorOf(input: string): string {
  const result = parseCurl(input);
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("tokenizeShell", () => {
  it("splits on whitespace and honours quotes", () => {
    expect(tokens(`curl -H 'A: b c' "x y" z`)).toEqual(["curl", "-H", "A: b c", "x y", "z"]);
  });

  it("keeps single-quoted text literal", () => {
    expect(tokens(`'a\\n$HOME "q"'`)).toEqual([`a\\n$HOME "q"`]);
  });

  it("handles escapes inside double quotes", () => {
    expect(tokens(`"say \\"hi\\" \\$5 \\n"`)).toEqual([`say "hi" $5 \\n`]);
  });

  it("joins backslash-continued lines, LF and CRLF", () => {
    expect(tokens("curl \\\n  -s \\\r\n  example.com")).toEqual(["curl", "-s", "example.com"]);
  });

  it("decodes $'…' ANSI-C quoting", () => {
    expect(tokens(`$'a\\nb\\t\\x41\\u00e9\\''`)).toEqual(["a\nb\tAé'"]);
  });

  it("keeps empty quoted arguments and joins adjacent quotes", () => {
    expect(tokens(`a '' "b"'c'd`)).toEqual(["a", "", "bcd"]);
  });

  it("stops at an unquoted pipe and reports it", () => {
    const result = tokenizeShell(`curl example.com | jq . "|"`);
    expect(result).toEqual({ ok: true, value: { tokens: ["curl", "example.com"], stoppedAt: "|" } });
  });

  it("skips comments", () => {
    expect(tokens("curl example.com # fetch it\n")).toEqual(["curl", "example.com"]);
  });

  it("rejects unterminated quotes", () => {
    expect(tokenizeShell(`curl 'abc`).ok).toBe(false);
    expect(tokenizeShell(`curl "abc`).ok).toBe(false);
  });
});

describe("parseCurl", () => {
  it("returns null for empty input", () => {
    expect(parseCurl("   ")).toEqual({ ok: true, value: null });
  });

  it("requires a curl command and a URL", () => {
    expect(errorOf("wget https://example.com")).toMatch(/starts with curl/);
    expect(errorOf("curl -s")).toMatch(/No URL/);
    expect(errorOf("curl -H")).toMatch(/needs a value/);
  });

  it("accepts a leading shell prompt and a path to curl", () => {
    expect(request("$ /usr/bin/curl https://example.com").url).toBe("https://example.com");
  });

  it("defaults to GET and assumes http:// like curl", () => {
    const r = request("curl example.com/a");
    expect(r.method).toBe("GET");
    expect(r.url).toBe("http://example.com/a");
    expect(r.body).toBeNull();
  });

  it("reads -X, including the attached form -XPUT", () => {
    expect(request("curl -X DELETE https://x.dev/1").method).toBe("DELETE");
    expect(request("curl -XPUT https://x.dev/1").method).toBe("PUT");
    expect(request("curl --request PATCH https://x.dev/1").method).toBe("PATCH");
  });

  it("expands clustered short flags", () => {
    const { request: r, warnings } = convert("curl -sSLk https://x.dev");
    expect(r.method).toBe("GET");
    expect(warnings).toEqual([expect.stringMatching(/insecure/)]);
  });

  it("parses headers, trims values and skips removals", () => {
    const r = request(`curl -H 'Accept:  text/plain' -H 'X-Empty;' -H 'User-Agent:' https://x.dev`);
    expect(r.headers).toEqual([
      ["Accept", "text/plain"],
      ["X-Empty", ""],
    ]);
  });

  it("makes -d a form-encoded POST and joins repeated -d with &", () => {
    const r = request("curl -d a=1 --data b=2 https://x.dev");
    expect(r.method).toBe("POST");
    expect(r.body).toEqual({ kind: "text", value: "a=1&b=2" });
    expect(r.headers).toContainEqual(["Content-Type", "application/x-www-form-urlencoded"]);
  });

  it("keeps an explicit Content-Type and an explicit method", () => {
    const r = request(`curl -X PUT -H 'content-type: application/json' -d '{"a":1}' https://x.dev`);
    expect(r.method).toBe("PUT");
    expect(r.headers).toEqual([["content-type", "application/json"]]);
  });

  it("sets JSON headers for --json", () => {
    const r = request(`curl --json '{"a":1}' https://x.dev`);
    expect(r.method).toBe("POST");
    expect(r.headers).toEqual([
      ["Content-Type", "application/json"],
      ["Accept", "application/json"],
    ]);
  });

  it("URL-encodes --data-urlencode the way curl does", () => {
    expect(request("curl --data-urlencode 'q=a b&c' https://x.dev").body).toEqual({
      kind: "text",
      value: "q=a%20b%26c",
    });
    expect(request("curl --data-urlencode '=x y' https://x.dev").body).toEqual({ kind: "text", value: "x%20y" });
    expect(request("curl --data-urlencode \"it's\" https://x.dev").body).toEqual({ kind: "text", value: "it%27s" });
  });

  it("moves data into the query string with -G", () => {
    const r = request("curl -G -d q=go -d page=2 'https://x.dev/search?lang=en#top'");
    expect(r.method).toBe("GET");
    expect(r.body).toBeNull();
    expect(r.url).toBe("https://x.dev/search?lang=en&q=go&page=2#top");
  });

  it("uses HEAD for -I", () => {
    expect(request("curl -I https://x.dev").method).toBe("HEAD");
  });

  it("turns -u into a Basic Authorization header, UTF-8 safe", () => {
    expect(request("curl -u alice:s3cret https://x.dev").headers).toEqual([
      ["Authorization", "Basic YWxpY2U6czNjcmV0"],
    ]);
    expect(request("curl -u josé:pw https://x.dev").headers).toEqual([["Authorization", "Basic am9zw6k6cHc="]]);
  });

  it("warns when -u has no password", () => {
    const { request: r, warnings } = convert("curl -u alice https://x.dev");
    expect(r.headers).toEqual([["Authorization", "Basic YWxpY2U6"]]);
    expect(warnings[0]).toMatch(/no password/);
  });

  it("does not override an explicit Authorization header", () => {
    const r = request("curl -u a:b -H 'Authorization: Bearer t' https://x.dev");
    expect(r.headers).toEqual([["Authorization", "Bearer t"]]);
  });

  it("maps -A, -e, -b, -r and --oauth2-bearer to headers", () => {
    const { request: r, warnings } = convert(
      "curl -A bot/1 -e https://ref.dev -b 'a=1' -r 0-99 --oauth2-bearer tok https://x.dev",
    );
    expect(r.headers).toEqual([
      ["User-Agent", "bot/1"],
      ["Referer", "https://ref.dev"],
      ["Cookie", "a=1"],
      ["Range", "bytes=0-99"],
      ["Authorization", "Bearer tok"],
    ]);
    expect(warnings).toEqual([expect.stringMatching(/Cookie header/)]);
  });

  it("collects -F fields and files into a multipart body", () => {
    const { request: r, warnings } = convert(
      "curl -H 'Content-Type: multipart/form-data' -F name=Ada -F 'avatar=@./img/me.png;type=image/png' https://x.dev",
    );
    expect(r.method).toBe("POST");
    expect(r.headers).toEqual([]);
    expect(r.body).toEqual({
      kind: "form",
      fields: [
        { name: "name", value: "Ada", file: false },
        { name: "avatar", value: "./img/me.png", file: true },
      ],
    });
    expect(warnings[0]).toMatch(/boundary/);
  });

  it("treats --form-string values literally", () => {
    expect(request("curl --form-string 'note=@home' https://x.dev").body).toEqual({
      kind: "form",
      fields: [{ name: "note", value: "@home", file: false }],
    });
  });

  it("rejects mixing -d and -F", () => {
    expect(errorOf("curl -d a=1 -F b=2 https://x.dev")).toMatch(/mixes -d and -F/);
  });

  it("converts --max-time to milliseconds", () => {
    expect(request("curl -m 2.5 https://x.dev").timeoutMs).toBe(2500);
    expect(convert("curl --max-time soon https://x.dev").warnings[0]).toMatch(/positive number/);
  });

  it("warns about unsupported options, files and extra URLs", () => {
    const { warnings } = convert("curl --proxy http://p:8080 -d @body.json --frobnicate https://a.dev https://b.dev");
    expect(warnings).toEqual([
      expect.stringMatching(/proxy/),
      expect.stringMatching(/reads the body from a file/),
      expect.stringMatching(/--frobnicate is not supported/),
      expect.stringMatching(/only the first, https:\/\/a\.dev/),
    ]);
  });

  it("stays quiet about options with no effect on the request", () => {
    expect(convert("curl -sSL --compressed -o out.html -w '%{http_code}' https://x.dev").warnings).toEqual([]);
  });

  it("warns when a GET request would carry a body", () => {
    expect(convert("curl -X GET -d a=1 https://x.dev").warnings).toEqual([
      expect.stringMatching(/GET request has a body/),
    ]);
  });

  it("treats arguments after -- as URLs", () => {
    expect(request("curl -- -weird.example").url).toBe("http://-weird.example");
  });
});

describe("toFetch", () => {
  it("renders a bare GET as a one-liner", () => {
    expect(convert("curl https://api.example.com/users").code).toBe(
      `const response = await fetch("https://api.example.com/users");`,
    );
  });

  it("renders method, headers and a pretty JSON body", () => {
    const code = convert(
      `curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -H 'Authorization: Bearer abc' -d '{"name":"Ada","tags":["x"]}'`,
    ).code;
    expect(code).toBe(
      [
        `const response = await fetch("https://api.example.com/users", {`,
        `  method: "POST",`,
        `  headers: {`,
        `    "Content-Type": "application/json",`,
        `    "Authorization": "Bearer abc",`,
        `  },`,
        `  body: JSON.stringify({`,
        `    "name": "Ada",`,
        `    "tags": [`,
        `      "x"`,
        `    ]`,
        `  }),`,
        `});`,
      ].join("\n"),
    );
  });

  it("keeps a JSON body that does not parse as a plain string", () => {
    expect(convert(`curl --json '{"a":' https://x.dev`).code).toContain(`body: "{\\"a\\":",`);
  });

  it("escapes strings safely", () => {
    expect(convert(`curl -d $'line1\\nline2 "q"' https://x.dev`).code).toContain(
      `body: "line1\\nline2 \\"q\\"",`,
    );
  });

  it("renders multipart bodies with FormData", () => {
    expect(convert("curl -F name=Ada -F file=@docs/cv.pdf https://x.dev/upload").code).toBe(
      [
        `const form = new FormData();`,
        `form.append("name", "Ada");`,
        `form.append("file", new Blob([/* contents of docs/cv.pdf */]), "cv.pdf");`,
        ``,
        `const response = await fetch("https://x.dev/upload", {`,
        `  method: "POST",`,
        `  body: form,`,
        `});`,
      ].join("\n"),
    );
  });

  it("merges repeated headers the way fetch would", () => {
    const code = toFetch({
      url: "https://x.dev",
      method: "GET",
      headers: [
        ["Accept", "text/html"],
        ["accept", "application/json"],
        ["Cookie", "a=1"],
        ["Cookie", "b=2"],
      ],
      body: null,
      timeoutMs: null,
    });
    expect(code).toContain(`"Accept": "text/html, application/json",`);
    expect(code).toContain(`"Cookie": "a=1; b=2",`);
    expect(code).not.toContain("method");
  });

  it("adds an abort signal for --max-time", () => {
    expect(convert("curl -m 10 https://x.dev").code).toContain("  signal: AbortSignal.timeout(10000),");
  });
});

describe("curlUrlEncode", () => {
  it("encodes everything but unreserved characters", () => {
    expect(curlUrlEncode("a-b_c.d~e !'()*/é")).toBe("a-b_c.d~e%20%21%27%28%29%2A%2F%C3%A9");
  });
});
