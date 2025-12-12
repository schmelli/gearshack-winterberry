# Contracts: Grand Visual Polish Sprint

**Feature**: 009-grand-visual-polish
**Date**: 2025-12-05

## Overview

This feature involves visual/styling changes only. **No API contracts are required.**

## Rationale

The Grand Visual Polish Sprint addresses:
- Typography consistency (CSS changes)
- Header styling (CSS changes)
- Layout adjustments (CSS/component structure)
- Activity Matrix (new UI component with static config)
- Footer styling (CSS changes)
- Component overlap fixes (CSS/structure changes)

All data structures (Activity Priority Matrix) are static configuration bundled with the application. No backend API calls, database changes, or external service integrations are needed.

## Future Considerations

If the Activity Priority Matrix needs to become user-configurable in the future:
1. Add Firestore collection for custom priority matrices
2. Create API contract for CRUD operations
3. Add user preference storage

For now, hardcoded values in `lib/loadout-utils.ts` are sufficient.
