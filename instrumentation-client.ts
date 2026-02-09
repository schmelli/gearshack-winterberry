// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// IMPORTANT: This is the ONLY client-side Sentry init file.
// Do NOT also init Sentry in sentry.client.config.ts to avoid
// "Multiple Sentry Session Replay instances" errors.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://99fbe5ece423a4b665e0553422a7f4a6@o4509520742645760.ingest.de.sentry.io/4510527773409360",

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
      autoInject: false,
      themeDark: {
        background: "#1a1a1a",
        backgroundHover: "#292929",
        foreground: "#ffffff",
        error: "#ef4444",
        success: "#10b981",
        border: "#404040",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
      },
      themeLight: {
        background: "#ffffff",
        backgroundHover: "#f9fafb",
        foreground: "#1f2937",
        error: "#ef4444",
        success: "#10b981",
        border: "#e5e7eb",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
      },
    }),
  ],

  // Define how likely traces are sampled. Reduced from 1.0 to 0.1 for performance.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  debug: false,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;