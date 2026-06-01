import type { OpenAPISpec, OpenAPIOperation } from "./generator.js";

export interface MatchedRoute {
  method: string;
  path: string;
  operation: OpenAPIOperation;
  pathParams: Record<string, string>;
}

interface RouteEntry {
  method: string;
  pattern: string; // e.g. "/users/{id}"
  regex: RegExp;
  paramNames: string[];
  operation: OpenAPIOperation;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;

function pathToRegex(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  let regexStr = "^";
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === "{") {
      const end = pattern.indexOf("}", i);
      if (end === -1) break;
      paramNames.push(pattern.slice(i + 1, end));
      regexStr += "([^/]+)";
      i = end + 1;
    } else {
      regexStr += pattern[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i++;
    }
  }
  regexStr += "/?$";
  return { regex: new RegExp(regexStr), paramNames };
}

export function buildRouteTable(spec: OpenAPISpec): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const paths = spec.paths ?? {};

  for (const [pattern, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== "object") continue;
    const { regex, paramNames } = pathToRegex(pattern);

    for (const method of HTTP_METHODS) {
      const operation = methods[method];
      if (operation && typeof operation === "object") {
        routes.push({
          method,
          pattern,
          regex,
          paramNames,
          operation,
        });
      }
    }
  }

  return routes;
}

export function matchRoute(
  routes: RouteEntry[],
  method: string,
  urlPath: string,
): MatchedRoute | null {
  const normalizedPath = urlPath.split("?")[0]; // Strip query string
  const lowerMethod = method.toLowerCase();

  for (const route of routes) {
    if (route.method !== lowerMethod) continue;
    const match = normalizedPath.match(route.regex);
    if (match) {
      const pathParams: Record<string, string> = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        pathParams[route.paramNames[i]] = decodeURIComponent(match[i + 1]);
      }
      return {
        method: route.method,
        path: route.pattern,
        operation: route.operation,
        pathParams,
      };
    }
  }

  return null;
}

export function getAllRoutes(
  spec: OpenAPISpec,
): Array<{ method: string; path: string; operation: OpenAPIOperation }> {
  const routes: Array<{ method: string; path: string; operation: OpenAPIOperation }> = [];
  const paths = spec.paths ?? {};

  for (const [pattern, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== "object") continue;
    for (const method of HTTP_METHODS) {
      const operation = methods[method];
      if (operation && typeof operation === "object") {
        routes.push({ method, path: pattern, operation });
      }
    }
  }

  return routes;
}
