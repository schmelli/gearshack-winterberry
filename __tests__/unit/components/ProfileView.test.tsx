/**
 * ProfileView Component Tests
 *
 * Tests for the ProfileView component used in user profiles.
 * Tests rendering of user info, stats, social links, favorites, and VIP badge.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileView } from '@/components/profile/ProfileView';
import type { MergedUser } from '@/types/auth';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      favorites: 'Favorites',
      forSale: 'For Sale',
      forRent: 'For Rent',
      forTrade: 'For Trade',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Instagram: ({ className }: { className?: string }) => (
    <svg data-testid="instagram-icon" className={className} />
  ),
  Facebook: ({ className }: { className?: string }) => (
    <svg data-testid="facebook-icon" className={className} />
  ),
  Youtube: ({ className }: { className?: string }) => (
    <svg data-testid="youtube-icon" className={className} />
  ),
  Globe: ({ className }: { className?: string }) => (
    <svg data-testid="globe-icon" className={className} />
  ),
  MapPin: ({ className }: { className?: string }) => (
    <svg data-testid="mappin-icon" className={className} />
  ),
  Crown: ({ className }: { className?: string }) => (
    <svg data-testid="crown-icon" className={className} />
  ),
  Pencil: ({ className }: { className?: string }) => (
    <svg data-testid="pencil-icon" className={className} />
  ),
  Package: ({ className }: { className?: string }) => (
    <svg data-testid="package-icon" className={className} />
  ),
  Backpack: ({ className }: { className?: string }) => (
    <svg data-testid="backpack-icon" className={className} />
  ),
  CheckCircle2: ({ className }: { className?: string }) => (
    <svg data-testid="check-circle-icon" className={className} />
  ),
  Heart: ({ className }: { className?: string }) => (
    <svg data-testid="heart-icon" className={className} />
  ),
  DollarSign: ({ className }: { className?: string }) => (
    <svg data-testid="dollar-icon" className={className} />
  ),
  Handshake: ({ className }: { className?: string }) => (
    <svg data-testid="handshake-icon" className={className} />
  ),
  Repeat2: ({ className }: { className?: string }) => (
    <svg data-testid="repeat-icon" className={className} />
  ),
}));

// Mock AvatarWithFallback
vi.mock('@/components/profile/AvatarWithFallback', () => ({
  AvatarWithFallback: ({
    src,
    name,
    size,
    className,
  }: {
    src?: string | null;
    name?: string;
    size?: string;
    className?: string;
  }) => (
    <div data-testid="avatar" data-src={src} data-name={name} data-size={size} className={className}>
      Avatar
    </div>
  ),
}));

// Mock ShakedownExpertiseSection
vi.mock('@/components/profile/ShakedownExpertiseSection', () => ({
  ShakedownExpertiseSection: ({
    userId,
    className,
  }: {
    userId: string;
    stats: unknown;
    className?: string;
  }) => (
    <div data-testid="shakedown-section" data-user-id={userId} className={className}>
      Shakedown Stats
    </div>
  ),
}));

// Mock avatar utils
vi.mock('@/lib/utils/avatar', () => ({
  getDisplayAvatarUrl: (avatarUrl?: string | null, providerUrl?: string | null) =>
    avatarUrl ?? providerUrl ?? null,
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    onClick,
    className,
    'aria-label': ariaLabel,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    className?: string;
    'aria-label'?: string;
  }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockUser = (overrides: Partial<MergedUser> = {}): MergedUser => ({
  uid: 'user-001',
  displayName: 'John Doe',
  email: 'john@example.com',
  avatarUrl: 'https://example.com/avatar.jpg',
  providerAvatarUrl: null,
  isVIP: false,
  bio: null,
  trailName: null,
  location: null,
  locationName: null,
  instagram: null,
  facebook: null,
  youtube: null,
  website: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('ProfileView', () => {
  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the user display name', () => {
      render(<ProfileView user={createMockUser()} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render the user email', () => {
      render(<ProfileView user={createMockUser()} />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should render the avatar', () => {
      render(<ProfileView user={createMockUser()} />);

      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('should render stats tiles', () => {
      render(<ProfileView user={createMockUser()} stats={{ itemCount: 5, loadoutCount: 3, shakedownCount: 2 }} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should render stat labels', () => {
      render(<ProfileView user={createMockUser()} />);

      expect(screen.getByText('Items')).toBeInTheDocument();
      expect(screen.getByText('Loadouts')).toBeInTheDocument();
      expect(screen.getByText('Shakedowns')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests - User Details
  // ===========================================================================

  describe('User Details', () => {
    it('should render trail name when provided', () => {
      render(<ProfileView user={createMockUser({ trailName: 'Trailblazer' })} />);

      // The component uses &ldquo; and &rdquo; which render as curly quotes
      expect(screen.getByText(/Trailblazer/)).toBeInTheDocument();
    });

    it('should not render trail name when not provided', () => {
      render(<ProfileView user={createMockUser({ trailName: null })} />);

      expect(screen.queryByText(/Trailblazer/)).not.toBeInTheDocument();
    });

    it('should render bio when provided', () => {
      render(<ProfileView user={createMockUser({ bio: 'I love hiking!' })} />);

      // The component uses &ldquo; and &rdquo; which render as curly quotes
      expect(screen.getByText(/I love hiking!/)).toBeInTheDocument();
    });

    it('should not render bio when not provided', () => {
      render(<ProfileView user={createMockUser({ bio: null })} />);

      // Bio section should not be present
      const bioText = screen.queryByText(/I love hiking/);
      expect(bioText).not.toBeInTheDocument();
    });

    it('should render location when locationName provided', () => {
      render(<ProfileView user={createMockUser({ locationName: 'Denver, CO' })} />);

      expect(screen.getByText('Denver, CO')).toBeInTheDocument();
      expect(screen.getByTestId('mappin-icon')).toBeInTheDocument();
    });

    it('should fallback to location when locationName not provided', () => {
      render(<ProfileView user={createMockUser({ location: 'Boulder', locationName: null })} />);

      expect(screen.getByText('Boulder')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // VIP Badge Tests
  // ===========================================================================

  describe('VIP Badge', () => {
    it('should render VIP badge when user is VIP', () => {
      render(<ProfileView user={createMockUser({ isVIP: true })} />);

      expect(screen.getByText('VIP')).toBeInTheDocument();
      expect(screen.getByTestId('crown-icon')).toBeInTheDocument();
    });

    it('should not render VIP badge when user is not VIP', () => {
      render(<ProfileView user={createMockUser({ isVIP: false })} />);

      expect(screen.queryByText('VIP')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Social Links Tests
  // ===========================================================================

  describe('Social Links', () => {
    it('should render Instagram link when provided', () => {
      render(<ProfileView user={createMockUser({ instagram: 'johndoe' })} />);

      expect(screen.getByTestId('instagram-icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    });

    it('should render Facebook link when provided', () => {
      render(<ProfileView user={createMockUser({ facebook: 'johndoe' })} />);

      expect(screen.getByTestId('facebook-icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    });

    it('should render YouTube link when provided', () => {
      render(<ProfileView user={createMockUser({ youtube: 'johndoe' })} />);

      expect(screen.getByTestId('youtube-icon')).toBeInTheDocument();
      expect(screen.getByLabelText('YouTube')).toBeInTheDocument();
    });

    it('should render website link when provided', () => {
      render(<ProfileView user={createMockUser({ website: 'johndoe.com' })} />);

      expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Website')).toBeInTheDocument();
    });

    it('should not render social links section when none provided', () => {
      render(<ProfileView user={createMockUser()} />);

      expect(screen.queryByTestId('instagram-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('facebook-icon')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should render edit button when onEditClick provided', () => {
      const onEditClick = vi.fn();
      render(<ProfileView user={createMockUser()} onEditClick={onEditClick} />);

      expect(screen.getByLabelText('Edit profile')).toBeInTheDocument();
    });

    it('should call onEditClick when edit button clicked', () => {
      const onEditClick = vi.fn();
      render(<ProfileView user={createMockUser()} onEditClick={onEditClick} />);

      fireEvent.click(screen.getByLabelText('Edit profile'));

      expect(onEditClick).toHaveBeenCalledTimes(1);
    });

    it('should not render edit button when onEditClick not provided', () => {
      render(<ProfileView user={createMockUser()} />);

      expect(screen.queryByLabelText('Edit profile')).not.toBeInTheDocument();
    });

    it('should call onItemClick when favorite item clicked', () => {
      const onItemClick = vi.fn();
      render(
        <ProfileView
          user={createMockUser()}
          onItemClick={onItemClick}
          favorites={[{ id: 'item-1', name: 'Tent', imageUrl: null }]}
        />
      );

      fireEvent.click(screen.getByText('Tent'));

      expect(onItemClick).toHaveBeenCalledWith('item-1');
    });
  });

  // ===========================================================================
  // Favorites Section Tests
  // ===========================================================================

  describe('Favorites Section', () => {
    it('should render favorites section when items provided', () => {
      render(
        <ProfileView
          user={createMockUser()}
          favorites={[{ id: 'item-1', name: 'Tent', imageUrl: null }]}
        />
      );

      expect(screen.getByText('Favorites')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    });

    it('should not render favorites section when empty', () => {
      render(<ProfileView user={createMockUser()} favorites={[]} />);

      expect(screen.queryByText('Favorites')).not.toBeInTheDocument();
    });

    it('should render for sale section when items provided', () => {
      render(
        <ProfileView
          user={createMockUser()}
          forSale={[{ id: 'item-1', name: 'Sleeping Bag', imageUrl: null }]}
        />
      );

      expect(screen.getByText('For Sale')).toBeInTheDocument();
      expect(screen.getByTestId('dollar-icon')).toBeInTheDocument();
    });

    it('should render for rent section when items provided', () => {
      render(
        <ProfileView
          user={createMockUser()}
          forRent={[{ id: 'item-1', name: 'Bear Can', imageUrl: null }]}
        />
      );

      expect(screen.getByText('For Rent')).toBeInTheDocument();
      expect(screen.getByTestId('handshake-icon')).toBeInTheDocument();
    });

    it('should render for trade section when items provided', () => {
      render(
        <ProfileView
          user={createMockUser()}
          forTrade={[{ id: 'item-1', name: 'Stove', imageUrl: null }]}
        />
      );

      expect(screen.getByText('For Trade')).toBeInTheDocument();
      expect(screen.getByTestId('repeat-icon')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Shakedown Stats Tests
  // ===========================================================================

  describe('Shakedown Stats', () => {
    it('should render shakedown section when stats provided', () => {
      const shakedownStats = {
        totalReviews: 5,
        averageRating: 4.5,
        expertiseLevel: 'intermediate' as const,
      };
      render(
        <ProfileView
          user={createMockUser()}
          shakedownStats={shakedownStats}
        />
      );

      expect(screen.getByTestId('shakedown-section')).toBeInTheDocument();
    });

    it('should not render shakedown section when stats not provided', () => {
      render(<ProfileView user={createMockUser()} />);

      expect(screen.queryByTestId('shakedown-section')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle user with no email', () => {
      render(<ProfileView user={createMockUser({ email: undefined })} />);

      expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
    });

    it('should use default stats when not provided', () => {
      render(<ProfileView user={createMockUser()} />);

      // Default stats are 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(3);
    });

    it('should handle Instagram with full URL', () => {
      render(
        <ProfileView
          user={createMockUser({ instagram: 'https://instagram.com/johndoe' })}
        />
      );

      const link = screen.getByLabelText('Instagram');
      expect(link).toHaveAttribute('href', 'https://instagram.com/johndoe');
    });

    it('should handle website without protocol', () => {
      render(
        <ProfileView
          user={createMockUser({ website: 'example.com' })}
        />
      );

      const link = screen.getByLabelText('Website');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });
});
