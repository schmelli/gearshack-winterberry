/**
 * Sentry Example Page Layout
 *
 * This page lives outside the [locale] segment and therefore does not
 * pass through app/[locale]/layout.tsx (which owns <html>/<body>).
 * This minimal layout provides the required document shell.
 *
 * Note: This is a debug/testing page only, not shown to end users.
 */

export default function SentryExampleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
