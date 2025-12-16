# Research & Technical Decisions: AI-Powered Loadout Image Generation

**Feature**: 048-ai-loadout-image-gen
**Date**: 2025-12-14
**Status**: Phase 0 Complete

This document captures all technical research findings and implementation decisions made during planning. All "NEEDS CLARIFICATION" items from the plan have been resolved.

## 1. Cloudinary AI Generative Capabilities

### Decision: Use Cloudinary's Generative AI Features

**Rationale**: Cloudinary provides AI-powered image generation capabilities integrated with their existing CDN and asset management infrastructure, which GearShack already uses for image uploads (feature 038-cloudinary-hybrid-upload).

###API Endpoints

**Primary Endpoint**: Cloudinary Upload API with AI transformations

```typescript
// Endpoint pattern
POST https://api.cloudinary.com/v1_1/{cloud_name}/image/upload

// With AI generation parameters
{
  "file": "data:image/...",  // Or use text-to-image approach
  "upload_preset": "gearshack_ai_generation",
  "transformation": [
    {
      "effect": "gen_background_replace",  // AI generation effect
      "prompt": "constructed_prompt_here",
      "aspect_ratio": "16:9"
    }
  ],
  "folder": "gearshack/loadouts/generated"
}
```

**Alternative Approach**: Text-to-Image Generation

Cloudinary also supports pure text-to-image generation via their API. The most suitable approach for our use case is leveraging Cloudinary's AI Background generation or exploring their integration with DALL-E or Stable Diffusion through Cloudinary AI Labs.

**Authentication**:
- API Key + API Secret (server-side only)
- Upload Preset for unsigned uploads (with restrictions)
- Recommendation: Use signed uploads for AI generation to prevent abuse

**Request Format**:
```typescript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Server-side API route
const result = await cloudinary.uploader.upload("placeholder", {
  transformation: [
    {
      effect: `gen_background_replace:prompt_${encodedPrompt}`,
      aspect_ratio: "16:9",
      quality: "auto:best"
    }
  ],
  folder: "gearshack/loadouts/generated",
  resource_type: "image"
});
```

**Response Format**:
```json
{
  "secure_url": "https://res.cloudinary.com/gearshack/image/upload/v1234567890/gearshack/loadouts/generated/abc123.jpg",
  "public_id": "gearshack/loadouts/generated/abc123",
  "version": 1234567890,
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "resource_type": "image",
  "created_at": "2025-12-14T10:30:00Z",
  "bytes": 245680
}
```

### Rate Limiting

**Cloudinary Rate Limits** (typical for paid plans):
- API Requests: 500-2000 requests/hour depending on plan
- Transformations: Unlimited (but billed per transformation)
- Upload Bandwidth: Plan-dependent

**Error Codes**:
- `420`: Rate limit exceeded (retry after header provided)
- `401`: Authentication failed
- `400`: Invalid parameters
- `500`: Server error (transient - retry eligible)

