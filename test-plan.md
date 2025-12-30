# Gearshack Test Plan

## Overview

This document outlines the comprehensive testing strategy for the Gearshack Next.js application.

**Codebase Size:**
- 112 files in /app
- 255 component files
- 113 hook files
- 116 lib/utility files
- 58 API endpoints

**Current Test Coverage:** 3 test files (Mastra rate-limiting only)

## Testing Framework

- **Test Runner:** Vitest 4.x
- **Component Testing:** React Testing Library
- **Coverage Provider:** V8
- **Mocking:** Vitest mocks + MSW for API routes

## Coverage Targets

| Metric | Target |
|--------|--------|
| Statements | >85% |
| Branches | >80% |
| Functions | >80% |
| Lines | >85% |

## Phase 1: Foundation (Critical - 30 tests)

### Authentication & State Management
| Module | Path | Priority | Tests |
|--------|------|----------|-------|
| useSupabaseAuth | `/hooks/useSupabaseAuth.ts` | CRITICAL | 8 |
| SupabaseAuthProvider | `/components/auth/SupabaseAuthProvider.tsx` | CRITICAL | 5 |
| Supabase Client | `/lib/supabase/client.ts` | CRITICAL | 3 |
| Supabase Server | `/lib/supabase/server.ts` | CRITICAL | 4 |

### Validation Schemas
| Module | Path | Priority | Tests |
|--------|------|----------|-------|
| Gear Schema | `/lib/validations/gear-schema.ts` | HIGH | 6 |
| Loadout Schema | `/lib/validations/loadout-schema.ts` | HIGH | 4 |

## Phase 2: Core Features (50 tests)

### Gear Management
| Module | Path | Tests |
|--------|------|-------|
| useGearItems | `/hooks/useGearItems.ts` | 8 |
| useGearEditor | `/hooks/useGearEditor.ts` | 6 |
| GearEditorForm | `/components/gear-editor/GearEditorForm.tsx` | 6 |
| GearCard | `/components/inventory-gallery/GearCard.tsx` | 4 |

### Loadout Management
| Module | Path | Tests |
|--------|------|-------|
| useLoadouts | `/hooks/useLoadouts.ts` | 10 |
| LoadoutList | `/components/loadouts/LoadoutList.tsx` | 5 |
| WeightDonut | `/components/loadouts/WeightDonut.tsx` | 4 |

### Utilities
| Module | Path | Tests |
|--------|------|-------|
| Weight Utils | `/lib/utils/weight.ts` | 7 |

## Phase 3: Integration Tests (40 tests)

### API Routes
| Endpoint | Tests |
|----------|-------|
| /api/loadout-images/* | 8 |
| /api/catalog/items/search | 4 |
| /api/shares/[token]/* | 4 |

### Database Queries
| Module | Tests |
|--------|-------|
| social-queries.ts | 8 |
| wishlist-queries.ts | 6 |
| bulletin-queries.ts | 6 |

## Phase 4: E2E Critical Paths (20 tests)

1. **User Authentication Flow** (5 tests)
   - Login with email/password
   - Login with Google OAuth
   - Session persistence
   - Logout
   - Protected route redirection

2. **Gear Management Flow** (5 tests)
   - Add new gear item
   - Edit gear item
   - Delete gear item
   - Search/filter inventory
   - View gear details

3. **Loadout Management Flow** (5 tests)
   - Create loadout
   - Add items to loadout
   - Weight calculations
   - Share loadout
   - Export loadout

4. **Social Features Flow** (5 tests)
   - Follow user
   - Send friend request
   - View activity feed
   - Privacy settings

## Test File Structure

```
__tests__/
├── unit/
│   ├── hooks/
│   │   ├── useSupabaseAuth.test.ts
│   │   ├── useGearItems.test.ts
│   │   ├── useLoadouts.test.ts
│   │   └── ...
│   ├── lib/
│   │   ├── utils/
│   │   │   └── weight.test.ts
│   │   ├── validations/
│   │   │   ├── gear-schema.test.ts
│   │   │   └── loadout-schema.test.ts
│   │   └── supabase/
│   │       └── transformers.test.ts
│   └── components/
│       ├── auth/
│       ├── gear-editor/
│       └── loadouts/
├── integration/
│   ├── api/
│   │   ├── loadout-images.test.ts
│   │   ├── catalog-search.test.ts
│   │   └── shares.test.ts
│   └── flows/
│       ├── auth-flow.test.ts
│       └── gear-management.test.ts
└── e2e/
    ├── auth.e2e.test.ts
    ├── inventory.e2e.test.ts
    └── loadouts.e2e.test.ts
```

## Mocking Strategy

### Supabase Client Mock
```typescript
// __tests__/mocks/supabase.ts
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
};
```

### Test Data Fixtures
```typescript
// __tests__/fixtures/gear.ts
export const mockGearItem = {
  id: 'gear-123',
  name: 'Big Agnes Copper Spur HV UL2',
  brand: 'Big Agnes',
  weight_grams: 1020,
  status: 'own',
  category_id: 'shelter-tent',
};
```

## Success Criteria

- [ ] All 140+ planned tests pass
- [ ] Coverage: >85% statements, >80% branches, >80% functions
- [ ] No flaky tests
- [ ] Test suite runs in <30 seconds
- [ ] All linter errors resolved

## Notes

- Use realistic outdoor gear data for fixtures
- Mock all external APIs (Supabase, Cloudinary, etc.)
- Follow AAA pattern (Arrange, Act, Assert)
- Each test should be independent and deterministic
