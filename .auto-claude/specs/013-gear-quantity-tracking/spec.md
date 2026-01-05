# Specification: Gear Quantity Tracking

## Overview

Enable the existing database `quantity` column to track multiple units of the same gear item, allowing users to manage inventory counts for consumables and spare items. This feature addresses a competitive gap identified in PackLight user feedback and leverages pre-existing database infrastructure.

## Workflow Type

**Type**: feature

**Rationale**: This task introduces new functionality by surfacing an existing database column through the UI. It requires changes across multiple views (form, inventory, loadout builder, gallery) and involves new business logic for quantity validation and weight calculations.

## Task Scope

### Services Involved
- **main** (primary) - Next.js frontend with Supabase backend integration

### This Task Will:
- [ ] Add quantity input field to gear item form with default value of 1
- [ ] Display total item count in inventory view when quantity > 1
- [ ] Implement quantity validation in loadout builder to prevent over-allocation
- [ ] Update weight calculations to multiply by quantity where applicable
- [ ] Show quantity badges on multi-unit items in gallery view
- [ ] Update TypeScript interfaces to include quantity field
- [ ] Ensure backward compatibility with existing gear items (default quantity = 1)

### Out of Scope:
- Database schema migration (column already exists)
- Quantity tracking across multiple loadouts (future enhancement)
- Partial quantity allocation (e.g., splitting 4 canisters across 2 trips)
- Quantity history or audit trail

## Service Context

### main

**Tech Stack:**
- Language: TypeScript 5.x (strict mode)
- Framework: Next.js 16+, React 19+
- State Management: Zustand
- Database: Supabase (PostgreSQL)
- UI: shadcn/ui, Tailwind CSS 4
- Forms: react-hook-form 7.x
- Validation: Zod 4.x
- Testing: Vitest

**Entry Point:** `app/` (Next.js App Router)

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Key Directories:**
- `components/` - UI components (gear forms, inventory displays, gallery)
- `hooks/` - Custom hooks (gear management, loadout logic)
- `types/` - TypeScript interfaces
- `lib/` - Utilities and helpers
- `__tests__/` - Test files

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `types/gear.ts` (or similar) | main | Add `quantity?: number` to GearItem interface with default 1 |
| `components/inventory/GearItemForm.tsx` (or similar) | main | Add quantity input field using react-hook-form |
| `components/inventory/InventoryGallery.tsx` (or similar) | main | Add quantity badge to items where quantity > 1 |
| `components/loadouts/LoadoutBuilder.tsx` (or similar) | main | Add quantity validation when adding items to loadouts |
| `hooks/useGearInventory.ts` (or similar) | main | Update Supabase queries to include quantity column |
| `hooks/useLoadouts.ts` (or similar) | main | Add logic to check available quantity before adding items |
| `lib/calculations.ts` (or similar) | main | Update weight calculation functions to multiply by quantity |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| Existing gear form components | react-hook-form integration with Zod validation |
| Existing Supabase hooks | Query patterns and state management with Zustand |
| Existing weight calculation utilities | Mathematical operations and unit handling |
| Existing badge/indicator components | Visual indicators for item properties |

## Patterns to Follow

### Form Integration with react-hook-form + Zod

**Key Points:**
- Use `useForm` hook with Zod resolver for validation
- Define schema with default values (quantity: 1)
- Use controlled inputs from shadcn/ui (Input component)
- Validate minimum value (1) and integer only

**Example Schema:**
```typescript
const gearItemSchema = z.object({
  // ... existing fields
  quantity: z.number().int().min(1).default(1),
});
```

### Zustand State Management

**Key Points:**
- Store quantity in gear item state
- Update state immutably when quantity changes
- Persist to Supabase on save
- Handle optimistic updates with rollback on error

### Supabase Integration

**Key Points:**
- Query `gear_items` table with quantity column
- Use `.select('*')` to include quantity in results
- Update/insert operations should include quantity field
- Default to 1 if quantity is null (backward compatibility)

### Visual Indicators (Badges)

**Key Points:**
- Use shadcn/ui Badge component for consistency
- Display badge only when quantity > 1
- Position badge in top-right corner of item card
- Use subtle styling to avoid visual clutter

## Requirements

### Functional Requirements

1. **Gear Item Form Enhancement**
   - Description: Add quantity input field to gear creation/edit form
   - Acceptance: Form displays quantity field with default value of 1, validates integer >= 1, saves to database

2. **Inventory Count Display**
   - Description: Show total count for items with quantity > 1
   - Acceptance: Inventory view displays "x N" or badge indicator on multi-unit items

3. **Loadout Quantity Validation**
   - Description: Prevent adding more items to loadouts than available in inventory
   - Acceptance: Error message shown when trying to exceed available quantity, loadout builder shows available count

