---
active: true
iteration: 2
max_iterations: 100
completion_promise: "COVERAGE_COMPLETE"
started_at: "2026-01-02T23:55:24Z"
---

Achieve 95 percent minimum coverage across ALL test levels for Gearshack Next.js App:

CURRENT STATE ANALYSIS:
- Overall Coverage: 81.96 percent Statements, 78.11 percent Branches
- 61 Test Files: 55 passing, 6 failing
- 2147 Tests: 2137 passing (99.5 percent), 10 failing
- CRITICAL GAPS: bulletin 20.78 percent, wishlist 14.7 percent, offers 2.43 percent
- FAILING Tests: GearCard (5), PostMenu (3), useSupabaseAuth (2)

TARGET: 95 PERCENT MINIMUM across UNIT, API, and UI test levels

PHASE 1 - FIX ALL FAILING TESTS (Iterations 1-8):
ZERO TOLERANCE for failing tests - fix these first before adding new tests

PRIORITY 1A: GearCard.test.tsx (5 failures at lines 197-239)
- Root cause: Image switching tests failing
- Fix: Likely missing image mocks or async/await handling
- Verify: All 5 tests green before proceeding

PRIORITY 1B: PostMenu.test.tsx (3 failures)
- Root cause: Edit expired text not rendering as expected
- Fix: Conditional rendering check or data-testid issue
- Verify: All 3 tests green before proceeding

PRIORITY 1C: useSupabaseAuth.test.ts (2 failures)
- Root cause: Auth state change handling broken
- Fix: Supabase Auth event mocks incorrectly configured
- Verify: Both tests green before proceeding

SUCCESS CRITERIA PHASE 1:
✓ ALL 10 failing tests are green
✓ Test Pass Rate: 100 percent (2147/2147)
✓ Zero regression in existing passing tests
✓ Document fixes in FIXES-APPLIED.md

PHASE 2 - UNIT TEST COVERAGE TO 95 PERCENT (Iterations 9-25):
Target: Every utility, hook, helper, validator, transformer at 95 percent minimum

UNIT PRIORITY 2A: hooks/offers/useItemOffers.ts (2.43 percent → 95 percent)
Must test:
- All hook states: idle, loading, error, success
- All actions: fetchOffers, acceptOffer, declineOffer, refreshOffers
- Error boundaries: network failures, validation errors, timeout
- Edge cases: empty offers, expired offers, concurrent updates
- State transitions: loading to success, loading to error
Required: Minimum 15 comprehensive tests