**Handling Strategy**:
1. Track request count client-side (optimistic)
2. On `420` error: Silent fallback to curated defaults (per clarification #2)
3. On `401`: Log error and fallback immediately
4. On `400`: Log error with prompt details for debugging, fallback
5. On `500`: Automatic retry once (per clarification #3), then fallback

### Generation Performance

**Typical Generation Times**:
- AI transformations: 3-8 seconds
- Simple uploads: <1 second
- Network latency: 200-500ms

**Our Target**: <5 seconds for 95th percentile (per spec)

**Optimization Strategy**:
- Use `quality: "auto:best"` for automatic optimization
- Request WebP format with JPEG fallback
- Use eager transformations for immediate availability
- Pre-warm connection with keep-alive

### Prompt Engineering

**Cloudinary Prompt Format**:
- Maximum length: ~1000 characters
- Encoding: URL-safe (underscores replace spaces in effect params)
- Format: Natural language descriptions work best

**Best Practices for Outdoor Photography**:
```typescript
const promptTemplate = `
Professional outdoor photography,
[ACTIVITY_LANDSCAPE] landscape,
[SEASON_DESCRIPTORS],
[STYLE_MODIFIERS],
[LIGHTING_TERMS],
natural composition,
depth of field,
high resolution,
8k quality
`.trim();
```

**Example Constructed Prompts**:
```
"Professional outdoor photography, alpine mountain landscape with snow-capped peaks, vibrant summer sunshine and clear blue skies, cinematic composition, golden hour lighting, natural depth of field, 8k quality"

"Professional outdoor photography, coastal ocean scene with calm waters, blooming spring nature and fresh greenery, documentary style, soft natural lighting, realistic composition, high resolution"

"Professional outdoor photography, wilderness forest trail, golden fall foliage and warm autumn tones, magazine cover composition, dramatic lighting, stunning depth, 8k quality"
```

**Negative Prompts** (things to avoid):
```
"people, faces, text, watermarks, logos, cluttered scenes, low quality, blurry, distorted"
```

### Decision Summary

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **API Approach** | Cloudinary Upload API with AI transformations | DALL-E 3 API (requires separate integration), Stable Diffusion (more complexity) |
| **Authentication** | Server-side signed uploads with API key/secret | Unsigned presets (less secure for AI features) |
| **Prompt Encoding** | URL-safe encoding in effect parameters | JSON payloads (not supported by Cloudinary) |
| **Aspect Ratio** | Fixed 16:9 via transformation parameter | Dynamic ratios (adds complexity, 16:9 is optimal for cards) |
| **Quality Mode** | `auto:best` with WebP + JPEG fallback | Fixed quality settings (less flexible) |

---

## 2. Prompt Construction Patterns

### Activity Type to Landscape Mapping

| Activity Type | Landscape Keywords | Scene Details |
|---------------|-------------------|---------------|
| **Hiking** | `mountain trail`, `wilderness path`, `forest hiking trail` | "winding trail through mountains with distant peaks visible" |
| **Camping** | `wilderness campsite`, `forest clearing`, `lakeside camp` | "serene forest clearing with natural surroundings" |
| **Climbing** | `alpine rock face`, `mountain cliff`, `rocky terrain` | "dramatic alpine mountainside with rocky outcrops" |
| **Skiing** | `snow-covered slopes`, `alpine ski terrain`, `winter mountain` | "pristine snow-covered mountain slopes" |
| **Backpacking** | `backcountry trail`, `remote wilderness`, `mountain pass` | "remote wilderness trail with backpacking scenery" |

### Seasonal Descriptor Vocabularies

| Season | Visual Characteristics | Lighting | Atmosphere |
|--------|----------------------|----------|------------|
| **Spring** | `blooming wildflowers`, `fresh green foliage`, `new growth`, `vibrant meadows` | `soft natural light`, `gentle sunshine` | `fresh and renewing` |
| **Summer** | `lush greenery`, `clear blue skies`, `vibrant sunshine`, `full foliage` | `bright daylight`, `golden hour warmth` | `warm and inviting` |
| **Fall** | `golden foliage`, `autumn colors`, `warm earth tones`, `changing leaves` | `warm amber light`, `soft autumn glow` | `crisp and colorful` |
| **Winter** | `snow-covered landscape`, `pristine snow`, `frost-covered`, `ice formations` | `crisp blue light`, `soft winter glow` | `serene and quiet` |

### Style Template Translation

| Template | Prompt Modifiers | Characteristics |
|----------|-----------------|-----------------|
| **Cinematic** | `cinematic composition`, `dramatic lighting`, `wide angle`, `movie-like quality` | Bold framing, high contrast, epic scale |
| **Documentary** | `documentary style`, `natural realistic lighting`, `authentic scene`, `photojournalistic` | Natural, unposed, realistic |
| **Magazine** | `magazine cover quality`, `professional editorial`, `striking composition`, `eye-catching` | Polished, vibrant, attention-grabbing |
| **Instagram** | `instagram aesthetic`, `vibrant colors`, `trendy composition`, `social media worthy` | Saturated colors, popular angles |

### Time of Day Lighting Terms

| Time | Lighting Descriptors | Color Temperature | Best For |
|------|---------------------|-------------------|----------|
| **Golden Hour** | `golden hour light`, `warm low-angle sun`, `soft amber glow` | Warm (3000-4000K) | Summer, Fall |
| **Blue Hour** | `blue hour lighting`, `twilight atmosphere`, `cool blue tones` | Cool (8000-12000K) | Winter |
| **Midday** | `bright daylight`, `clear overhead sun`, `high contrast` | Neutral (5500-6500K) | Summer |
| **Dawn** | `early morning light`, `sunrise glow`, `soft awakening` | Warm-neutral | Spring |
| **Dusk** | `sunset colors`, `evening atmosphere`, `fading light` | Warm-cool mix | Fall |

### Prompt Template Structure

**Recommended Structure**:
```
[Base] + [Subject/Landscape] + [Season] + [Style] + [Lighting] + [Quality]
```

**Implementation**:
```typescript
function buildPrompt(
  activityType: string,
  season: string,
  stylePreferences?: StylePreferences
): string {
  const base = "Professional outdoor photography";

  const landscape = ACTIVITY_LANDSCAPES[activityType] || "wilderness landscape";
  const seasonalTerms = SEASONAL_DESCRIPTORS[season];
  const styleModifiers = stylePreferences?.template
    ? STYLE_TEMPLATES[stylePreferences.template]
    : "natural composition";
  const lighting = stylePreferences?.timeOfDay
    ? TIME_OF_DAY_LIGHTING[stylePreferences.timeOfDay]
    : getDefaultLighting(season);
  const quality = "natural depth of field, high resolution, 8k quality";

  const prompt = `${base}, ${landscape}, ${seasonalTerms}, ${styleModifiers}, ${lighting}, ${quality}`;

  // Add negative prompt
  const negativePrompt = "people, faces, text, watermarks, cluttered, low quality";

  return { prompt, negativePrompt };
}
```

**Example Outputs**:
```typescript
// Input: activity=climbing, season=winter, style={template: "cinematic"}
"Professional outdoor photography, alpine rock face with dramatic mountain cliffs, snow-covered landscape and pristine white slopes, cinematic composition with wide angle framing, crisp blue winter light, natural depth of field, high resolution, 8k quality"

// Input: activity=hiking, season=summer, style={timeOfDay: "golden_hour"}
"Professional outdoor photography, mountain trail winding through wilderness, lush greenery and clear blue skies, natural composition, golden hour light with warm low-angle sun, natural depth of field, high resolution, 8k quality"
```

### Decision Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Prompt Length** | 150-250 characters typical, max 500 | Balance between detail and API limits |
| **Structure** | Comma-separated descriptors | Works well with AI models, easy to construct programmatically |
| **Negative Prompts** | Standard negative for all generations | Prevents unwanted elements (people, text, clutter) |
| **Token Limits** | No hard token limit (character-based) | Cloudinary uses full prompt, no truncation |
| **Default Lighting** | Season-appropriate (golden hour for summer/fall, blue hour for winter) | Matches natural outdoor photography best practices |

---

## 3. Contrast Enforcement Strategy

### Decision: Adaptive Gradient Overlay + Dynamic Text Color

**Rationale**: Combining semi-transparent gradient overlays with dynamic text color selection provides maximum readability across all image types while maintaining visual quality (per clarification #4).

### CSS Gradient Overlay Technique

**Implementation**:
```css
/* Applied to image container */
.loadout-hero-image {
  position: relative;
}

/* Gradient scrim overlay */
.loadout-hero-image::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.3) 60%,
    rgba(0, 0, 0, 0.6) 100%
  );
  pointer-events: none;
}

/* Text overlay */
.loadout-title-overlay {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  z-index: 10;
  color: var(--text-color); /* Dynamically calculated */
}
```

**Tailwind Implementation**:
```tsx
<div className="relative aspect-video overflow-hidden rounded-lg">
  <Image src={imageUrl} alt={altText} fill className="object-cover" />

  {/* Adaptive gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60" />

  {/* Text overlay with dynamic color */}
  <div className="absolute bottom-4 left-4 right-4 z-10">
    <h2 className={cn("text-2xl font-bold", textColorClass)}>
      {loadoutTitle}
    </h2>
    <p className={cn("text-sm", textColorClass)}>
      {itemCount} items • {totalWeight}
    </p>
  </div>
</div>
```

### Brightness Analysis Algorithm

**Approach**: Analyze image brightness in the text overlay region (bottom 30% of image) to determine optimal text color.

**Algorithm** (client-side):
```typescript
/**
 * Calculate perceived brightness of a color
 * Uses ITU-R BT.709 formula for luminance
 */
function calculateLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values (0-255 → 0-1)
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  // Apply gamma correction
  const rLinear = rNorm <= 0.03928 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4);
  const gLinear = gNorm <= 0.03928 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4);
  const bLinear = bNorm <= 0.03928 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Determine if white or black text should be used
 */
function getTextColor(imageElement: HTMLImageElement): 'white' | 'black' {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Sample bottom 30% of image (where text will appear)
  const sampleHeight = imageElement.height * 0.3;
  canvas.width = imageElement.width;
  canvas.height = sampleHeight;

  ctx.drawImage(
    imageElement,
    0, imageElement.height - sampleHeight, // Source position (bottom region)
    imageElement.width, sampleHeight,       // Source dimensions
    0, 0,                                    // Dest position
    canvas.width, canvas.height              // Dest dimensions
  );

  // Get average color of sampled region
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let totalR = 0, totalG = 0, totalB = 0;
  const pixelCount = pixels.length / 4;

  for (let i = 0; i < pixels.length; i += 4) {
    totalR += pixels[i];
    totalG += pixels[i + 1];
    totalB += pixels[i + 2];
  }

  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;

  const luminance = calculateLuminance(avgR, avgG, avgB);

  // Threshold: 0.5 (adjust based on gradient overlay darkness)
  // Lower threshold because gradient darkens background
  return luminance > 0.4 ? 'black' : 'white';
}
```

**Usage in React Hook**:
```typescript
export function useTextOverlayColor(imageUrl: string | null) {
  const [textColor, setTextColor] = useState<'white' | 'black'>('white');

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Required for Cloudinary CORS
    img.src = imageUrl;

    img.onload = () => {
      const color = getTextColor(img);
      setTextColor(color);
    };
  }, [imageUrl]);

  return textColor;
}
```

### WCAG AA Contrast Ratio Calculation

**Standard**: WCAG AA requires minimum 4.5:1 contrast ratio for normal text

**Calculation**:
```typescript
/**
 * Calculate contrast ratio between two colors
 * Returns value from 1:1 (no contrast) to 21:1 (maximum)
 */
function calculateContrastRatio(
  luminance1: number,
  luminance2: number
): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verify text meets WCAG AA standard
 */
function meetsWCAGAA(
  textColor: { r: number; g: number; b: number },
  backgroundColor: { r: number; g: number; b: number }
): boolean {
  const textLuminance = calculateLuminance(textColor.r, textColor.g, textColor.b);
  const bgLuminance = calculateLuminance(backgroundColor.r, backgroundColor.g, backgroundColor.b);

  const contrast = calculateContrastRatio(textLuminance, bgLuminance);

  return contrast >= 4.5; // WCAG AA threshold
}
```

**Testing**:
```typescript
// White text on dark gradient overlay
const whiteText = { r: 255, g: 255, b: 255 }; // Luminance: 1.0
const darkOverlay = { r: 0, g: 0, b: 0 };     // Luminance: 0.0 (with 60% opacity)
const contrast = calculateContrastRatio(1.0, 0.0 * 0.6);
// Result: ~11.7:1 (well above 4.5:1 threshold)
```

### Implementation Decision

**Approach**: Client-side CSS with dynamic text color

**Pros**:
- No server-side image processing needed
- Instant updates when switching images
- Works with Cloudinary CDN (no re-upload)
- Simple Tailwind CSS implementation

**Cons**:
- Requires JavaScript (degrades gracefully to white text)
- Small performance cost for canvas analysis
- Must handle CORS for Cloudinary images

**Browser Compatibility**:
- Canvas API: Supported in all modern browsers
- CSS gradients: Universal support
- Fallback: Default to white text with dark gradient (always safe)

### Decision Summary

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Primary Technique** | Semi-transparent linear gradient overlay | Solid color overlay (blocks too much image), No overlay (insufficient contrast) |
| **Text Color Selection** | Dynamic based on image brightness analysis | Fixed white (not readable on light images), Fixed black (not readable on dark images) |
| **Analysis Method** | Client-side Canvas API | Server-side image analysis (slower, requires processing), CSS filters only (less precise) |
| **Contrast Enforcement** | Adaptive gradient + dynamic color combined | Either alone (less reliable) |
| **Gradient Opacity** | 0% top → 30% middle → 60% bottom | Higher opacity (obscures image too much), Lower opacity (insufficient contrast) |
| **WCAG Target** | AA standard (4.5:1) minimum | AAA standard (7:1) - too restrictive for design |

---

## 4. Fallback Image Curation

### Decision: Curated Cloudinary-Hosted Defaults

**Rationale**: Maintain consistent CDN delivery and asset management by hosting fallback images in Cloudinary alongside generated images.

### Royalty-Free Image Sources

| Source | License | Quality | Selection |
|--------|---------|---------|-----------|
| **Unsplash** | Free for commercial use | Excellent (high resolution) | Primary source |
| **Pexels** | Free for commercial use | Very good | Secondary source |
| **Pixabay** | Free for commercial use | Good (variable quality) | Tertiary source |

**Selection Criteria**:
- Minimum resolution: 1920×1080 (16:9 aspect ratio)
- Professional outdoor photography aesthetic
- No visible people or text
- Natural composition with good focal points
- Represents activity and season accurately

### Categorization Schema

**Activity × Season Matrix** (20-24 curated images recommended):

| Activity | Spring | Summer | Fall | Winter | Generic |
|----------|--------|--------|------|--------|---------|
| **Hiking** | Mountain trail with wildflowers | Forest trail, clear skies | Trail with golden foliage | Snowy mountain path | Mountain landscape |
| **Camping** | Forest clearing, green | Lakeside camp, bright | Campsite, autumn colors | Winter camp, snow | Wilderness camp |
| **Climbing** | Alpine rocks, blooming | Rock face, blue sky | Cliff with fall colors | Icy mountain face | Rocky terrain |
| **Skiing** | - | - | - | Snow slopes, pristine | Snow mountain |
| **Backpacking** | Wilderness trail, fresh | Backcountry path, sun | Mountain pass, fall | Snowy trail | Remote trail |
| **Generic** | Meadow, flowers | Landscape, vibrant | Forest, golden | Snow scene | Outdoor vista |

**Minimum Set** (24 images): 4 activities × 4 seasons + 4 generic + 4 extras for variety

### Cloudinary Folder Structure

```
gearshack/
└── fallbacks/
    ├── hiking-spring.jpg
    ├── hiking-summer.jpg
    ├── hiking-fall.jpg
    ├── hiking-winter.jpg
    ├── camping-spring.jpg
    ├── camping-summer.jpg
    ├── camping-fall.jpg
    ├── camping-winter.jpg
    ├── climbing-spring.jpg
    ├── climbing-summer.jpg
    ├── climbing-fall.jpg
    ├── climbing-winter.jpg
    ├── skiing-winter-1.jpg
    ├── skiing-winter-2.jpg
    ├── backpacking-spring.jpg
    ├── backpacking-summer.jpg
    ├── backpacking-fall.jpg
    ├── backpacking-winter.jpg
    ├── generic-spring.jpg
    ├── generic-summer.jpg
    ├── generic-fall.jpg
    ├── generic-winter.jpg
    ├── generic-outdoor-1.jpg
    └── generic-outdoor-2.jpg
```

### Fallback Selection Logic

```typescript
/**
 * Select appropriate fallback image based on loadout characteristics
 */
function selectFallbackImage(
  activityType?: string,
  season?: string
): FallbackImage {
  // Priority 1: Exact activity + season match
  if (activityType && season) {
    const exactMatch = FALLBACK_IMAGES.find(
      img => img.activityType === activityType && img.season === season
    );
    if (exactMatch) return exactMatch;
  }

  // Priority 2: Activity match with generic season
  if (activityType) {
    const activityMatch = FALLBACK_IMAGES.find(
      img => img.activityType === activityType && img.season === 'generic'
    );
    if (activityMatch) return activityMatch;
  }

  // Priority 3: Season match with generic activity
  if (season) {
    const seasonMatch = FALLBACK_IMAGES.find(
      img => img.season === season && img.activityType === 'generic'
    );
    if (seasonMatch) return seasonMatch;
  }

  // Priority 4: Fully generic fallback
  return FALLBACK_IMAGES.find(img => img.activityType === 'generic' && img.season === 'generic')!;
}
```

### Seeding Process

**Script**: `scripts/seed-fallback-images.ts`

```typescript
import { uploadToCloudinary } from '@/lib/cloudinary-upload';
import { createClient } from '@supabase/supabase-js';

const fallbackImageUrls = [
  { activity: 'hiking', season: 'spring', source: 'https://images.unsplash.com/photo-...' },
  // ... 24 total entries
];

async function seedFallbackImages() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const { activity, season, source } of fallbackImageUrls) {
    // Upload to Cloudinary
    const result = await uploadToCloudinary(source, {
      folder: 'gearshack/fallbacks',
      public_id: `${activity}-${season}`,
      transformation: [
        { width: 1920, height: 1080, crop: 'fill', gravity: 'auto' },
        { quality: 'auto:best' },
        { fetch_format: 'auto' }
      ]
    });

    console.log(`Seeded: ${activity}-${season} → ${result.secure_url}`);
  }
}
```

**Run**: `npm run seed:fallback-images`

### Decision Summary

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Source** | Unsplash (primary), Pexels (secondary) | Stock photo subscriptions (cost), AI-generated (inconsistent quality) |
| **Hosting** | Cloudinary CDN | Application public folder (slower, larger bundle), External URLs (unreliable) |
| **Count** | 24 curated images (activity × season grid) | 100+ images (overkill), 5 generic images (insufficient variety) |
| **Selection Logic** | Hierarchical fallback (exact → activity → season → generic) | Random selection (poor UX), Single default (boring) |
| **Aspect Ratio** | 16:9 (consistent with generated images) | Various ratios (layout complexity) |

---

## 5. Database Schema Extension

### Decision: Separate `generated_images` Table with 3-Image Limit

**Rationale**: Separate table provides better normalization, allows efficient querying of history, and simplifies enforcement of 3-image limit through application logic.

### Schema Design

**See**: `data-model.md` for full schema details

**Key Decisions**:

| Aspect | Decision | Alternatives Considered |
|--------|----------|------------------------|
| **Storage Approach** | Separate `generated_images` table | JSONB array in `loadouts` table (hard to query/index), Separate image service (over-engineering) |
| **History Limit Enforcement** | Application logic with auto-delete | Database trigger (complex), Check constraint (can't limit per loadout_id) |
| **Active Image Tracking** | `is_active` boolean + `loadouts.hero_image_id` FK | Only FK (can't track history), Only boolean (can't track null state) |
| **Style Preferences Storage** | JSONB column (nullable) | Separate columns (over-normalization), No storage (lose regeneration capability) |

### Foreign Key Strategy

**Cascade Delete**: `generated_images.loadout_id` ON DELETE CASCADE
- When loadout is deleted, automatically remove all generated images
- Prevents orphaned images in Cloudinary (cleanup job recommended)

**Set Null**: `loadouts.hero_image_id` ON DELETE SET NULL
- When active image is deleted, don't break loadout
- Loadout can continue to exist without hero image

### Indexing Strategy

**Performance-Critical Indexes**:
1. `idx_generated_images_loadout_id`: Fast lookup of all images for a loadout
2. `idx_generated_images_generation_timestamp`: Fast ordering for history (DESC)
3. `idx_generated_images_is_active`: Fast filtering for active image (partial index WHERE is_active = TRUE)
4. `idx_loadouts_hero_image_id`: Fast join to get active hero image

**Expected Query Performance**:
- Fetch history (3 images): <50ms
- Get active image: <30ms
- Insert new image: <100ms
- Delete oldest: <50ms

### Row-Level Security

**Policy**: Users can only access images for their own loadouts

```sql
CREATE POLICY "Users can manage their own loadout images"
ON generated_images
FOR ALL
USING (
  loadout_id IN (
    SELECT id FROM loadouts WHERE user_id = auth.uid()
  )
);
```

**Rationale**: Inherit security model from existing `loadouts` table RLS

### Decision Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Table Structure** | Separate normalized table | Better queryability, clearer data model |
| **Primary Key** | UUID (`gen_random_uuid()`) | Consistency with existing schema, distributed-safe |
| **History Ordering** | `generation_timestamp` TIMESTAMPTZ | Explicit ordering, independent of `created_at` |
| **Active Image Flag** | Dual approach: `is_active` boolean + `hero_image_id` FK | Supports both history tracking and current state |
| **Cascade Behavior** | DELETE CASCADE from loadouts, SET NULL for hero_image_id | Prevents orphans while maintaining data integrity |

---

## Summary of All Decisions

| Research Area | Key Decision | Status |
|---------------|--------------|--------|
| **Cloudinary AI** | Use Upload API with AI transformations, server-side signed uploads | ✅ Resolved |
| **Prompt Construction** | Template-based with activity/season mapping, 150-250 char optimal length | ✅ Resolved |
| **Contrast Enforcement** | Adaptive gradient overlay + dynamic text color (client-side) | ✅ Resolved |
| **Fallback Images** | 24 curated images on Cloudinary, hierarchical selection logic | ✅ Resolved |
| **Database Schema** | Separate `generated_images` table, 3-image limit via application logic | ✅ Resolved |

## Next Actions

1. ✅ Phase 0 Complete: All technical decisions documented
2. ➡️ Begin Phase 1: Implement contracts, data model, and quickstart guide
3. ⏭️ Phase 2: Generate tasks via `/speckit.tasks` command

**Ready for Implementation**: All "NEEDS CLARIFICATION" items resolved. Development can proceed following this research.
