# Research: Rescue & Refine

**Feature Branch**: `011-rescue-refine-bugs`
**Date**: 2025-12-05

## Research Tasks

### 1. Firestore Document ID Format

**Question**: What constitutes a valid Firestore document ID?

**Findings**:
- Firestore auto-generated IDs are 20 alphanumeric characters (Base62: a-z, A-Z, 0-9)
- Pattern: `/^[a-zA-Z0-9]{20}$/`
- Custom IDs can contain: letters, numbers, hyphens, underscores
- Custom ID constraints: max 1500 bytes, no slashes
- Invalid IDs: hex colors like `#4CAF50` contain `#` which is unusual

**Decision**: Use regex `/^[a-zA-Z0-9_-]{10,}$/` for validation
- Allows both auto-generated and custom IDs
- Rejects hex colors and other malformed values
- Minimum 10 chars to catch truncated IDs

**Rationale**: Balances strictness with backward compatibility for any custom IDs in legacy data.

---

### 2. Legacy Flutter Field Names for Gear Item Name

**Question**: What field names does the Flutter app use for gear item names?

**Findings from adapter.ts analysis**:
- Current schema expects `name: z.string().min(1)` (required)
- No fallback fields checked for name
- Flutter Firestore pattern uses snake_case: `item_name`, `display_name`, `title`
- The resolveField helper already supports dual format but isn't used for name

**Decision**: Check fields in order: `name`, `title`, `item_name`, `displayName`
- `name` - current web format
- `title` - common legacy pattern
- `item_name` - snake_case legacy pattern
- `displayName` - camelCase variant

**Rationale**: Covers all likely field name variants from the Flutter app without breaking existing web data.

---

### 3. Edit Loadout: Sheet vs Dialog

**Question**: Should edit loadout use Sheet or Dialog for consistency?

**Findings**:
- `GearDetailModal.tsx` uses `Dialog` component
- `LoadoutMetadataSheet.tsx` uses `Sheet` component
- Constitution states: "Dialog for modals, Sheet for mobile drawers"
- Edit loadout is a modal action, not a mobile drawer

**Decision**: Migrate `LoadoutMetadataSheet.tsx` to `LoadoutMetadataDialog.tsx`
- Use Dialog component from shadcn/ui
- Maintain same form structure and fields
- Add DialogFooter for action buttons

**Rationale**: Aligns with constitution principle III (Design System Compliance) and provides consistent UX.

---

### 4. Footer Styling: Header Match

**Question**: What styling does the footer need to match the header?

**Findings from SiteHeader.tsx and SiteFooter.tsx**:
- Header: `bg-emerald-50/90 backdrop-blur-md` (light), `dark:bg-emerald-900/90` (dark)
- Footer current: `bg-emerald-900 text-emerald-100` (always dark emerald)
- User story specifies footer should match header's pastel green

**Decision**: Update footer to use light pastel styling matching header
- Light mode: `bg-emerald-50/90 backdrop-blur-md`
- Dark mode: `dark:bg-emerald-900/90`
- Adjust text colors accordingly

**Rationale**: Creates visual cohesion between header and footer per user story 4.

**Alternative Considered**: Keep dark footer for contrast
**Rejected Because**: User explicitly requested matching styling

---

### 5. Modal Z-Index Strategy

**Question**: What z-index values ensure modals appear above header?

**Findings**:
- SiteHeader.tsx: `z-50` (sticky top)
- Dialog components: Default shadcn/ui z-index is `z-50` on overlay
- DialogContent: Uses `fixed` positioning with overlay

**Decision**: No code changes needed
- shadcn/ui Dialog already uses proper z-index layering
- Dialog overlay is `z-50`, content is above
- If issues persist, can add `z-[60]` to specific dialogs

**Rationale**: Default shadcn/ui implementation handles stacking context correctly.

---

## Summary of Decisions

| Topic | Decision | Impact |
|-------|----------|--------|
| ID Validation | Regex `/^[a-zA-Z0-9_-]{10,}$/` | adapter.ts |
| Name Fields | Check `name`, `title`, `item_name`, `displayName` | adapter.ts, Zod schema |
| Edit Loadout | Migrate Sheet → Dialog | LoadoutMetadataSheet.tsx → Dialog |
| Footer | Match header's pastel emerald | SiteFooter.tsx |
| Z-Index | Use shadcn defaults | No changes needed |

---

## Unknowns Resolved

All NEEDS CLARIFICATION items have been resolved through code analysis. No external research required.
