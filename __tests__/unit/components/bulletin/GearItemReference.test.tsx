/**
 * GearItemReference Component Tests
 *
 * Tests for the gear item reference component that displays
 * gear items with add-to-inventory functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GearItemReference } from '@/components/bulletin/GearItemReference';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Package: ({ className }: { className?: string }) => (
    <svg data-testid="package-icon" className={className} />
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg data-testid="plus-icon" className={className} />
  ),
}));

// Mock shadcn components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    size,
    variant
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    size?: string;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-size={size}
      data-variant={variant}
      data-testid="add-button"
    >
      {children}
    </button>
  ),
}));

// Mock console.log to verify logging
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('GearItemReference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with provided name', () => {
      render(<GearItemReference itemId="item-123" name="Zpacks Duplex" />);

      expect(screen.getByText('Zpacks Duplex')).toBeInTheDocument();
    });

    it('should render with truncated item ID when no name provided', () => {
      render(<GearItemReference itemId="12345678-abcd-efgh-ijkl" />);

      expect(screen.getByText('Gear Item #12345678')).toBeInTheDocument();
    });

    it('should display "Referenced gear item" subtitle', () => {
      render(<GearItemReference itemId="item-123" name="Test Item" />);

      expect(screen.getByText('Referenced gear item')).toBeInTheDocument();
    });

    it('should render package icon', () => {
      render(<GearItemReference itemId="item-123" />);

      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should render Add button with plus icon', () => {
      render(<GearItemReference itemId="item-123" />);

      expect(screen.getByTestId('add-button')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should render within a Card component', () => {
      render(<GearItemReference itemId="item-123" />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });
  });

  describe('Button styling', () => {
    it('should use small size button', () => {
      render(<GearItemReference itemId="item-123" />);

      expect(screen.getByTestId('add-button')).toHaveAttribute('data-size', 'sm');
    });

    it('should use outline variant button', () => {
      render(<GearItemReference itemId="item-123" />);

      expect(screen.getByTestId('add-button')).toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Add to inventory interaction', () => {
    it('should call handleAddToInventory when button clicked', async () => {
      render(<GearItemReference itemId="item-123" name="Test Tent" />);

      const button = screen.getByTestId('add-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Add to inventory:', 'item-123');
      });
    });

    it('should log correct item ID on click', async () => {
      render(<GearItemReference itemId="unique-item-456" />);

      fireEvent.click(screen.getByTestId('add-button'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Add to inventory:', 'unique-item-456');
      });
    });

    it('should not be disabled initially', () => {
      render(<GearItemReference itemId="item-123" />);

      expect(screen.getByTestId('add-button')).not.toBeDisabled();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long item names', () => {
      const longName = 'Hyperlite Mountain Gear 3400 Southwest Ultralight Backpack';
      render(<GearItemReference itemId="item-123" name={longName} />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle short item IDs', () => {
      render(<GearItemReference itemId="abc" />);

      // Should show first 8 chars (or full ID if shorter)
      expect(screen.getByText('Gear Item #abc')).toBeInTheDocument();
    });

    it('should handle exactly 8 character item IDs', () => {
      render(<GearItemReference itemId="12345678" />);

      expect(screen.getByText('Gear Item #12345678')).toBeInTheDocument();
    });

    it('should handle empty name by falling back to item ID', () => {
      render(<GearItemReference itemId="item-abc123" name="" />);

      // Empty string is falsy, should show item ID format
      expect(screen.getByText('Gear Item #item-abc')).toBeInTheDocument();
    });

    it('should handle UUID format item IDs', () => {
      render(<GearItemReference itemId="550e8400-e29b-41d4-a716-446655440000" />);

      expect(screen.getByText('Gear Item #550e8400')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have clickable button', () => {
      render(<GearItemReference itemId="item-123" />);

      const button = screen.getByTestId('add-button');
      expect(button.tagName.toLowerCase()).toBe('button');
    });

    it('should have descriptive button text', () => {
      render(<GearItemReference itemId="item-123" />);

      expect(screen.getByRole('button')).toHaveTextContent('Add');
    });
  });
});
