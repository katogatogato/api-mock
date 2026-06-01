export interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  description?: string;
  ref?: string;
  additionalProperties?: boolean | SchemaObject;
  oneOf?: SchemaObject[];
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
}

export interface OpenAPIResponse {
  description?: string;
  content?: Record<string, { schema?: SchemaObject }>;
}

export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: SchemaObject;
  }>;
  requestBody?: {
    content?: Record<string, { schema?: SchemaObject }>;
  };
  responses?: Record<string, OpenAPIResponse>;
}

export interface OpenAPISpec {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  paths?: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, unknown>;
  };
  servers?: Array<{ url: string; description?: string }>;
}

// Seeded pseudo-random number generator (mulberry32)
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

// Deterministic seed from spec content
function seedFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash) || 1;
}

// --- Data pools ---
const FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael",
  "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan",
  "Joseph", "Jessica", "Thomas", "Sarah", "Christopher", "Karen",
  "Daniel", "Lisa", "Matthew", "Nancy", "Anthony", "Betty", "Mark",
  "Margaret", "Donald", "Sandra", "Oliver", "Emma", "Liam", "Ava",
  "Noah", "Sophia", "Ethan", "Isabella", "Mason", "Mia",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
];

const DOMAINS = [
  "gmail.com", "outlook.com", "example.com", "company.io", "mail.com",
  "proton.me", "fastmail.com", "icloud.com", "yahoo.com", "posteo.de",
];

const LOREM = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
  "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
  "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
  "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure",
  "in", "reprehenderit", "voluptate", "velit", "esse", "cillum", "fugiat",
  "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat",
  "non", "proident", "sunt", "culpa", "qui", "officia", "deserunt",
  "mollit", "anim", "id", "est", "laborum",
];

const TLD_PARTS = [
  "blog", "app", "dev", "web", "api", "docs", "shop", "news", "io",
  "cloud", "data", "tech", "code", "hub", "net",
];

let rng: SeededRandom;
let idCounter = 0;

