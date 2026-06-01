import fs from "node:fs";
import path from "node:path";
import type { ServerOptions } from "./server.js";
import { startServer, stopServer } from "./server.js";
import { parseSpec } from "./parser.js";
import { createLogger } from "./utils.js";
import type http from "node:http";

export interface WatcherOptions extends ServerOptions {
  specPath: string;
}

export function startWithWatcher(options: WatcherOptions): void {
  const logger = createLogger(options.verbose ?? false);
  let currentServer: http.Server | null = null;
  let watcher: fs.FSWatcher | null = null;
  let restarting = false;

  const resolvedPath = path.resolve(options.specPath);

  function boot(): void {
    try {
      const spec = parseSpec(resolvedPath);
      currentServer = startServer(spec, options);
    } catch (err) {
      logger.error(`Failed to start: ${err instanceof Error ? err.message : String(err)}`);
      logger.info("Waiting for spec file to change…");
    }
  }

  async function restart(): Promise<void> {
    if (restarting) return;
    restarting = true;

    logger.info("Spec file changed — restarting…");

    if (currentServer) {
      try {
        await stopServer(currentServer);
      } catch {
        // Server may not be running
      }
      currentServer = null;
    }

    boot();
    restarting = false;
  }

  // Debounce rapid file changes
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedRestart = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(restart, 300);
  };

  boot();

  // Watch the spec file
  const dir = path.dirname(resolvedPath);
  const basename = path.basename(resolvedPath);

  watcher = fs.watch(dir, (eventType, filename) => {
    if (filename === basename) {
      debouncedRestart();
    }
  });

  watcher.on("error", (err) => {
    logger.error(`Watcher error: ${err.message}`);
  });

  // Graceful shutdown
  const cleanup = async (): Promise<void> => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (watcher) watcher.close();
    if (currentServer) {
      await stopServer(currentServer);
    }
    logger.info("Shut down.");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}
