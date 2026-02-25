/**
 * GoogleSignInButton Component Tests
 *
 * Tests for the GoogleSignInButton component used in authentication.
 * Tests rendering, loading states, success/error callbacks, and variants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

// =============================================================================
// Mocks
// =============================================================================

const mockSignInWithGoogle = vi.fn();

vi.mock('@/components/auth/SupabaseAuthProvider', () => ({
  useAuthContext: () => ({
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      googleButton: 'Continue with Google',
      'errors.signInFailed': 'Sign in failed',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-icon" className={className} />
  ),
}));

// Mock UI Button
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    type,
    variant,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    type?: string;
    variant?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="google-button"
      data-type={type}
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

// =============================================================================
// Tests
// =============================================================================

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithGoogle.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the button', () => {
      render(<GoogleSignInButton />);

      expect(screen.getByTestId('google-button')).toBeInTheDocument();
    });

    it('should render with translated text', () => {
      render(<GoogleSignInButton />);

      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('should render Google icon by default', () => {
      render(<GoogleSignInButton />);

      // Google icon is an SVG with multiple paths
      const button = screen.getByTestId('google-button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with type button', () => {
      render(<GoogleSignInButton />);

      expect(screen.getByTestId('google-button')).toHaveAttribute('data-type', 'button');
    });
  });

  // ===========================================================================
  // Variant Tests
  // ===========================================================================

  describe('Variants', () => {
    it('should use outline variant by default', () => {
      render(<GoogleSignInButton />);

      expect(screen.getByTestId('google-button')).toHaveAttribute('data-variant', 'outline');
    });

    it('should use default variant when specified', () => {
      render(<GoogleSignInButton variant="default" />);

      expect(screen.getByTestId('google-button')).toHaveAttribute('data-variant', 'default');
    });
  });

  // ===========================================================================
  // Full Width Tests
  // ===========================================================================

  describe('Full Width', () => {
    it('should be full width by default', () => {
      render(<GoogleSignInButton />);

      expect(screen.getByTestId('google-button')).toHaveClass('w-full');
    });

    it('should not be full width when fullWidth is false', () => {
      render(<GoogleSignInButton fullWidth={false} />);

      expect(screen.getByTestId('google-button')).not.toHaveClass('w-full');
    });
  });

  // ===========================================================================
  // Click Handling Tests
  // ===========================================================================

  describe('Click Handling', () => {
    it('should call signInWithGoogle when clicked', async () => {
      render(<GoogleSignInButton />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onSuccess after successful sign in', async () => {
      const onSuccess = vi.fn();
      render(<GoogleSignInButton onSuccess={onSuccess} />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onError when sign in fails', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Auth failed'));
      const onError = vi.fn();
      render(<GoogleSignInButton onError={onError} />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Auth failed');
      });
    });

    it('should call onError with default message for non-Error', async () => {
      mockSignInWithGoogle.mockRejectedValue('Unknown error');
      const onError = vi.fn();
      render(<GoogleSignInButton onError={onError} />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Sign in failed');
      });
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loader while signing in', async () => {
      // Make the promise never resolve to keep loading state
      mockSignInWithGoogle.mockImplementation(() => new Promise(() => {}));
      render(<GoogleSignInButton />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      });
    });

    it('should disable button while loading', async () => {
      mockSignInWithGoogle.mockImplementation(() => new Promise(() => {}));
      render(<GoogleSignInButton />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(screen.getByTestId('google-button')).toBeDisabled();
      });
    });

    it('should re-enable button after sign in completes', async () => {
      render(<GoogleSignInButton />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(screen.getByTestId('google-button')).not.toBeDisabled();
      });
    });

    it('should re-enable button after sign in fails', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Failed'));
      const onError = vi.fn();
      render(<GoogleSignInButton onError={onError} />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(screen.getByTestId('google-button')).not.toBeDisabled();
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have descriptive text', () => {
      render(<GoogleSignInButton />);

      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle missing onSuccess callback', async () => {
      render(<GoogleSignInButton />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
      // Should not throw
    });

    it('should handle missing onError callback', async () => {
      mockSignInWithGoogle.mockRejectedValue(new Error('Failed'));
      render(<GoogleSignInButton />);

      fireEvent.click(screen.getByTestId('google-button'));

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
      // Should not throw
    });

    it('should prevent multiple clicks while loading', async () => {
      let resolvePromise: () => void;
      mockSignInWithGoogle.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );
      render(<GoogleSignInButton />);

      fireEvent.click(screen.getByTestId('google-button'));
      fireEvent.click(screen.getByTestId('google-button'));
      fireEvent.click(screen.getByTestId('google-button'));

      // Button should be disabled after first click
      await waitFor(() => {
        expect(screen.getByTestId('google-button')).toBeDisabled();
      });

      // Resolve to complete
      resolvePromise!();

      // Only one call should have been made
      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      });
    });
  });
});
