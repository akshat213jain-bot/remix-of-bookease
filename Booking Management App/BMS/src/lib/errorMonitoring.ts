/**
 * Error Monitoring & Logging Utilities
 * Production-ready error tracking and logging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, unknown>;
}

// Check if we're in production
const isProduction = import.meta.env.PROD;

// Log storage for debugging
const logBuffer: LogEntry[] = [];
const MAX_LOG_BUFFER = 100;

/**
 * Add entry to log buffer
 */
const addToBuffer = (entry: LogEntry) => {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }
};

/**
 * Format error for logging
 */
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ""}`;
  }
  return String(error);
};

/**
 * Create structured log entry
 */
const createLogEntry = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  context,
  error,
});

/**
 * Logger with structured logging support
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    const entry = createLogEntry("debug", message, context);
    addToBuffer(entry);
    if (!isProduction) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  },

  info: (message: string, context?: Record<string, unknown>) => {
    const entry = createLogEntry("info", message, context);
    addToBuffer(entry);
    console.info(`[INFO] ${message}`, context || "");
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    const entry = createLogEntry("warn", message, context);
    addToBuffer(entry);
    console.warn(`[WARN] ${message}`, context || "");
  },

  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    const errorObj = error instanceof Error ? error : undefined;
    const entry = createLogEntry("error", message, context, errorObj);
    addToBuffer(entry);
    console.error(`[ERROR] ${message}`, error, context || "");

    // In production, you could send to error tracking service
    if (isProduction && errorObj) {
      captureException(errorObj, { action: message, metadata: context });
    }
  },

  /**
   * Get recent logs for debugging
   */
  getRecentLogs: (count = 50): LogEntry[] => {
    return logBuffer.slice(-count);
  },

  /**
   * Clear log buffer
   */
  clearLogs: () => {
    logBuffer.length = 0;
  },
};

/**
 * Capture exception for error tracking
 * This can be extended to send to Sentry, LogRocket, etc.
 */
export const captureException = (
  error: Error,
  context?: ErrorContext
): void => {
  const errorData = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };

  // Log to console in development
  if (!isProduction) {
    console.error("[Captured Exception]", errorData);
    return;
  }

  // In production, you could send to your error tracking service
  // Example: sendToErrorService(errorData);
  console.error("[Production Error]", errorData);
};

/**
 * Capture a breadcrumb for error context
 */
export const captureBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, unknown>
): void => {
  logger.debug(`[Breadcrumb:${category}] ${message}`, data);
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (user: {
  id: string;
  email?: string;
  role?: string;
}): void => {
  logger.info("User context set", { userId: user.id, role: user.role });
};

/**
 * Clear user context (on logout)
 */
export const clearUserContext = (): void => {
  logger.info("User context cleared");
};

/**
 * Performance monitoring
 */
export const performance = {
  /**
   * Measure async function execution time
   */
  measure: async <T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      logger.debug(`[Performance] ${name} completed`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`[Performance] ${name} failed after ${duration}ms`, error);
      throw error;
    }
  },

  /**
   * Mark a point in time
   */
  mark: (name: string): void => {
    if (typeof window !== "undefined" && window.performance) {
      window.performance.mark(name);
    }
  },

  /**
   * Measure between two marks
   */
  measureBetween: (name: string, startMark: string, endMark: string): void => {
    if (typeof window !== "undefined" && window.performance) {
      try {
        window.performance.measure(name, startMark, endMark);
        const entries = window.performance.getEntriesByName(name);
        if (entries.length > 0) {
          logger.debug(`[Performance] ${name}`, { duration: `${entries[0].duration.toFixed(2)}ms` });
        }
      } catch {
        // Marks may not exist
      }
    }
  },
};

/**
 * Error boundary helper - wrap async handlers
 */
export const withErrorHandling = <T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  }) as T;
};

/**
 * Rate limiter for client-side operations
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canProceed(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return true;
    }

    return false;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(
      (timestamp) => now - timestamp < this.windowMs
    );
    return Math.max(0, this.maxRequests - this.timestamps.length);
  }
}

export default {
  logger,
  captureException,
  captureBreadcrumb,
  setUserContext,
  clearUserContext,
  performance,
  withErrorHandling,
  RateLimiter,
};