/**
 * Structured logging utility
 * Feature: 050-price-tracking (Review fix #13)
 * Date: 2025-12-17
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  module?: string;
  function?: string;
  user_id?: string;
  tracking_id?: string;
  partner_id?: string;
  alert_id?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger class for structured logging
 */
class Logger {
  private readonly minLevel: LogLevel;
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private formatLogEntry(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      // JSON format for production (structured logging)
      return JSON.stringify(entry);
    } else {
      // Human-readable format for development
      const { timestamp: _timestamp, level, message, context, error } = entry;
      const levelEmoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      };

      let formatted = `${levelEmoji[level]} [${level.toUpperCase()}] ${message}`;

      if (context) {
        const contextStr = Object.entries(context)
          .filter(([_key, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join(' ');
        if (contextStr) {
          formatted += ` | ${contextStr}`;
        }
      }

      if (error) {
        formatted += `\n  Error: ${error.name}: ${error.message}`;
        if (error.stack) {
          formatted += `\n  Stack: ${error.stack}`;
        }
      }

      return formatted;
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatLogEntry(entry);

    // Output to console (will be captured by logging service in production)
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Create a logger with default context for a module
 */
export function createModuleLogger(module: string): {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext, error?: Error) => void;
  error: (message: string, context?: LogContext, error?: Error) => void;
} {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(message, { module, ...context }),
    info: (message: string, context?: LogContext) =>
      logger.info(message, { module, ...context }),
    warn: (message: string, context?: LogContext, error?: Error) =>
      logger.warn(message, { module, ...context }, error),
    error: (message: string, context?: LogContext, error?: Error) =>
      logger.error(message, { module, ...context }, error),
  };
}
