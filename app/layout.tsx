// Root layout for Gearshack Winterberry
// Passthrough layout: delegates html/body to [locale]/layout.tsx (next-intl pattern)
// This avoids invalid nested <html><body> tags which break viewport meta on mobile

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
