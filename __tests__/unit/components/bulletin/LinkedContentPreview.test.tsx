/**
 * LinkedContentPreview Component Tests
 *
 * Tests for the linked content preview component with loadout/shakedown data.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LinkedContentPreview } from '@/components/bulletin/LinkedContentPreview';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'linkedContent.loadout': 'Loadout',
      'linkedContent.shakedown': 'Shakedown',
      'linkedContent.marketplace_item': 'Marketplace Item',
      'linkedContent.loadFailed': 'Failed to load content',
      'linkedContent.notFound': 'Content not found',
    };
    if (key === 'linkedContent.baseWeight') {
      return `${params?.weight}`;
    }
    if (key === 'linkedContent.items') {
      return `${params?.count} items`;
    }
    return translations[key] || key;
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ExternalLink: ({ className }: { className?: string }) => (
    <svg data-testid="external-link-icon" className={className} />
  ),
  Package: ({ className }: { className?: string }) => (
    <svg data-testid="package-icon" className={className} />
  ),
  Scale: ({ className }: { className?: string }) => (
    <svg data-testid="scale-icon" className={className} />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-icon" className={className} />
  ),
}));

// Mock Supabase - create a fresh mock for each test
let mockLoadoutData: unknown = null;
let mockLoadoutError: Error | null = null;
let mockItemCount = 0;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'loadouts') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockLoadoutData, error: mockLoadoutError }),
            }),
          }),
        };
      }
      if (table === 'loadout_items') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ count: mockItemCount }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    },
  }),
}));

// Mock shadcn components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    asChild
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    className?: string;
    asChild?: boolean;
  }) => (
    asChild ? <>{children}</> : <button data-testid="view-button">{children}</button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe('LinkedContentPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadoutData = null;
    mockLoadoutError = null;
    mockItemCount = 0;
  });

  describe('Loading state', () => {
    it('should show skeleton while loading', () => {
      // No data set, will be in loading state briefly
      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      // Initially shows skeleton
      expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('Success state', () => {
    it('should display loadout title after loading', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'PCT Thru-Hike Setup',
        hero_image_url: null,
        base_weight_g: 4500,
      };
      mockItemCount = 15;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        expect(screen.getByText('PCT Thru-Hike Setup')).toBeInTheDocument();
      });
    });

    it('should display type label for loadout', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'Test Loadout',
      };
      mockItemCount = 5;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        expect(screen.getByText('Loadout')).toBeInTheDocument();
      });
    });

    it('should display shakedown type label', async () => {
      mockLoadoutData = {
        id: 'shakedown-123',
        name: 'My First Shakedown',
      };
      mockItemCount = 8;

      render(<LinkedContentPreview contentType="shakedown" contentId="shakedown-123" />);

      await waitFor(() => {
        expect(screen.getByText('Shakedown')).toBeInTheDocument();
      });
    });

    it('should display thumbnail when available', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'Test Loadout',
        hero_image_url: 'https://example.com/image.jpg',
      };
      mockItemCount = 5;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        const img = screen.getByAltText('Test Loadout');
        expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      });
    });

    it('should show package icon when no thumbnail', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'Test Loadout',
        hero_image_url: null,
      };
      mockItemCount = 5;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        // Get all package icons and check at least one exists in the success state
        const icons = screen.getAllByTestId('package-icon');
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    it('should display item count', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'Test Loadout',
      };
      mockItemCount = 12;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        expect(screen.getByText('12 items')).toBeInTheDocument();
      });
    });

    it('should render external link', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'Test Loadout',
      };
      mockItemCount = 5;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/loadouts/loadout-123');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });
  });

  describe('Error state', () => {
    it('should show error message when fetch fails', async () => {
      mockLoadoutError = new Error('Database error');
      mockLoadoutData = null;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load content')).toBeInTheDocument();
      });
    });

    it('should show alert icon on error', async () => {
      mockLoadoutError = new Error('Not found');
      mockLoadoutData = null;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Weight formatting', () => {
    it('should format weight in grams', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'Test Loadout',
        base_weight_g: 500,
      };
      mockItemCount = 5;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        expect(screen.getByText('500 g')).toBeInTheDocument();
      });
    });

    it('should format weight in kilograms when >= 1000g', async () => {
      mockLoadoutData = {
        id: 'loadout-123',
        name: 'Test Loadout',
        base_weight_g: 4500,
      };
      mockItemCount = 5;

      render(<LinkedContentPreview contentType="loadout" contentId="loadout-123" />);

      await waitFor(() => {
        expect(screen.getByText('4.50 kg')).toBeInTheDocument();
      });
    });
  });
});
