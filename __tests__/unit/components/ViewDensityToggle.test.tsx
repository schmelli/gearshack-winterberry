/**
 * ViewDensityToggle Component Tests
 *
 * Tests for the ViewDensityToggle component used in the inventory gallery.
 * Tests rendering of view density options, interactions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewDensityToggle } from '@/components/inventory-gallery/ViewDensityToggle';
import type { ViewDensity } from '@/types/inventory';

// =============================================================================
// Mocks
// =============================================================================

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// Mock inventory types
vi.mock('@/types/inventory', () => ({
  VIEW_DENSITY_OPTIONS: ['compact', 'standard', 'detailed'] as const,
  VIEW_DENSITY_LABELS: {
    compact: 'Compact',
    standard: 'Standard',
    detailed: 'Detailed',
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('ViewDensityToggle', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render all three view density options', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      expect(screen.getByText('Compact')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Detailed')).toBeInTheDocument();
    });

    it('should render as a radiogroup', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should render three radio buttons', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(3);
    });

    it('should apply custom className', () => {
      render(
        <ViewDensityToggle
          value="standard"
          onChange={mockOnChange}
          className="custom-class"
        />
      );

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveClass('custom-class');
    });
  });

  // ===========================================================================
  // Props Tests
  // ===========================================================================

  describe('Props', () => {
    it('should mark compact as checked when value is compact', () => {
      render(<ViewDensityToggle value="compact" onChange={mockOnChange} />);

      const compactButton = screen.getByText('Compact');
      expect(compactButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should mark standard as checked when value is standard', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const standardButton = screen.getByText('Standard');
      expect(standardButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should mark detailed as checked when value is detailed', () => {
      render(<ViewDensityToggle value="detailed" onChange={mockOnChange} />);

      const detailedButton = screen.getByText('Detailed');
      expect(detailedButton).toHaveAttribute('aria-checked', 'true');
    });

    it('should mark non-selected options as unchecked', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const compactButton = screen.getByText('Compact');
      const detailedButton = screen.getByText('Detailed');

      expect(compactButton).toHaveAttribute('aria-checked', 'false');
      expect(detailedButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onChange with "compact" when Compact is clicked', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const compactButton = screen.getByText('Compact');
      fireEvent.click(compactButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('compact');
    });

    it('should call onChange with "standard" when Standard is clicked', () => {
      render(<ViewDensityToggle value="compact" onChange={mockOnChange} />);

      const standardButton = screen.getByText('Standard');
      fireEvent.click(standardButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('standard');
    });

    it('should call onChange with "detailed" when Detailed is clicked', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const detailedButton = screen.getByText('Detailed');
      fireEvent.click(detailedButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('detailed');
    });

    it('should call onChange even when clicking already selected option', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const standardButton = screen.getByText('Standard');
      fireEvent.click(standardButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith('standard');
    });
  });

  // ===========================================================================
  // Styling State Tests
  // ===========================================================================

  describe('Styling States', () => {
    it('should apply selected styles to active option', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const standardButton = screen.getByText('Standard');
      expect(standardButton).toHaveClass('bg-background');
      expect(standardButton).toHaveClass('text-foreground');
      expect(standardButton).toHaveClass('shadow-sm');
    });

    it('should apply unselected styles to inactive options', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const compactButton = screen.getByText('Compact');
      expect(compactButton).toHaveClass('text-muted-foreground');
      expect(compactButton).toHaveClass('hover:text-foreground');
      expect(compactButton).not.toHaveClass('bg-background');
    });

    it('should have button type for all options', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const buttons = screen.getAllByRole('radio');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have aria-label on the radiogroup', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAttribute('aria-label', 'View density');
    });

    it('should use proper radio role for options', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('should have proper aria-checked state', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const radios = screen.getAllByRole('radio');
      const checkedRadios = radios.filter(
        (radio) => radio.getAttribute('aria-checked') === 'true'
      );
      expect(checkedRadios).toHaveLength(1);
    });

    it('should have focus-visible styles', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const compactButton = screen.getByText('Compact');
      expect(compactButton).toHaveClass('focus-visible:outline-none');
      expect(compactButton).toHaveClass('focus-visible:ring-2');
      expect(compactButton).toHaveClass('focus-visible:ring-ring');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid consecutive clicks', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const compactButton = screen.getByText('Compact');
      const detailedButton = screen.getByText('Detailed');

      fireEvent.click(compactButton);
      fireEvent.click(detailedButton);
      fireEvent.click(compactButton);

      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenNthCalledWith(1, 'compact');
      expect(mockOnChange).toHaveBeenNthCalledWith(2, 'detailed');
      expect(mockOnChange).toHaveBeenNthCalledWith(3, 'compact');
    });

    it('should maintain correct order of options', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const radios = screen.getAllByRole('radio');
      expect(radios[0]).toHaveTextContent('Compact');
      expect(radios[1]).toHaveTextContent('Standard');
      expect(radios[2]).toHaveTextContent('Detailed');
    });

    it('should not have any hidden options', () => {
      render(<ViewDensityToggle value="standard" onChange={mockOnChange} />);

      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toBeVisible();
      });
    });
  });
});
