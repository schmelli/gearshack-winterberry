# Lint Errors Inventory

**Generated:** 2026-01-07
**Total Problems:** 562 (281 errors, 281 warnings)

## Summary by Category

### Errors (281)

| Category | Count | Description |
|----------|-------|-------------|
| @typescript-eslint/no-explicit-any | ~180 | Explicit `any` types used instead of proper typing |
| react-hooks/set-state-in-effect | 15 | Calling setState synchronously within useEffect |
| react-hooks/purity | 2 | Impure functions (Date.now) called during render |
| react-hooks/static-components | 2 | Components created during render |
| react/no-unescaped-entities | 8 | Unescaped quotes in JSX |
| react/no-children-prop | 2 | Passing children as props |
| react-hooks/rules-of-hooks | 1 | Hooks called conditionally |
| react-hooks/preserve-manual-memoization | 2 | Manual memoization conflicts |
| @typescript-eslint/ban-ts-comment | 20 | @ts-ignore and @ts-nocheck usage |
| prefer-const | 3 | let used when const would work |
| react-hooks/exhaustive-deps | 3 | Missing dependencies in hooks |

### Warnings (281)

| Category | Count | Description |
|----------|-------|-------------|
| @typescript-eslint/no-unused-vars | ~150 | Unused imports, variables, and parameters |
| @next/next/no-img-element | 25 | Using <img> instead of next/image |
| react-hooks/exhaustive-deps | 20 | Missing hook dependencies |
| react-hooks/incompatible-library | 12 | React Hook Form watch() pattern |
| Unused eslint-disable directives | 8 | Unnecessary disable comments |

## Top Files by Error Count

1. `lib/vip/vip-service.ts` - 40+ any types
2. `lib/supabase/bulletin-queries.ts` - 21 any types
3. `app/api/cron/enrich-gear-items/route.ts` - 11 any types
4. `lib/ai-assistant/ai-client.ts` - 12 any types
5. `hooks/admin/useAdminUsers.ts` - 8 any types
6. `lib/services/category-service.ts` - 9 @ts-ignore comments
7. Components with <img> elements - ~25 files

## Fix Strategy

### Phase 1: Auto-fixable (2 errors, 8 warnings)
- Run `npm run lint -- --fix`

### Phase 2: Critical Errors
1. Replace @ts-nocheck with proper typing
2. Replace @ts-ignore with @ts-expect-error (9 files)
3. Fix prefer-const issues (3 locations)

### Phase 3: React Compiler Errors
1. Fix set-state-in-effect (15 locations) - refactor to avoid cascading renders
2. Fix purity issues (2 locations) - move Date.now() outside render
3. Fix static-components (2 locations) - move component creation outside render
4. Fix rules-of-hooks (1 location) - move conditional hook call

### Phase 4: TypeScript Type Safety
1. Replace `any` types with proper types (~180 locations)
2. Focus on high-traffic files first

### Phase 5: Warnings Cleanup
1. Remove unused imports/variables (~150)
2. Replace <img> with next/image (~25)
3. Fix exhaustive-deps warnings (~20)

## Estimated Complexity

- **Low:** Auto-fix, unused vars, prefer-const
- **Medium:** @ts-ignore→@ts-expect-error, unescaped entities
- **High:** any→proper types, React Compiler errors
