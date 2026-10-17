/**
 * Production-safe logging utility
 * Console statements only execute in development mode
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  
  error: (...args) => {
    // Always log errors, but in production send to monitoring service
    console.error(...args);
    // TODO: Integrate with Sentry/LogRocket for production error tracking
  },
  
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
  
  info: (...args) => {
    if (isDev) console.info(...args);
  }
};

// For quick migration: export named functions
export const log = logger.log;
export const warn = logger.warn;
export const error = logger.error;
export const debug = logger.debug;
export const info = logger.info;
