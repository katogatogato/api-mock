import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { OpenAPISpec, SchemaObject } from "./generator.js";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export function parseSpec(filePath: string): OpenAPISpec {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new ParseError(`Spec file not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, "utf-8");
  const ext = path.extname(resolved).toLowerCase();

  let spec: unknown;
  if (ext === ".yaml" || ext === ".yml") {
    spec = yaml.load(raw);
  } else if (ext === ".json") {
    spec = JSON.parse(raw);
  } else {
    // Try JSON first, fall back to YAML
    try {
      spec = JSON.parse(raw);
    } catch {
      spec = yaml.load(raw);
    }
  }

  if (!spec || typeof spec !== "object") {
    throw new ParseError("Spec file did not produce a valid object");
  }

  normalizeRefs(spec);
  return spec as OpenAPISpec;
}

function normalizeRefs(obj: unknown): void {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    for (const item of obj) normalizeRefs(item);
    return;
  }
  if (typeof obj !== "object") return;
  const record = obj as Record<string, unknown>;
  if ("$ref" in record && typeof record["$ref"] === "string") {
    record.ref = record["$ref"];
    delete record["$ref"];
  }
  for (const value of Object.values(record)) {
    normalizeRefs(value);
  }
}

export function resolveComponentRef(
  spec: OpenAPISpec,
): (ref: string) => SchemaObject | undefined {
  return (ref: string): SchemaObject | undefined => {
    if (!ref.startsWith("#/")) return undefined;
    const parts = ref.slice(2).split("/");
    let current: unknown = spec;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current as SchemaObject;
  };
}

export function getSpecTitle(spec: OpenAPISpec): string {
  return spec.info?.title ?? "Untitled API";
}

export function getSpecVersion(spec: OpenAPISpec): string {
  return spec.info?.version ?? "0.0.0";
}
