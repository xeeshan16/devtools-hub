import { describe, expect, it } from "vitest";
import type { ToolResult } from "./result";
import {
  addressKind,
  formatIpv4,
  maskToPrefix,
  parseIpv4,
  parseSubnet,
  prefixToMask,
  type Subnet,
} from "./subnet";

function value<T>(result: ToolResult<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.value;
}

function error<T>(result: ToolResult<T>): string {
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

function subnet(input: string): Subnet {
  const s = value(parseSubnet(input));
  if (!s) throw new Error("expected a subnet, got null");
  return s;
}

function ip(text: string): number {
  return value(parseIpv4(text));
}

describe("parseIpv4 and formatIpv4", () => {
  it("round-trips the extremes and a typical address", () => {
    for (const text of ["0.0.0.0", "255.255.255.255", "192.168.1.10", "10.0.0.1"]) {
      expect(formatIpv4(ip(text))).toBe(text);
    }
    expect(ip("255.255.255.255")).toBe(0xffffffff);
    expect(ip(" 1.2.3.4 ")).toBe(0x01020304);
  });

  it("rejects the wrong number of octets", () => {
    expect(error(parseIpv4("10.0.1"))).toMatch(/4 dot-separated numbers.*got 3/);
    expect(error(parseIpv4("1.2.3.4.5"))).toMatch(/got 5/);
  });

  it("names the bad octet", () => {
    expect(error(parseIpv4("192.168.1.256"))).toBe("Octet 4 is 256; each number must be 0–255.");
    expect(error(parseIpv4("192.x.1.1"))).toBe('"x" in octet 2 is not a number.');
    expect(error(parseIpv4("192..1.1"))).toBe("Octet 2 is empty.");
    expect(error(parseIpv4("-1.0.0.0"))).toMatch(/octet 1 is not a number/);
  });

  it("rejects leading zeros, which some tools read as octal", () => {
    expect(error(parseIpv4("192.168.010.1"))).toBe('"010" in octet 3 has a leading zero; write it as 10.');
    expect(ip("10.0.0.0")).toBe(0x0a000000);
  });
});

describe("prefixToMask and maskToPrefix", () => {
  it("round-trips every prefix length", () => {
    for (let prefix = 0; prefix <= 32; prefix++) {
      expect(value(maskToPrefix(formatIpv4(prefixToMask(prefix))))).toBe(prefix);
    }
    expect(formatIpv4(prefixToMask(0))).toBe("0.0.0.0");
    expect(formatIpv4(prefixToMask(20))).toBe("255.255.240.0");
    expect(formatIpv4(prefixToMask(32))).toBe("255.255.255.255");
  });

  it("rejects non-contiguous masks", () => {
    expect(error(maskToPrefix("255.0.255.0"))).toMatch(/not a valid netmask/);
    expect(error(maskToPrefix("255.255.255.1"))).toMatch(/not a valid netmask/);
    expect(error(maskToPrefix("255.255.300.0"))).toMatch(/^Netmask: Octet 3 is 300/);
  });
});

describe("parseSubnet", () => {
  it("returns null for blank input", () => {
    expect(value(parseSubnet(""))).toBeNull();
    expect(value(parseSubnet("   "))).toBeNull();
  });

  it("computes a /24", () => {
    expect(subnet("192.168.1.10/24")).toEqual({
      address: "192.168.1.10",
      prefix: 24,
      netmask: "255.255.255.0",
      wildcard: "0.0.0.255",
      network: "192.168.1.0",
      broadcast: "192.168.1.255",
      firstHost: "192.168.1.1",
      lastHost: "192.168.1.254",
      totalAddresses: 256,
      usableHosts: 254,
      cidr: "192.168.1.0/24",
      hostBitsSet: true,
      kind: "Private (RFC 1918)",
      binaryAddress: "11000000.10101000.00000001.00001010",
      binaryNetmask: "11111111.11111111.11111111.00000000",
    });
  });

  it("handles prefixes that do not fall on an octet boundary", () => {
    const s = subnet("172.20.37.200/20");
    expect(s.network).toBe("172.20.32.0");
    expect(s.broadcast).toBe("172.20.47.255");
    expect(s.firstHost).toBe("172.20.32.1");
    expect(s.lastHost).toBe("172.20.47.254");
    expect(s.usableHosts).toBe(4094);
  });

  it("accepts a dotted netmask after a space or a slash", () => {
    expect(subnet("10.1.2.3 255.255.0.0").cidr).toBe("10.1.0.0/16");
    expect(subnet("10.1.2.3/255.255.0.0").cidr).toBe("10.1.0.0/16");
    expect(subnet("10.1.2.3 / 16").cidr).toBe("10.1.0.0/16");
  });

  it("reads a bare address as a single host", () => {
    const s = subnet("8.8.8.8");
    expect(s.prefix).toBe(32);
    expect(s.broadcast).toBeNull();
    expect(s.firstHost).toBe("8.8.8.8");
    expect(s.lastHost).toBe("8.8.8.8");
    expect(s.usableHosts).toBe(1);
    expect(s.hostBitsSet).toBe(false);
    expect(s.kind).toBe("Public");
  });

  it("treats /31 as a point-to-point link with no broadcast (RFC 3021)", () => {
    const s = subnet("10.0.0.1/31");
    expect(s.network).toBe("10.0.0.0");
    expect(s.broadcast).toBeNull();
    expect(s.firstHost).toBe("10.0.0.0");
    expect(s.lastHost).toBe("10.0.0.1");
    expect(s.usableHosts).toBe(2);
  });

  it("keeps the network and broadcast reserved for /30", () => {
    const s = subnet("10.0.0.5/30");
    expect(s.network).toBe("10.0.0.4");
    expect(s.broadcast).toBe("10.0.0.7");
    expect(s.usableHosts).toBe(2);
  });

  it("covers the whole address space at /0", () => {
    const s = subnet("0.0.0.0/0");
    expect(s.netmask).toBe("0.0.0.0");
    expect(s.wildcard).toBe("255.255.255.255");
    expect(s.broadcast).toBe("255.255.255.255");
    expect(s.totalAddresses).toBe(2 ** 32);
    expect(s.usableHosts).toBe(2 ** 32 - 2);
    expect(s.hostBitsSet).toBe(false);
  });

  it("flags when the address is the network address", () => {
    expect(subnet("192.168.1.0/24").hostBitsSet).toBe(false);
    expect(subnet("192.168.1.1/24").hostBitsSet).toBe(true);
  });

  it("rejects bad prefixes and malformed input", () => {
    expect(error(parseSubnet("10.0.0.0/33"))).toBe('"/33" is not a valid prefix length; use a number from 0 to 32.');
    expect(error(parseSubnet("10.0.0.0/abc"))).toMatch(/not a valid prefix length/);
    expect(error(parseSubnet("10.0.0.0/"))).toMatch(/Enter an address with a prefix/);
    expect(error(parseSubnet("10.0.0.0 255.0.0.0 extra"))).toMatch(/Enter an address/);
    expect(error(parseSubnet("10.0.0/8"))).toMatch(/got 3/);
    expect(error(parseSubnet("10.0.0.0 255.0.255.0"))).toMatch(/not a valid netmask/);
  });
});

describe("addressKind", () => {
  it.each([
    ["10.20.30.40", "Private (RFC 1918)"],
    ["172.16.0.1", "Private (RFC 1918)"],
    ["172.31.255.255", "Private (RFC 1918)"],
    ["172.32.0.1", "Public"],
    ["192.168.0.1", "Private (RFC 1918)"],
    ["100.64.0.1", "Shared address space (RFC 6598, carrier-grade NAT)"],
    ["127.0.0.1", "Loopback"],
    ["169.254.10.10", "Link-local"],
    ["192.0.2.1", "Documentation (RFC 5737)"],
    ["198.51.100.7", "Documentation (RFC 5737)"],
    ["203.0.113.9", "Documentation (RFC 5737)"],
    ["224.0.0.251", "Multicast"],
    ["240.0.0.1", "Reserved"],
    ["0.0.0.0", "This network"],
    ["255.255.255.255", "Limited broadcast"],
    ["1.1.1.1", "Public"],
  ])("%s is %s", (address, kind) => {
    expect(addressKind(ip(address))).toBe(kind);
  });
});
