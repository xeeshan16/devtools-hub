import { splitWords } from "./case-converter";
import { locateJsonError } from "./json-formatter";
import { err, messageOf, ok, type ToolResult } from "./result";

export type DeclarationStyle = "interface" | "type";

export type JsonToTsOptions = {
  /** Name of the top-level type. Sanitized into a PascalCase identifier. */
  rootName: string;
  /** Emit `export interface X { … }` or `export type X = { … };`. */
  declaration: DeclarationStyle;
};

export const DEFAULT_JSON_TO_TS_OPTIONS: JsonToTsOptions = {
  rootName: "Root",
  declaration: "interface",
};

type Primitive = "string" | "number" | "boolean" | "null";

/**
 * Everything one JSON position has been seen holding. Array elements and the
 * same key across several objects are merged into one shape, so a sample with
 * `[{ "a": 1 }, { "a": "x", "b": true }]` yields `a: number | string` and an
 * optional `b` instead of one type per element.
 */
type Shape = {
  primitives: Set<Primitive>;
  object: ObjectShape | null;
  /** Merged element shape; present once any array was seen here. */
  array: Shape | null;
};

type ObjectShape = {
  /** How many objects were merged into this one. */
  count: number;
  /** Key order follows first appearance in the sample. */
  fields: Map<string, { shape: Shape; seen: number }>;
};

const PRIMITIVE_ORDER: Primitive[] = ["string", "number", "boolean", "null"];

function emptyShape(): Shape {
  return { primitives: new Set(), object: null, array: null };
}

function isEmpty(shape: Shape): boolean {
  return shape.primitives.size === 0 && !shape.object && !shape.array;
}

function infer(value: unknown): Shape {
  const shape = emptyShape();
  if (value === null) {
    shape.primitives.add("null");
  } else if (Array.isArray(value)) {
    shape.array = value.reduce<Shape>(
      (acc, item) => merge(acc, infer(item)),
      emptyShape(),
    );
  } else if (typeof value === "object") {
    const fields: ObjectShape["fields"] = new Map();
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      fields.set(key, { shape: infer(v), seen: 1 });
    }
    shape.object = { count: 1, fields };
  } else {
    shape.primitives.add(typeof value as Primitive);
  }
  return shape;
}

function mergeObjects(a: ObjectShape, b: ObjectShape): ObjectShape {
  const fields: ObjectShape["fields"] = new Map();
  for (const [key, field] of a.fields) fields.set(key, field);
  for (const [key, field] of b.fields) {
    const existing = fields.get(key);
    fields.set(
      key,
      existing
        ? { shape: merge(existing.shape, field.shape), seen: existing.seen + field.seen }
        : field,
    );
  }
  return { count: a.count + b.count, fields };
}

function merge(a: Shape, b: Shape): Shape {
  return {
    primitives: new Set([...a.primitives, ...b.primitives]),
    object:
      a.object && b.object ? mergeObjects(a.object, b.object) : (a.object ?? b.object),
    array: a.array && b.array ? merge(a.array, b.array) : (a.array ?? b.array),
  };
}

// Naming an interface after one of these would shadow the global type for
// everything else in the file the user pastes it into.
const RESERVED_NAMES = new Set([
  "Array",
  "Boolean",
  "Date",
  "Error",
  "Function",
  "Map",
  "Number",
  "Object",
  "Promise",
  "Record",
  "Set",
  "String",
  "Symbol",
]);

function pascalCase(input: string): string {
  return splitWords(input.replace(/[^A-Za-z0-9_\s-]+/g, " "))
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/** "users" → "User", "categories" → "Category"; good enough for type names. */
function singular(name: string): string {
  if (/ies$/.test(name) && name.length > 4) return `${name.slice(0, -3)}y`;
  if (/[^isu]s$/.test(name) && name.length > 3) return name.slice(0, -1);
  return name;
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function propertyKey(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

class Emitter {
  private readonly used = new Set<string>();
  private readonly declarations: string[] = [];

  constructor(private readonly style: DeclarationStyle) {}

  /** Picks an unused, valid type name close to `hint`. */
  private claim(hint: string, fallback: string): string {
    let base = pascalCase(hint) || fallback;
    if (/^[0-9]/.test(base)) base = `${fallback}${base}`;
    if (RESERVED_NAMES.has(base)) base = `${base}Type`;
    let name = base;
    for (let n = 2; this.used.has(name); n++) name = `${base}${n}`;
    this.used.add(name);
    return name;
  }

  /** Declares the root type and returns every declaration, root first. */
  emitRoot(shape: Shape, rootName: string): string {
    const name = this.claim(rootName, "Root");
    if (isNamedObject(shape)) {
      this.declareObject(name, shape.object!);
    } else {
      const slot = this.declarations.length;
      this.declarations.push("");
      this.declarations[slot] =
        `export type ${name} = ${this.expression(shape, `${name}Item`, true)};`;
    }
    return this.declarations.join("\n\n");
  }

  private declareObject(name: string, object: ObjectShape) {
    // Reserve the slot before recursing so the parent is printed before the
    // types it refers to — the order people read a schema in.
    const slot = this.declarations.length;
    this.declarations.push("");

    const lines = [...object.fields].map(([key, field]) => {
      const optional = field.seen < object.count ? "?" : "";
      const type = this.expression(field.shape, key, false);
      return `  ${propertyKey(key)}${optional}: ${type};`;
    });
    const body = lines.length ? `{\n${lines.join("\n")}\n}` : "{}";

    this.declarations[slot] =
      this.style === "interface"
        ? `export interface ${name} ${body}`
        : `export type ${name} = ${body};`;
  }

  /**
   * Renders a shape as a type expression. `hint` names any object type found
   * here; inside arrays it is singularized, so `users: [...]` gives `User[]`.
   */
  private expression(shape: Shape, hint: string, isRootArray: boolean): string {
    const members = this.members(shape, hint, isRootArray);
    return members.length ? members.join(" | ") : "unknown";
  }

  private members(shape: Shape, hint: string, isRootArray: boolean): string[] {
    const members: string[] = [];

    if (shape.object) {
      if (shape.object.fields.size === 0) {
        members.push("Record<string, unknown>");
      } else {
        const name = this.claim(hint, "Item");
        this.declareObject(name, shape.object);
        members.push(name);
      }
    }

    if (shape.array) {
      const elementHint = isRootArray ? hint : singular(hint);
      const element = isEmpty(shape.array)
        ? ["unknown"]
        : this.members(shape.array, elementHint, false);
      members.push(
        element.length > 1 ? `(${element.join(" | ")})[]` : `${element[0]}[]`,
      );
    }

    for (const primitive of PRIMITIVE_ORDER) {
      if (shape.primitives.has(primitive)) members.push(primitive);
    }

    return members;
  }
}

function isNamedObject(shape: Shape): boolean {
  return (
    shape.object !== null &&
    shape.object.fields.size > 0 &&
    shape.primitives.size === 0 &&
    shape.array === null
  );
}

/**
 * Generates TypeScript declarations from a JSON sample. Types are inferred
 * from the values present, so a key that is missing from some objects in an
 * array becomes optional and a key seen with different types becomes a union.
 */
export function jsonToTs(
  input: string,
  options: JsonToTsOptions = DEFAULT_JSON_TO_TS_OPTIONS,
): ToolResult<string> {
  if (!input.trim()) return ok("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return err(locateJsonError(input, messageOf(e, "Invalid JSON")));
  }

  return ok(
    new Emitter(options.declaration).emitRoot(infer(parsed), options.rootName),
  );
}