export function initGenerator(seed: string): void {
  rng = new SeededRandom(seedFromString(seed));
  idCounter = 0;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function generateName(): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

export function generateFirstName(): string {
  return rng.pick(FIRST_NAMES);
}

export function generateLastName(): string {
  return rng.pick(LAST_NAMES);
}

export function generateEmail(): string {
  const user = rng.pick(FIRST_NAMES).toLowerCase() + rng.nextInt(1, 999);
  return `${user}@${rng.pick(DOMAINS)}`;
}

export function generateUrl(): string {
  const sub = rng.pick(TLD_PARTS);
  const path = rng.pick(TLD_PARTS);
  const page = rng.nextInt(1, 1000);
  return `https://${sub}.example.com/${path}/${page}`;
}

export function generatePhone(): string {
  const area = rng.nextInt(200, 999);
  const mid = rng.nextInt(100, 999);
  const end = rng.nextInt(1000, 9999);
  return `+1-${area}-${mid}-${end}`;
}

export function generateUuid(): string {
  const hex = (): string =>
    rng.nextInt(0, 0xffff).toString(16).padStart(4, "0");
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

export function generateDate(): string {
  const year = rng.nextInt(2020, 2026);
  const month = rng.nextInt(1, 12);
  const day = rng.nextInt(1, 28);
  const hour = rng.nextInt(0, 23);
  const minute = rng.nextInt(0, 59);
  const second = rng.nextInt(0, 59);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}Z`;
}

export function generateLorem(count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(rng.pick(LOREM));
  }
  return words.join(" ");
}

export function generateNumber(min: number, max: number): number {
  const raw = rng.next() * (max - min) + min;
  return Math.round(raw * 100) / 100;
}

export function generateInteger(min: number, max: number): number {
  return rng.nextInt(Math.ceil(min), Math.floor(max));
}

export function generateBoolean(): boolean {
  return rng.next() > 0.5;
}

// Detect property intent from name
function propertyIntent(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower === "id" || lower.endsWith("id")) return "id";
  if (lower.includes("email") || lower.includes("mail")) return "email";
  if (lower.includes("name")) return "name";
  if (lower.includes("price") || lower.includes("amount") || lower.includes("cost") || lower.includes("salary")) return "price";
  if (lower.includes("url") || lower.includes("href") || lower.includes("website") || lower.includes("link")) return "url";
  if (lower.includes("phone") || lower.includes("tel") || lower.includes("mobile")) return "phone";
  if (lower.includes("avatar") || lower.includes("image") || lower.includes("photo") || lower.includes("picture") || lower.includes("thumbnail")) return "avatar";
  if (lower.includes("description") || lower.includes("bio") || lower.includes("summary") || lower.includes("body") || lower.includes("content") || lower.includes("text")) return "lorem";
  if (lower.includes("date") || lower.includes("time") || lower.includes("created") || lower.includes("updated") || lower.includes("at")) return "date";
  if (lower.includes("title") || lower.includes("subject") || lower.includes("label")) return "title";
  if (lower.includes("status") || lower.includes("state")) return "status";
  if (lower.includes("color") || lower.includes("colour")) return "color";
  return null;
}

const STATUSES = ["active", "inactive", "pending", "completed", "archived"];
const COLORS = ["#ff5733", "#33ff57", "#3357ff", "#f033ff", "#ff33a8", "#33fff0", "#ffbd33"];

export function generateFromSchema(
  schema: SchemaObject,
  propName?: string,
  resolveRef?: (ref: string) => SchemaObject | undefined,
): unknown {
  // Handle $ref
  if (schema.ref && resolveRef) {
    const resolved = resolveRef(schema.ref);
    if (resolved) return generateFromSchema(resolved, propName, resolveRef);
  }

  // Handle oneOf/anyOf — pick first
  if (schema.oneOf && schema.oneOf.length > 0) {
    return generateFromSchema(schema.oneOf[0], propName, resolveRef);
  }
  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateFromSchema(rng.pick(schema.anyOf), propName, resolveRef);
  }

  // Handle allOf — merge properties
  if (schema.allOf && schema.allOf.length > 0) {
    const merged: SchemaObject = { type: "object", properties: {} };
    for (const sub of schema.allOf) {
      const resolved: SchemaObject = (sub.ref && resolveRef ? resolveRef(sub.ref) : sub) ?? sub;
      if (resolved.properties) {
        merged.properties = { ...merged.properties, ...resolved.properties };
      }
      if (resolved.required) {
        merged.required = [...(merged.required ?? []), ...resolved.required];
      }
    }
    return generateFromSchema(merged, propName, resolveRef);
  }

  // Handle enum
  if (schema.enum && schema.enum.length > 0) {
    return rng.pick(schema.enum);
  }

  const type = schema.type ?? "object";
  const intent = propName ? propertyIntent(propName) : null;

  // Intent-based generation (overrides type-based)
  if (intent) {
    switch (intent) {
      case "id":
        return ++idCounter;
      case "email":
        return generateEmail();
      case "name":
        return generateName();
      case "price":
        return generateNumber(0.99, 9999.99);
      case "url":
        return generateUrl();
      case "phone":
        return generatePhone();
      case "avatar":
        return `https://placehold.co/${rng.nextInt(100, 400)}x${rng.nextInt(100, 400)}`;
      case "lorem":
        return generateLorem(rng.nextInt(8, 25));
      case "date":
        return generateDate();
      case "title":
        return generateLorem(rng.nextInt(2, 6))
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      case "status":
        return rng.pick(STATUSES);
      case "color":
        return rng.pick(COLORS);
    }
  }

  // Type-based generation
  switch (type) {
    case "string": {
      if (schema.format === "date-time") return generateDate();
      if (schema.format === "email") return generateEmail();
      if (schema.format === "uri" || schema.format === "url") return generateUrl();
      if (schema.format === "uuid") return generateUuid();
      if (schema.format === "date") return generateDate().split("T")[0];
      if (schema.format === "password") return "••••••••";
      if (schema.format === "byte") return Buffer.from(generateLorem(3)).toString("base64");
      if (schema.format === "binary") return "<binary>";
      const minLen = schema.minLength ?? 3;
      const maxLen = schema.maxLength ?? Math.max(minLen + 5, 12);
      return generateLorem(rng.nextInt(minLen, maxLen));
    }
    case "integer": {
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 1000;
      return generateInteger(min, max);
    }
    case "number": {
      const min = schema.minimum ?? 0;
      const max = schema.maximum ?? 1000;
      return generateNumber(min, max);
    }
    case "boolean":
      return generateBoolean();
    case "array": {
      const count = rng.nextInt(3, 5);
      if (!schema.items) return [];
      return Array.from({ length: count }, () =>
        generateFromSchema(schema.items!, propName, resolveRef),
      );
    }
    case "object": {
      if (!schema.properties) return {};
      const result: Record<string, unknown> = {};
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        result[key] = generateFromSchema(propSchema, key, resolveRef);
      }
      return result;
    }
    default:
      return null;
  }
}
