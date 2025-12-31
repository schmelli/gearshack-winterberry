/**
 * ThemeToggle Component Tests
 *
 * Tests for the ThemeToggle component used in dark/light mode switching.
 * Tests rendering, hydration safety, theme states, and interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

// =============================================================================
// Mocks
// =============================================================================

// Mock useThemePreference hook
const mockToggleTheme = vi.fn();
const mockThemePreference = {
  isDarkMode: false,
  toggleTheme: mockToggleTheme,
};

vi.mock('@/hooks/useThemePreference', () => ({
  useThemePreference: () => mockThemePreference,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Moon: ({ className }: { className?: string }) => (
    <svg data-testid="moon-icon" className={className} />
  ),
  Sun: ({ className }: { className?: string }) => (
    <svg data-testid="sun-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    id,
    checked,
    onCheckedChange,
    'aria-label': ariaLabel,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    'aria-label'?: string;
  }) => (
    <button
      data-testid="theme-switch"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label data-testid="theme-label" htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

// =============================================================================
// Tests
// =============================================================================

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThemePreference.isDarkMode = false;
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the theme toggle container', () => {
      render(<ThemeToggle />);

      const container = screen.getByTestId('theme-switch').parentElement?.parentElement;
      expect(container).toBeInTheDocument();
    });

    it('should render the theme label', () => {
      render(<ThemeToggle />);

      expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    });

    it('should render the theme switch', () => {
      render(<ThemeToggle />);

      expect(screen.getByTestId('theme-switch')).toBeInTheDocument();
    });

    it('should render theme description text', () => {
      render(<ThemeToggle />);

      expect(screen.getByText('Using light theme')).toBeInTheDocument();
    });

    it('should have label connected to switch via htmlFor', () => {
      render(<ThemeToggle />);

      const label = screen.getByTestId('theme-label');
      expect(label).toHaveAttribute('for', 'dark-mode');
    });
  });

  // ===========================================================================
  // Props Tests - Theme States
  // ===========================================================================

  describe('Theme States', () => {
    it('should show sun icon in light mode', () => {
      mockThemePreference.isDarkMode = false;
      render(<ThemeToggle />);

      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
    });

    it('should show moon icon in dark mode', () => {
      mockThemePreference.isDarkMode = true;
      render(<ThemeToggle />);

      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
    });

    it('should show "Using light theme" text in light mode', () => {
      mockThemePreference.isDarkMode = false;
      render(<ThemeToggle />);

      expect(screen.getByText('Using light theme')).toBeInTheDocument();
    });

    it('should show "Using dark theme" text in dark mode', () => {
      mockThemePreference.isDarkMode = true;
      render(<ThemeToggle />);

      expect(screen.getByText('Using dark theme')).toBeInTheDocument();
    });

    it('should set switch to unchecked in light mode', () => {
      mockThemePreference.isDarkMode = false;
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });

    it('should set switch to checked in dark mode', () => {
      mockThemePreference.isDarkMode = true;
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call toggleTheme when switch is clicked', () => {
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      fireEvent.click(switchEl);

      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('should toggle from light to dark mode', () => {
      mockThemePreference.isDarkMode = false;
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      fireEvent.click(switchEl);

      expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('should toggle from dark to light mode', () => {
      mockThemePreference.isDarkMode = true;
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      fireEvent.click(switchEl);

      expect(mockToggleTheme).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have aria-label on switch', () => {
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      expect(switchEl).toHaveAttribute('aria-label', 'Toggle dark mode');
    });

    it('should have role="switch" on toggle', () => {
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      expect(switchEl).toHaveAttribute('role', 'switch');
    });

    it('should have proper switch id', () => {
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');
      expect(switchEl).toHaveAttribute('id', 'dark-mode');
    });
  });

  // ===========================================================================
  // Style Tests
  // ===========================================================================

  describe('Styles', () => {
    it('should apply text-primary class to moon icon in dark mode', () => {
      mockThemePreference.isDarkMode = true;
      render(<ThemeToggle />);

      const moonIcon = screen.getByTestId('moon-icon');
      expect(moonIcon).toHaveClass('text-primary');
    });

    it('should apply text-accent class to sun icon in light mode', () => {
      mockThemePreference.isDarkMode = false;
      render(<ThemeToggle />);

      const sunIcon = screen.getByTestId('sun-icon');
      expect(sunIcon).toHaveClass('text-accent');
    });

    it('should apply size classes to icons', () => {
      render(<ThemeToggle />);

      const sunIcon = screen.getByTestId('sun-icon');
      expect(sunIcon).toHaveClass('h-5');
      expect(sunIcon).toHaveClass('w-5');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid theme toggles', () => {
      render(<ThemeToggle />);

      const switchEl = screen.getByTestId('theme-switch');

      fireEvent.click(switchEl);
      fireEvent.click(switchEl);
      fireEvent.click(switchEl);

      expect(mockToggleTheme).toHaveBeenCalledTimes(3);
    });

    it('should maintain layout structure when switching themes', () => {
      mockThemePreference.isDarkMode = false;
      const { rerender } = render(<ThemeToggle />);

      // Check initial structure
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();

      // Switch to dark mode
      mockThemePreference.isDarkMode = true;
      rerender(<ThemeToggle />);

      // Should still have proper structure
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
      expect(screen.getByText('Dark Mode')).toBeInTheDocument();
      expect(screen.getByTestId('theme-switch')).toBeInTheDocument();
    });
  });
});
