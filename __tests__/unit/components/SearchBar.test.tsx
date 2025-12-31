/**
 * SearchBar Component Tests
 *
 * Tests for the SearchBar component used in the bulletin board for keyword filtering.
 * Tests rendering, debounced search behavior, interactions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '@/components/bulletin/SearchBar';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'search.placeholder': 'Search posts...',
      'search.clear': 'Clear search',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="search-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
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
    ...props
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
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    className,
    onClick,
    'aria-label': ariaLabel,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    className?: string;
    onClick?: () => void;
    'aria-label'?: string;
  }) => (
    <button
      data-variant={variant}
      data-size={size}
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid="clear-button"
      {...props}
    >
      {children}
    </button>
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

describe('SearchBar', () => {
  let mockOnSearch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnSearch = vi.fn();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the search input with placeholder', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search posts...');
    });

    it('should render the search icon', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should not render clear button when input is empty', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<SearchBar onSearch={mockOnSearch} className="custom-class" />);

      const container = screen.getByTestId('search-input').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });

  // ===========================================================================
  // Props Tests
  // ===========================================================================

  describe('Props', () => {
    it('should use default debounce time of 300ms', async () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      // Should not call immediately
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance timer by 299ms - still should not call
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance to 300ms - should call
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    });

    it('should respect custom debounce time', async () => {
      render(<SearchBar onSearch={mockOnSearch} debounceMs={500} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      // Advance 300ms - should not call yet
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance to 500ms - should call
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should update input value when typing', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'hiking gear' } });

      expect(input).toHaveValue('hiking gear');
    });

    it('should show clear button when input has value', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'tent' } });

      expect(screen.getByTestId('clear-button')).toBeInTheDocument();
    });

    it('should clear input and call onSearch with empty string when clear is clicked', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'backpack' } });

      const clearButton = screen.getByTestId('clear-button');
      fireEvent.click(clearButton);

      expect(input).toHaveValue('');
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('should hide clear button after clearing', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'backpack' } });

      const clearButton = screen.getByTestId('clear-button');
      fireEvent.click(clearButton);

      expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument();
    });

    it('should debounce multiple rapid inputs', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');

      // Type rapidly
      fireEvent.change(input, { target: { value: 'h' } });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.change(input, { target: { value: 'hi' } });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.change(input, { target: { value: 'hik' } });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.change(input, { target: { value: 'hike' } });

      // Should not have called yet
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only be called once with final value
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith('hike');
    });
  });

  // ===========================================================================
  // State Tests
  // ===========================================================================

  describe('States', () => {
    it('should trim whitespace from search query', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: '  trimmed query  ' } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('trimmed query');
    });

    it('should handle empty input after typing', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');

      // Type something
      fireEvent.change(input, { target: { value: 'test' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockOnSearch).toHaveBeenCalledWith('test');

      // Clear manually by typing
      fireEvent.change(input, { target: { value: '' } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('should handle whitespace-only input', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: '   ' } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Trimmed whitespace should result in empty string
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible clear button with aria-label', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByTestId('clear-button');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    });

    it('should have text input type for search', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle special characters in search query', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test@#$%^&*()' } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('test@#$%^&*()');
    });

    it('should handle unicode characters', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'zelt wandern' } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('zelt wandern');
    });

    it('should cleanup timer on unmount', () => {
      const { unmount } = render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      // Unmount before debounce completes
      unmount();

      // Advance timer - should not cause errors
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // onSearch should not have been called
      expect(mockOnSearch).not.toHaveBeenCalled();
    });

    it('should handle very long search queries', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      const longQuery = 'a'.repeat(500);
      fireEvent.change(input, { target: { value: longQuery } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockOnSearch).toHaveBeenCalledWith(longQuery);
    });
  });
});