4. **Weight Calculation Update**
   - Description: Multiply item weight by quantity in all calculations
   - Acceptance: Loadout total weight correctly reflects quantity × weight, individual item displays show calculated weight

5. **Gallery Visual Indicator**
   - Description: Display quantity badge on gallery cards for multi-unit items
   - Acceptance: Badge visible on items where quantity > 1, positioned consistently, uses project design system

### Edge Cases

1. **Existing Items Without Quantity** - Default to quantity = 1 for backward compatibility
2. **Zero or Negative Quantity** - Validation prevents values < 1
3. **Non-Integer Quantity** - Form validation requires integer values only
4. **Quantity Exceeds Loadout Capacity** - Show warning but allow (weight is more important than count)
5. **Item in Multiple Loadouts** - Track total allocated vs. available (future enhancement, not in scope)

## Implementation Notes

### DO
- Follow Feature-Sliced Light architecture (logic in hooks, stateless UI components)
- Use existing shadcn/ui components (Input, Badge, Label)
- Maintain TypeScript strict mode compliance
- Add quantity to existing Zod schemas
- Update Supabase queries to include quantity column
- Provide visual feedback for quantity constraints
- Test with existing gear data (backward compatibility)
- Use internationalization (next-intl) for all new UI text

### DON'T
- Create new database migrations (column exists)
- Add complex quantity allocation logic across multiple loadouts (out of scope)
- Break existing weight calculations
- Ignore TypeScript errors or use `any` types
- Create separate CSS files (use Tailwind only)
- Skip form validation for quantity field

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- main: http://localhost:3000

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for server-side operations)

## Success Criteria

The task is complete when:

1. [ ] Gear item form includes quantity field with default value of 1 and validates integer >= 1
2. [ ] Inventory view displays quantity indicator/badge on items where quantity > 1
3. [ ] Loadout builder prevents adding more items than available (respects quantity)
4. [ ] Weight calculations correctly multiply item weight by quantity
5. [ ] Gallery view shows quantity badges on multi-unit items
6. [ ] No console errors in browser
7. [ ] Existing tests still pass
8. [ ] New functionality verified via browser testing
9. [ ] Backward compatibility confirmed (existing items default to quantity 1)
10. [ ] TypeScript compiles without errors

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Gear item schema validation | `__tests__/types/gear.test.ts` | quantity field accepts integers >= 1, defaults to 1, rejects invalid values |
| Weight calculation | `__tests__/lib/calculations.test.ts` | Weight correctly multiplies by quantity (e.g., 2kg × 3 = 6kg) |
| Quantity validation hook | `__tests__/hooks/useGearInventory.test.ts` | Validates quantity constraints, handles null/undefined as 1 |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Form submission with quantity | main (form → Supabase) | Quantity persists to database, retrieves correctly |
| Loadout builder quantity check | main (loadout logic → inventory) | Cannot add item if quantity exceeded |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Add gear with quantity | 1. Open gear form 2. Fill fields 3. Set quantity to 3 4. Save | Item saved with quantity=3, displays in inventory with badge |
| Add item to loadout | 1. Create gear with quantity=2 2. Open loadout 3. Try to add 3 of the item | Error shown, only 2 can be added |
| Weight calculation | 1. Create 1kg item with quantity=4 2. Add to loadout 3. Check total weight | Loadout weight shows +4kg |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Gear Item Form | `http://localhost:3000/inventory/new` (or similar) | Quantity field visible, default=1, validation works |
| Inventory Gallery | `http://localhost:3000/inventory` | Quantity badges display on items with quantity>1 |
| Loadout Builder | `http://localhost:3000/loadouts/[id]` | Quantity validation prevents over-allocation |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Quantity column exists | `SELECT column_name FROM information_schema.columns WHERE table_name='gear_items' AND column_name='quantity'` | Returns 1 row |
| Default value handling | `SELECT * FROM gear_items WHERE quantity IS NULL` | No rows (or defaults to 1 on read) |
| Quantity persists | Insert test item with quantity=5, then query | quantity=5 in database |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (form, inventory, loadout, gallery)
- [ ] Database state verified (quantity column populated correctly)
- [ ] No regressions in existing functionality (weight, forms, loadouts)
- [ ] Code follows Feature-Sliced Light architecture (logic in hooks, stateless UI)
- [ ] No TypeScript errors or `any` types introduced
- [ ] Backward compatibility verified (existing items work with quantity=1 default)
- [ ] All new UI text uses next-intl for internationalization
- [ ] No console errors or warnings
- [ ] Performance remains acceptable (no N+1 queries introduced)
