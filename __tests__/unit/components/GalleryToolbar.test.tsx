/**
 * GalleryToolbar Component Tests
 *
 * Tests for the GalleryToolbar component used in the inventory gallery.
 * Tests search, category filter, sorting, view density toggle, and item counts.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GalleryToolbar } from '@/components/inventory-gallery/GalleryToolbar';
import type { ViewDensity, SortOption } from '@/types/inventory';
import type { CategoryOption } from '@/types/category';

// =============================================================================
// Mocks
// =============================================================================

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="search-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
  ArrowUpDown: ({ className }: { className?: string }) => (
    <svg data-testid="arrow-updown-icon" className={className} />
  ),
}));

// Mock inventory types
vi.mock('@/types/inventory', () => ({
  SORT_OPTIONS: ['name', 'category', 'dateAdded'] as const,
  VIEW_DENSITY_OPTIONS: ['compact', 'standard', 'detailed'] as const,
  VIEW_DENSITY_LABELS: {
    compact: 'Compact',
    standard: 'Standard',
    detailed: 'Detailed',
  },
}));

// Mock UI components
vi.mock('@/components/ui/input', () => ({
  Input: ({
    type,
    placeholder,
    value,
    onChange,
    className,
    'aria-label': ariaLabel,
  }: {
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    'aria-label'?: string;
  }) => (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      aria-label={ariaLabel}
      data-testid="search-input"
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.('test')}>
      {children}
    </div>
  ),
  SelectTrigger: ({
    children,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button data-testid="select-trigger" className={className} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      data-testid="clear-filters-button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/inventory-gallery/ViewDensityToggle', () => ({
  ViewDensityToggle: ({
    value,
    onChange,
    className,
  }: {
    value: ViewDensity;
    onChange: (density: ViewDensity) => void;
    className?: string;
  }) => (
    <div
      data-testid="view-density-toggle"
      data-value={value}
      className={className}
      onClick={() => onChange('detailed')}
    >
      ViewDensityToggle
    </div>
  ),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockCategoryOptions = (): CategoryOption[] => [
  { value: 'shelter', label: 'Shelter' },
  { value: 'sleep', label: 'Sleep System' },
  { value: 'pack', label: 'Packs' },
  { value: 'cooking', label: 'Cooking' },
];

const createDefaultProps = () => ({
  searchQuery: '',
  onSearchChange: vi.fn(),
  categoryFilter: null,
  onCategoryChange: vi.fn(),
  categoryOptions: createMockCategoryOptions(),
  sortOption: 'dateAdded' as SortOption,
  onSortChange: vi.fn(),
  viewDensity: 'standard' as ViewDensity,
  onViewDensityChange: vi.fn(),
  hasActiveFilters: false,
  onClearFilters: vi.fn(),
  itemCount: 25,
  filteredCount: 25,
});

// =============================================================================
// Tests
// =============================================================================

describe('GalleryToolbar', () => {
  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the search input', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('should render the search icon', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render category filter select', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      const selectTriggers = screen.getAllByTestId('select-trigger');
      expect(selectTriggers.length).toBeGreaterThanOrEqual(1);
    });

    it('should render sort dropdown', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      expect(screen.getByTestId('arrow-updown-icon')).toBeInTheDocument();
    });

    it('should render view density toggle', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      const toggles = screen.getAllByTestId('view-density-toggle');
      expect(toggles.length).toBeGreaterThanOrEqual(1);
    });

    it('should render item count display', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      // Uses default translation: '{count} items'
      expect(screen.getByText('{count} items')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests
  // ===========================================================================

  describe('Props', () => {
    it('should display search query value', () => {
      const props = { ...createDefaultProps(), searchQuery: 'hiking tent' };
      render(<GalleryToolbar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveValue('hiking tent');
    });

    it('should use custom translations when provided', () => {
      const props = {
        ...createDefaultProps(),
        translations: {
          searchPlaceholder: 'Suche...',
          filterAll: 'Alle Kategorien',
        },
      };
      render(<GalleryToolbar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('placeholder', 'Suche...');
    });

    it('should render all category options', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      expect(screen.getByTestId('select-item-shelter')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-sleep')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-pack')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-cooking')).toBeInTheDocument();
    });

    it('should render all sort options', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      expect(screen.getByTestId('select-item-name')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-category')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-dateAdded')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onSearchChange when typing in search', () => {
      const props = createDefaultProps();
      render(<GalleryToolbar {...props} />);

      const searchInput = screen.getByTestId('search-input');
      fireEvent.change(searchInput, { target: { value: 'backpack' } });

      expect(props.onSearchChange).toHaveBeenCalledWith('backpack');
    });

    it('should not show clear filters button when no active filters', () => {
      const props = { ...createDefaultProps(), hasActiveFilters: false };
      render(<GalleryToolbar {...props} />);

      expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    });

    it('should show clear filters button when filters are active', () => {
      const props = { ...createDefaultProps(), hasActiveFilters: true };
      render(<GalleryToolbar {...props} />);

      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('should call onClearFilters when clear button is clicked', () => {
      const props = { ...createDefaultProps(), hasActiveFilters: true };
      render(<GalleryToolbar {...props} />);

      const clearButton = screen.getByText('Clear filters');
      fireEvent.click(clearButton);

      expect(props.onClearFilters).toHaveBeenCalledTimes(1);
    });

    it('should call onViewDensityChange when view density toggle is clicked', () => {
      const props = createDefaultProps();
      render(<GalleryToolbar {...props} />);

      const toggles = screen.getAllByTestId('view-density-toggle');
      fireEvent.click(toggles[0]);

      expect(props.onViewDensityChange).toHaveBeenCalledWith('detailed');
    });
  });

  // ===========================================================================
  // State Tests - Filtered Count Display
  // ===========================================================================

  describe('States', () => {
    it('should show total count when no filters active', () => {
      const props = {
        ...createDefaultProps(),
        hasActiveFilters: false,
        itemCount: 50,
        filteredCount: 50,
      };
      render(<GalleryToolbar {...props} />);

      expect(screen.getByText('{count} items')).toBeInTheDocument();
    });

    it('should show filtered count when filters active and counts differ', () => {
      const props = {
        ...createDefaultProps(),
        hasActiveFilters: true,
        itemCount: 50,
        filteredCount: 15,
      };
      render(<GalleryToolbar {...props} />);

      expect(screen.getByText('Showing {filtered} of {total} items')).toBeInTheDocument();
    });

    it('should show regular count when filters active but all items shown', () => {
      const props = {
        ...createDefaultProps(),
        hasActiveFilters: true,
        itemCount: 25,
        filteredCount: 25,
      };
      render(<GalleryToolbar {...props} />);

      expect(screen.getByText('{count} items')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have aria-label on search input', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toHaveAttribute('aria-label');
    });

    it('should have aria-label on category filter', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      const selectTriggers = screen.getAllByTestId('select-trigger');
      // First trigger should be for category filter
      expect(selectTriggers[0]).toHaveAttribute('aria-label');
    });

    it('should have aria-label on sort dropdown', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      const selectTriggers = screen.getAllByTestId('select-trigger');
      // Second trigger should be for sort
      expect(selectTriggers[1]).toHaveAttribute('aria-label');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty category options', () => {
      const props = { ...createDefaultProps(), categoryOptions: [] };
      render(<GalleryToolbar {...props} />);

      // Should still render without category options
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('should handle zero items', () => {
      const props = {
        ...createDefaultProps(),
        itemCount: 0,
        filteredCount: 0,
      };
      render(<GalleryToolbar {...props} />);

      expect(screen.getByText('{count} items')).toBeInTheDocument();
    });

    it('should handle very large item counts', () => {
      const props = {
        ...createDefaultProps(),
        itemCount: 10000,
        filteredCount: 5000,
        hasActiveFilters: true,
      };
      render(<GalleryToolbar {...props} />);

      expect(screen.getByText('Showing {filtered} of {total} items')).toBeInTheDocument();
    });

    it('should render mobile view density toggle', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      // Should have two toggles - one for desktop, one for mobile
      const toggles = screen.getAllByTestId('view-density-toggle');
      expect(toggles).toHaveLength(2);
    });

    it('should apply width constraint class to mobile toggle', () => {
      render(<GalleryToolbar {...createDefaultProps()} />);

      const toggles = screen.getAllByTestId('view-density-toggle');
      // Mobile toggle should have full width and center justify
      const mobileToggle = toggles[1];
      expect(mobileToggle).toHaveClass('w-full');
      expect(mobileToggle).toHaveClass('justify-center');
    });
  });
});
