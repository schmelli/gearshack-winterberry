# Research: App Shell & Branding

**Feature**: 003-app-shell-branding
**Date**: 2025-12-04

## Research Topics

### 1. Google Font Integration with Next.js

**Decision**: Use `next/font/google` to load "Rock Salt" font with CSS variable approach.

**Rationale**:
- Next.js built-in font optimization automatically self-hosts fonts
- CSS variable approach allows applying font selectively (brand name only)
- Zero layout shift due to font subsetting and preloading
- Constitution requires preferring built-in Next.js features

**Implementation**:
```typescript
import { Rock_Salt } from 'next/font/google';

const rockSalt = Rock_Salt({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-rock-salt',
  display: 'swap',
});
```

**Alternatives Considered**:
- Google Fonts CDN link: Slower, external dependency, not recommended by Next.js
- Self-hosted font files: More complex, `next/font` handles this automatically

---

### 2. Sticky Header Pattern

**Decision**: Use `position: sticky` with `top: 0` and appropriate z-index for header.

**Rationale**:
- Native CSS solution, no JavaScript needed
- Works across all modern browsers
- Simpler than `position: fixed` which requires padding compensation
- Tailwind classes: `sticky top-0 z-50`

**Implementation**:
```tsx
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
```

**Alternatives Considered**:
- `position: fixed`: Requires padding on body, more complex layout management
- JavaScript scroll listener: Unnecessary complexity for simple sticky behavior

---

### 3. Sticky Footer Pattern (Flexbox)

**Decision**: Use flex column layout with `min-h-screen` on container and `flex-1` on main content.

**Rationale**:
- Modern CSS solution, widely supported
- Footer naturally pushed to bottom even with minimal content
- Constitution requires flex/grid layouts with Tailwind

**Implementation**:
```tsx
// layout.tsx
<div className="flex min-h-screen flex-col">
  <SiteHeader />
  <main className="flex-1">{children}</main>
  <SiteFooter />
</div>
```

**Alternatives Considered**:
- CSS Grid with `grid-template-rows`: Works but flexbox is simpler for this use case
- JavaScript calculation: Unnecessary, CSS handles this natively
- `position: fixed` footer: Bad UX, covers content

---

### 4. Mobile Navigation Pattern

**Decision**: Use shadcn/ui Sheet component (slide-from-left) triggered by hamburger icon.

**Rationale**:
- Sheet component already available in project
- Follows common mobile UX patterns (Instagram, Twitter)
- Built-in accessibility, focus trapping, escape-to-close
- Constitution requires using existing shadcn/ui components

**Implementation**:
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="md:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    {/* Navigation links */}
  </SheetContent>
</Sheet>
```

**Alternatives Considered**:
- Dropdown menu for mobile: Less intuitive, limited space
- Full-screen overlay: Heavier, unnecessary for simple nav
- Accordion/collapsible: Doesn't match spec requirement for slide-out

---

### 5. User Menu Component

**Decision**: Use shadcn/ui DropdownMenu with Avatar trigger.

**Rationale**:
- DropdownMenu provides keyboard navigation, proper ARIA attributes
- Avatar component needed for circular user image
- Both need to be installed via shadcn CLI

**shadcn Components Needed**:
```bash
npx shadcn@latest add dropdown-menu avatar
```

**Implementation**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
      <Avatar className="h-8 w-8">
        <AvatarImage src="/placeholder-avatar.png" />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Sign out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Alternatives Considered**:
- Custom dropdown: Constitution prohibits creating new base components
- Popover component: DropdownMenu is semantically correct for menus

---

### 6. Notification Bell with Badge

**Decision**: Use lucide-react Bell icon with positioned badge dot using Tailwind.

**Rationale**:
- lucide-react is the approved icon library per constitution
- Pure CSS badge positioning is simple and reliable
- No actual notification system needed per spec (mocked)

**Implementation**:
```tsx
<Button variant="ghost" size="icon" className="relative">
  <Bell className="h-5 w-5" />
  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
  <span className="sr-only">Notifications</span>
</Button>
```

**Alternatives Considered**:
- Badge component: Would need shadcn Badge, but positioned dot is simpler
- Icon with built-in badge: lucide doesn't have this, CSS is cleaner

---

### 7. Disabled Navigation Links

**Decision**: Use `aria-disabled` with muted styling and prevent navigation.

**Rationale**:
- Accessible approach that indicates disabled state to screen readers
- Visual indication via Tailwind classes
- Links remain visible but clearly non-interactive

**Implementation**:
```tsx
<Link
  href="/loadouts"
  aria-disabled="true"
  className="text-muted-foreground pointer-events-none opacity-50"
  tabIndex={-1}
>
  Loadouts
</Link>
```

**Alternatives Considered**:
- Remove from DOM: Spec says show as disabled/grayed, not hidden
- Button instead of Link: Links are semantically correct for navigation
- `disabled` attribute: Not valid on anchor elements

---

### 8. Footer Multi-Column Layout

**Decision**: Use CSS Grid with responsive columns (1 col mobile, 3 cols desktop).

**Rationale**:
- Grid provides clean column alignment
- Responsive breakpoints handle mobile stacking
- Footer content naturally flows within columns

**Implementation**:
```tsx
<footer className="bg-slate-900 text-slate-200">
  <div className="container grid gap-8 py-12 md:grid-cols-3">
    {/* Brand column */}
    {/* Legal column */}
    {/* Social column */}
  </div>
  <div className="border-t border-slate-800 py-4 text-center text-sm">
    © 2025 Gearshack. Built with Vibe.
  </div>
</footer>
```

**Alternatives Considered**:
- Flexbox: Works but grid is cleaner for fixed column count
- Table layout: Outdated, not responsive-friendly

---

## Dependencies Summary

| Component | Status | Action |
|-----------|--------|--------|
| Sheet | ✅ Available | None |
| Button | ✅ Available | None |
| DropdownMenu | ❌ Missing | `npx shadcn@latest add dropdown-menu` |
| Avatar | ❌ Missing | `npx shadcn@latest add avatar` |
| Rock Salt font | ❌ Missing | Add via `next/font/google` in layout.tsx |

---

## Resolved Clarifications

No NEEDS CLARIFICATION items - all decisions made based on:
1. Constitution requirements
2. Spec requirements with explicit details
3. Standard Next.js/React best practices
4. Existing shadcn/ui patterns
