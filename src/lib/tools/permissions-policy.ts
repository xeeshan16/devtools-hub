import { err, ok, type ToolResult } from "./result";

/** Who a policy lets use a feature. */
export type PermissionsAccess = "none" | "self" | "origins" | "all";

/** One feature from a `Permissions-Policy` header, after the last duplicate wins. */
export type PermissionsFeature = {
  /** Feature name as written (structured-field keys are lowercase). */
  name: string;
  /** The allowlist as written, e.g. `(self "https://example.com")`. */
  allowlist: string;
  access: PermissionsAccess;
  /** True when the page's own origin is allowed (`self` or `*`). */
  self: boolean;
  /** Origins allowed besides the page itself, normalized with the URL parser. */
  origins: string[];
  /** False for feature names no browser defines; browsers ignore them. */
  known: boolean;
  /** What the feature controls, or a note that it is not recognized. */
  description: string;
  /** What this allowlist does, in one sentence. */
  effect: string;
};

export type PermissionsPolicyResult = {
  features: PermissionsFeature[];
  /** False when the header is not a valid structured-field dictionary, so browsers ignore all of it. */
  valid: boolean;
  /** Mistakes that make browsers ignore the header or one feature, and settings worth a second look. */
  warnings: string[];
};

type Feature = { description: string; deprecated?: string };

const FEATURES: Record<string, Feature> = {
  accelerometer: { description: "Reading device acceleration through the Accelerometer sensor API." },
  "ambient-light-sensor": { description: "Reading ambient light levels through the AmbientLightSensor API." },
  "attribution-reporting": { description: "Registering ad clicks and conversions with the Attribution Reporting API." },
  autoplay: { description: "Playing audio and video automatically without a user gesture." },
  bluetooth: { description: "Talking to Bluetooth devices through Web Bluetooth." },
  "browsing-topics": { description: "Reading the user's interest topics through the Topics API." },
  camera: { description: "Using video input devices through getUserMedia()." },
  "clipboard-read": { description: "Reading the clipboard through navigator.clipboard.read()." },
  "clipboard-write": { description: "Writing to the clipboard through navigator.clipboard.write()." },
  "compute-pressure": { description: "Observing CPU pressure through the Compute Pressure API." },
  "cross-origin-isolated": { description: "Using APIs that need cross-origin isolation, such as SharedArrayBuffer." },
  "display-capture": { description: "Capturing the screen through getDisplayMedia()." },
  "document-domain": {
    description: "Setting document.domain to relax the same-origin policy.",
    deprecated: "Browsers are removing document.domain setting, so this feature has little effect.",
  },
  "encrypted-media": { description: "Playing DRM-protected media through Encrypted Media Extensions." },
  fullscreen: { description: "Entering fullscreen through Element.requestFullscreen()." },
  gamepad: { description: "Reading game controllers through the Gamepad API." },
  geolocation: { description: "Reading the device location through the Geolocation API." },
  gyroscope: { description: "Reading device rotation through the Gyroscope sensor API." },
  hid: { description: "Talking to HID devices such as keyboards and game controllers through WebHID." },
  "identity-credentials-get": { description: "Signing in with a federated identity provider through FedCM." },
  "idle-detection": { description: "Detecting when the user is idle through the Idle Detection API." },
  "interest-cohort": {
    description: "Opting out of FLoC interest cohorts.",
    deprecated: "FLoC was replaced by the Topics API; use browsing-topics instead. Chrome logs an error for this name.",
  },
  "keyboard-map": { description: "Reading the keyboard layout through navigator.keyboard.getLayoutMap()." },
  "local-fonts": { description: "Listing installed fonts through the Local Font Access API." },
  magnetometer: { description: "Reading the magnetic field through the Magnetometer sensor API." },
  microphone: { description: "Using audio input devices through getUserMedia()." },
  midi: { description: "Talking to MIDI devices through Web MIDI." },
  "otp-credentials": { description: "Reading one-time codes from SMS through the WebOTP API." },
  payment: { description: "Starting payments through the Payment Request API." },
  "picture-in-picture": { description: "Playing video in a picture-in-picture window." },
  "publickey-credentials-create": { description: "Creating passkeys and other WebAuthn credentials." },
  "publickey-credentials-get": { description: "Signing in with passkeys and other WebAuthn credentials." },
  "screen-wake-lock": { description: "Keeping the screen on through the Screen Wake Lock API." },
  serial: { description: "Talking to serial ports through Web Serial." },
  "speaker-selection": { description: "Choosing audio output devices through selectAudioOutput()." },
  "storage-access": { description: "Requesting access to unpartitioned cookies through the Storage Access API." },
  "sync-xhr": { description: "Making synchronous XMLHttpRequest calls." },
  usb: { description: "Talking to USB devices through WebUSB." },
  "web-share": { description: "Opening the system share sheet through navigator.share()." },
  "window-management": { description: "Placing windows across multiple screens through the Window Management API." },
  "xr-spatial-tracking": { description: "Using VR and AR sessions through WebXR." },
};

