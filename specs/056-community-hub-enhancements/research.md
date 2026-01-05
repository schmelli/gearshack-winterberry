# Research: Community Hub Enhancements

**Feature**: 056-community-hub-enhancements
**Date**: 2026-01-04

## Research Topics

### 1. Currency Conversion Strategy

**Decision**: Use `Intl.NumberFormat` with user's locale for display-only formatting (no actual conversion)

**Rationale**:
- The spec says "convert all prices to user's locale currency" but actual exchange rate conversion is complex and requires real-time rates
- For MVP, use locale-based number formatting (e.g., €100.00 vs $100.00) without actual conversion
- The gear item already stores `price_paid` and `currency` fields - display both for transparency
- Example: "€85.00 (EUR)" helps buyers understand the original price

**Alternatives Considered**:
- **Exchange rate API (fixer.io, exchangerate-api)**: Added complexity, cost, and staleness issues
- **Store prices in single currency**: Would require users to convert at input time, poor UX
- **Display original only**: Selected - display in original currency with locale-appropriate formatting

**Implementation Note**: If actual conversion is needed later, can add as separate feature with `exchange_rates` table and daily refresh job.

### 2. Infinite Scroll Pattern (Marketplace)

**Decision**: Copy `useBulletinBoard` hook pattern with cursor-based pagination

**Rationale**:
- Consistent UX across community features (bulletin board already uses this)
- Cursor-based pagination handles real-time additions better than offset pagination
- IntersectionObserver pattern already implemented and tested

**Implementation Pattern** (from `hooks/bulletin/useBulletinBoard.ts`):
```typescript
interface MarketplaceState {
  listings: MarketplaceListing[];
  hasMore: boolean;
  nextCursor: string | null;
  loadingState: 'idle' | 'loading' | 'loading-more' | 'error';
  error: string | null;
  filters: MarketplaceFilters;
}
```

**Alternatives Considered**:
- **Offset pagination**: Poor performance with real-time data, can skip/duplicate items
- **Load all**: Not scalable with 1000+ items
- **Virtual scrolling**: Over-engineered for current scale

### 3. Banner Carousel Auto-Rotation

**Decision**: Use `embla-carousel-autoplay` plugin with 6-second interval, pause on hover

**Rationale**:
- embla-carousel already in use (shadcn Carousel component)
- Autoplay plugin is official and well-maintained
- 6-second interval confirmed in clarification session

**Implementation Pattern**:
```typescript
import Autoplay from 'embla-carousel-autoplay';

const [api, setApi] = useState<CarouselApi>();

useEffect(() => {
  if (!api) return;

  // Pause on hover
  const container = api.rootNode();
  container.addEventListener('mouseenter', () => api.plugins().autoplay?.stop());
  container.addEventListener('mouseleave', () => api.plugins().autoplay?.play());
}, [api]);

<Carousel
  plugins={[Autoplay({ delay: 6000, stopOnInteraction: false })]}
  setApi={setApi}
>
```

**Alternatives Considered**:
- **Custom interval with setInterval**: Less robust, doesn't handle edge cases
- **CSS-only animation**: Can't pause on hover elegantly

### 4. VIP Modal vs Navigation

**Decision**: Use shadcn `Dialog` component with client-side data fetching

**Rationale**:
- Dialog component already in design system
- Keep existing `/vip/[slug]` page for SEO and direct linking
- Modal shows subset of data (profile + loadouts grid + featured videos)
- Fetch VIP data client-side when modal opens (reuse `useVipProfile` hook)

**Implementation Pattern**:
```typescript
// Global state for modal
const useVipModalStore = create<{
  isOpen: boolean;
  vipSlug: string | null;
  open: (slug: string) => void;
  close: () => void;
}>(...);

// VipProfileModal renders anywhere, listens to store
<Dialog open={isOpen} onOpenChange={close}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <VipProfileContent slug={vipSlug} compact />
  </DialogContent>
</Dialog>
```

**Alternatives Considered**:
- **Server component modal**: Complex with App Router, SEO not needed for modal
- **Sheet instead of Dialog**: Dialog better for centered content with scroll
- **Replace page entirely**: Would break direct links and SEO

### 5. URL Query Parameter Persistence (Filter State)

**Decision**: Use `useSearchParams` from `next/navigation` with `router.replace`

**Rationale**:
- Next.js App Router provides `useSearchParams` hook
- `router.replace` updates URL without adding history entries (cleaner back navigation)
- Shareable URLs: `/community?tag=gear_advice`

**Implementation Pattern**:
```typescript
import { useSearchParams, useRouter } from 'next/navigation';

export function useBulletinFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTag = searchParams.get('tag') as PostTag | null;

  const setActiveTag = useCallback((tag: PostTag | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tag) {
      params.set('tag', tag);
    } else {
      params.delete('tag');
    }
    router.replace(`?${params.toString()}`);
  }, [searchParams, router]);

  return { activeTag, setActiveTag };
}
```

**Alternatives Considered**:
- **localStorage**: Not shareable, clutters storage
- **Zustand persist**: Not shareable via URL
- **History API directly**: Next.js wrapper is cleaner

### 6. YouTube Preview Sizing

**Decision**: Add `max-h-[300px]` constraint to AspectRatio container

**Rationale**:
- Simple CSS solution, no JavaScript needed
- AspectRatio maintains 16:9 ratio, max-height prevents oversized embeds
- Preserves responsive behavior on smaller screens

**Implementation**:
```tsx
<AspectRatio ratio={16 / 9} className="relative bg-muted max-h-[300px]">
  {/* Thumbnail content */}
</AspectRatio>
```

**Alternatives Considered**:
- **Fixed width**: Breaks responsive design
- **Custom hook for sizing**: Over-engineered for simple constraint

### 7. Admin Banner Management

**Decision**: Standard CRUD form with Cloudinary upload for hero images

**Rationale**:
- Follows existing admin patterns (categories, VIP management)
- Cloudinary already configured for image uploads
- Date pickers for visibility window (start/end)

**Form Fields**:
- `hero_image_url` (Cloudinary upload)
- `cta_text` (text input, required)
- `button_text` (text input, required)
- `target_url` (URL input, required, internal or external)
- `visibility_start` (datetime picker)
- `visibility_end` (datetime picker)
- `display_order` (number, for manual ordering)
- `is_active` (toggle, for quick enable/disable)

### 8. Marketplace Messaging Integration

**Decision**: Reuse existing `useConversations` hook with gear item context

**Rationale**:
- Feature 046 (User Messaging System) already provides full conversation infrastructure
- Add optional `context` field to conversation for marketplace reference
- "Message Seller" button creates/opens conversation with item context

**Implementation Pattern**:
```typescript
const { startConversation } = useConversations();

const handleMessageSeller = async (sellerId: string, gearItem: GearItem) => {
  const conversation = await startConversation(sellerId, {
    type: 'marketplace',
    gearItemId: gearItem.id,
    gearItemName: gearItem.name,
  });
  router.push(`/messages/${conversation.id}`);
};
```

## No Further Clarification Needed

All research topics resolved with clear implementation decisions. Ready for Phase 1 design.
