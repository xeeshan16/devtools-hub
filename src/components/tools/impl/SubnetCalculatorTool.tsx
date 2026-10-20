"use client";

import { Info, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import { parseSubnet, type Subnet } from "@/lib/tools/subnet";

const SAMPLE = "192.168.1.10/24";

const PLACEHOLDER_ROWS = [
  "Network",
  "Broadcast",
  "First host",
  "Last host",
  "Usable hosts",
  "Netmask",
  "Wildcard mask",
  "Total addresses",
];

/** The values shown as cards, network facts first and masks after. */
function rowsOf(s: Subnet | null): { name: string; value: string; note?: string }[] {
  if (!s) return PLACEHOLDER_ROWS.map((name) => ({ name, value: "" }));
  return [
    { name: "Network", value: s.cidr },
    {
      name: "Broadcast",
      value: s.broadcast ?? "",
      note: s.broadcast ? undefined : s.prefix === 31 ? "None on a /31 link" : "None for a single host",
    },
    { name: "First host", value: s.firstHost },
    { name: "Last host", value: s.lastHost },
    { name: "Usable hosts", value: s.usableHosts.toLocaleString("en-US") },
    { name: "Netmask", value: s.netmask },
    { name: "Wildcard mask", value: s.wildcard },
    { name: "Total addresses", value: s.totalAddresses.toLocaleString("en-US") },
  ];
}

export function SubnetCalculatorTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parseSubnet(input), [input]);
  const subnet = result.ok ? result.value : null;

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="IPv4 address and prefix"
        placeholder="Type an address with a prefix or netmask, e.g. 10.0.0.0/16 or 192.168.1.10 255.255.255.0…"
        sample={SAMPLE}
        minRows={2}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      {subnet ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Address type: <span className="text-foreground">{subnet.kind}</span>.
            {subnet.hostBitsSet ? (
              <>
                {" "}
                <span className="font-code text-foreground">{subnet.address}</span> is a host inside{" "}
                <span className="font-code text-foreground">{subnet.cidr}</span>, not its network address.
              </>
            ) : null}
          </span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rowsOf(subnet).map(({ name, value, note }) => (
          <div
            key={name}
            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">{name}</p>
              <p className="font-code mt-1 text-[13px] break-all text-muted">{value || note || "—"}</p>
            </div>
            <CopyButton value={value} size="icon" label={`Copy ${name.toLowerCase()}`} disabled={!value} />
          </div>
        ))}
      </div>

      {subnet ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
          <table className="w-full text-left text-xs">
            <caption className="pb-2 text-left font-semibold tracking-wide text-muted uppercase">
              Binary (/{subnet.prefix}: {subnet.prefix} network bits, {32 - subnet.prefix} host bits)
            </caption>
            <tbody>
              <tr>
                <th scope="row" className="py-1 pr-3 align-top font-semibold text-foreground">
                  Address
                </th>
                <td className="font-code py-1 break-all text-muted">{subnet.binaryAddress}</td>
              </tr>
              <tr className="border-t border-border">
                <th scope="row" className="py-1 pr-3 align-top font-semibold text-foreground">
                  Netmask
                </th>
                <td className="font-code py-1 break-all text-muted">{subnet.binaryNetmask}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
