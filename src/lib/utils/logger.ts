/* eslint-disable no-console */

const isDev = import.meta.env.DEV;

type LogArgs = Parameters<typeof console.log>;
type WarnArgs = Parameters<typeof console.warn>;
type ErrorArgs = Parameters<typeof console.error>;

export const logger = {
  debug: (...args: LogArgs) => {
    if (!isDev) {
      return;
    }

    console.debug(...args);
  },
  info: (...args: LogArgs) => {
    if (!isDev) {
      return;
    }

    console.info(...args);
  },
  warn: (...args: WarnArgs) => {
    console.warn(...args);
  },
  error: (...args: ErrorArgs) => {
    console.error(...args);
  },
};


