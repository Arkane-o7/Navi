type LogArgs = unknown[];

const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: LogArgs) => {
    if (isDevelopment) console.debug(...args);
  },
  info: (...args: LogArgs) => {
    if (isDevelopment) console.info(...args);
  },
  warn: (...args: LogArgs) => {
    console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};
