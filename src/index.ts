#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { parseSpec, getSpecTitle, getSpecVersion } from "./parser.js";
import { getAllRoutes } from "./router.js";
import { validateSpec } from "./validator.js";
import { startWithWatcher } from "./watcher.js";
import { createLogger } from "./utils.js";

const VERSION = "1.0.0";

const program = new Command();

program
  .name("api-mock")
  .description("Spin up a local mock server from an OpenAPI spec with realistic fake data")
  .version(VERSION);

program
  .command("start")
  .description("Start a mock server from an OpenAPI spec")
  .argument("<spec>", "Path to OpenAPI spec file (JSON or YAML)")
  .option("-p, --port <number>", "Port to listen on", "3456")
  .option("-d, --delay <ms>", "Artificial response delay in milliseconds", "0")
  .option("-e, --error-rate <rate>", "Probability (0-1) of simulated 500 errors", "0")
  .option("-w, --watch", "Watch spec file for changes and hot-reload", false)
  .option("-v, --verbose", "Show request/response bodies", false)
  .action((specPath: string, opts: Record<string, string | boolean>) => {
    const port = parseInt(String(opts.port), 10);
    const delay = parseInt(String(opts.delay), 10);
    const errorRate = parseFloat(String(opts.errorRate));
    const verbose = Boolean(opts.verbose);
    const watch = Boolean(opts.watch);

    if (isNaN(port) || port < 1 || port > 65535) {
      console.error(chalk.red("Error: Port must be a number between 1 and 65535"));
      process.exit(1);
    }

    if (isNaN(delay) || delay < 0) {
      console.error(chalk.red("Error: Delay must be a non-negative number"));
      process.exit(1);
    }

    if (isNaN(errorRate) || errorRate < 0 || errorRate > 1) {
      console.error(chalk.red("Error: Error rate must be between 0 and 1"));
      process.exit(1);
    }

    const logger = createLogger(verbose);

    try {
      // Validate spec loads
      parseSpec(specPath);
    } catch (err) {
      logger.error(`Failed to load spec: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    const serverOptions = { port, delay, errorRate, verbose };

    if (watch) {
      startWithWatcher({ specPath, ...serverOptions });
    } else {
      const spec = parseSpec(specPath);
      // Dynamic import of startServer to avoid circular dep issues
      import("./server.js").then(({ startServer }) => {
        const server = startServer(spec, serverOptions);

        const cleanup = (): void => {
          logger.info("Shutting down…");
          server.close(() => {
            logger.info("Goodbye!");
            process.exit(0);
          });
        };

        process.on("SIGINT", cleanup);
        process.on("SIGTERM", cleanup);
      });
    }
  });

program
  .command("routes")
  .description("List all routes defined in the spec")
  .argument("<spec>", "Path to OpenAPI spec file (JSON or YAML)")
  .action((specPath: string) => {
    const logger = createLogger(false);

    let spec;
    try {
      spec = parseSpec(specPath);
    } catch (err) {
      logger.error(`Failed to load spec: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    const title = getSpecTitle(spec);
    const version = getSpecVersion(spec);
    const routes = getAllRoutes(spec);

    if (routes.length === 0) {
      logger.warn("No routes found in spec.");
      return;
    }

    console.log(chalk.bold(`\n  ${title} v${version} — ${routes.length} route${routes.length === 1 ? "" : "s"}\n`));

    // Find max widths for alignment
    const methodStrs = routes.map((r) => r.method.toUpperCase());
    const pathStrs = routes.map((r) => r.path);
    const maxMethod = Math.max(...methodStrs.map((m) => m.length));
    const maxPath = Math.max(...pathStrs.map((p) => p.length));

    console.log(chalk.gray(`  ${"METHOD".padEnd(maxMethod)}   ${"PATH".padEnd(maxPath)}   STATUS  CONTENT-TYPE`));
    console.log(chalk.gray(`  ${"─".repeat(maxMethod)}   ${"─".repeat(maxPath)}   ──────  ────────────`));

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      const method = methodStrs[i].padEnd(maxMethod);
      const routePath = pathStrs[i].padEnd(maxPath);

      const responses = route.operation.responses ?? {};
      const statusCodes = Object.keys(responses);
      const statusStr = (statusCodes.length > 0 ? statusCodes.join(", ") : "200").padEnd(6);

      const firstResponse = responses[statusCodes[0]];
      const contentTypes = firstResponse?.content ? Object.keys(firstResponse.content) : ["application/json"];
      const contentType = contentTypes[0] ?? "application/json";

      const methodColor: Record<string, (s: string) => string> = {
        GET: chalk.green,
        POST: chalk.yellow,
        PUT: chalk.blue,
        PATCH: chalk.magenta,
        DELETE: chalk.red,
        OPTIONS: chalk.gray,
        HEAD: chalk.gray,
      };
      const colorFn = methodColor[method.trim()] ?? chalk.white;

      console.log(`  ${colorFn(method)}   ${chalk.white(routePath)}   ${chalk.cyan(statusStr)}   ${chalk.gray(contentType)}`);
    }

    console.log();
  });

program
  .command("validate")
  .description("Validate an OpenAPI spec file")
  .argument("<spec>", "Path to OpenAPI spec file (JSON or YAML)")
  .action((specPath: string) => {
    const logger = createLogger(false);

    let spec;
    try {
      spec = parseSpec(specPath);
    } catch (err) {
      logger.error(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    const result = validateSpec(spec);

    console.log(chalk.bold(`\n  Validating ${specPath}\n`));

    if (result.errors.length > 0) {
      console.log(chalk.red(`  Errors (${result.errors.length}):`));
      for (const err of result.errors) {
        console.log(chalk.red(`    ✖ ${err}`));
      }
    }

    if (result.warnings.length > 0) {
      if (result.errors.length > 0) console.log();
      console.log(chalk.yellow(`  Warnings (${result.warnings.length}):`));
      for (const warn of result.warnings) {
        console.log(chalk.yellow(`    ⚠ ${warn}`));
      }
    }

    if (result.valid) {
      console.log(chalk.green(`\n  ✔ Spec is valid${result.warnings.length > 0 ? ` (${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"})` : ""}\n`));
    } else {
      console.log(chalk.red(`\n  ✖ Spec has ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}\n`));
      process.exit(1);
    }
  });

program.parse();
