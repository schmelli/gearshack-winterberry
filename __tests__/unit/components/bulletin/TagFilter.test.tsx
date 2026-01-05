/**
 * TagFilter Component Tests
 *
 * Tests for the tag filter component with category chips.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagFilter } from '@/components/bulletin/TagFilter';
import type { PostTag } from '@/types/bulletin';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'tags.all': 'All Posts',
      'tags.gear_review': 'Gear Review',
      'tags.trip_report': 'Trip Report',
      'tags.question': 'Question',
      'tags.discussion': 'Discussion',
      'tags.gear_sale': 'Gear Sale',
      'tags.tip': 'Tip',
      'tags.gearreview': 'Gear Review',
      'tags.tripreport': 'Trip Report',
      'tags.gearsale': 'Gear Sale',
      'filter.activeFilter': `Filtered by: ${params?.tag || ''}`,
      'filter.clearFilter': 'Clear filter',
    };
    return translations[key] || key;
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
}));

// Mock types/bulletin
vi.mock('@/types/bulletin', () => ({
  POST_TAGS: [
    { value: 'gear_review', labelKey: 'tags.gear_review' },
    { value: 'trip_report', labelKey: 'tags.trip_report' },
    { value: 'question', labelKey: 'tags.question' },
    { value: 'discussion', labelKey: 'tags.discussion' },
    { value: 'gear_sale', labelKey: 'tags.gear_sale' },
    { value: 'tip', labelKey: 'tags.tip' },
  ],
}));

// Mock shadcn components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      data-testid="filter-button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
  }) => (
    <span data-testid="active-badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

describe('TagFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render All Posts button', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      expect(screen.getByText('All Posts')).toBeInTheDocument();
    });

    it('should render all tag buttons', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      expect(screen.getByText('Gear Review')).toBeInTheDocument();
      expect(screen.getByText('Trip Report')).toBeInTheDocument();
      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('Discussion')).toBeInTheDocument();
      expect(screen.getByText('Gear Sale')).toBeInTheDocument();
      expect(screen.getByText('Tip')).toBeInTheDocument();
    });

    it('should render correct number of filter buttons', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      // All Posts + 6 tags = 7 buttons
      const buttons = screen.getAllByTestId('filter-button');
      expect(buttons).toHaveLength(7);
    });
  });

  describe('Active state', () => {
    it('should show All Posts as active when no tag selected', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      const allButton = screen.getByText('All Posts').closest('button');
      expect(allButton).toHaveAttribute('data-variant', 'default');
    });

    it('should show selected tag as active', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag="gear_review" onTagChange={mockOnTagChange} />);

      const gearReviewButton = screen.getByText('Gear Review').closest('button');
      expect(gearReviewButton).toHaveAttribute('data-variant', 'default');
    });

    it('should show other tags as outline when one is selected', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag="gear_review" onTagChange={mockOnTagChange} />);

      const tripReportButton = screen.getByText('Trip Report').closest('button');
      expect(tripReportButton).toHaveAttribute('data-variant', 'outline');
    });

    it('should show active filter badge when tag selected', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      expect(screen.getByTestId('active-badge')).toBeInTheDocument();
    });

    it('should not show active filter badge when no tag selected', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      expect(screen.queryByTestId('active-badge')).not.toBeInTheDocument();
    });
  });

  describe('Click interactions', () => {
    it('should call onTagChange with null when All Posts clicked', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag="gear_review" onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('All Posts'));

      expect(mockOnTagChange).toHaveBeenCalledWith(null);
    });

    it('should call onTagChange with tag value when tag clicked', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('Trip Report'));

      expect(mockOnTagChange).toHaveBeenCalledWith('trip_report');
    });

    it('should toggle off when same tag clicked again', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('Question'));

      expect(mockOnTagChange).toHaveBeenCalledWith(null);
    });

    it('should clear filter when X button in badge clicked', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag="discussion" onTagChange={mockOnTagChange} />);

      const xIcon = screen.getByTestId('x-icon');
      const clearButton = xIcon.closest('button');
      fireEvent.click(clearButton!);

      expect(mockOnTagChange).toHaveBeenCalledWith(null);
    });
  });

  describe('Styling', () => {
    it('should use small size buttons', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      const buttons = screen.getAllByTestId('filter-button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('data-size', 'sm');
      });
    });

    it('should apply custom className', () => {
      const mockOnTagChange = vi.fn();
      const { container } = render(
        <TagFilter
          activeTag={null}
          onTagChange={mockOnTagChange}
          className="custom-filter-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-filter-class');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible clear filter button', () => {
      const mockOnTagChange = vi.fn();
      render(<TagFilter activeTag="tip" onTagChange={mockOnTagChange} />);

      const badge = screen.getByTestId('active-badge');
      const clearButton = badge.querySelector('button');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear filter');
    });
  });

  describe('Edge cases', () => {
    it('should handle all tag values', () => {
      const mockOnTagChange = vi.fn();
      const tags: PostTag[] = [
        'gear_review',
        'trip_report',
        'question',
        'discussion',
        'gear_sale',
        'tip',
      ];

      tags.forEach(tag => {
        const { unmount } = render(
          <TagFilter activeTag={tag} onTagChange={mockOnTagChange} />
        );
        expect(screen.getByTestId('active-badge')).toBeInTheDocument();
        unmount();
      });
    });
  });
});