const PREFIX = /^(?:[<>]\s*)?permissions-policy\s*:\s*/i;
const FEATURE_POLICY_PREFIX = /^(?:[<>]\s*)?feature-policy\s*:\s*/i;
const SEMICOLONS = 'Features are separated by commas, not semicolons. Found ";"';
const EXAMPLE = "camera=(), geolocation=(self), microphone=()";

/**
 * Parses a `Permissions-Policy` header (optionally prefixed with the header
 * name or curl -v markers). The header is a structured-field dictionary
 * (RFC 9651): if it does not parse, browsers ignore the whole header. Each
 * value is an allowlist: `*`, `self`, a quoted origin, or an inner list of
 * those, where `()` disables the feature everywhere. Several header lines are
 * combined with commas, as HTTP does. Legacy `Feature-Policy` syntax is
 * detected and the equivalent header is suggested.
 */
export function parsePermissionsPolicy(input: string): ToolResult<PermissionsPolicyResult | null> {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines.length === 0) return ok(null);

  const legacy = lines.some((line) => FEATURE_POLICY_PREFIX.test(line)) || lines.some(looksLikeFeaturePolicy);
  if (legacy) {
    const converted = convertFeaturePolicy(lines.map((line) => line.replace(FEATURE_POLICY_PREFIX, "")).join("; "));
    return err(
      converted
        ? `This is Feature-Policy syntax, which Permissions-Policy does not accept. The equivalent header is: Permissions-Policy: ${converted}`
        : `This is Feature-Policy syntax, which Permissions-Policy does not accept. A Permissions-Policy header looks like: ${EXAMPLE}`,
    );
  }

  const header = lines.map((line) => line.replace(PREFIX, "")).join(", ");
  const parsed = parseDictionary(header);
  if (!parsed.ok) {
    return ok({
      features: [],
      valid: false,
      warnings: [`${parsed.error} Browsers ignore the whole header when it does not parse.`],
    });
  }
  if (parsed.value.length === 0) {
    return err(`No features found. A Permissions-Policy header looks like: ${EXAMPLE}`);
  }

  const warnings: string[] = [];
  const byName = new Map<string, PermissionsFeature>();
  for (const member of parsed.value) {
    if (byName.has(member.key)) {
      warnings.push(`${member.key} appears more than once; only the last value (${member.raw}) is used.`);
      byName.delete(member.key);
    }
    byName.set(member.key, interpret(member, warnings));
  }

  return ok({ features: [...byName.values()], valid: true, warnings });
}

type Item = { kind: "token" | "string" | "number" | "boolean"; value: string };
type Member = { key: string; raw: string; items: Item[] | null; params: string[] };

