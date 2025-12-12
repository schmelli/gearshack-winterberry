# Research: Landing Page & i18n Strings

**Feature**: 028-landing-page-i18n
**Date**: 2025-12-07

## Design Decisions

### DR-001: Landing Page Component Architecture

**Decision**: Create a `LandingPage` client component that orchestrates stateless section components.

**Rationale**:
- Constitution Principle I (Feature-Sliced Light) requires stateless UI components
- Auth state needed for CTA switching - consumed via `useAuthContext` hook
- Each section (Hero, Features, Social Proof, Pricing) is a pure presentational component
- Translations accessed via `useTranslations` hook at LandingPage level, passed as props

**Alternatives Considered**:
- Server Component with conditional rendering: Rejected because auth state is client-side (Firebase Auth)
- Individual section components with their own auth checks: Rejected for prop drilling simplicity

### DR-002: Deep Forest Theme Implementation

**Decision**: Use Tailwind CSS custom colors via `bg-[#405A3D]` for Deep Forest backgrounds with emerald accents from Tailwind palette.

**Rationale**:
- FR-013 specifies #405A3D as the Deep Forest color
- Existing app uses dark mode default (Feature 004)
- Tailwind arbitrary values allow one-off colors without extending config
- Emerald accent (`emerald-500`, `emerald-600`) provides contrast for CTAs

**Alternatives Considered**:
- Extend tailwind.config.js with custom color: More maintainable for large-scale use but overkill for one color
- CSS custom property: Would require globals.css modification

### DR-003: Translation Namespace Strategy

**Decision**: Extend existing `messages/en.json` and `messages/de.json` with four new namespaces: Landing, Auth, Inventory, GearEditor.

**Rationale**:
- Feature 027 established namespace pattern (Navigation, Hero, Common)
- Type safety via global.d.ts automatically extends with new namespaces
- Logical grouping: Landing (page-specific), Auth (forms), Inventory (gallery), GearEditor (form labels)

**Implementation Pattern**:
```json
{
  "Landing": {
    "heroTitle": "...",
    "heroSubtitle": "...",
    "ctaStartTrial": "Start Free Trial",
    "ctaDashboard": "Go to Dashboard"
  },
  "Auth": {
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "loginButton": "Log In",
    "registerButton": "Create Account"
  }
}
```

### DR-004: CTA Button Logic

**Decision**: Use `useAuthContext` hook to determine authentication state and render appropriate CTA.

**Rationale**:
- FR-005/FR-006 require different CTAs based on auth state
- `useAuthContext` already provides `user` object (null when logged out)
- Keeps LandingPage as a thin orchestrator - just checks `!!user`

**Implementation Pattern**:
```tsx
const { user } = useAuthContext();
const ctaLabel = user ? t('ctaDashboard') : t('ctaStartTrial');
const ctaHref = user ? '/inventory' : '/login';
```

### DR-005: Responsive Section Layout

**Decision**: Use CSS Grid with `grid-cols-1 md:grid-cols-3` for feature grid, flexbox for other sections.

**Rationale**:
- FR-007 requires mobile-first design (320px and up)
- Feature grid (3 items) naturally maps to 3-column grid on desktop
- Stack to single column on mobile with `grid-cols-1`
- Hero, Social Proof, Pricing use flexbox for simpler layouts

**Breakpoints**:
- Mobile: < 768px (single column, stacked sections)
- Tablet: 768px+ (2-column where appropriate)
- Desktop: 1024px+ (full 3-column feature grid)

### DR-006: Social Proof Content Strategy

**Decision**: Use placeholder testimonials and trust indicators with translation keys.

**Rationale**:
- Spec assumption: "Social proof section will use placeholder content initially"
- Structure allows easy replacement with real testimonials later
- Translation keys for quotes enable localization when real content available

**Placeholder Structure**:
```json
{
  "socialProof": {
    "title": "Trusted by Outdoor Enthusiasts",
    "testimonial1": "GearGraph changed how I organize my hiking gear...",
    "author1": "Alex M., Thru-Hiker"
  }
}
```

### DR-007: Pricing Tier Display

**Decision**: Display two tiers (Basecamp/Free, Trailblazer/Pro) with feature comparison.

**Rationale**:
- Spec defines: "Pricing Tier: Product offering level (Basecamp/Free, Trailblazer/Pro)"
- Spec assumption: "Pricing tiers are placeholders - actual pricing details can be updated later"
- Two-tier comparison is standard SaaS pattern

**Implementation**:
- Use shadcn/ui Card components for each tier
- Highlight recommended tier with emerald border
- Feature list with check/x icons per tier

## Technology Best Practices

### Next.js App Router Landing Pages

**Pattern**: Use route group `(marketing)` for landing-specific layouts (optional, not implemented here).

**Best Practice Applied**:
- Landing page at `app/[locale]/page.tsx` replaces default Next.js template
- Server-side rendering for SEO (initial HTML includes content)
- Client components for interactive elements only (CTA logic)

### next-intl Namespace Organization

**Best Practice Applied**:
- Namespace per feature/domain (Landing, Auth, Inventory, GearEditor)
- Flat key structure within namespace (avoid deep nesting)
- Common namespace for shared strings (save, cancel, delete)
- Type-safe keys via global.d.ts (IDE autocompletion)

### Tailwind CSS Dark Mode

**Best Practice Applied**:
- Dark mode as default (existing from Feature 004)
- Use `dark:` variants for light mode overrides
- Deep Forest color works well in both modes with proper contrast

## Unresolved Questions

None - all Technical Context items are resolved.

## References

- Feature 027 (i18n with next-intl): `specs/027-i18n-next-intl/`
- next-intl documentation: https://next-intl-docs.vercel.app/
- shadcn/ui components: https://ui.shadcn.com/
- Tailwind CSS colors: https://tailwindcss.com/docs/customizing-colors
