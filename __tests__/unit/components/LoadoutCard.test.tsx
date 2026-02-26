/**
 * LoadoutCard Component Tests
 *
 * Tests for the LoadoutCard component used in loadout management.
 * Tests rendering, weight calculations, interactions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadoutCard } from '@/components/loadouts/LoadoutCard';
import type { Loadout } from '@/types/loadout';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      itemCount: `${params?.count ?? 0} items`,
    };
    return translations[key] ?? key;
  },
}));

// Mock i18n navigation
vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} data-testid="loadout-link" {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Calendar: ({ className }: { className?: string }) => (
    <svg data-testid="calendar-icon" className={className} />
  ),
  Package: ({ className }: { className?: string }) => (
    <svg data-testid="package-icon" className={className} />
  ),
  Scale: ({ className }: { className?: string }) => (
    <svg data-testid="scale-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
}));

// Mock DeleteLoadoutDialog
vi.mock('@/components/loadouts/DeleteLoadoutDialog', () => ({
  DeleteLoadoutDialog: ({
    loadoutName,
    onConfirm,
  }: {
    loadoutName: string;
    onConfirm: () => void;
  }) => (
    <button
      data-testid="delete-button"
      data-loadout-name={loadoutName}
      onClick={onConfirm}
    >
      Delete {loadoutName}
    </button>
  ),
}));

// Mock useStore
const mockDeleteLoadout = vi.fn();
vi.mock('@/hooks/useSupabaseStore', () => ({
  useStore: (selector: (state: { deleteLoadout: () => void }) => unknown) =>
    selector({ deleteLoadout: mockDeleteLoadout }),
}));

// Mock loadout-utils
vi.mock('@/lib/loadout-utils', () => ({
  calculateTotalWeight: (items: GearItem[]) =>
    items.reduce((sum, item) => sum + (item.weightGrams ?? 0), 0),
  formatWeight: (grams: number) => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
    return `${grams} g`;
  },
  formatTripDate: (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  getWeightCategory: (grams: number) => {
    if (grams < 4500) return 'ultralight';
    if (grams < 9000) return 'lightweight';
    return 'traditional';
  },
  getWeightCategoryColor: (category: string) => {
    const colors: Record<string, string> = {
      ultralight: 'text-green-600',
      lightweight: 'text-yellow-600',
      traditional: 'text-red-600',
    };
    return colors[category] ?? 'text-muted-foreground';
  },
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockLoadout = (overrides: Partial<Loadout> = {}): Loadout => ({
  id: 'loadout-abc123xyz',
  userId: 'user-001',
  name: 'Summer PCT Section Hike',
  tripDate: new Date('2024-07-15'),
  itemIds: ['gear-001', 'gear-002', 'gear-003'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const createMockGearItems = (): GearItem[] => [
  {
    id: 'gear-001',
    name: 'Big Agnes Copper Spur HV UL2',
    brand: 'Big Agnes',
    brandUrl: null,
    modelNumber: null,
    description: null,
    productUrl: null,
    productTypeId: 'shelter',
    weightGrams: 1020,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    size: null,
    color: null,
    volumeLiters: null,
    materials: null,
    tentConstruction: null,
    pricePaid: null,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: null,
    quantity: 1,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'gear-002',
    name: 'Zpacks 20F Sleeping Bag',
    brand: 'Zpacks',
    brandUrl: null,
    modelNumber: null,
    description: null,
    productUrl: null,
    productTypeId: 'sleep-system',
    weightGrams: 567,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    size: null,
    color: null,
    volumeLiters: null,
    materials: null,
    tentConstruction: null,
    pricePaid: null,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: null,
    quantity: 1,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'gear-003',
    name: 'Gossamer Gear Mariposa 60',
    brand: 'Gossamer Gear',
    brandUrl: null,
    modelNumber: null,
    description: null,
    productUrl: null,
    productTypeId: 'packs',
    weightGrams: 737,
    weightDisplayUnit: 'g',
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    size: null,
    color: null,
    volumeLiters: 60,
    materials: null,
    tentConstruction: null,
    pricePaid: null,
    currency: 'USD',
    purchaseDate: null,
    retailer: null,
    retailerUrl: null,
    primaryImageUrl: null,
    galleryImageUrls: [],
    condition: 'new',
    status: 'own',
    notes: null,
    quantity: 1,
    isFavourite: false,
    isForSale: false,
    canBeBorrowed: false,
    canBeTraded: false,
    dependencyIds: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('LoadoutCard', () => {
  let mockLoadout: Loadout;
  let mockItems: GearItem[];

  beforeEach(() => {
    mockLoadout = createMockLoadout();
    mockItems = createMockGearItems();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the loadout name', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      expect(screen.getByText('Summer PCT Section Hike')).toBeInTheDocument();
    });

    it('should render the card component', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should render as a link to the loadout detail page', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      const link = screen.getByTestId('loadout-link');
      expect(link).toHaveAttribute('href', '/loadouts/loadout-abc123xyz');
    });

    it('should render the trip date when provided', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
      expect(screen.getByText('Jul 15, 2024')).toBeInTheDocument();
    });

    it('should not render trip date when not provided', () => {
      const loadoutWithoutDate = createMockLoadout({ tripDate: undefined });
      render(<LoadoutCard loadout={loadoutWithoutDate} items={mockItems} />);

      expect(screen.queryByTestId('calendar-icon')).not.toBeInTheDocument();
    });

    it('should render item count', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    it('should render total weight', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      expect(screen.getByTestId('scale-icon')).toBeInTheDocument();
      // Total: 1020 + 567 + 737 = 2324g = 2.32 kg
      expect(screen.getByText('2.32 kg')).toBeInTheDocument();
    });

    it('should render delete button', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      expect(screen.getByTestId('delete-button')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests - Weight Calculations
  // ===========================================================================

  describe('Weight Calculations', () => {
    it('should calculate total weight from loadout items only', () => {
      // Add an item not in the loadout
      const extraItem: GearItem = {
        ...mockItems[0],
        id: 'gear-extra',
        name: 'Extra Item',
        weightGrams: 5000,
      };
      const itemsWithExtra = [...mockItems, extraItem];

      render(<LoadoutCard loadout={mockLoadout} items={itemsWithExtra} />);

      // Should only count the 3 items in the loadout
      expect(screen.getByText('2.32 kg')).toBeInTheDocument();
    });

    it('should display ultralight color for light weights', () => {
      // Total weight 2324g is ultralight
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      // Find the weight display
      const weightText = screen.getByText('2.32 kg');
      const weightContainer = weightText.parentElement;
      expect(weightContainer).toHaveClass('text-green-600');
    });

    it('should handle items with no weight', () => {
      const itemsWithNoWeight = mockItems.map((item) => ({
        ...item,
        weightGrams: null,
      })) as GearItem[];

      render(<LoadoutCard loadout={mockLoadout} items={itemsWithNoWeight} />);

      expect(screen.getByText('0 g')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call deleteLoadout when delete is confirmed', async () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      const deleteButton = screen.getByTestId('delete-button');
      fireEvent.click(deleteButton);

      expect(mockDeleteLoadout).toHaveBeenCalledWith('loadout-abc123xyz');
    });

    it('should pass loadout name to delete dialog', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      const deleteButton = screen.getByTestId('delete-button');
      expect(deleteButton).toHaveAttribute('data-loadout-name', 'Summer PCT Section Hike');
    });
  });

  // ===========================================================================
  // State Tests - ID Validation
  // ===========================================================================

  describe('ID Validation', () => {
    it('should not render for invalid loadout ID (hex color)', () => {
      const invalidLoadout = createMockLoadout({ id: '#3b82f6' });
      render(<LoadoutCard loadout={invalidLoadout} items={mockItems} />);

      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('should not render for empty loadout ID', () => {
      const invalidLoadout = createMockLoadout({ id: '' });
      render(<LoadoutCard loadout={invalidLoadout} items={mockItems} />);

      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('should not render for short loadout ID', () => {
      const invalidLoadout = createMockLoadout({ id: 'abc123' });
      render(<LoadoutCard loadout={invalidLoadout} items={mockItems} />);

      expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('should render for valid alphanumeric ID', () => {
      const validLoadout = createMockLoadout({ id: 'abcdefghij123' });
      render(<LoadoutCard loadout={validLoadout} items={mockItems} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should render for valid ID with underscores and hyphens', () => {
      const validLoadout = createMockLoadout({ id: 'abc-def_123456' });
      render(<LoadoutCard loadout={validLoadout} items={mockItems} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have a card title with loadout name', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      const title = screen.getByTestId('card-title');
      expect(title).toHaveTextContent('Summer PCT Section Hike');
    });

    it('should have hover styles on card for visual feedback', () => {
      render(<LoadoutCard loadout={mockLoadout} items={mockItems} />);

      const card = screen.getByTestId('card');
      expect(card).toHaveClass('hover:border-primary/50');
      expect(card).toHaveClass('hover:bg-muted/50');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty loadout (no items)', () => {
      const emptyLoadout = createMockLoadout({ itemIds: [] });
      render(<LoadoutCard loadout={emptyLoadout} items={mockItems} />);

      expect(screen.getByText('0 items')).toBeInTheDocument();
      expect(screen.getByText('0 g')).toBeInTheDocument();
    });

    it('should handle very long loadout name with truncation class', () => {
      const longNameLoadout = createMockLoadout({
        name: 'This is a very long loadout name that should be truncated in the display',
      });
      render(<LoadoutCard loadout={longNameLoadout} items={mockItems} />);

      const title = screen.getByTestId('card-title');
      expect(title).toHaveClass('line-clamp-1');
    });

    it('should handle items not found in inventory', () => {
      const loadoutWithMissingItems = createMockLoadout({
        itemIds: ['gear-001', 'gear-missing'],
      });
      render(<LoadoutCard loadout={loadoutWithMissingItems} items={mockItems} />);

      // Should only count 1 item (the one that exists)
      expect(screen.getByText('1 items')).toBeInTheDocument();
    });
  });
});
