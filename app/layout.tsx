// Root layout for Gearshack Winterberry
// Contains global scripts that must load before any other code

export const metadata = {
  title: 'Gearshack',
  description: 'Your outdoor gear companion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Meticulous.ai recorder - MUST be first script to load */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          data-recording-token="Hfx0rAszTGc7WlMQNOi2ORW3bIiPMflK9o88ds5B"
          data-is-production-environment={process.env.VERCEL_ENV === "production" ? "true" : "false"}
          src="https://snippet.meticulous.ai/v1/meticulous.js"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
