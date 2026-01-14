/**
 * WeightDisplay Component Tests
 *
 * Tests for the WeightDisplay component used for displaying weights with unit conversion.
 * Tests rendering, unit toggling, tooltips, and user preference integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeightDisplay } from '@/components/ui/weight-display';
import type { WeightUnit } from '@/types/gear';

// =============================================================================
// Mocks
// =============================================================================

// Mock useWeightConversion hook
const mockFormatForDisplay = vi.fn((grams: number, unit: WeightUnit) => {
  // Simple mock implementation
  if (unit === 'g') return `${grams.toFixed(1)} g`;
  if (unit === 'oz') return `${(grams * 0.035274).toFixed(1)} oz`;
  if (unit === 'lb') return `${(grams * 0.00220462).toFixed(1)} lb`;
  return `${grams} g`;
});

let mockPreferredUnit: WeightUnit = 'g';

vi.mock('@/hooks/useWeightConversion', () => ({
  useWeightConversion: () => ({
    preferredUnit: mockPreferredUnit,
    formatForDisplay: mockFormatForDisplay,
  }),
}));

// Mock shadcn/ui components
interface ButtonMockProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: string;
  size?: string;
  className?: string;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
}

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    'aria-label': ariaLabel,
    type = 'button',
  }: ButtonMockProps) => (
    <button
      data-testid="toggle-button"
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      aria-label={ariaLabel}
      type={type}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild) return children;
    return <div data-testid="tooltip-trigger">{children}</div>;
  },
  TooltipContent: ({
    children,
    side,
    sideOffset,
  }: {
    children: React.ReactNode;
    side?: string;
    sideOffset?: number;
  }) => (
    <div data-testid="tooltip-content" data-side={side} data-side-offset={sideOffset}>
      {children}
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeftRight: ({ className }: { className?: string }) => (
    <span data-testid="arrow-icon" className={className}>
      ↔
    </span>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// =============================================================================
// Tests
// =============================================================================

describe('WeightDisplay', () => {
  beforeEach(() => {
    mockPreferredUnit = 'g';
    mockFormatForDisplay.mockClear();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the weight display container', () => {
      render(<WeightDisplay value={1000} />);

      const container = screen.getByTestId('tooltip').parentElement;
      expect(container).toHaveAttribute('data-slot', 'weight-display');
    });

    it('should display formatted weight value', () => {
      render(<WeightDisplay value={1000} />);

      expect(screen.getByText('1000.0 g')).toBeInTheDocument();
    });

    it('should call formatForDisplay with correct arguments', () => {
      render(<WeightDisplay value={1000} />);

      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'g');
    });

    it('should render tooltip component', () => {
      render(<WeightDisplay value={1000} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    });

    it('should not show toggle button by default', () => {
      render(<WeightDisplay value={1000} />);

      expect(screen.queryByTestId('toggle-button')).not.toBeInTheDocument();
    });

    it('should show toggle button when showToggle is true', () => {
      render(<WeightDisplay value={1000} showToggle />);

      expect(screen.getByTestId('toggle-button')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Unit Display Tests
  // ===========================================================================

  describe('Unit Display', () => {
    it('should display weight in grams when preferred unit is grams', () => {
      mockPreferredUnit = 'g';
      render(<WeightDisplay value={1000} />);

      expect(screen.getByText('1000.0 g')).toBeInTheDocument();
    });

    it('should display weight in ounces when preferred unit is ounces', () => {
      mockPreferredUnit = 'oz';
      render(<WeightDisplay value={1000} />);

      expect(screen.getByText('35.3 oz')).toBeInTheDocument();
    });

    it('should display weight in pounds when preferred unit is pounds', () => {
      mockPreferredUnit = 'lb';
      render(<WeightDisplay value={1000} />);

      expect(screen.getByText('2.2 lb')).toBeInTheDocument();
    });

    it('should have tabular-nums class for consistent number width', () => {
      render(<WeightDisplay value={1000} />);

      const valueElement = screen.getByText('1000.0 g');
      expect(valueElement).toHaveClass('tabular-nums');
    });

    it('should have font-medium class for weight', () => {
      render(<WeightDisplay value={1000} />);

      const valueElement = screen.getByText('1000.0 g');
      expect(valueElement).toHaveClass('font-medium');
    });

    it('should have cursor-help class for tooltip interaction', () => {
      render(<WeightDisplay value={1000} />);

      const valueElement = screen.getByText('1000.0 g');
      expect(valueElement).toHaveClass('cursor-help');
    });
  });

  // ===========================================================================
  // Toggle Functionality Tests
  // ===========================================================================

  describe('Toggle Functionality', () => {
    it('should cycle from grams to ounces when toggle is clicked', async () => {
      mockPreferredUnit = 'g';
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');
      await userEvent.click(toggleButton);

      // After clicking, should show oz
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'oz');
    });

    it('should cycle from ounces to pounds when toggle is clicked', async () => {
      mockPreferredUnit = 'oz';
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');
      await userEvent.click(toggleButton);

      // After clicking, should show lb
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'lb');
    });

    it('should cycle from pounds back to grams when toggle is clicked', async () => {
      mockPreferredUnit = 'lb';
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');
      await userEvent.click(toggleButton);

      // After clicking, should show g
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'g');
    });

    it('should have aria-label for toggle button', () => {
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');
      expect(toggleButton).toHaveAttribute('aria-label', 'Toggle weight unit display');
    });

    it('should render toggle button with correct variant', () => {
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');
      expect(toggleButton).toHaveAttribute('data-variant', 'ghost');
    });

    it('should render toggle button with correct size', () => {
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');
      expect(toggleButton).toHaveAttribute('data-size', 'icon-sm');
    });

    it('should have type="button" to prevent form submission', () => {
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');
      expect(toggleButton).toHaveAttribute('type', 'button');
    });

    it('should render ArrowLeftRight icon in toggle button', () => {
      render(<WeightDisplay value={1000} showToggle />);

      expect(screen.getByTestId('arrow-icon')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Tooltip Tests
  // ===========================================================================

  describe('Tooltip', () => {
    it('should display alternative units in tooltip', () => {
      mockPreferredUnit = 'g';
      render(<WeightDisplay value={1000} />);

      // Tooltip should show "Also: 35.3 oz / 2.2 lb"
      expect(screen.getByText('Also:')).toBeInTheDocument();
    });

    it('should format tooltip content with alternative units', () => {
      mockPreferredUnit = 'g';
      render(<WeightDisplay value={1000} />);

      // Should call formatForDisplay for oz and lb (alternatives to g)
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'oz');
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'lb');
    });

    it('should position tooltip on top', () => {
      render(<WeightDisplay value={1000} />);

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-side', 'top');
    });

    it('should have correct tooltip offset', () => {
      render(<WeightDisplay value={1000} />);

      const tooltipContent = screen.getByTestId('tooltip-content');
      expect(tooltipContent).toHaveAttribute('data-side-offset', '4');
    });
  });

  // ===========================================================================
  // User Preference Integration Tests
  // ===========================================================================

  describe('User Preference Integration', () => {
    it('should reset to preferred unit when preference changes', () => {
      mockPreferredUnit = 'g';
      const { rerender } = render(<WeightDisplay value={1000} />);

      expect(screen.getByText('1000.0 g')).toBeInTheDocument();

      // Change preferred unit
      mockPreferredUnit = 'oz';
      rerender(<WeightDisplay value={1000} />);

      expect(screen.getByText('35.3 oz')).toBeInTheDocument();
    });

    it('should respect user preference on initial render', () => {
      mockPreferredUnit = 'oz';
      render(<WeightDisplay value={500} />);

      expect(mockFormatForDisplay).toHaveBeenCalledWith(500, 'oz');
    });
  });

  // ===========================================================================
  // Styling Tests
  // ===========================================================================

  describe('Styling', () => {
    it('should accept custom className', () => {
      render(<WeightDisplay value={1000} className="custom-class" />);

      const container = screen.getByTestId('tooltip').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should apply default inline-flex layout classes', () => {
      render(<WeightDisplay value={1000} />);

      const container = screen.getByTestId('tooltip').parentElement;
      expect(container).toHaveClass('inline-flex', 'items-center', 'gap-2');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle zero weight', () => {
      render(<WeightDisplay value={0} />);

      expect(mockFormatForDisplay).toHaveBeenCalledWith(0, 'g');
    });

    it('should handle very small weights', () => {
      render(<WeightDisplay value={0.1} />);

      expect(mockFormatForDisplay).toHaveBeenCalledWith(0.1, 'g');
    });

    it('should handle very large weights', () => {
      render(<WeightDisplay value={50000} />);

      expect(mockFormatForDisplay).toHaveBeenCalledWith(50000, 'g');
    });

    it('should handle fractional gram values', () => {
      render(<WeightDisplay value={123.456} />);

      expect(mockFormatForDisplay).toHaveBeenCalledWith(123.456, 'g');
    });

    it('should recalculate tooltip when value changes', () => {
      const { rerender } = render(<WeightDisplay value={1000} />);

      mockFormatForDisplay.mockClear();

      rerender(<WeightDisplay value={2000} />);

      expect(mockFormatForDisplay).toHaveBeenCalledWith(2000, 'g');
    });

    it('should recalculate tooltip when display unit changes', async () => {
      render(<WeightDisplay value={1000} showToggle />);

      mockFormatForDisplay.mockClear();

      const toggleButton = screen.getByTestId('toggle-button');
      await userEvent.click(toggleButton);

      // Should recalculate with new display unit (oz)
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'oz');
    });
  });

  // ===========================================================================
  // Multiple Toggles Tests
  // ===========================================================================

  describe('Multiple Toggles', () => {
    it('should cycle through all units in sequence', async () => {
      mockPreferredUnit = 'g';
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');

      // Start with g, click to get oz
      await userEvent.click(toggleButton);
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'oz');

      // Click again to get lb
      await userEvent.click(toggleButton);
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'lb');

      // Click again to cycle back to g
      await userEvent.click(toggleButton);
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'g');
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration', () => {
    it('should work without toggle button', () => {
      render(<WeightDisplay value={1000} showToggle={false} />);

      expect(screen.getByText('1000.0 g')).toBeInTheDocument();
      expect(screen.queryByTestId('toggle-button')).not.toBeInTheDocument();
    });

    it('should update tooltip when toggling units', async () => {
      mockPreferredUnit = 'g';
      render(<WeightDisplay value={1000} showToggle />);

      const toggleButton = screen.getByTestId('toggle-button');

      // Initial state: showing g, tooltip has oz/lb
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'oz');
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'lb');

      mockFormatForDisplay.mockClear();

      // Toggle to oz
      await userEvent.click(toggleButton);

      // Now showing oz, tooltip should have g/lb
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'g');
      expect(mockFormatForDisplay).toHaveBeenCalledWith(1000, 'lb');
    });
  });
});
