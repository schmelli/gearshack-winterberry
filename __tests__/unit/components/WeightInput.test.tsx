/**
 * WeightInput Component Tests
 *
 * Tests for the WeightInput component used for weight entry with unit selection.
 * Tests rendering, value input, unit selection, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeightInput } from '@/components/ui/weight-input';
import type { WeightUnit } from '@/types/gear';

// =============================================================================
// Mocks
// =============================================================================

// Mock shadcn/ui components
interface InputMockProps {
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
  min?: number | string;
  step?: number | string;
  name?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  [key: string]: unknown;
}

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    onBlur,
    placeholder,
    disabled,
    className,
    type,
    min,
    step,
    name,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
    ...props
  }: InputMockProps) => (
    <input
      data-testid="weight-value-input"
      type={type}
      min={min}
      step={step}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <div data-testid="weight-unit-select" data-value={value} data-disabled={disabled}>
      {children}
      <select
        data-testid="weight-unit-select-native"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value as WeightUnit)}
        disabled={disabled}
      >
        <option value="g">Grams (g)</option>
        <option value="oz">Ounces (oz)</option>
        <option value="lb">Pounds (lb)</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children, className, 'aria-label': ariaLabel }: { children: React.ReactNode; className?: string; 'aria-label'?: string }) => (
    <div data-testid="select-trigger" className={className} aria-label={ariaLabel}>
      {children}
    </div>
  ),
  SelectValue: () => <span data-testid="select-value">Selected Value</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`} data-value={value}>
      {children}
    </div>
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

describe('WeightInput', () => {
  let mockOnValueChange: ReturnType<typeof vi.fn>;
  let mockOnUnitChange: ReturnType<typeof vi.fn>;
  let mockOnBlur: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnValueChange = vi.fn();
    mockOnUnitChange = vi.fn();
    mockOnBlur = vi.fn();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the weight input container', () => {
      render(<WeightInput unit="g" />);

      const container = screen.getByTestId('weight-value-input').parentElement;
      expect(container).toHaveAttribute('data-slot', 'weight-input');
    });

    it('should render both input and unit selector', () => {
      render(<WeightInput unit="g" />);

      expect(screen.getByTestId('weight-value-input')).toBeInTheDocument();
      expect(screen.getByTestId('weight-unit-select')).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('placeholder', '0');
    });

    it('should render with custom placeholder', () => {
      render(<WeightInput unit="g" placeholder="Enter weight" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('placeholder', 'Enter weight');
    });

    it('should render with numeric value', () => {
      render(<WeightInput value={500} unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(500);
    });

    it('should render with string value', () => {
      render(<WeightInput value="123.45" unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(123.45);
    });

    it('should render with empty value when not provided', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(null);
    });
  });

  // ===========================================================================
  // Unit Selection Tests
  // ===========================================================================

  describe('Unit Selection', () => {
    it('should display grams unit', () => {
      render(<WeightInput unit="g" />);

      const select = screen.getByTestId('weight-unit-select');
      expect(select).toHaveAttribute('data-value', 'g');
    });

    it('should display ounces unit', () => {
      render(<WeightInput unit="oz" />);

      const select = screen.getByTestId('weight-unit-select');
      expect(select).toHaveAttribute('data-value', 'oz');
    });

    it('should display pounds unit', () => {
      render(<WeightInput unit="lb" />);

      const select = screen.getByTestId('weight-unit-select');
      expect(select).toHaveAttribute('data-value', 'lb');
    });

    it('should call onUnitChange when unit is changed', async () => {
      render(<WeightInput unit="g" onUnitChange={mockOnUnitChange} />);

      const select = screen.getByTestId('weight-unit-select-native');
      await userEvent.selectOptions(select, 'oz');

      expect(mockOnUnitChange).toHaveBeenCalledWith('oz');
    });

    it('should render all three unit options', () => {
      render(<WeightInput unit="g" />);

      expect(screen.getByTestId('select-item-g')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-oz')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-lb')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Value Input Tests
  // ===========================================================================

  describe('Value Input', () => {
    it('should call onValueChange when value is entered', async () => {
      render(<WeightInput unit="g" onValueChange={mockOnValueChange} />);

      const input = screen.getByTestId('weight-value-input');
      await userEvent.type(input, '250');

      expect(mockOnValueChange).toHaveBeenCalled();
    });

    it('should call onBlur when input loses focus', async () => {
      render(<WeightInput unit="g" onBlur={mockOnBlur} />);

      const input = screen.getByTestId('weight-value-input');
      await userEvent.click(input);
      await userEvent.tab();

      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should have type="number" attribute', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should have min="0" attribute', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('min', '0');
    });

    it('should have step="any" attribute', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('step', 'any');
    });

    it('should accept decimal values', async () => {
      render(<WeightInput unit="g" onValueChange={mockOnValueChange} />);

      const input = screen.getByTestId('weight-value-input');
      await userEvent.type(input, '123.45');

      expect(mockOnValueChange).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('Disabled State', () => {
    it('should not be disabled by default', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).not.toBeDisabled();
    });

    it('should disable input when disabled prop is true', () => {
      render(<WeightInput unit="g" disabled />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toBeDisabled();
    });

    it('should disable unit selector when disabled prop is true', () => {
      render(<WeightInput unit="g" disabled />);

      const select = screen.getByTestId('weight-unit-select');
      expect(select).toHaveAttribute('data-disabled', 'true');
    });
  });

  // ===========================================================================
  // Form Integration Tests
  // ===========================================================================

  describe('Form Integration', () => {
    it('should accept name attribute for form field', () => {
      render(<WeightInput unit="g" name="weight" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('name', 'weight');
    });

    it('should work with controlled value', async () => {
      const { rerender } = render(<WeightInput value={100} unit="g" />);

      let input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(100);

      rerender(<WeightInput value={200} unit="g" />);

      input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(200);
    });

    it('should work with controlled unit', () => {
      const { rerender } = render(<WeightInput value={100} unit="g" />);

      let select = screen.getByTestId('weight-unit-select');
      expect(select).toHaveAttribute('data-value', 'g');

      rerender(<WeightInput value={100} unit="oz" />);

      select = screen.getByTestId('weight-unit-select');
      expect(select).toHaveAttribute('data-value', 'oz');
    });
  });

  // ===========================================================================
  // Styling Tests
  // ===========================================================================

  describe('Styling', () => {
    it('should accept custom className for container', () => {
      render(<WeightInput unit="g" className="custom-class" />);

      const container = screen.getByTestId('weight-value-input').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('should accept custom inputClassName', () => {
      render(<WeightInput unit="g" inputClassName="custom-input" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveClass('custom-input');
    });

    it('should accept custom selectClassName', () => {
      render(<WeightInput unit="g" selectClassName="custom-select" />);

      const trigger = screen.getByTestId('select-trigger');
      expect(trigger).toHaveClass('custom-select');
    });

    it('should apply default flex layout classes', () => {
      render(<WeightInput unit="g" />);

      const container = screen.getByTestId('weight-value-input').parentElement;
      expect(container).toHaveClass('flex', 'items-center', 'gap-2');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have default aria-label for input', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('aria-label', 'Weight value');
    });

    it('should accept custom aria-label', () => {
      render(<WeightInput unit="g" aria-label="Item weight" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('aria-label', 'Item weight');
    });

    it('should have aria-label for unit selector', () => {
      render(<WeightInput unit="g" />);

      const trigger = screen.getByTestId('select-trigger');
      expect(trigger).toHaveAttribute('aria-label', 'Weight unit');
    });

    it('should support aria-invalid attribute', () => {
      render(<WeightInput unit="g" aria-invalid={true} />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not set aria-invalid by default', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).not.toHaveAttribute('aria-invalid');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle zero value', () => {
      render(<WeightInput value={0} unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(0);
    });

    it('should handle undefined value', () => {
      render(<WeightInput value={undefined} unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(null);
    });

    it('should handle very large values', () => {
      render(<WeightInput value={999999} unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(999999);
    });

    it('should handle very small decimal values', () => {
      render(<WeightInput value="0.001" unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(0.001);
    });

    it('should handle empty string value', () => {
      render(<WeightInput value="" unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      expect(input).toHaveValue(null);
    });

    it('should handle missing callbacks gracefully', () => {
      render(<WeightInput unit="g" />);

      const input = screen.getByTestId('weight-value-input');
      // Should not throw when typing without onValueChange
      expect(() => fireEvent.change(input, { target: { value: '100' } })).not.toThrow();
    });
  });

  // ===========================================================================
  // Ref Forwarding Tests
  // ===========================================================================

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = vi.fn();
      render(<WeightInput ref={ref} unit="g" />);

      // Ref should be called with the input element
      expect(ref).toHaveBeenCalled();
    });
  });
});
