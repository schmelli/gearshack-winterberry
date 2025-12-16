# Fallback Images Curation Guide

**Feature**: 048-ai-loadout-image-gen | **Task**: T010

## Overview

This guide helps you curate and upload 24 high-quality fallback images that will be used when AI image generation fails or is rate-limited.

## Image Requirements

- **Resolution**: Minimum 1920×1080 (16:9 aspect ratio)
- **Quality**: Professional outdoor photography
- **Content**: Natural landscapes without people or text
- **License**: Royalty-free, commercial use permitted
- **Format**: JPEG (will be optimized during upload)

## Recommended Sources

### 1. Unsplash (Primary Source)
- URL: https://unsplash.com
- License: Free for commercial use
- Quality: Excellent
- Search tips: Use specific terms like "mountain trail summer", "alpine climbing winter"

### 2. Pexels (Secondary Source)
- URL: https://pexels.com
- License: Free for commercial use
- Quality: Very good
- Filter by: "Landscape" category, "High resolution"

### 3. Pixabay (Tertiary Source)
- URL: https://pixabay.com
- License: Free for commercial use
- Quality: Good (variable)
- Use filters: "Large" size, "Nature" category

## Image List

Download and save these 24 images to `public/fallback-images/` directory:

### Hiking (4 images)
- [ ] `hiking-spring.jpg` - Mountain trail with blooming wildflowers
  - Keywords: "mountain trail wildflowers spring"
  - Example: https://unsplash.com/s/photos/mountain-trail-spring
- [ ] `hiking-summer.jpg` - Forest trail under clear blue skies
  - Keywords: "forest hiking trail blue sky summer"
- [ ] `hiking-fall.jpg` - Trail with golden autumn foliage
  - Keywords: "autumn hiking trail fall foliage"
- [ ] `hiking-winter.jpg` - Snowy mountain hiking path
  - Keywords: "snowy mountain trail winter"

### Camping (4 images)
- [ ] `camping-spring.jpg` - Forest clearing with fresh greenery
  - Keywords: "forest camping spring"
- [ ] `camping-summer.jpg` - Lakeside campsite with bright sun
  - Keywords: "lakeside camping summer"
- [ ] `camping-fall.jpg` - Campsite with autumn colors
  - Keywords: "wilderness camping fall"
- [ ] `camping-winter.jpg` - Winter camp with snow
  - Keywords: "winter camping snow"

### Climbing (4 images)
- [ ] `climbing-spring.jpg` - Alpine rocks with blooming landscape
  - Keywords: "alpine rock climbing spring"
- [ ] `climbing-summer.jpg` - Rock face under blue sky
  - Keywords: "rock climbing summer blue sky"
- [ ] `climbing-fall.jpg` - Mountain cliff with fall colors
  - Keywords: "mountain climbing autumn"
- [ ] `climbing-winter.jpg` - Icy alpine mountain face
  - Keywords: "ice climbing winter alpine"

### Skiing (2 images)
- [ ] `skiing-winter-1.jpg` - Pristine snow slopes
  - Keywords: "ski slopes mountain winter"
- [ ] `skiing-winter-2.jpg` - Snowy ski terrain with powder
  - Keywords: "powder snow skiing mountain"

### Backpacking (4 images)
- [ ] `backpacking-spring.jpg` - Remote wilderness trail in spring
  - Keywords: "backpacking trail spring wilderness"
- [ ] `backpacking-summer.jpg` - Backcountry path with sunlight
  - Keywords: "backcountry hiking summer"
- [ ] `backpacking-fall.jpg` - Mountain pass with fall foliage
  - Keywords: "mountain pass backpacking autumn"
- [ ] `backpacking-winter.jpg` - Snowy backcountry trail
  - Keywords: "winter backpacking snow"

### Generic (6 images)
- [ ] `generic-spring.jpg` - Outdoor meadow with spring flowers
  - Keywords: "meadow wildflowers spring landscape"
- [ ] `generic-summer.jpg` - Vibrant landscape with clear skies
  - Keywords: "outdoor landscape summer vibrant"
- [ ] `generic-fall.jpg` - Scenic forest with autumn colors
  - Keywords: "forest autumn fall scenic"
- [ ] `generic-winter.jpg` - Serene snow-covered scene
  - Keywords: "winter landscape snow serene"
- [ ] `generic-outdoor-1.jpg` - Mountain wilderness vista
  - Keywords: "mountain landscape wilderness vista"
- [ ] `generic-outdoor-2.jpg` - Scenic outdoor nature view
  - Keywords: "nature landscape scenic outdoor"

## Download and Preparation Steps

### Step 1: Create Directory
```bash
mkdir -p public/fallback-images
```

### Step 2: Download Images
For each image in the list above:
1. Search on Unsplash using the provided keywords
2. Select a high-quality image (1920×1080 or larger)
3. Download the image
4. Rename to match the exact filename (e.g., `hiking-spring.jpg`)
5. Save to `public/fallback-images/` directory

### Step 3: Verify Downloaded Images
```bash
# Check that all 24 images are present
ls -1 public/fallback-images/ | wc -l
# Should output: 24
```

### Step 4: Upload to Cloudinary
```bash
# Run the seeding script
npx tsx scripts/seed-fallback-images.ts
```

The script will:
- Validate your Cloudinary configuration
- Upload each image to `gearshack/fallbacks/` folder
- Apply optimization transformations (resize to 1920×1080, auto-quality)
- Report success/failure for each upload

## Verification

After running the seed script, verify images are accessible:

1. Go to Cloudinary dashboard: https://cloudinary.com/console
2. Navigate to Media Library → `gearshack/fallbacks/`
3. Confirm all 24 images are present
4. Check a few image URLs to ensure they load correctly

## Troubleshooting

### Error: "Directory not found"
- Ensure `public/fallback-images/` directory exists
- Check that images are saved in the correct directory

### Error: "Missing CLOUDINARY_API_KEY"
- Verify `.env.local` has all required Cloudinary variables
- Check that you're running the script from the project root

### Error: "Upload failed"
- Check internet connection
- Verify Cloudinary credentials are correct
- Ensure you have sufficient upload quota

### Image quality issues
- Re-download at higher resolution (minimum 1920×1080)
- Check that source image has good composition
- Consider using a different image from Unsplash/Pexels

## Alternative: Using Stock Photos

If you prefer, you can use these curated Unsplash collections:

- **Mountain Landscapes**: https://unsplash.com/collections/827743/mountain-landscapes
- **Forest Scenes**: https://unsplash.com/collections/1129453/forest
- **Winter Outdoor**: https://unsplash.com/collections/3800101/winter-outdoor
- **Camping**: https://unsplash.com/collections/1999417/camping

## License Compliance

All images downloaded from Unsplash, Pexels, or Pixabay are free for commercial use. However:

- **Attribution**: Not required but appreciated
- **Modification**: Allowed (we resize and optimize)
- **Redistribution**: Allowed as part of GearShack application
- **Do NOT**: Sell images directly or claim as your own

For details, see:
- Unsplash License: https://unsplash.com/license
- Pexels License: https://www.pexels.com/license/
- Pixabay License: https://pixabay.com/service/license/

## Next Steps

After completing this guide:
1. Mark T010 as complete in `tasks.md`
2. Verify fallback images work by testing the fallback selection logic
3. Proceed to Phase 3: User Story 1 implementation
