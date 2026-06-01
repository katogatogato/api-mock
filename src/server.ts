import http from "node:http";
import { URL } from "node:url";
import type { OpenAPISpec, OpenAPIOperation, SchemaObject } from "./generator.js";
import { initGenerator, resetIdCounter, generateFromSchema } from "./generator.js";
import { parseSpec, resolveComponentRef, getSpecTitle, getSpecVersion } from "./parser.js";
import { buildRouteTable, matchRoute, getAllRoutes, type MatchedRoute } from "./router.js";
import { createLogger, formatMethod, formatStatus, formatMs, type Logger } from "./utils.js";

export interface ServerOptions {
  port: number;
  delay: number;
  errorRate: number;
  verbose: boolean;
}

const DEFAULT_OPTIONS: ServerOptions = {
  port: 3456,
  delay: 0,
  errorRate: 0,
  verbose: false,
};

function getFirstResponseSchema(
  operation: OpenAPIOperation,
  spec: OpenAPISpec,
): { schema: SchemaObject | undefined; status: number; contentType: string } {
  const responses = operation.responses ?? {};
  const resolver = resolveComponentRef(spec);

  // Prefer 200, then 2xx, then first available
  const statusPriority = ["200", "201", "204", "default"];
  let bestStatus = "200";
  let bestResponse = responses["200"];

  if (!bestResponse) {
    for (const code of statusPriority) {
      if (responses[code]) {
        bestStatus = code;
        bestResponse = responses[code];
        break;
      }
    }
  }

  if (!bestResponse) {
    // Take first available
    for (const [code, resp] of Object.entries(responses)) {
      bestStatus = code;
      bestResponse = resp;
      break;
    }
  }

  if (!bestResponse?.content) {
    return { schema: undefined, status: parseInt(bestStatus) || 200, contentType: "application/json" };
  }

  const contentType = Object.keys(bestResponse.content)[0] ?? "application/json";
  const mediaType = bestResponse.content[contentType];
  let schema = mediaType?.schema;

  // Resolve $ref at schema level
  if (schema?.ref) {
    const resolved = resolver(schema.ref);
    if (resolved) schema = resolved;
  }

  return {
    schema,
    status: parseInt(bestStatus) || 200,
    contentType,
  };
}

function collectRequestBody(body: string): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export function createMockServer(
  spec: OpenAPISpec,
  options: Partial<ServerOptions> = {},
): http.Server {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = createLogger(opts.verbose);
  const routes = buildRouteTable(spec);
  const title = getSpecTitle(spec);
  const version = getSpecVersion(spec);

  // Initialize generator with deterministic seed from spec title+version
  const seed = `${title}-${version}`;
  initGenerator(seed);

  logger.success(`Loaded "${title}" v${version}`);
  logger.info(`${routes.length} route${routes.length === 1 ? "" : "s"} registered`);

  const server = http.createServer((req, res) => {
    const start = performance.now();

    // CORS preflight
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${opts.port}`);
    const method = (req.method ?? "GET").toLowerCase();

    // Collect request body
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const bodyStr = Buffer.concat(chunks).toString("utf-8");

      if (opts.verbose && bodyStr) {
        logger.verbose(`Request body: ${bodyStr}`);
      }

      // Simulated error rate
      if (opts.errorRate > 0 && Math.random() < opts.errorRate) {
        const elapsed = Math.round(performance.now() - start);
        const errorBody = JSON.stringify({ error: "Internal Server Error", message: "Simulated error" });
        setCorsHeaders(res);
        res.setHeader("Content-Type", "application/json");
        res.writeHead(500);
        res.end(errorBody);
        logger.error(`${formatMethod("GET")} ${url.pathname} ${formatStatus(500)} ${formatMs(elapsed)}`);
        return;
      }

      const matched = matchRoute(routes, method, url.pathname);

      if (!matched) {
        const elapsed = Math.round(performance.now() - start);
        const available = routes.map((r) => `${r.method.toUpperCase()} ${r.pattern}`);
        const errorBody = JSON.stringify({
          error: "Not Found",
          message: `No route matches ${method.toUpperCase()} ${url.pathname}`,
          availableRoutes: available,
        });
        setCorsHeaders(res);
        res.setHeader("Content-Type", "application/json");
        res.writeHead(404);
        res.end(errorBody);
        logger.error(`${formatMethod(method.toUpperCase())} ${url.pathname} ${formatStatus(404)} ${formatMs(elapsed)}`);
        return;
      }

      const { schema, status, contentType } = getFirstResponseSchema(matched.operation, spec);

      // Reset ID counter for consistent data
      resetIdCounter();

      const resolver = resolveComponentRef(spec);
      const data = schema ? generateFromSchema(schema, undefined, resolver) : null;

      const elapsed = Math.round(performance.now() - start);

      const sendResponse = (): void => {
        setCorsHeaders(res);
        res.setHeader("Content-Type", contentType);

        if (status === 204 || data === null) {
          res.writeHead(status);
          res.end();
        } else {
          const body = JSON.stringify(data, null, 2);
          res.writeHead(status);
          res.end(body);

          if (opts.verbose) {
            logger.verbose(`Response body: ${body.length > 500 ? body.slice(0, 500) + "…" : body}`);
          }
        }

        logger.info(`${formatMethod(method.toUpperCase())} ${url.pathname} ${formatStatus(status)} ${formatMs(elapsed)}`);
      };

      // Simulated delay
      if (opts.delay > 0) {
        setTimeout(sendResponse, opts.delay);
      } else {
        sendResponse();
      }
    });
  });

  return server;
}

function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function startServer(spec: OpenAPISpec, options: Partial<ServerOptions> = {}): http.Server {
  const server = createMockServer(spec, options);
  const port = options.port ?? DEFAULT_OPTIONS.port;
  const logger = createLogger(options.verbose ?? false);

  server.listen(port, () => {
    logger.success(`Mock server running at http://localhost:${port}`);
    logger.info("Press Ctrl+C to stop");
  });

  return server;
}

export function stopServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
