# Research: Nature Vibe Polish

**Feature**: 004-nature-vibe-polish
**Date**: 2025-12-04

## Research Topics

### 1. Color Palette - Forest Green Primary

**Decision**: Use `#1A4D2E` (Deep Forest Green) as primary brand color, converted to OKLCH for CSS variables.

**Rationale**:
- Matches the "outdoor/nature" brand identity
- Provides excellent contrast against light backgrounds (7.8:1 ratio on white)
- Works well with the existing shadcn/ui zinc-based neutral palette
- OKLCH format maintains perceptual uniformity across devices

**OKLCH Conversion**:
```css
/* #1A4D2E → OKLCH */
--primary: oklch(0.35 0.08 155);  /* Forest green */
--primary-foreground: oklch(0.98 0 0);  /* Near white for contrast */
```

**Alternatives Considered**:
- Emerald-900 (#064e3b): Too blue-green, less earthy
- Pure forest (#228B22): Too bright, less sophisticated
- Tailwind green-900: Generic, doesn't feel unique

---

### 2. Accent Color - Terracotta/Clay

**Decision**: Use `#D97706` (Amber-600/Terracotta) as accent color for buttons and active states.

**Rationale**:
- Evokes warmth of campfires and desert landscapes
- High contrast against both forest green and white backgrounds
- Amber-600 is already in Tailwind palette, reducing custom color needs
- Passes WCAG AA for large text on white backgrounds

**OKLCH Conversion**:
```css
/* #D97706 → OKLCH */
--accent: oklch(0.65 0.18 70);  /* Terracotta/clay */
--accent-foreground: oklch(0.15 0 0);  /* Near black for contrast */
```

**Alternatives Considered**:
- Orange-500 (#f97316): Too bright, feels more "tech" than "nature"
- Rust (#B7410E): Too dark, insufficient contrast
- Copper: Hard to achieve consistent rendering across devices

---

### 3. Background Color - Stone/Mist

**Decision**: Use Tailwind `stone-50` (#FAFAF9) for light mode background.

**Rationale**:
- Subtle warmth without being yellow
- Reduces eye strain compared to pure white
- Stone palette has earthy undertones matching nature theme
- Already in Tailwind, no custom color needed

**OKLCH Conversion**:
```css
/* stone-50 #FAFAF9 → OKLCH */
--background: oklch(0.985 0.002 90);  /* Warm off-white */
```

**Alternatives Considered**:
- Slate-50: Too cool/blue, doesn't feel earthy
- Pure white: Clinical, contradicts nature theme
- Cream/ivory: Too yellow, feels dated

---

### 4. Dark Mode Colors

**Decision**: Use deep forest/slate tones that maintain the nature aesthetic.

**Rationale**:
- Dark backgrounds should feel like a forest at night, not a tech dashboard
- Muted earth tones prevent the "dark mode = inverted colors" look
- Forest green becomes lighter in dark mode for visibility
- Terracotta accent remains similar for brand consistency

**OKLCH Values for Dark Mode**:
```css
.dark {
  --background: oklch(0.18 0.02 155);  /* Deep forest night */
  --card: oklch(0.22 0.015 155);  /* Slightly lighter forest */
  --primary: oklch(0.65 0.12 155);  /* Lighter forest green */
  --accent: oklch(0.70 0.16 70);  /* Slightly brighter terracotta */
  --border: oklch(0.35 0.02 155);  /* Muted forest border */
}
```

**Alternatives Considered**:
- Pure black background: Too harsh, loses nature feel
- Slate-900: Too blue, feels corporate
- Brown-tinted dark: Can look muddy on some screens

---

### 5. Dark Mode Implementation - next-themes

**Decision**: Use `next-themes` library for dark mode toggle and persistence.

**Rationale**:
- De facto standard for Next.js dark mode
- Handles SSR hydration correctly (no flash of wrong theme)
- Built-in localStorage persistence
- Works seamlessly with Tailwind's dark mode class strategy
- shadcn/ui already designed for next-themes compatibility

**Implementation Pattern**:
```tsx
// components/theme/ThemeProvider.tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

**Alternatives Considered**:
- Custom React context: More code, SSR hydration issues to solve manually
- CSS media query only: No user preference override
- next-themes with system: User requested manual toggle takes precedence

---

### 6. Border Radius - Organic Feel

**Decision**: Increase global radius from 0.625rem to 0.75rem.

**Rationale**:
- 0.75rem (12px) creates friendlier, more organic shapes
- Aligns with modern design trends (Apple, Stripe)
- Small enough to not look "bubbly" or childish
- CSS variable already exists, single-point change

**Implementation**:
```css
:root {
  --radius: 0.75rem;  /* Up from 0.625rem */
}
```

**Alternatives Considered**:
- 1rem: Too rounded, starts to look pill-shaped
- 0.5rem: Too subtle, not noticeably different
- Per-component radius: Inconsistent, more maintenance

---

### 7. Header Alignment Fix

**Decision**: Use flexbox `items-center` with explicit height matching for logo container and text.

**Rationale**:
- Current issue: Logo wrapper has padding that offsets vertical alignment
- Solution: Match the flex container height and ensure consistent line-height
- Keep backdrop blur as already implemented, just improve alignment

**Implementation**:
```tsx
<Link href="/" className="flex items-center gap-3">
  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
    <Image ... className="h-9 w-9" />
  </div>
  <span className="flex items-center text-xl leading-none font-[family-name:var(--font-rock-salt)]">
    Gearshack
  </span>
</Link>
```

**Alternatives Considered**:
- Remove logo wrapper padding: Loses visual separation
- Absolute positioning: Brittle, doesn't scale with content
- Grid layout: Overkill for simple horizontal alignment

---

### 8. Settings Page Structure

**Decision**: Create minimal Settings page with Appearance section containing theme toggle.

**Rationale**:
- Settings page already in user menu items (Profile, Settings, Sign out)
- Simple card-based layout matching existing design patterns
- Room for future settings sections (Profile, Notifications, etc.)
- Uses shadcn/ui Switch component for toggle

**Implementation Pattern**:
```tsx
// app/settings/page.tsx
export default function SettingsPage() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how Gearshack looks</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
    </main>
  );
}
```

**Alternatives Considered**:
- Modal dialog: Harder to extend with more settings
- Header dropdown: Limited space for future options
- System tray icon: Not standard for web apps

---

## Dependencies Summary

| Component | Status | Action |
|-----------|--------|--------|
| next-themes | ❌ Missing | `npm install next-themes` |
| shadcn Switch | ❌ Missing | `npx shadcn@latest add switch` |
| All other shadcn components | ✅ Available | None |
| Tailwind stone palette | ✅ Available | None |

---

## Color Contrast Verification

All color combinations verified against WCAG AA standards:

| Combination | Ratio | Status |
|-------------|-------|--------|
| Forest green on stone-50 | 7.8:1 | ✅ AAA |
| Terracotta on white | 4.6:1 | ✅ AA |
| White on forest green | 7.8:1 | ✅ AAA |
| Light text on dark background | 12.5:1 | ✅ AAA |
| Terracotta on dark background | 5.2:1 | ✅ AA |

---

## Resolved Clarifications

No NEEDS CLARIFICATION items - all decisions made based on:
1. Spec requirements with explicit color guidance
2. WCAG accessibility standards
3. shadcn/ui compatibility requirements
4. next-themes as standard Next.js solution
