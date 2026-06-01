import chalk from "chalk";

export interface Logger {
  info: (...args: string[]) => void;
  warn: (...args: string[]) => void;
  error: (...args: string[]) => void;
  success: (...args: string[]) => void;
  verbose: (...args: string[]) => void;
}

export function createLogger(verboseEnabled: boolean): Logger {
  return {
    info: (...args: string[]) => {
      console.log(chalk.blue("ℹ"), ...args);
    },
    warn: (...args: string[]) => {
      console.warn(chalk.yellow("⚠"), ...args);
    },
    error: (...args: string[]) => {
      console.error(chalk.red("✖"), ...args);
    },
    success: (...args: string[]) => {
      console.log(chalk.green("✔"), ...args);
    },
    verbose: (...args: string[]) => {
      if (verboseEnabled) {
        console.log(chalk.gray("…"), ...args.map((a) => chalk.gray(a)));
      }
    },
  };
}

export function formatMethod(method: string): string {
  const colors: Record<string, (s: string) => string> = {
    GET: chalk.green,
    POST: chalk.yellow,
    PUT: chalk.blue,
    PATCH: chalk.magenta,
    DELETE: chalk.red,
    OPTIONS: chalk.gray,
    HEAD: chalk.gray,
  };
  const colorFn = colors[method.toUpperCase()] ?? chalk.white;
  return colorFn(method.toUpperCase().padEnd(7));
}

export function formatStatus(status: number): string {
  if (status >= 200 && status < 300) return chalk.green(String(status));
  if (status >= 300 && status < 400) return chalk.blue(String(status));
  if (status >= 400 && status < 500) return chalk.yellow(String(status));
  return chalk.red(String(status));
}

export function formatMs(ms: number): string {
  if (ms < 10) return chalk.green(`${ms}ms`);
  if (ms < 100) return chalk.yellow(`${ms}ms`);
  return chalk.red(`${ms}ms`);
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