function interpret(member: Member, warnings: string[]): PermissionsFeature {
  const spec = Object.hasOwn(FEATURES, member.key) ? FEATURES[member.key] : undefined;
  const description = spec?.description ?? "Not a feature browsers recognize, so this entry has no effect.";
  if (!spec) {
    const suggestion = suggest(member.key);
    warnings.push(`Unknown feature "${member.key}"; browsers ignore it.${suggestion ? ` Did you mean ${suggestion}?` : ""}`);
  } else if (spec.deprecated) {
    warnings.push(`${member.key}: ${spec.deprecated}`);
  }
  if (member.params.some((p) => p !== "report-to")) {
    warnings.push(`${member.key} has parameters other than report-to; browsers ignore them.`);
  }

  const base = { name: member.key, allowlist: member.raw, known: Boolean(spec), description };

  if (member.items === null) {
    warnings.push(
      `${member.key} has no allowlist, which browsers read as an empty one: the feature is disabled everywhere. Write ${member.key}=() to say so explicitly, or ${member.key}=(self) to allow it on your own origin.`,
    );
  }
  const items = member.items ?? [];

  let all = false;
  let self = false;
  const origins: string[] = [];
  for (const item of items) {
    if (item.kind === "token" && item.value === "*") {
      all = true;
    } else if (item.kind === "token" && item.value === "self") {
      self = true;
    } else if (item.kind === "token" && item.value === "src") {
      warnings.push(`${member.key}: src only applies to an iframe's allow attribute, not to the header; it is ignored here.`);
    } else if (item.kind === "string") {
      const origin = toOrigin(item.value);
      if (origin === null) {
        warnings.push(`${member.key}: "${item.value}" is not a valid origin, so it is ignored. Use a full origin such as "https://example.com".`);
      } else {
        if (!origins.includes(origin)) origins.push(origin);
        if (origin !== item.value.replace(/\/$/, "")) {
          warnings.push(`${member.key}: only the origin of "${item.value}" is used (${origin}); paths and queries are ignored.`);
        }
      }
    } else if (item.kind === "token" && /^https?:\/\//i.test(item.value)) {
      warnings.push(`${member.key}: origins must be quoted, e.g. "${item.value}"; unquoted, ${item.value} is ignored.`);
    } else {
      warnings.push(`${member.key}: ${item.value} is not a valid allowlist entry; only *, self and quoted origins are, so it is ignored.`);
    }
  }

  if (all) {
    if (items.length > 1) warnings.push(`${member.key}: * already allows every origin, so the other entries are redundant.`);
    return {
      ...base,
      access: "all",
      self: true,
      origins: [],
      effect: "Allowed on this page and in frames from any origin; cross-origin iframes still need an allow attribute for most features.",
    };
  }
  if (origins.length > 0) {
    if (!self) {
      warnings.push(`${member.key} lists origins without self, so the feature is blocked on your own page and only allowed in frames from those origins.`);
    }
    return {
      ...base,
      access: "origins",
      self,
      origins,
      effect: `${self ? "Allowed on this page and" : "Blocked on this page; allowed only"} in frames from ${origins.join(", ")}, which also need an allow attribute.`,
    };
  }
  if (self) {
    return { ...base, access: "self", self: true, origins: [], effect: "Allowed on this page and in same-origin frames; blocked in cross-origin frames." };
  }
  return { ...base, access: "none", self: false, origins: [], effect: "Disabled everywhere: this page and every embedded frame." };
}

/** Returns the serialized origin of an http(s) URL, or null when it is not one. */
function toOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Suggests a known feature for misspellings such as `geo_location` or `Camera`. */
function suggest(name: string): string | null {
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const target = squash(name);
  if (!target) return null;
  return Object.keys(FEATURES).find((known) => squash(known) === target) ?? null;
}

/** Feature-Policy uses `name 'self' https://a.example; name2 'none'`: quoted keywords or a space-separated list. */
function looksLikeFeaturePolicy(line: string): boolean {
  const body = line.replace(PREFIX, "");
  if (body.includes("=")) return false;
  return /'(?:self|none|src)'/i.test(body) || /^[a-z-]+\s+(?:\*|'|https?:)/i.test(body);
}

/** Converts a Feature-Policy header to Permissions-Policy, or returns null when a directive can't be read. */
function convertFeaturePolicy(header: string): string | null {
  const parts = header
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const [name, ...values] = part.split(/\s+/);
    if (!/^[a-z][a-z0-9-]*$/i.test(name)) return null;
    const key = name.toLowerCase();
    if (values.length === 0 || values.some((v) => v.toLowerCase() === "'none'")) {
      out.push(`${key}=()`);
    } else if (values.includes("*")) {
      out.push(`${key}=*`);
    } else {
      const items = values.map((v) => {
        const lower = v.toLowerCase();
        if (lower === "'self'") return "self";
        if (lower === "'src'") return "src";
        return `"${v.replace(/["\\]/g, "")}"`;
      });
      out.push(`${key}=(${items.join(" ")})`);
    }
  }
  return out.length > 0 ? out.join(", ") : null;
}

/**
 * A small structured-field dictionary parser (RFC 9651 §4.2.2) covering what a
 * Permissions-Policy header can contain: tokens, strings, numbers, booleans,
 * inner lists and parameters. Errors name the character position.
 */