UNIT PRIORITY 2B: hooks/price-tracking/* (33.33 percent → 95 percent)
Must test:
- Price update detection and notifications
- Threshold alerts and triggers
- Historical price comparison logic
- API integration with retry logic
- Cache invalidation strategies
Required: Minimum 12 tests

UNIT PRIORITY 2C: lib/utils/* (99.24 percent → 100 percent)
Already excellent but push to perfection:
- Test all edge cases in weight.ts
- Test all branches in remaining utilities
- Achieve 100 percent branch coverage
Required: Add 3-5 missing edge case tests

UNIT PRIORITY 2D: hooks/social (88.52 percent → 95 percent)
Must test:
- All social interaction hooks completely
- Follow/unfollow logic with race conditions
- Notification handling and debouncing
- Error recovery and retry mechanisms
Required: Add 8-10 tests for missing branches

SUCCESS CRITERIA PHASE 2:
✓ hooks/offers/useItemOffers.ts at 95 percent+
✓ hooks/price-tracking at 95 percent+
✓ lib/utils at 100 percent
✓ hooks/social at 95 percent+
✓ ALL unit-level code at minimum 95 percent coverage

PHASE 3 - API ROUTE COVERAGE TO 95 PERCENT (Iterations 26-40):
Target: Every API endpoint, route handler, middleware at 95 percent minimum

API PRIORITY 3A: api/catalog/items/search (95.38 percent → 98 percent)
Already good but needs:
- Test all error paths: malformed queries, timeout, DB errors
- Test pagination edge cases: first page, last page, empty results
- Test search filters: all combinations, invalid filters
Required: Add 4-6 tests for edge cases

API PRIORITY 3B: api/loadout-images/generate (100 percent → maintain)
Perfect coverage - ensure no regression
Add integration tests with actual image generation if missing

API PRIORITY 3C: Identify and test ALL untested API routes
Scan for routes in app/api/** that have zero or low coverage:
- Authentication endpoints
- CRUD operations for all entities
- File upload handlers
- Webhook handlers
For each route test:
- Happy path: valid request returns expected response
- Validation: invalid inputs return proper errors
- Authorization: unauthorized requests rejected
- Edge cases: rate limiting, concurrent requests
Required: Minimum 8 tests per major API route

SUCCESS CRITERIA PHASE 3:
✓ api/catalog/items/search at 98 percent+
✓ api/loadout-images/generate maintains 100 percent
✓ ALL API routes at minimum 95 percent coverage
✓ ALL error paths tested
✓ ALL authorization checks tested

PHASE 4 - UI COMPONENT COVERAGE TO 95 PERCENT (Iterations 41-65):
Target: Every component, page, layout at 95 percent minimum

UI PRIORITY 4A: components/bulletin/* (20.78 percent → 95 percent)
Critical gap - must test:
PostCard component:
- Render with all prop variations
- User interactions: like, share, report
- Edit/delete actions with permissions
- Timestamp formatting and relative time
- Image gallery if present
- Required: 12-15 tests

ReplyThread component:
- Nested reply rendering
- Reply composition and submission
- Threading depth limits
- Load more functionality
- Required: 10-12 tests

UI PRIORITY 4B: components/wishlist/* (14.7 percent → 95 percent)
Critical gap - must test:
PricesDisplay component (completely untested):
- Price rendering with currency formatting
- Price comparison display
- Historical price charts if present
- Loading and error states
- Empty state handling
- Required: 10-12 tests

Wishlist management components:
- Add/remove items
- Priority ordering
- Share wishlist functionality
- Required: 8-10 tests

UI PRIORITY 4C: components/messaging/MessageInput.tsx (46.87 percent → 95 percent)
Focus on untested features:
- Voice recording: start, stop, cancel, playback
- File attachments: select, preview, remove, upload
- Message composition: text input, emoji, mentions
- Send button states: disabled, loading, error
- Character limit and validation
- Required: 15-18 tests

UI PRIORITY 4D: components/loadouts/* (94.73 percent → 98 percent)
Almost there - add missing tests:
- Edge cases in loadout calculations
- Weight distribution visualizations
- Export/share functionality
- Required: 5-8 tests

UI PRIORITY 4E: components/inventory-gallery/* (86.44 percent → 95 percent)
Must test:
- All view modes: grid, list, detail
- Filtering and sorting interactions
- Image lazy loading and errors
- Selection and bulk actions
- Required: 12-15 tests

UI PRIORITY 4F: components/social/* (96.73 percent → 99 percent)
Already excellent but push to near-perfect:
- Test remaining edge cases
- Test all conditional renders
- Required: 3-5 tests

SUCCESS CRITERIA PHASE 4:
✓ components/bulletin at 95 percent+
✓ components/wishlist at 95 percent+
✓ components/messaging/MessageInput.tsx at 95 percent+
✓ components/loadouts at 98 percent+
✓ components/inventory-gallery at 95 percent+
✓ components/social at 99 percent+
✓ ALL UI components at minimum 95 percent coverage

PHASE 5 - BRANCH COVERAGE OPTIMIZATION (Iterations 66-80):
Target: 95 percent+ branch coverage everywhere (currently 78.11 percent)

Systematically improve branch coverage:
- Identify all if/else paths not covered
- Test all ternary operators both ways
- Test all switch cases including default
- Test all try/catch blocks including catch paths
- Test all early returns and guard clauses
- Test all optional chaining scenarios

For each file under 95 percent branches:
1. Run coverage report to identify exact missing branches
2. Add specific tests to hit those branches
3. Verify branch coverage improved
4. Document why certain branches might be unreachable

Required: Every file at 95 percent+ branch coverage

PHASE 6 - FUNCTION COVERAGE PERFECTION (Iterations 81-90):
Target: 95 percent+ function coverage everywhere (currently 81.29 percent)

Ensure every exported function is tested:
- Identify all untested exports
- Test all public methods
- Test all callback functions
- Test all event handlers
- Test all HOCs and utility functions

For components:
- Test all custom methods
- Test all useEffect callbacks
- Test all event handler functions
- Test all render prop functions

Required: Every exported function has at least one test

PHASE 7 - FINAL PUSH TO 95 PERCENT (Iterations 91-100):
Aggressive final optimization to hit 95 percent minimum everywhere

Run detailed coverage analysis:
npm run test -- --coverage --reporter=verbose

Identify remaining gaps by file and line number
Create FINAL-GAPS.md with:
- Every file under 95 percent
- Exact line numbers not covered
- Why they are not covered
- Plan to cover them

Add laser-focused tests for each gap
Prioritize by impact: highest file coverage gain first

FINAL TARGETS - ABSOLUTE MINIMUMS:
✓ Statements Coverage: 95 percent+ (currently 81.96 percent)
✓ Branches Coverage: 95 percent+ (currently 78.11 percent)
✓ Functions Coverage: 95 percent+ (currently 81.29 percent)
✓ Lines Coverage: 95 percent+ (currently 82.14 percent)

BREAKDOWN BY TEST LEVEL:
✓ UNIT Tests: 95 percent+ for all hooks, utils, lib, validators
✓ API Tests: 95 percent+ for all routes, handlers, middleware
✓ UI Tests: 95 percent+ for all components, pages, layouts

TECHNICAL REQUIREMENTS:
Reference the 2137 passing tests for style and patterns
Use consistent mocking strategies throughout

Mock Setup Standards:
Supabase Auth: onAuthStateChange, signIn, signOut, getSession
Supabase Database: from, select, insert, update, delete, upsert
Mastra Tools: all tool invocations with realistic responses
Voice API: MediaRecorder, AudioContext mocks
File Upload: File, FileReader, FormData mocks
Next.js: useRouter, useSearchParams, usePathname, Image

Test Data Templates:
mockOffer equals id offer_123, item Hilleberg Nallo 2 GT, price 799, merchant REI, status pending
mockPost equals id post_456, content Great tent for winter camping, author user_789, replies 3, likes 12
mockMessage equals id msg_101, text Available for trade question, hasAttachment true, voiceNote null
mockLoadout equals id loadout_202, name Summer Alps Trek, totalWeight 8500, items array of 15 items

CRITICAL RULES:
🚨 ZERO tolerance for test failures - all 2147 tests must stay green
🚨 Do NOT modify existing passing tests unless absolutely necessary
✅ Add tests only - deletion requires strong justification
✅ Every new test must pass before moving to next test
✅ Run coverage after each phase to verify progress
✅ Branch coverage is equally important as statement coverage
✅ Test realistic user scenarios not just code coverage
✅ Mock external dependencies completely and correctly
✅ Use async/await for all database and API calls
✅ Test error states as thoroughly as success states

QUALITY GATES:
- AAA Pattern enforced: Arrange Act Assert
- Test descriptions must clearly state what is being tested
- Realistic test data using actual outdoor gear examples
- No flaky tests: must be deterministic and repeatable
- No snapshot tests: too brittle for UI changes
- Prefer getByRole over getByTestId for accessibility
- User events with userEvent library not fireEvent
- Test user journeys not just isolated functions

STUCK HANDLING:
After 10 iterations without coverage improvement:
Document in COVERAGE-BLOCKERS.md:
- Current coverage percentage by area
- What was attempted and why it failed
- Technical blockers or impossible-to-test scenarios
- Alternative approaches to try
- Decision: skip and return later or reduce scope

After 20 iterations stuck:
- Reduce target for that specific area to 90 percent
- Focus on achievable quick wins
- Document hard-to-test areas in HARD-TO-TEST.md
- Continue with other high-impact areas

PROGRESS MONITORING:
After every 10 iterations run:
npm run test -- --coverage --reporter=json-summary

Document in COVERAGE-PROGRESS.md:
- Iteration range: X to Y
- Coverage before: Statements A percent, Branches B percent, Functions C percent
- Coverage after: Statements D percent, Branches E percent, Functions F percent
- Tests added: Z new tests
- Files improved: list of files
- Next focus area: specific component or module

Create visualizations:
- Coverage trend line graph data
- Heatmap of file coverage levels
- List of files sorted by coverage ascending

OUTPUT CONDITIONS:
Output <promise>COVERAGE_COMPLETE</promise> when:
- Statements Coverage at or above 95 percent
- Branches Coverage at or above 95 percent
- Functions Coverage at or above 95 percent
- Lines Coverage at or above 95 percent
- ZERO failing tests (all 2147 plus new tests green)
- UNIT level at 95 percent minimum
- API level at 95 percent minimum
- UI level at 95 percent minimum
- No files under 90 percent coverage
- Document achievement in COVERAGE-SUCCESS.md

Output <promise>COVERAGE_PARTIAL</promise> after 100 iterations if:
- Overall coverage at or above 92 percent (close but not quite)
- All failing tests fixed (10 of 10)
- At least two of three levels (UNIT, API, UI) at 95 percent+
- No critical areas under 80 percent
- Document remaining gaps in COVERAGE-REMAINING.md with plan

TECHNICAL STACK:
Next.js 14+ App Router, React Testing Library, Vitest, TypeScript, Supabase Client v2, Mastra Tools, testing-library user-event, jest-axe for accessibility, MSW for API mocking

