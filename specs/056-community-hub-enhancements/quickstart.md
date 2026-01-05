# Quickstart: Community Hub Enhancements

**Feature**: 056-community-hub-enhancements
**Date**: 2026-01-04

## Prerequisites

- Node.js 18+
- Supabase CLI installed (`npm install -g supabase`)
- Access to Supabase project
- Cloudinary account configured (for banner images)

## Setup Steps

### 1. Database Migrations

Run the new migrations in order:

```bash
# Apply all pending migrations
supabase db push

# Or run individually:
supabase migration up 20260104_create_community_banners
supabase migration up 20260104_add_vip_featured_videos
supabase migration up 20260104_create_marketplace_view
```

### 2. Verify Database Changes

```sql
-- Check community_banners table
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'community_banners';

-- Check vip_accounts extension
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'vip_accounts' AND column_name = 'featured_video_urls';

-- Check marketplace view
SELECT * FROM v_marketplace_listings LIMIT 5;
```

### 3. Install Dependencies

No new npm dependencies required - all dependencies already present:
- `embla-carousel-react` (for carousel)
- `embla-carousel-autoplay` (check if installed, add if not)

```bash
# Check if autoplay plugin is installed
npm list embla-carousel-autoplay || npm install embla-carousel-autoplay
```

### 4. Type Generation

Regenerate Supabase types after migration:

```bash
npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/supabase.ts
```

## Development Workflow

### Running Locally

```bash
# Start development server
npm run dev

# Run type checking
npm run lint
```

### Testing New Features

1. **Marketplace**: Navigate to `/community/marketplace` (enable tab first in `CommunityNavTabs.tsx`)
2. **Banner Carousel**: Create a test banner in `/admin/banners`
3. **VIP Modal**: Click any VIP name in community to open modal
4. **Filter Persistence**: Add `?tag=gear_advice` to community URL

## Key Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `types/marketplace.ts` | Marketplace types and schemas |
| `types/banner.ts` | Banner types and schemas |
| `hooks/marketplace/useMarketplace.ts` | Marketplace data hook |
| `hooks/marketplace/useMarketplaceFilters.ts` | Filter state with URL sync |
| `hooks/banner/useBannerCarousel.ts` | Active banners hook |
| `hooks/vip/useVipModal.ts` | Global modal state (Zustand) |
| `components/marketplace/MarketplaceGrid.tsx` | Listing grid component |
| `components/marketplace/MarketplaceCard.tsx` | Individual listing card |
| `components/marketplace/MarketplaceFilters.tsx` | Filter controls |
| `components/community/BannerCarousel.tsx` | Hero banner carousel |
| `components/vip/VipProfileModal.tsx` | VIP profile modal |
| `components/vip/VipFeaturedVideos.tsx` | Featured videos section |
| `app/[locale]/community/marketplace/page.tsx` | Marketplace page |
| `app/[locale]/admin/banners/page.tsx` | Banner admin page |

### Modified Files

| Path | Change |
|------|--------|
| `components/community/CommunityNavTabs.tsx` | Enable Marketplace tab |
| `components/community/CommunitySidebar.tsx` | Increase spacing to 24px |
| `components/bulletin/YouTubePreview.tsx` | Add max-height constraint |
| `hooks/bulletin/useBulletinBoard.ts` | Add URL param filter persistence |
| `types/vip.ts` | Add `featuredVideoUrls` field |
| `app/[locale]/community/page.tsx` | Add BannerCarousel component |
| `app/[locale]/admin/vip/page.tsx` | Add featured videos management |
| `app/[locale]/community/merchant-loadouts/page.tsx` | Add Reseller tab (disabled) |

## Testing Checklist

### P1: Marketplace

- [ ] Marketplace tab enabled and clickable
- [ ] Gear cards display with seller info
- [ ] Filter by type works (for sale/trade/borrow)
- [ ] Sort by date/price/name works
- [ ] Infinite scroll loads more items
- [ ] Click seller avatar shows public profile
- [ ] Message button initiates conversation
- [ ] Currency displays correctly per item

### P1: Banner Carousel

- [ ] Admin can create banner with image upload
- [ ] Admin can set visibility dates
- [ ] Carousel displays active banners
- [ ] Auto-rotates every 6 seconds
- [ ] Pauses on hover
- [ ] Manual navigation works (dots/arrows)
- [ ] Hidden when no active banners

### P2: VIP Modal

- [ ] Click VIP name opens modal (not navigates)
- [ ] Modal shows profile, loadouts, featured videos
- [ ] Click outside closes modal
- [ ] Escape key closes modal
- [ ] Direct URL `/vip/[slug]` still works

### P2: Filter Bug Fix

- [ ] Filter persists in URL params
- [ ] Refresh preserves filter
- [ ] Shareable filter URLs work
- [ ] Clear filters updates URL

### P3: Polish

- [ ] YouTube previews max 300px height
- [ ] Sidebar panels have 24px gap
- [ ] VIP featured videos display correctly
- [ ] Reseller tab shows "Soon" badge

## Common Issues

### Banner not showing

1. Check visibility dates (must be within window)
2. Check `is_active` is true
3. Check RLS policies allow SELECT

### Marketplace empty

1. Ensure gear items have `is_for_sale`, `can_be_traded`, or `can_be_borrowed` set
2. Check gear item `status` is 'owned'
3. Check seller is not banned

### Filter not persisting

1. Ensure using `useSearchParams` from `next/navigation`
2. Check URL updates with `router.replace`
3. Verify initial state reads from URL params

## i18n Keys to Add

Add to `messages/en.json` and `messages/de.json`:

```json
{
  "Marketplace": {
    "title": "Marketplace",
    "filters": {
      "all": "All Listings",
      "forSale": "For Sale",
      "forTrade": "For Trade",
      "forBorrow": "For Borrow"
    },
    "sort": {
      "date": "Newest",
      "price": "Price",
      "name": "Name"
    },
    "card": {
      "forSale": "For Sale",
      "forTrade": "For Trade",
      "forBorrow": "Available to Borrow",
      "messageButton": "Message Seller"
    },
    "empty": "No listings match your filters"
  },
  "Banner": {
    "admin": {
      "title": "Banner Management",
      "create": "Create Banner",
      "edit": "Edit Banner",
      "delete": "Delete Banner",
      "fields": {
        "heroImage": "Hero Image",
        "ctaText": "Headline Text",
        "buttonText": "Button Text",
        "targetUrl": "Target URL",
        "visibilityStart": "Start Date",
        "visibilityEnd": "End Date",
        "displayOrder": "Display Order",
        "isActive": "Active"
      }
    }
  }
}
```
