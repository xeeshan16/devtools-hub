import { err, ok, type ToolResult } from "./result";

export type AddressKind =
  | "Public"
  | "Private (RFC 1918)"
  | "Shared address space (RFC 6598, carrier-grade NAT)"
  | "Loopback"
  | "Link-local"
  | "Multicast"
  | "Documentation (RFC 5737)"
  | "Reserved"
  | "This network"
  | "Limited broadcast";

export type Subnet = {
  /** The address as typed, normalized to dotted decimal. */
  address: string;
  prefix: number;
  netmask: string;
  /** The inverted mask, as used in ACLs and OSPF network statements. */
  wildcard: string;
  network: string;
  /** `null` for /31 and /32, which have no broadcast address. */
  broadcast: string | null;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
  /** The network in CIDR notation, e.g. `192.168.1.0/24`. */
  cidr: string;
  /** True when the typed address had host bits set, i.e. it is not the network address. */
  hostBitsSet: boolean;
  kind: AddressKind;
  /** The address and netmask as four dot-separated groups of eight bits. */
  binaryAddress: string;
  binaryNetmask: string;
};

/**
 * Parses a dotted-decimal IPv4 address into an unsigned 32-bit integer.
 * Octets with leading zeros are rejected: some tools read `010` as octal 8
 * and others as decimal 10, so accepting it would hide a real ambiguity.
 */
export function parseIpv4(input: string): ToolResult<number> {
  const trimmed = input.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 4) {
    return err(`An IPv4 address has 4 dot-separated numbers, such as 192.168.1.10; got ${parts.length}.`);
  }
  let value = 0;
  for (const [index, part] of parts.entries()) {
    const position = `octet ${index + 1}`;
    if (!/^\d+$/.test(part)) {
      return err(part ? `"${part}" in ${position} is not a number.` : `${capitalize(position)} is empty.`);
    }
    if (part.length > 1 && part.startsWith("0")) {
      return err(`"${part}" in ${position} has a leading zero; write it as ${Number.parseInt(part, 10)}.`);
    }
    const octet = Number.parseInt(part, 10);
    if (octet > 255) return err(`${capitalize(position)} is ${octet}; each number must be 0–255.`);
    value = value * 256 + octet;
  }
  return ok(value);
}

export function formatIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join(".");
}

/** The netmask for a prefix length, as an unsigned 32-bit integer. */
export function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/**
 * Converts a dotted netmask such as 255.255.255.0 to its prefix length.
 * The mask must be contiguous ones followed by zeros.
 */
export function maskToPrefix(mask: string): ToolResult<number> {
  const parsed = parseIpv4(mask);
  if (!parsed.ok) return err(`Netmask: ${parsed.error}`);
  const value = parsed.value;
  const inverted = ~value >>> 0;
  // A valid mask inverted is 2^n − 1, so adding one leaves a single bit set.
  if ((inverted & (inverted + 1)) !== 0) {
    return err(`${formatIpv4(value)} is not a valid netmask: its one bits must all come before its zero bits.`);
  }
  return ok(32 - Math.log2(inverted + 1));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function inRange(value: number, base: string, prefix: number): boolean {
  const mask = prefixToMask(prefix);
  const parsed = parseIpv4(base);
  return parsed.ok && ((value & mask) >>> 0) === parsed.value;
}

/** Classifies an address by the IANA special-purpose ranges developers meet most often. */
export function addressKind(value: number): AddressKind {
  if (value === 0xffffffff) return "Limited broadcast";
  if (inRange(value, "0.0.0.0", 8)) return "This network";
  if (inRange(value, "127.0.0.0", 8)) return "Loopback";
  if (inRange(value, "10.0.0.0", 8) || inRange(value, "172.16.0.0", 12) || inRange(value, "192.168.0.0", 16)) {
    return "Private (RFC 1918)";
  }
  if (inRange(value, "100.64.0.0", 10)) return "Shared address space (RFC 6598, carrier-grade NAT)";
  if (inRange(value, "169.254.0.0", 16)) return "Link-local";
  if (inRange(value, "192.0.2.0", 24) || inRange(value, "198.51.100.0", 24) || inRange(value, "203.0.113.0", 24)) {
    return "Documentation (RFC 5737)";
  }
  if (inRange(value, "224.0.0.0", 4)) return "Multicast";
  if (inRange(value, "240.0.0.0", 4)) return "Reserved";
  return "Public";
}

function toBinary(value: number): string {
  return value
    .toString(2)
    .padStart(32, "0")
    .match(/.{8}/g)!
    .join(".");
}

/**
 * Parses an IPv4 network in any of the forms people paste:
 * CIDR (`192.168.1.10/24`), an address and a dotted netmask separated by a
 * space or slash (`192.168.1.10 255.255.255.0`), or a bare address, read as
 * a single host (/32). Blank input parses to `null`.
 */
export function parseSubnet(input: string): ToolResult<Subnet | null> {
  const trimmed = input.trim();
  if (!trimmed) return ok(null);

  const match = /^([^\s/]+)(?:(?:\s*\/\s*|\s+)(\S+))?$/.exec(trimmed);
  if (!match) {
    return err("Enter an address with a prefix, such as 192.168.1.10/24, or with a netmask, such as 192.168.1.10 255.255.255.0.");
  }
  const [, addressText, suffix] = match;

  const address = parseIpv4(addressText);
  if (!address.ok) return address;

  let prefix = 32;
  if (suffix !== undefined) {
    if (suffix.includes(".")) {
      const fromMask = maskToPrefix(suffix);
      if (!fromMask.ok) return fromMask;
      prefix = fromMask.value;
    } else if (/^\d{1,2}$/.test(suffix) && Number(suffix) <= 32) {
      prefix = Number(suffix);
    } else {
      return err(`"/${suffix}" is not a valid prefix length; use a number from 0 to 32.`);
    }
  }

  const mask = prefixToMask(prefix);
  const network = (address.value & mask) >>> 0;
  const total = 2 ** (32 - prefix);
  const last = network + total - 1;

  // RFC 3021: a /31 point-to-point link uses both addresses, and a /32 is one host.
  const hasBroadcast = prefix <= 30;
  const firstHost = hasBroadcast ? network + 1 : network;
  const lastHost = hasBroadcast ? last - 1 : last;

  return ok({
    address: formatIpv4(address.value),
    prefix,
    netmask: formatIpv4(mask),
    wildcard: formatIpv4(~mask >>> 0),
    network: formatIpv4(network),
    broadcast: hasBroadcast ? formatIpv4(last) : null,
    firstHost: formatIpv4(firstHost),
    lastHost: formatIpv4(lastHost),
    totalAddresses: total,
    usableHosts: hasBroadcast ? total - 2 : total,
    cidr: `${formatIpv4(network)}/${prefix}`,
    hostBitsSet: network !== address.value,
    kind: addressKind(address.value),
    binaryAddress: toBinary(address.value),
    binaryNetmask: toBinary(mask),
  });
}
