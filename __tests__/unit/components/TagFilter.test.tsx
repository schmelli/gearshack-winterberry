/**
 * TagFilter Component Tests
 *
 * Tests for the TagFilter component used in the bulletin board.
 * Tests rendering of tag chips, interactions, and filter state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagFilter } from '@/components/bulletin/TagFilter';
import type { PostTag } from '@/types/bulletin';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'tags.all': 'All Posts',
      'tags.question': 'Questions',
      'tags.shakedown': 'Shakedowns',
      'tags.trade': 'Trade',
      'tags.tripplanning': 'Trip Planning',
      'tags.gearadvice': 'Gear Advice',
      'tags.other': 'Other',
      'filter.activeFilter': `Filtered by: ${params?.tag ?? ''}`,
      'filter.clearFilter': 'Clear filter',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      data-testid={`tag-button-${(children as string)?.toString().toLowerCase().replace(' ', '-')}`}
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      className={className}
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
    <span data-testid="active-filter-badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// Mock bulletin types
vi.mock('@/types/bulletin', () => ({
  POST_TAGS: [
    { value: 'question', labelKey: 'tags.question' },
    { value: 'shakedown', labelKey: 'tags.shakedown' },
    { value: 'trade', labelKey: 'tags.trade' },
    { value: 'trip_planning', labelKey: 'tags.tripplanning' },
    { value: 'gear_advice', labelKey: 'tags.gearadvice' },
    { value: 'other', labelKey: 'tags.other' },
  ],
}));

// =============================================================================
// Tests
// =============================================================================

describe('TagFilter', () => {
  let mockOnTagChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnTagChange = vi.fn();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the All Posts button', () => {
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      expect(screen.getByText('All Posts')).toBeInTheDocument();
    });

    it('should render all tag buttons', () => {
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      expect(screen.getByText('Questions')).toBeInTheDocument();
      expect(screen.getByText('Shakedowns')).toBeInTheDocument();
      expect(screen.getByText('Trade')).toBeInTheDocument();
      expect(screen.getByText('Trip Planning')).toBeInTheDocument();
      expect(screen.getByText('Gear Advice')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });

    it('should render tags in a flex container', () => {
      const { container } = render(
        <TagFilter activeTag={null} onTagChange={mockOnTagChange} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-wrap');
      expect(wrapper).toHaveClass('gap-2');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TagFilter
          activeTag={null}
          onTagChange={mockOnTagChange}
          className="custom-class"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  // ===========================================================================
  // Props Tests - Active State
  // ===========================================================================

  describe('Active State', () => {
    it('should show All Posts as default when no tag is active', () => {
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      const allButton = screen.getByText('All Posts');
      expect(allButton).toHaveAttribute('data-variant', 'default');
    });

    it('should show All Posts as outline when a tag is active', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      const allButton = screen.getByText('All Posts');
      expect(allButton).toHaveAttribute('data-variant', 'outline');
    });

    it('should show active tag button as default variant', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      const questionButton = screen.getByText('Questions');
      expect(questionButton).toHaveAttribute('data-variant', 'default');
    });

    it('should show inactive tag buttons as outline variant', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      const tradeButton = screen.getByText('Trade');
      expect(tradeButton).toHaveAttribute('data-variant', 'outline');
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onTagChange with null when All Posts is clicked', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('All Posts'));

      expect(mockOnTagChange).toHaveBeenCalledWith(null);
    });

    it('should call onTagChange with tag value when tag is clicked', () => {
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('Questions'));

      expect(mockOnTagChange).toHaveBeenCalledWith('question');
    });

    it('should toggle tag off when same tag is clicked', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('Questions'));

      expect(mockOnTagChange).toHaveBeenCalledWith(null);
    });

    it('should switch tags when different tag is clicked', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('Trade'));

      expect(mockOnTagChange).toHaveBeenCalledWith('trade');
    });
  });

  // ===========================================================================
  // Filter Badge Tests
  // ===========================================================================

  describe('Filter Badge', () => {
    it('should not show filter badge when no tag is active', () => {
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      expect(screen.queryByTestId('active-filter-badge')).not.toBeInTheDocument();
    });

    it('should show filter badge when a tag is active', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      expect(screen.getByTestId('active-filter-badge')).toBeInTheDocument();
    });

    it('should show X icon in filter badge', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('should clear filter when badge X is clicked', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      const clearButton = screen.getByLabelText('Clear filter');
      fireEvent.click(clearButton);

      expect(mockOnTagChange).toHaveBeenCalledWith(null);
    });

    it('should have accessible clear button', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      const clearButton = screen.getByLabelText('Clear filter');
      expect(clearButton).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have aria-label on clear filter button', () => {
      render(<TagFilter activeTag="question" onTagChange={mockOnTagChange} />);

      const clearButton = screen.getByLabelText('Clear filter');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear filter');
    });

    it('should have small size for all tag buttons', () => {
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      const allButton = screen.getByText('All Posts');
      expect(allButton).toHaveAttribute('data-size', 'sm');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid tag switching', () => {
      render(<TagFilter activeTag={null} onTagChange={mockOnTagChange} />);

      fireEvent.click(screen.getByText('Questions'));
      fireEvent.click(screen.getByText('Trade'));
      fireEvent.click(screen.getByText('Shakedowns'));

      expect(mockOnTagChange).toHaveBeenCalledTimes(3);
      expect(mockOnTagChange).toHaveBeenNthCalledWith(1, 'question');
      expect(mockOnTagChange).toHaveBeenNthCalledWith(2, 'trade');
      expect(mockOnTagChange).toHaveBeenNthCalledWith(3, 'shakedown');
    });

    it('should handle all tag types as active', () => {
      const tags: PostTag[] = ['question', 'shakedown', 'trade', 'trip_planning', 'gear_advice', 'other'];

      tags.forEach((tag) => {
        const { unmount } = render(
          <TagFilter activeTag={tag} onTagChange={mockOnTagChange} />
        );
        expect(screen.getByTestId('active-filter-badge')).toBeInTheDocument();
        unmount();
      });
    });
  });
});
