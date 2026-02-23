// Root layout for Gearshack Winterberry
// Passthrough layout: delegates html/body to [locale]/layout.tsx (next-intl pattern)
// This avoids invalid nested <html><body> tags which break viewport meta on mobile
//
// Note: next/script with strategy="beforeInteractive" must be placed in the root
// layout (not nested layouts) per Next.js docs, so the Meticulous recorder lives here.

import Script from 'next/script';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Meticulous.ai recorder - strategy="beforeInteractive" ensures it loads
          before React hydration to capture full session replays.
          Set NEXT_PUBLIC_METICULOUS_TOKEN in your environment to override the token. */}
      <Script
        id="meticulous-recorder"
        src="https://snippet.meticulous.ai/v1/meticulous.js"
        strategy="beforeInteractive"
        data-recording-token={process.env.NEXT_PUBLIC_METICULOUS_TOKEN ?? 'Hfx0rAszTGc7WlMQNOi2ORW3bIiPMflK9o88ds5B'}
        data-is-production-environment={process.env.VERCEL_ENV === "production" ? "true" : "false"}
      />
      {children}
    </>
  )
}