function parseDictionary(input: string): ToolResult<Member[]> {
  const s = input.trim();
  let i = 0;
  const members: Member[] = [];

  const fail = (message: string) => err<Member[]>(`${message} (at character ${i + 1}).`);
  const skipOws = () => {
    while (s[i] === " " || s[i] === "\t") i++;
  };

  while (i < s.length) {
    const key = parseKey();
    if (key === null) {
      const ch = s[i];
      return fail(
        /[A-Z]/.test(ch)
          ? `Feature names must be lowercase, but found "${ch}"`
          : `Expected a feature name but found "${ch}"`,
      );
    }
    const start = i;
    let items: Item[] | null = null;
    if (s[i] === "=") {
      i++;
      if (s[i] === "(") {
        i++;
        items = [];
        for (;;) {
          while (s[i] === " ") i++;
          if (s[i] === ")") {
            i++;
            break;
          }
          if (i >= s.length) return fail("Missing closing parenthesis");
          const item = parseBareItem();
          if (!item.ok) return fail(item.error);
          items.push(item.value);
          const params = parseParams();
          if (!params.ok) return fail(params.error);
          if (i >= s.length) return fail("Missing closing parenthesis");
          if (s[i] !== " " && s[i] !== ")") return fail(`Expected a space or ")" between entries but found "${s[i] ?? "end of header"}"`);
        }
      } else {
        const item = parseBareItem();
        if (!item.ok) return fail(item.error);
        items = [item.value];
      }
    }
    const raw = items === null ? "" : s.slice(start + 1, i);
    const params = parseParams();
    if (!params.ok) return fail(params.error);
    members.push({ key, raw, items, params: params.value });

    skipOws();
    if (i >= s.length) break;
    if (s[i] !== ",") {
      return fail(
        s[i] === ";" ? SEMICOLONS : `Expected "," after ${key} but found "${s[i]}"`,
      );
    }
    i++;
    skipOws();
    if (i >= s.length) return fail("Trailing comma after the last feature");
  }
  return ok(members);

  function parseKey(): string | null {
    const match = /^[a-z*][a-z0-9_\-.*]*/.exec(s.slice(i));
    if (!match) return null;
    i += match[0].length;
    return match[0];
  }

  function parseParams(): ToolResult<string[]> {
    const names: string[] = [];
    while (s[i] === ";") {
      i++;
      while (s[i] === " ") i++;
      const key = parseKey();
      if (key === null) return err(`Expected a parameter name but found "${s[i] ?? "end of header"}"`);
      if (Object.hasOwn(FEATURES, key)) return err(SEMICOLONS);
      names.push(key);
      if (s[i] === "=") {
        i++;
        if (s[i] === "(") return err(SEMICOLONS);
        const value = parseBareItem();
        if (!value.ok) return err(value.error);
      }
    }
    return ok(names);
  }

  function parseBareItem(): ToolResult<Item> {
    const ch = s[i];
    if (ch === '"') {
      let value = "";
      i++;
      while (i < s.length) {
        const c = s[i++];
        if (c === "\\") {
          const next = s[i++];
          if (next !== '"' && next !== "\\") return err("Only \\\" and \\\\ escapes are allowed in strings");
          value += next;
        } else if (c === '"') {
          return ok({ kind: "string", value });
        } else {
          value += c;
        }
      }
      return err("Unterminated string; a closing double quote is missing");
    }
    if (ch === "'") return err("Origins and keywords use double quotes or none at all, not single quotes like Feature-Policy");
    if (ch !== undefined && /[A-Za-z*]/.test(ch)) {
      const match = /^[A-Za-z*][!#$%&'*+\-.^_`|~0-9A-Za-z:/]*/.exec(s.slice(i))!;
      i += match[0].length;
      return ok({ kind: "token", value: match[0] });
    }
    if (ch !== undefined && /[-0-9]/.test(ch)) {
      const match = /^-?\d+(?:\.\d+)?/.exec(s.slice(i));
      if (!match) return err(`Invalid number`);
      i += match[0].length;
      return ok({ kind: "number", value: match[0] });
    }
    if (ch === "?" && (s[i + 1] === "0" || s[i + 1] === "1")) {
      i += 2;
      return ok({ kind: "boolean", value: `?${s[i - 1]}` });
    }
    return err(`Expected an allowlist entry but found "${ch ?? "end of header"}"`);
  }
}
