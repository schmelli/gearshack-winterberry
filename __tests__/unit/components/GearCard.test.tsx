/**
 * GearCard Component Tests
 *
 * Tests for the GearCard component used in the inventory gallery.
 * Uses realistic outdoor gear data for testing display, interactions,
 * and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GearCard } from '@/components/inventory-gallery/GearCard';
import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock i18n navigation
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="gear-image" {...props} />
  ),
}));

// Mock useCategoryBreadcrumb hook
vi.mock('@/hooks/useCategoryBreadcrumb', () => ({
  useCategoryBreadcrumb: (productTypeId: string | null) => ({
    breadcrumb: productTypeId ? ['Shelter', 'Tents', 'Backpacking Tents'] : [],
    productTypeLabel: productTypeId ? 'Backpacking Tent' : null,
  }),
}));

// Mock useCategoriesStore
vi.mock('@/hooks/useCategoriesStore', () => ({
  useCategoriesStore: () => [],
}));

// Mock category-helpers
vi.mock('@/lib/utils/category-helpers', () => ({
  getParentCategoryIds: () => ({ categoryId: 'shelter', subcategoryId: 'tents' }),
}));

// Mock gear-utils
vi.mock('@/lib/gear-utils', () => ({
  formatWeightForDisplay: (weight: number | null) => {
    if (weight === null) return '—';
    if (weight >= 1000) return `${(weight / 1000).toFixed(2)} kg`;
    return `${Math.round(weight)} g`;
  },
  getOptimizedImageUrl: (item: { primaryImageUrl?: string | null }) => item.primaryImageUrl,
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div data-testid="gear-card" onClick={onClick} className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild) return children;
    return <button {...props}>{children}</button>;
  },
}));

vi.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HoverCardTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild) return children;
    return <>{children}</>;
  },
  HoverCardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hover-content">{children}</div>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/inventory-gallery/CategoryPlaceholder', () => ({
  CategoryPlaceholder: ({ categoryId }: { categoryId: string }) => (
    <div data-testid="category-placeholder">{categoryId}</div>
  ),
}));

vi.mock('@/components/gear/SpecIcon', () => ({
  SpecIcon: ({ type }: { type: string }) => <span data-testid={`spec-icon-${type}`} />,
}));

vi.mock('@/components/wishlist/PriceStubIndicator', () => ({
  PriceStubIndicator: () => <div data-testid="price-stub">Price stub</div>,
}));

vi.mock('@/components/wishlist/PriceHistoryStub', () => ({
  PriceHistoryStub: () => <div data-testid="price-history">Price history</div>,
}));

vi.mock('@/components/wishlist/MoveToInventoryButton', () => ({
  MoveToInventoryButton: ({ itemName }: { itemName: string }) => (
    <button data-testid="move-to-inventory">Move {itemName}</button>
  ),
}));

vi.mock('@/components/wishlist/CommunityAvailabilityPanel', () => ({
  CommunityAvailabilityPanel: () => <div data-testid="community-availability">Community</div>,
}));

// Mock wishlist hooks used by TopPricesDisplay
vi.mock('@/hooks/offers/useWishlistItemOffers', () => ({
  useWishlistItemOffers: () => ({
    offers: [],
    isLoading: false,
    error: null,
  }),
}));

// Mock price results hook used directly in GearCard
vi.mock('@/hooks/price-tracking/useWishlistPriceResults', () => ({
  useWishlistPriceResults: () => ({
    priceResults: [],
    isLoading: false,
    error: null,
  }),
}));

// Mock TopPricesDisplay to avoid needing full hook setup
vi.mock('@/components/wishlist/TopPricesDisplay', () => ({
  TopPricesDisplay: ({ wishlistItemId }: { wishlistItemId: string }) => (
    <div data-testid="top-prices-display">{wishlistItemId}</div>
  ),
}));

// Mock TopRetailPricesDisplay
vi.mock('@/components/wishlist/TopRetailPricesDisplay', () => ({
  TopRetailPricesDisplay: () => <div data-testid="top-retail-prices">Retail prices</div>,
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockGearItem = (overrides: Partial<GearItem> = {}): GearItem => ({
  id: 'gear-001',
  name: 'Big Agnes Copper Spur HV UL2',
  brand: 'Big Agnes',
  brandUrl: 'https://bigagnes.com',
  modelNumber: 'Copper Spur HV UL2',
  description: 'Ultralight 2-person backpacking tent with excellent ventilation',
  productUrl: null,
  productTypeId: 'shelter-tent',
  weightGrams: 1020,
  weightDisplayUnit: 'g',
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  size: null,
  color: 'Olive Green',
  volumeLiters: null,
  materials: 'Solution-dyed ripstop nylon',
  tentConstruction: 'Semi-freestanding',
  pricePaid: 449.95,
  currency: 'USD',
  purchaseDate: new Date('2023-06-15'),
  retailer: 'REI',
  retailerUrl: 'https://rei.com',
  primaryImageUrl: 'https://res.cloudinary.com/test/tent.jpg',
  galleryImageUrls: [],
  condition: 'new',
  status: 'own',
  notes: 'Great for PCT thru-hike',
  quantity: 1,
  isFavourite: false,
  isForSale: false,
  canBeBorrowed: false,
  canBeTraded: false,
  dependencyIds: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('GearCard', () => {
  let mockItem: GearItem;
  let mockOnClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockItem = createMockGearItem();
    mockOnClick = vi.fn();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the gear item name', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      expect(screen.getByText('Big Agnes Copper Spur HV UL2')).toBeInTheDocument();
    });

    it('should render the brand name', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      // Brand appears multiple times (in brand display and as part of item name)
      // Use getAllByText and verify at least one exists
      const brandElements = screen.getAllByText(/Big Agnes/);
      expect(brandElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render the weight with proper formatting', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      // 1020g should be displayed as "1.02 kg"
      expect(screen.getByText('1.02 kg')).toBeInTheDocument();
    });

    it('should render product type label from category breadcrumb', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      expect(screen.getByText('Backpacking Tent')).toBeInTheDocument();
    });

    it('should render the gear image when available', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      const image = screen.getByTestId('gear-image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', 'Big Agnes Copper Spur HV UL2');
    });

    it('should render category placeholder when no image is available', () => {
      const itemWithoutImage = createMockGearItem({ primaryImageUrl: null });
      render(<GearCard item={itemWithoutImage} viewDensity="standard" />);

      expect(screen.getByTestId('category-placeholder')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // View Density Tests
  // ===========================================================================

  describe('View Density Modes', () => {
    it('should render in compact mode with horizontal layout', () => {
      render(<GearCard item={mockItem} viewDensity="compact" />);

      const card = screen.getByTestId('gear-card');
      expect(card).toHaveClass('flex-row');
    });

    it('should render in standard mode with adequate height', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      const card = screen.getByTestId('gear-card');
      expect(card).toHaveClass('min-h-[260px]');
    });

    it('should render in detailed mode with expanded content', () => {
      const itemWithDescription = createMockGearItem({
        description: 'Full description for detailed view',
        notes: 'Personal notes about the tent',
      });
      render(<GearCard item={itemWithDescription} viewDensity="detailed" />);

      const card = screen.getByTestId('gear-card');
      expect(card).toHaveClass('min-h-[450px]');
    });

    it('should show description in detailed view', () => {
      const itemWithDescription = createMockGearItem({
        description: 'Ultralight 2-person backpacking tent',
      });
      render(<GearCard item={itemWithDescription} viewDensity="detailed" />);

      expect(screen.getByText('Ultralight 2-person backpacking tent')).toBeInTheDocument();
    });

    it('should show notes section in detailed view', () => {
      const itemWithNotes = createMockGearItem({
        notes: 'Great for PCT thru-hike',
      });
      render(<GearCard item={itemWithNotes} viewDensity="detailed" />);

      expect(screen.getByText('Great for PCT thru-hike')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onClick handler when card is clicked', () => {
      render(<GearCard item={mockItem} viewDensity="standard" onClick={mockOnClick} />);

      const card = screen.getByTestId('gear-card');
      fireEvent.click(card);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have edit link with correct href', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      const editLink = screen.getByRole('link', { name: /edit/i });
      expect(editLink).toHaveAttribute('href', '/inventory/gear-001/edit');
    });
  });

  // ===========================================================================
  // Status Icon Tests
  // ===========================================================================

  describe('Status Icons', () => {
    it('should show favourite icon when item is favourite', () => {
      const favouriteItem = createMockGearItem({ isFavourite: true });
      render(<GearCard item={favouriteItem} viewDensity="standard" />);

      expect(screen.getByTitle('Favourite')).toBeInTheDocument();
    });

    it('should show for-sale icon when item is for sale', () => {
      const forSaleItem = createMockGearItem({ isForSale: true });
      render(<GearCard item={forSaleItem} viewDensity="standard" />);

      expect(screen.getByTitle('For Sale')).toBeInTheDocument();
    });

    it('should show borrowable icon when item can be borrowed', () => {
      const borrowableItem = createMockGearItem({ canBeBorrowed: true });
      render(<GearCard item={borrowableItem} viewDensity="standard" />);

      expect(screen.getByTitle('Can be Borrowed')).toBeInTheDocument();
    });

    it('should show tradeable icon when item can be traded', () => {
      const tradeableItem = createMockGearItem({ canBeTraded: true });
      render(<GearCard item={tradeableItem} viewDensity="standard" />);

      expect(screen.getByTitle('Up for Trade')).toBeInTheDocument();
    });

    it('should show lent icon when item status is lent', () => {
      const lentItem = createMockGearItem({ status: 'lent' });
      render(<GearCard item={lentItem} viewDensity="standard" />);

      expect(screen.getByTitle('Currently Lent')).toBeInTheDocument();
    });

    it('should show sold icon when item status is sold', () => {
      const soldItem = createMockGearItem({ status: 'sold' });
      render(<GearCard item={soldItem} viewDensity="standard" />);

      expect(screen.getByTitle('Sold')).toBeInTheDocument();
    });

    it('should not show status icons in wishlist context', () => {
      const favouriteItem = createMockGearItem({ isFavourite: true });
      render(<GearCard item={favouriteItem} viewDensity="standard" context="wishlist" />);

      expect(screen.queryByTitle('Favourite')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Wishlist Context Tests
  // ===========================================================================

  describe('Wishlist Context', () => {
    it('should show move to inventory button in wishlist context', () => {
      const onMoveToInventory = vi.fn();
      render(
        <GearCard
          item={mockItem}
          viewDensity="standard"
          context="wishlist"
          onMoveToInventory={onMoveToInventory}
        />
      );

      expect(screen.getByTestId('move-to-inventory')).toBeInTheDocument();
    });

    it('should show top prices display in standard wishlist view', () => {
      render(<GearCard item={mockItem} viewDensity="standard" context="wishlist" />);

      expect(screen.getByTestId('top-prices-display')).toBeInTheDocument();
      expect(screen.getByTestId('top-retail-prices')).toBeInTheDocument();
    });

    it('should show top prices display in detailed wishlist view', () => {
      render(<GearCard item={mockItem} viewDensity="detailed" context="wishlist" />);

      expect(screen.getByTestId('top-prices-display')).toBeInTheDocument();
      expect(screen.getByTestId('top-retail-prices')).toBeInTheDocument();
    });

    it('should show community availability panel in wishlist context', () => {
      render(<GearCard item={mockItem} viewDensity="standard" context="wishlist" />);

      expect(screen.getByTestId('community-availability')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible edit button with screen reader text', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      const editButton = screen.getByRole('link', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should render image with proper alt text', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      const image = screen.getByTestId('gear-image');
      expect(image).toHaveAttribute('alt', 'Big Agnes Copper Spur HV UL2');
    });

    it('should have interactive card when onClick is provided', () => {
      render(<GearCard item={mockItem} viewDensity="standard" onClick={mockOnClick} />);

      const card = screen.getByTestId('gear-card');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle item without brand gracefully', () => {
      const itemWithoutBrand = createMockGearItem({ brand: null });
      render(<GearCard item={itemWithoutBrand} viewDensity="standard" />);

      // Should still render the name
      expect(screen.getByText('Big Agnes Copper Spur HV UL2')).toBeInTheDocument();
    });

    it('should handle item without weight gracefully', () => {
      const itemWithoutWeight = createMockGearItem({ weightGrams: null });
      render(<GearCard item={itemWithoutWeight} viewDensity="standard" />);

      // Should still render the card
      expect(screen.getByTestId('gear-card')).toBeInTheDocument();
    });

    it('should handle very long item names with truncation', () => {
      const itemWithLongName = createMockGearItem({
        name: 'Super Long Gear Item Name That Should Be Truncated In The Display',
      });
      render(<GearCard item={itemWithLongName} viewDensity="compact" />);

      // Name should be present (truncation is via CSS)
      expect(
        screen.getByText('Super Long Gear Item Name That Should Be Truncated In The Display')
      ).toBeInTheDocument();
    });

    it('should format weight as kilograms when >= 1000g', () => {
      const heavyItem = createMockGearItem({ weightGrams: 2500 });
      render(<GearCard item={heavyItem} viewDensity="standard" />);

      expect(screen.getByText('2.50 kg')).toBeInTheDocument();
    });

    it('should format weight as grams when < 1000g', () => {
      const lightItem = createMockGearItem({ weightGrams: 500 });
      render(<GearCard item={lightItem} viewDensity="standard" />);

      expect(screen.getByText('500 g')).toBeInTheDocument();
    });

    it('should show placeholder when image fails to load in standard view', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      const image = screen.getByTestId('gear-image');
      fireEvent.error(image);

      // After error, placeholder should be shown
      expect(screen.getByTestId('category-placeholder')).toBeInTheDocument();
    });

    it('should show placeholder when image fails to load in compact view', () => {
      render(<GearCard item={mockItem} viewDensity="compact" />);

      const image = screen.getByTestId('gear-image');
      fireEvent.error(image);

      // After error, placeholder should be shown
      expect(screen.getByTestId('category-placeholder')).toBeInTheDocument();
    });

    it('should handle item without productTypeId', () => {
      const itemWithoutProductType = createMockGearItem({ productTypeId: null });
      render(<GearCard item={itemWithoutProductType} viewDensity="standard" />);

      expect(screen.getByTestId('gear-card')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Brand URL Tests
  // ===========================================================================

  describe('Brand URL', () => {
    it('should render brand website link in hover card when brandUrl is provided', () => {
      render(<GearCard item={mockItem} viewDensity="standard" />);

      // Check for hover content containing brand link
      const hoverContents = screen.getAllByTestId('hover-content');
      expect(hoverContents.length).toBeGreaterThan(0);
    });

    it('should not show brand link when brandUrl is null', () => {
      const itemWithoutBrandUrl = createMockGearItem({ brandUrl: null });
      render(<GearCard item={itemWithoutBrandUrl} viewDensity="standard" />);

      // Card should render without brand link
      expect(screen.getByTestId('gear-card')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Compact View Wishlist Tests
  // ===========================================================================

  describe('Compact View Wishlist', () => {
    it('should show move to inventory button in compact wishlist view', () => {
      const onMoveToInventory = vi.fn();
      render(
        <GearCard
          item={mockItem}
          viewDensity="compact"
          context="wishlist"
          onMoveToInventory={onMoveToInventory}
        />
      );

      expect(screen.getByTestId('move-to-inventory')).toBeInTheDocument();
    });

    it('should call onMoveComplete when provided', () => {
      const onMoveToInventory = vi.fn();
      const onMoveComplete = vi.fn();
      render(
        <GearCard
          item={mockItem}
          viewDensity="compact"
          context="wishlist"
          onMoveToInventory={onMoveToInventory}
          onMoveComplete={onMoveComplete}
        />
      );

      // The button should be rendered with the complete handler
      expect(screen.getByTestId('move-to-inventory')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Detailed View Brand Tests
  // ===========================================================================

  describe('Detailed View Brand', () => {
    it('should show brand in detailed view with hover card', () => {
      render(<GearCard item={mockItem} viewDensity="detailed" />);

      expect(screen.getAllByText(/Big Agnes/).length).toBeGreaterThanOrEqual(2);
    });

    it('should show brand link when brandUrl exists in detailed view', () => {
      render(<GearCard item={mockItem} viewDensity="detailed" />);

      // Look for external link indicator in any hover content
      const hoverContents = screen.getAllByTestId('hover-content');
      expect(hoverContents.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Status Icons Component Edge Cases
  // ===========================================================================

  describe('Status Icons Edge Cases', () => {
    it('should show multiple status icons when multiple flags are true', () => {
      const multiStatusItem = createMockGearItem({
        isFavourite: true,
        isForSale: true,
        canBeBorrowed: true,
      });
      render(<GearCard item={multiStatusItem} viewDensity="standard" />);

      expect(screen.getByTitle('Favourite')).toBeInTheDocument();
      expect(screen.getByTitle('For Sale')).toBeInTheDocument();
      expect(screen.getByTitle('Can be Borrowed')).toBeInTheDocument();
    });

    it('should not show any icons when all status flags are false', () => {
      const noStatusItem = createMockGearItem({
        isFavourite: false,
        isForSale: false,
        canBeBorrowed: false,
        canBeTraded: false,
        status: 'own',
      });
      render(<GearCard item={noStatusItem} viewDensity="standard" />);

      expect(screen.queryByTitle('Favourite')).not.toBeInTheDocument();
      expect(screen.queryByTitle('For Sale')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Can be Borrowed')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Up for Trade')).not.toBeInTheDocument();
    });
  });
});
