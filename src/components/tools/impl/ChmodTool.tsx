"use client";

import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { InputPanel } from "@/components/tools/InputPanel";
import {
  PERMISSION_CLASSES,
  describePermissions,
  emptyPermissions,
  fileTypeOf,
  isOctalInput,
  parsePermissions,
  toOctal,
  toSymbolic,
  toSymbolicMode,
  type ClassBits,
  type Permissions,
  type SpecialBits,
} from "@/lib/tools/chmod";

const SAMPLE = "-rwxr-xr-x";

const BITS: readonly { key: keyof ClassBits; name: string }[] = [
  { key: "read", name: "Read" },
  { key: "write", name: "Write" },
  { key: "execute", name: "Execute" },
];

const SPECIAL_BITS: readonly { key: keyof SpecialBits; name: string }[] = [
  { key: "setuid", name: "Setuid" },
  { key: "setgid", name: "Setgid" },
  { key: "sticky", name: "Sticky" },
];

const checkboxClass = "h-4 w-4 cursor-pointer accent-[var(--accent)]";

export function ChmodTool() {
  const [input, setInput] = useState("");

  const result = useMemo(() => parsePermissions(input), [input]);
  const perms = result.ok ? result.value : null;

  // Ticking a box rewrites the input in the form the user typed it in.
  function update(next: Permissions) {
    const symbolic = input.trim() !== "" && !isOctalInput(input);
    setInput(symbolic ? toSymbolic(next, fileTypeOf(input)) : toOctal(next));
  }

  // While the input is invalid the boxes show nothing ticked; editing them starts from scratch.
  const current = perms ?? emptyPermissions();

  const rows = perms
    ? [
        { name: "Octal", value: toOctal(perms) },
        { name: "Symbolic", value: toSymbolic(perms) },
        { name: "chmod (octal)", value: `chmod ${toOctal(perms)} file` },
        { name: "chmod (symbolic)", value: `chmod ${toSymbolicMode(perms)} file` },
      ]
    : [];

  return (
    <div className="space-y-4">
      <InputPanel
        value={input}
        onChange={setInput}
        title="Permissions"
        placeholder="Type an octal mode or an ls -l string, e.g. 755, 0644 or drwxr-xr-x…"
        sample={SAMPLE}
        minRows={2}
      />

      {!result.ok ? (
        <p role="alert" className="text-danger flex items-start gap-2 text-[13px] leading-6">
          <TriangleAlert className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-code break-words">{result.error}</span>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Permission bits by class</caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="pb-2 font-semibold">
                Class
              </th>
              {BITS.map((bit) => (
                <th key={bit.key} scope="col" className="pb-2 text-center font-semibold">
                  {bit.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CLASSES.map(({ key, name }) => (
              <tr key={key} className="border-t border-border">
                <th scope="row" className="py-2 font-semibold text-foreground">
                  {name}
                </th>
                {BITS.map((bit) => (
                  <td key={bit.key} className="py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${name} ${bit.name.toLowerCase()}`}
                      checked={current[key][bit.key]}
                      onChange={(e) =>
                        update({ ...current, [key]: { ...current[key], [bit.key]: e.target.checked } })
                      }
                      className={checkboxClass}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <fieldset className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
          <legend className="sr-only">Special bits</legend>
          {SPECIAL_BITS.map((bit) => (
            <label key={bit.key} className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={current.special[bit.key]}
                onChange={(e) =>
                  update({ ...current, special: { ...current.special, [bit.key]: e.target.checked } })
                }
                className={checkboxClass}
              />
              {bit.name}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(rows.length ? rows : [{ name: "Octal", value: "" }, { name: "Symbolic", value: "" }]).map(
          ({ name, value }) => (
            <div
              key={name}
              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{name}</p>
                <p className="font-code mt-1 text-[13px] break-all text-muted">{value || "—"}</p>
              </div>
              <CopyButton value={value} size="icon" label={`Copy ${name.toLowerCase()}`} disabled={!value} />
            </div>
          ),
        )}
      </div>

      <ul aria-live="polite" className="space-y-1 text-xs text-muted">
        {perms ? describePermissions(perms).map((line) => <li key={line}>{line}</li>) : null}
      </ul>
    </div>
  );
}
