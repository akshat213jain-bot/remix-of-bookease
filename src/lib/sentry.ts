import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error monitoring
 * Call this in main.tsx before rendering the app
 */
export const initSentry = () => {
    // Only initialize in production or if SENTRY_DSN is set
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    if (!dsn) {
        console.log("Sentry DSN not configured, skipping initialization");
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE,

        // Performance monitoring
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
            }),
        ],

        // Sample rates
        tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Filter out known non-critical errors
        beforeSend(event) {
            // Ignore ResizeObserver errors (common React issue)
            if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
                return null;
            }
            return event;
        },
    });
};

/**
 * Capture a custom error with context
 */
export const captureError = (error: Error, context?: Record<string, unknown>) => {
    Sentry.captureException(error, {
        extra: context,
    });
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (user: { id: string; email?: string; name?: string } | null) => {
    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.name,
        });
    } else {
        Sentry.setUser(null);
    }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>) => {
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: "info",
    });
};

export { Sentry };
