// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://99fbe5ece423a4b665e0553422a7f4a6@o4509520742645760.ingest.de.sentry.io/4510527773409360",

  // Define how likely traces are sampled. Reduced from 1.0 to 0.1 for performance.
  // 100% sampling causes significant overhead on every request.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
