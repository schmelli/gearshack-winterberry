// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://99fbe5ece423a4b665e0553422a7f4a6@o4509520742645760.ingest.de.sentry.io/4510527773409360",

  // Define how likely traces are sampled. Reduced from 1.0 to 0.1 for performance.
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    // User Feedback integration for the report dialog
    Sentry.feedbackIntegration({
      // Additional Feedback configuration
      colorScheme: "system",
      showBranding: false,
      autoInject: false, // We manually trigger it via getFeedback().openDialog()
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

  // Enable sending user PII (Personally Identifiable Information)
  // This is needed for the user feedback form to pre-fill user email
  sendDefaultPii: true,
});
