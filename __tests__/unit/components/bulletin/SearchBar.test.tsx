/**
 * SearchBar Component Tests
 *
 * Tests for the search bar component with debounce functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from '@/components/bulletin/SearchBar';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'search.placeholder': 'Search posts...',
      'search.clear': 'Clear search',
    };
    return translations[key] || key;
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <svg data-testid="search-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="clear-icon" className={className} />
  ),
}));

// Mock shadcn components
vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
    type
  }: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
    className?: string;
    type?: string;
  }) => (
    <input
      data-testid="search-input"
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    'aria-label': ariaLabel
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      aria-label={ariaLabel}
      data-testid="clear-button"
    >
      {children}
    </button>
  ),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('should render search icon', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should show placeholder text', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.getByPlaceholderText('Search posts...')).toBeInTheDocument();
    });

    it('should not show clear button when input is empty', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument();
    });
  });

  describe('Typing behavior', () => {
    it('should update input value when typing', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'tent' } });

      expect(input).toHaveValue('tent');
    });

    it('should show clear button when input has value', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'backpack' } });

      expect(screen.getByTestId('clear-button')).toBeInTheDocument();
    });
  });

  describe('Debounce functionality', () => {
    it('should call onSearch after debounce delay', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'ultralight' } });

      // Should not call immediately
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance timers by default 300ms
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('ultralight');
    });

    it('should respect custom debounce delay', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} debounceMs={500} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      // Advance by 300ms - should not call yet
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance by remaining 200ms
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    });

    it('should debounce multiple keystrokes', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');

      fireEvent.change(input, { target: { value: 't' } });
      act(() => vi.advanceTimersByTime(100));

      fireEvent.change(input, { target: { value: 'te' } });
      act(() => vi.advanceTimersByTime(100));

      fireEvent.change(input, { target: { value: 'ten' } });
      act(() => vi.advanceTimersByTime(100));

      fireEvent.change(input, { target: { value: 'tent' } });

      // Should not have called yet
      expect(mockOnSearch).not.toHaveBeenCalled();

      // Advance full debounce period
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only call once with final value
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith('tent');
    });

    it('should trim whitespace from search query', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: '  hiking gear  ' } });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('hiking gear');
    });
  });

  describe('Clear functionality', () => {
    it('should clear input when clear button clicked', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByTestId('clear-button');
      fireEvent.click(clearButton);

      expect(input).toHaveValue('');
    });

    it('should call onSearch with empty string when cleared', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByTestId('clear-button');
      fireEvent.click(clearButton);

      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('should hide clear button after clearing', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByTestId('clear-button');
      fireEvent.click(clearButton);

      expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible clear button', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      fireEvent.change(input, { target: { value: 'test' } });

      const clearButton = screen.getByTestId('clear-button');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    });

    it('should have text input type', () => {
      const mockOnSearch = vi.fn();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByTestId('search-input');
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to container', () => {
      const mockOnSearch = vi.fn();
      const { container } = render(
        <SearchBar onSearch={mockOnSearch} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
