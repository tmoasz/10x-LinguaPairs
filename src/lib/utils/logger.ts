/* eslint-disable no-console */

type LogArgs = Parameters<typeof console.log>;
type WarnArgs = Parameters<typeof console.warn>;
type ErrorArgs = Parameters<typeof console.error>;

/**
 * Lazy getter for dev mode detection.
 * Evaluated at call time (not module load time) to avoid issues with
 * import.meta.env being undefined during early module initialization.
 */
const isDev = (): boolean => {
  try {
    // Try Astro/Vite import.meta.env first
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV !== undefined) {
      return import.meta.env.DEV;
    }
  } catch {
    // Ignore errors accessing import.meta.env
  }

  // Fallback to process.env.NODE_ENV for Node.js environments
  return process.env.NODE_ENV !== "production";
};

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDev()) {
      console.debug(...args);
    }
  },
  info: (...args: LogArgs) => {
    if (isDev()) {
      console.info(...args);
    }
  },
  warn: (...args: WarnArgs) => {
    console.warn(...args);
  },
  error: (...args: ErrorArgs) => {
    console.error(...args);
  },
};
