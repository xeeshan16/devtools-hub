import type { ToolContent } from "@/content/types";

export const subnetCalculatorContent: ToolContent = {
  howToUse: [
    "Type an IPv4 address with a prefix length such as 10.0.0.0/16, or with a dotted netmask such as 192.168.1.10 255.255.255.0. A bare address is read as a single host (/32).",
    "The tool shows the network in CIDR form, the broadcast address, the first and last usable host, how many hosts fit, the netmask and wildcard mask, and the address and mask in binary so you can see where the network bits end.",
    "If the address you typed has host bits set, the network is worked out for you and the page says which network the address belongs to. Each value has a copy button for pasting into firewall rules, VPC settings or config files.",
  ],
  examples: [
    {
      title: "A home or office LAN",
      note: "Two addresses are reserved for the network and broadcast.",
      input: "192.168.1.10/24",
      output: "192.168.1.0/24 · hosts 192.168.1.1–192.168.1.254 · 254 usable",
    },
    {
      title: "A cloud VPC subnet",
      note: "A prefix that does not end on an octet boundary.",
      input: "10.20.37.0 255.255.240.0",
      output: "10.20.32.0/20 · broadcast 10.20.47.255 · 4,094 usable",
    },
    {
      title: "A point-to-point link",
      note: "RFC 3021 lets both addresses of a /31 be used, with no broadcast.",
      input: "10.0.0.0/31",
      output: "10.0.0.0–10.0.0.1 · 2 usable",
    },
  ],
  faq: [
    {
      question: "What does the /24 in 192.168.1.0/24 mean?",
      answer:
        "It is the prefix length: the number of leading bits that identify the network. The remaining 32 − 24 = 8 bits number the hosts inside it, so a /24 has 256 addresses. The same network written with a netmask is 255.255.255.0.",
    },
    {
      question: "Why are there two fewer usable hosts than addresses?",
      answer:
        "In a normal subnet the first address, with all host bits zero, names the network itself, and the last, with all host bits one, is the broadcast address. Neither can be given to a device. The exceptions are /31, used for point-to-point links where both addresses are usable, and /32, which is a single host.",
    },
    {
      question: "What is a wildcard mask?",
      answer:
        "It is the netmask with every bit flipped, so 255.255.255.0 becomes 0.0.0.255. Cisco access lists and OSPF network statements use it, where a 1 bit means the address may differ in that position.",
    },
    {
      question: "Which IPv4 ranges are private?",
      answer:
        "RFC 1918 reserves 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16 for private networks, so they are never routed on the public internet. Related ranges you may meet are 100.64.0.0/10 for carrier-grade NAT, 169.254.0.0/16 for link-local addresses and 127.0.0.0/8 for loopback.",
    },
    {
      question: "Why does the tool reject an address like 192.168.010.1?",
      answer:
        "Some software reads a number with a leading zero as octal, so 010 means 8, while other software reads it as 10. Rather than guess, the tool asks you to write the number without the leading zero.",
    },
  ],
};
