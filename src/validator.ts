import type { OpenAPISpec, SchemaObject } from "./generator.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSpec(spec: OpenAPISpec): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Top-level checks
  if (!spec.openapi) {
    errors.push('Missing required field "openapi" — expected "3.0.x" or "3.1.x"');
  } else if (!spec.openapi.startsWith("3.")) {
    warnings.push(`OpenAPI version "${spec.openapi}" may not be fully supported — designed for 3.x`);
  }

  if (!spec.info) {
    errors.push('Missing required field "info"');
  } else {
    if (!spec.info.title) warnings.push('Missing "info.title"');
    if (!spec.info.version) warnings.push('Missing "info.version"');
  }

  // Paths
  if (!spec.paths || typeof spec.paths !== "object") {
    errors.push('Missing or invalid "paths" object');
  } else if (Object.keys(spec.paths).length === 0) {
    warnings.push('"paths" is empty — no endpoints defined');
  } else {
    validatePaths(spec, errors, warnings);
  }

  // Components/schemas
  if (spec.components?.schemas) {
    validateSchemas(spec.components.schemas, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validatePaths(
  spec: OpenAPISpec,
  errors: string[],
  warnings: string[],
): void {
  const validMethods = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);
  const paths = spec.paths!;

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (!pathStr.startsWith("/")) {
      errors.push(`Path "${pathStr}" must start with "/"`);
    }

    if (!pathItem || typeof pathItem !== "object") continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!validMethods.has(method)) continue;
      if (!operation || typeof operation !== "object") continue;

      const op = operation as Record<string, unknown>;

      if (!op.responses || typeof op.responses !== "object") {
        warnings.push(`${method.toUpperCase()} ${pathStr}: Missing "responses"`);
      }

      if (op.parameters && Array.isArray(op.parameters)) {
        for (const param of op.parameters) {
          if (!param.name) {
            errors.push(`${method.toUpperCase()} ${pathStr}: Parameter missing "name"`);
          }
          if (!param.in) {
            errors.push(`${method.toUpperCase()} ${pathStr}: Parameter "${param.name ?? "?"}" missing "in"`);
          }
        }
      }
    }
  }
}

function validateSchemas(
  schemas: Record<string, SchemaObject>,
  errors: string[],
  warnings: string[],
): void {
  for (const [name, schema] of Object.entries(schemas)) {
    if (!schema.type && !schema.ref && !schema.allOf && !schema.oneOf && !schema.anyOf && !schema.enum) {
      warnings.push(`Schema "${name}": No "type" or composition keyword defined`);
    }

    if (schema.type === "array" && !schema.items) {
      errors.push(`Schema "${name}": Array type missing "items"`);
    }

    if (schema.type === "object" && !schema.properties && !schema.additionalProperties) {
      warnings.push(`Schema "${name}": Object type has no "properties"`);
    }
  }
}
