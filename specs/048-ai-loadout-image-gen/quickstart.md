# Quickstart Guide: AI-Powered Loadout Image Generation

**Feature**: 048-ai-loadout-image-gen
**Last Updated**: 2025-12-14

This guide helps developers set up their local environment for developing and testing the AI-powered loadout image generation feature.

## Prerequisites

- Node.js 20+ installed
- Supabase project configured
- Cloudinary account with AI generation enabled
- Access to project repository

## Environment Setup

### 1. Cloudinary Credentials

Add the following environment variables to `.env.local`:

```bash
# Cloudinary Configuration (existing)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# NEW: Cloudinary AI Generation (Feature 048)
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_AI_ENABLED=true

# Optional: Rate limit configuration
CLOUDINARY_AI_RATE_LIMIT_PER_HOUR=100
```

**How to get credentials**:
1. Log in to [Cloudinary Console](https://cloudinary.com/console)
2. Navigate to Settings → Security
3. Copy API Key and API Secret
4. Ensure "AI Background Generation" is enabled in your plan

### 2. Database Migration

Run the database migration to create the `generated_images` table:

```bash
# Using Supabase CLI
npx supabase migration new add_loadout_image_generation

# Copy migration content from data-model.md
# Then apply migration
npx supabase db push
```

**Manual alternative** (via Supabase Dashboard):
1. Go to SQL Editor
2. Paste migration script from `data-model.md`
3. Click "Run"
4. Verify tables created: `generated_images` and `loadouts` columns

### 3. Install Dependencies

All required dependencies are already in `package.json`:
- `next-cloudinary@6.17.5` - Cloudinary integration
- `@supabase/supabase-js@2.87.1` - Database access
- `zod@4.1.13` - Schema validation
- `sonner@2.0.7` - Toast notifications

No additional npm installs needed for this feature.

### 4. Seed Fallback Images

Create fallback image set for when AI generation fails:

```bash
# Run seed script (to be created in implementation)
npm run seed:fallback-images
```

**Manual alternative**:
1. Select 20-30 high-quality outdoor images from Unsplash/Pexels
2. Upload to Cloudinary folder: `gearshack/fallbacks/`
3. Organize by activity × season (e.g., `hiking-summer.jpg`)
4. Update `lib/fallback-images.ts` with Cloudinary URLs

## Development Workflow

### Running Locally

```bash
# Start development server
npm run dev

# App runs at http://localhost:3000
```

### Testing Image Generation

#### Manual Testing Checklist

**P1: Basic Generation**
- [ ] Navigate to existing loadout (e.g., `/loadouts/[id]`)
- [ ] Click "Generate Image" button
- [ ] Verify loading state shows skeleton/spinner
- [ ] Verify image appears within 5 seconds
- [ ] Verify image has 16:9 aspect ratio
- [ ] Verify text overlay (title/gear count) is readable

**P2: Variations & History**
- [ ] Click "Generate Another" button
- [ ] Verify new variation generated
- [ ] View image history (should show up to 3 images)
- [ ] Click different historical image
- [ ] Verify active image switches
- [ ] Generate 4th image
- [ ] Verify oldest image auto-deleted

**Failure Scenarios**
- [ ] Simulate API failure (disconnect network)
- [ ] Verify automatic retry attempt
- [ ] Verify fallback image appears after retry failure
- [ ] Verify no broken images or endless loading
- [ ] Simulate rate limit (make many requests)
- [ ] Verify silent fallback to curated defaults

**Contrast & Accessibility**
- [ ] Generate image with bright background
- [ ] Verify text uses dark color + scrim overlay
- [ ] Generate image with dark background
- [ ] Verify text uses light color + scrim overlay
- [ ] Use browser DevTools accessibility checker
- [ ] Verify contrast ratio ≥ 4.5:1

### Running Tests

```bash
# Unit tests (hooks and utils)
npm run test hooks/useLoadoutImageGeneration
npm run test lib/prompt-builder
npm run test lib/contrast-analyzer

# Integration tests
npm run test:integration loadout-image-generation

# E2E tests
npm run test:e2e -- loadout-image-generation.spec.ts
```

### Debugging Tips

**Check Cloudinary API logs**:
```bash
# Monitor Cloudinary requests in browser DevTools Network tab
# Filter by: "cloudinary.com"
# Look for: POST requests to AI generation endpoint
```

**Check Supabase database**:
```sql
-- View generated images for a loadout
SELECT * FROM generated_images WHERE loadout_id = 'YOUR_LOADOUT_UUID';

-- Check active image status
SELECT l.id, l.name, l.hero_image_id, gi.cloudinary_url, gi.is_active
FROM loadouts l
LEFT JOIN generated_images gi ON l.hero_image_id = gi.id
WHERE l.id = 'YOUR_LOADOUT_UUID';

-- Verify history limit (should be ≤ 3 per loadout)
SELECT loadout_id, COUNT(*) as image_count
FROM generated_images
GROUP BY loadout_id
HAVING COUNT(*) > 3;
```

**Enable verbose logging**:
```typescript
// In lib/cloudinary-ai.ts
const DEBUG = process.env.CLOUDINARY_AI_DEBUG === 'true';
if (DEBUG) console.log('[CloudinaryAI]', ...args);
```

## Common Issues

### Issue: "Cloudinary AI generation failed"

**Symptoms**: Error toast, fallback image shown

**Possible causes**:
1. API credentials invalid → Check `.env.local`
2. AI generation not enabled in plan → Upgrade Cloudinary plan
3. Rate limit exceeded → Wait or increase quota
4. Network timeout → Check internet connection

**Fix**:
```bash
# Verify credentials
curl -u YOUR_API_KEY:YOUR_API_SECRET \
  https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/resources/image
```

### Issue: "Images not appearing in history"

**Symptoms**: Generated images don't show in selector

**Possible causes**:
1. Database insert failed → Check Supabase logs
2. RLS policy blocking access → Verify user_id matches
3. Foreign key constraint issue → Check loadout exists

**Fix**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'generated_images';

-- Test direct insert
INSERT INTO generated_images (loadout_id, cloudinary_public_id, cloudinary_url, prompt_used)
VALUES ('YOUR_LOADOUT_UUID', 'test-123', 'https://res.cloudinary.com/test.jpg', 'test prompt');
```

### Issue: "Text overlay not readable"

**Symptoms**: Text too dark/light on background

**Possible causes**:
1. Contrast algorithm bug → Check `lib/contrast-analyzer.ts`
2. Gradient overlay not applied → Inspect CSS in DevTools
3. Image too bright/dark → Adjust scrim opacity

**Fix**:
```typescript
// Test contrast calculation manually
import { calculateContrast } from '@/lib/contrast-analyzer';
const contrast = calculateContrast('#FFFFFF', '#000000');
console.log('Contrast ratio:', contrast); // Should be 21:1
```

## Architecture Overview

### Key Files

```
hooks/
└── useLoadoutImageGeneration.ts   # Main business logic hook

lib/
├── cloudinary-ai.ts                # API client for Cloudinary AI
├── prompt-builder.ts               # Constructs prompts from loadout data
├── contrast-analyzer.ts            # Calculates text contrast
└── fallback-images.ts              # Curated default image selection

components/loadout/
├── image-generation-button.tsx     # Trigger generation
├── image-history-selector.tsx      # Browse/select variations
├── generated-image-preview.tsx     # Preview with text overlay
└── fallback-image-placeholder.tsx  # Loading/fallback states

types/
└── loadout-image.ts                # TypeScript definitions

specs/048-ai-loadout-image-gen/contracts/
├── image-generation-request.schema.ts
├── image-generation-history.schema.ts
└── cloudinary-ai-generation.ts
```

### State Flow

```
User Action → useLoadoutImageGeneration Hook → Cloudinary AI API
                       ↓
                  Supabase DB
                       ↓
              UI Components (stateless)
```

## Performance Benchmarks

**Target Metrics**:
- Image generation: <5 seconds (P95)
- UI state update: <200ms
- Database insert: <100ms
- History query: <50ms

**How to measure**:
```typescript
// In useLoadoutImageGeneration hook
const start = performance.now();
await generateImage(request);
const duration = performance.now() - start;
console.log(`Generation took ${duration}ms`);
```

## Next Steps

1. Complete Phase 0 research (see `research.md`)
2. Implement core hook (`useLoadoutImageGeneration`)
3. Build UI components following constitution
4. Write unit tests for prompt builder and contrast analyzer
5. Add E2E tests for full generation workflow
6. Test with real Cloudinary AI API
7. Curate and seed fallback image set

## Getting Help

- **Cloudinary AI Docs**: https://cloudinary.com/documentation/ai_background_generation
- **Supabase Docs**: https://supabase.com/docs
- **Next.js 16 Docs**: https://nextjs.org/docs
- **Project Constitution**: `.specify/memory/constitution.md`
- **Feature Spec**: `specs/048-ai-loadout-image-gen/spec.md`

## Useful Commands

```bash
# Format code
npm run format

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build for production
npm run build

# Run Supabase locally
npx supabase start

# Reset local database
npx supabase db reset
```
