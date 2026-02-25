/**
 * FollowButton Component Tests
 *
 * Tests for the FollowButton component used in the social graph system.
 * Tests rendering, follow/unfollow states, hover interactions, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FollowButton, FollowButtonCompact } from '@/components/social/FollowButton';

// =============================================================================
// Mocks
// =============================================================================

// Mock toggle function
const mockToggle = vi.fn().mockResolvedValue(undefined);

// Mock useIsFollowing hook
const mockIsFollowingData = {
  isFollowing: false,
  isLoading: false,
  toggle: mockToggle,
};

vi.mock('@/hooks/social/useFollowing', () => ({
  useIsFollowing: () => mockIsFollowingData,
}));

// Mock auth context
const mockAuthContext = {
  user: { uid: 'current-user-001' },
};

vi.mock('@/components/auth/SupabaseAuthProvider', () => ({
  useAuthContext: () => mockAuthContext,
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'following.follow': 'Follow',
      'following.following': 'Following',
      'following.unfollow': 'Unfollow',
      'following.loading': 'Loading...',
      'following.followAriaLabel': `Follow ${params?.name ?? 'user'}`,
      'following.unfollowAriaLabel': `Unfollow ${params?.name ?? 'user'}`,
      'followers.countLabel': `${params?.count ?? 0} followers`,
      'followers.label': 'followers',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  UserPlus: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="user-plus-icon" className={className} aria-hidden={ariaHidden} />
  ),
  UserMinus: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="user-minus-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Loader2: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="loader-icon" className={className} aria-hidden={ariaHidden} />
  ),
  Check: ({ className, 'aria-hidden': ariaHidden }: { className?: string; 'aria-hidden'?: string }) => (
    <svg data-testid="check-icon" className={className} aria-hidden={ariaHidden} />
  ),
}));

// Mock UI button
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    onClick,
    disabled,
    className,
    'aria-label': ariaLabel,
    'aria-busy': ariaBusy,
    'aria-pressed': ariaPressed,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    'aria-label'?: string;
    'aria-busy'?: boolean;
    'aria-pressed'?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
  }) => (
    <button
      data-testid="follow-button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      aria-pressed={ariaPressed}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
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

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFollowingData.isFollowing = false;
    mockIsFollowingData.isLoading = false;
    mockAuthContext.user = { uid: 'current-user-001' };
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the follow button', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toBeInTheDocument();
    });

    it('should render "Follow" text when not following', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByText('Follow')).toBeInTheDocument();
    });

    it('should render "Following" text when following', () => {
      mockIsFollowingData.isFollowing = true;
      render(<FollowButton userId="user-002" />);

      expect(screen.getByText('Following')).toBeInTheDocument();
    });

    it('should render UserPlus icon when not following', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('user-plus-icon')).toBeInTheDocument();
    });

    it('should render Check icon when following', () => {
      mockIsFollowingData.isFollowing = true;
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should render loader icon when loading', () => {
      mockIsFollowingData.isLoading = true;
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should not render when viewing own profile', () => {
      render(<FollowButton userId="current-user-001" />);

      expect(screen.queryByTestId('follow-button')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests
  // ===========================================================================

  describe('Props', () => {
    it('should apply custom className', () => {
      render(<FollowButton userId="user-002" className="custom-class" />);

      expect(screen.getByTestId('follow-button')).toHaveClass('custom-class');
    });

    it('should apply size prop', () => {
      render(<FollowButton userId="user-002" size="lg" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('data-size', 'lg');
    });

    it('should use icon size when iconOnly is true', () => {
      render(<FollowButton userId="user-002" iconOnly />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('data-size', 'icon');
    });

    it('should show follower count when showFollowerCount is true', () => {
      render(
        <FollowButton
          userId="user-002"
          showFollowerCount
          followerCount={150}
        />
      );

      // Text is split across elements, use regex or partial match
      expect(screen.getByText(/150/)).toBeInTheDocument();
      expect(screen.getByText(/followers/)).toBeInTheDocument();
    });

    it('should not show follower count when null', () => {
      render(
        <FollowButton
          userId="user-002"
          showFollowerCount
          followerCount={null}
        />
      );

      expect(screen.queryByText('followers')).not.toBeInTheDocument();
    });

    it('should use default userName for aria label', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute(
        'aria-label',
        'Follow this user'
      );
    });

    it('should use custom userName for aria label', () => {
      render(<FollowButton userId="user-002" userName="John Doe" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute(
        'aria-label',
        'Follow John Doe'
      );
    });
  });

  // ===========================================================================
  // Button Variants Tests
  // ===========================================================================

  describe('Button Variants', () => {
    it('should use outline variant when not following', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('data-variant', 'outline');
    });

    it('should use secondary variant when following', () => {
      mockIsFollowingData.isFollowing = true;
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('data-variant', 'secondary');
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call toggle when clicked', async () => {
      render(<FollowButton userId="user-002" />);

      const button = screen.getByTestId('follow-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockToggle).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onFollow callback when following', async () => {
      const onFollow = vi.fn();
      render(<FollowButton userId="user-002" onFollow={onFollow} />);

      const button = screen.getByTestId('follow-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onFollow).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onUnfollow callback when unfollowing', async () => {
      mockIsFollowingData.isFollowing = true;
      const onUnfollow = vi.fn();
      render(<FollowButton userId="user-002" onUnfollow={onUnfollow} />);

      const button = screen.getByTestId('follow-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onUnfollow).toHaveBeenCalledTimes(1);
      });
    });

    it('should be disabled when loading', () => {
      mockIsFollowingData.isLoading = true;
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toBeDisabled();
    });

    it('should show hover state with UserMinus icon when following and hovering', () => {
      mockIsFollowingData.isFollowing = true;
      render(<FollowButton userId="user-002" />);

      const button = screen.getByTestId('follow-button');
      fireEvent.mouseEnter(button);

      expect(screen.getByTestId('user-minus-icon')).toBeInTheDocument();
    });

    it('should show "Unfollow" text when following and hovering', () => {
      mockIsFollowingData.isFollowing = true;
      render(<FollowButton userId="user-002" />);

      const button = screen.getByTestId('follow-button');
      fireEvent.mouseEnter(button);

      expect(screen.getByText('Unfollow')).toBeInTheDocument();
    });

    it('should revert from hover state on mouse leave', () => {
      mockIsFollowingData.isFollowing = true;
      render(<FollowButton userId="user-002" />);

      const button = screen.getByTestId('follow-button');
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(screen.getByText('Following')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have aria-label', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('aria-label');
    });

    it('should have aria-busy when loading', () => {
      mockIsFollowingData.isLoading = true;
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-pressed when following', () => {
      mockIsFollowingData.isFollowing = true;
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have aria-pressed false when not following', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('follow-button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('should have sr-only text in iconOnly mode', () => {
      render(<FollowButton userId="user-002" iconOnly userName="Jane" />);

      expect(screen.getByText('Follow Jane')).toHaveClass('sr-only');
    });

    it('should have aria-hidden on icons', () => {
      render(<FollowButton userId="user-002" />);

      expect(screen.getByTestId('user-plus-icon')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle toggle error gracefully', async () => {
      mockToggle.mockRejectedValueOnce(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<FollowButton userId="user-002" />);

      const button = screen.getByTestId('follow-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should handle user with no auth', () => {
      mockAuthContext.user = null as unknown as { uid: string };
      render(<FollowButton userId="user-002" />);

      // Should still render for unauthenticated users (button might redirect to login)
      expect(screen.getByTestId('follow-button')).toBeInTheDocument();
    });

    it('should format large follower counts', () => {
      render(
        <FollowButton
          userId="user-002"
          showFollowerCount
          followerCount={1500000}
        />
      );

      // toLocaleString formats numbers - locale agnostic check with regex
      expect(screen.getByText(/1[\.,]?500[\.,]?000/)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// FollowButtonCompact Tests
// =============================================================================

describe('FollowButtonCompact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFollowingData.isFollowing = false;
    mockIsFollowingData.isLoading = false;
    mockAuthContext.user = { uid: 'current-user-001' };
  });

  it('should render with icon size', () => {
    render(<FollowButtonCompact userId="user-002" />);

    expect(screen.getByTestId('follow-button')).toHaveAttribute('data-size', 'icon');
  });

  it('should pass callbacks to base component', async () => {
    const onFollow = vi.fn();
    const onUnfollow = vi.fn();

    render(
      <FollowButtonCompact
        userId="user-002"
        onFollow={onFollow}
        onUnfollow={onUnfollow}
      />
    );

    fireEvent.click(screen.getByTestId('follow-button'));

    await waitFor(() => {
      expect(onFollow).toHaveBeenCalled();
    });
  });

  it('should apply custom className', () => {
    render(<FollowButtonCompact userId="user-002" className="compact-class" />);

    expect(screen.getByTestId('follow-button')).toHaveClass('compact-class');
  });
});
