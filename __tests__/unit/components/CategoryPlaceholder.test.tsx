/**
 * CategoryPlaceholder Component Tests
 *
 * Tests for the CategoryPlaceholder component used in the inventory gallery.
 * Tests rendering of category-specific icons, size variants, and accessibility.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryPlaceholder } from '@/components/inventory-gallery/CategoryPlaceholder';

// =============================================================================
// Mocks
// =============================================================================

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Tent: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="tent-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Moon: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="moon-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Backpack: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="backpack-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Shirt: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="shirt-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Flame: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="flame-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Droplet: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="droplet-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Zap: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="zap-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Compass: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="compass-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Heart: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="heart-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Bath: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="bath-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Package: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="package-icon" className={className} aria-hidden={ariaHidden} />
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

describe('CategoryPlaceholder', () => {
  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render a container div', () => {
      render(<CategoryPlaceholder categoryId="shelter" />);

      const container = screen.getByTestId('tent-icon').parentElement;
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('items-center');
      expect(container).toHaveClass('justify-center');
    });

    it('should render with rounded background styling', () => {
      render(<CategoryPlaceholder categoryId="shelter" />);

      const container = screen.getByTestId('tent-icon').parentElement;
      expect(container).toHaveClass('rounded-md');
      expect(container).toHaveClass('bg-muted');
    });

    it('should render the icon with text styling', () => {
      render(<CategoryPlaceholder categoryId="shelter" />);

      const icon = screen.getByTestId('tent-icon');
      expect(icon).toHaveClass('text-primary/50');
    });
  });

  // ===========================================================================
  // Props Tests - Category Icon Mapping
  // ===========================================================================

  describe('Category Icons', () => {
    it('should render Tent icon for shelter category', () => {
      render(<CategoryPlaceholder categoryId="shelter" />);
      expect(screen.getByTestId('tent-icon')).toBeInTheDocument();
    });

    it('should render Moon icon for sleep-system category', () => {
      render(<CategoryPlaceholder categoryId="sleep-system" />);
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    });

    it('should render Backpack icon for packs category', () => {
      render(<CategoryPlaceholder categoryId="packs" />);
      expect(screen.getByTestId('backpack-icon')).toBeInTheDocument();
    });

    it('should render Shirt icon for clothing category', () => {
      render(<CategoryPlaceholder categoryId="clothing" />);
      expect(screen.getByTestId('shirt-icon')).toBeInTheDocument();
    });

    it('should render Flame icon for cooking category', () => {
      render(<CategoryPlaceholder categoryId="cooking" />);
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    });

    it('should render Droplet icon for water category', () => {
      render(<CategoryPlaceholder categoryId="water" />);
      expect(screen.getByTestId('droplet-icon')).toBeInTheDocument();
    });

    it('should render Zap icon for electronics category', () => {
      render(<CategoryPlaceholder categoryId="electronics" />);
      expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
    });

    it('should render Compass icon for navigation category', () => {
      render(<CategoryPlaceholder categoryId="navigation" />);
      expect(screen.getByTestId('compass-icon')).toBeInTheDocument();
    });

    it('should render Heart icon for first-aid category', () => {
      render(<CategoryPlaceholder categoryId="first-aid" />);
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    });

    it('should render Bath icon for toiletries category', () => {
      render(<CategoryPlaceholder categoryId="toiletries" />);
      expect(screen.getByTestId('bath-icon')).toBeInTheDocument();
    });

    it('should render Package icon for miscellaneous category', () => {
      render(<CategoryPlaceholder categoryId="miscellaneous" />);
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should render default Package icon for unknown category', () => {
      render(<CategoryPlaceholder categoryId="unknown-category" />);
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should render default Package icon for null category', () => {
      render(<CategoryPlaceholder categoryId={null} />);
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests - Size Variants
  // ===========================================================================

  describe('Size Variants', () => {
    it('should render medium size by default', () => {
      render(<CategoryPlaceholder categoryId="shelter" />);

      const container = screen.getByTestId('tent-icon').parentElement;
      expect(container).toHaveClass('h-12');
      expect(container).toHaveClass('w-12');
    });

    it('should render small size when specified', () => {
      render(<CategoryPlaceholder categoryId="shelter" size="sm" />);

      const container = screen.getByTestId('tent-icon').parentElement;
      expect(container).toHaveClass('h-8');
      expect(container).toHaveClass('w-8');
    });

    it('should render large size when specified', () => {
      render(<CategoryPlaceholder categoryId="shelter" size="lg" />);

      const container = screen.getByTestId('tent-icon').parentElement;
      expect(container).toHaveClass('h-16');
      expect(container).toHaveClass('w-16');
    });

    it('should apply medium icon size for default container', () => {
      render(<CategoryPlaceholder categoryId="shelter" />);

      const icon = screen.getByTestId('tent-icon');
      expect(icon).toHaveClass('h-6');
      expect(icon).toHaveClass('w-6');
    });

    it('should apply small icon size for small container', () => {
      render(<CategoryPlaceholder categoryId="shelter" size="sm" />);

      const icon = screen.getByTestId('tent-icon');
      expect(icon).toHaveClass('h-4');
      expect(icon).toHaveClass('w-4');
    });

    it('should apply large icon size for large container', () => {
      render(<CategoryPlaceholder categoryId="shelter" size="lg" />);

      const icon = screen.getByTestId('tent-icon');
      expect(icon).toHaveClass('h-8');
      expect(icon).toHaveClass('w-8');
    });
  });

  // ===========================================================================
  // Props Tests - Custom className
  // ===========================================================================

  describe('Custom className', () => {
    it('should apply custom className to container', () => {
      render(<CategoryPlaceholder categoryId="shelter" className="custom-class" />);

      const container = screen.getByTestId('tent-icon').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      render(<CategoryPlaceholder categoryId="shelter" className="mt-4" />);

      const container = screen.getByTestId('tent-icon').parentElement;
      expect(container).toHaveClass('flex');
      expect(container).toHaveClass('mt-4');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have aria-hidden on icon', () => {
      render(<CategoryPlaceholder categoryId="shelter" />);

      const icon = screen.getByTestId('tent-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should be decorative (aria-hidden on all category icons)', () => {
      render(<CategoryPlaceholder categoryId="cooking" />);

      const icon = screen.getByTestId('flame-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty string categoryId', () => {
      render(<CategoryPlaceholder categoryId="" />);
      // Empty string should fall back to default
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should handle whitespace categoryId', () => {
      render(<CategoryPlaceholder categoryId="  " />);
      // Whitespace should fall back to default
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });

    it('should handle case-sensitive categoryId', () => {
      // The mapping uses lowercase keys
      render(<CategoryPlaceholder categoryId="Shelter" />);
      // 'Shelter' !== 'shelter', should fall back to default
      expect(screen.getByTestId('package-icon')).toBeInTheDocument();
    });
  });
});
