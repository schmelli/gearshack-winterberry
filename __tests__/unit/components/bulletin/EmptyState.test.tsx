/**
 * EmptyState Component Tests
 *
 * Tests for the empty state component that displays messages
 * when there are no posts or no search results.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/bulletin/EmptyState';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'empty.title': 'No posts yet',
      'empty.subtitle': 'Be the first to share something with the community!',
      'empty.cta': 'Create First Post',
      'noResults.title': 'No results found',
      'noResults.subtitle': 'Try adjusting your search or filters',
      'noResults.clearFilters': 'Clear Filters',
    };
    return translations[key] || key;
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  MessageSquarePlus: ({ className }: { className?: string }) => (
    <svg data-testid="message-icon" className={className} />
  ),
  SearchX: ({ className }: { className?: string }) => (
    <svg data-testid="search-icon" className={className} />
  ),
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
    onClick,
    variant,
    className
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default empty variant', () => {
    it('should render empty state title', () => {
      render(<EmptyState />);

      expect(screen.getByText('No posts yet')).toBeInTheDocument();
    });

    it('should render empty state subtitle', () => {
      render(<EmptyState />);

      expect(screen.getByText('Be the first to share something with the community!')).toBeInTheDocument();
    });

    it('should render message icon for empty variant', () => {
      render(<EmptyState />);

      expect(screen.getByTestId('message-icon')).toBeInTheDocument();
    });

    it('should render Create Post button when onCreatePost provided', () => {
      const mockCreatePost = vi.fn();
      render(<EmptyState onCreatePost={mockCreatePost} />);

      expect(screen.getByText('Create First Post')).toBeInTheDocument();
    });

    it('should call onCreatePost when button clicked', () => {
      const mockCreatePost = vi.fn();
      render(<EmptyState onCreatePost={mockCreatePost} />);

      fireEvent.click(screen.getByText('Create First Post'));

      expect(mockCreatePost).toHaveBeenCalledTimes(1);
    });

    it('should not render button when onCreatePost not provided', () => {
      render(<EmptyState />);

      expect(screen.queryByText('Create First Post')).not.toBeInTheDocument();
    });
  });

  describe('No results variant', () => {
    it('should render no results title', () => {
      render(<EmptyState variant="no-results" />);

      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should render no results subtitle', () => {
      render(<EmptyState variant="no-results" />);

      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });

    it('should render search icon for no-results variant', () => {
      render(<EmptyState variant="no-results" />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render Clear Filters button when onClearFilters provided', () => {
      const mockClearFilters = vi.fn();
      render(<EmptyState variant="no-results" onClearFilters={mockClearFilters} />);

      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should call onClearFilters when button clicked', () => {
      const mockClearFilters = vi.fn();
      render(<EmptyState variant="no-results" onClearFilters={mockClearFilters} />);

      fireEvent.click(screen.getByText('Clear Filters'));

      expect(mockClearFilters).toHaveBeenCalledTimes(1);
    });

    it('should not render Clear Filters button when onClearFilters not provided', () => {
      render(<EmptyState variant="no-results" />);

      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should use dashed border on card', () => {
      render(<EmptyState />);

      expect(screen.getByTestId('card')).toHaveClass('border-dashed');
    });

    it('should center content', () => {
      render(<EmptyState />);

      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('items-center', 'justify-center', 'text-center');
    });
  });

  describe('Edge cases', () => {
    it('should default to empty variant', () => {
      render(<EmptyState />);

      // Should show empty variant content
      expect(screen.getByTestId('message-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('search-icon')).not.toBeInTheDocument();
    });

    it('should handle both callbacks provided', () => {
      const mockCreatePost = vi.fn();
      const mockClearFilters = vi.fn();

      // Empty variant ignores onClearFilters
      render(
        <EmptyState
          onCreatePost={mockCreatePost}
          onClearFilters={mockClearFilters}
        />
      );

      // Should only show create post button
      expect(screen.getByText('Create First Post')).toBeInTheDocument();
      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });
  });
});
