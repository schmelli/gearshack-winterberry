/**
 * PostSkeleton Component Tests
 *
 * Tests for the loading skeleton component that displays
 * placeholder content while posts are loading.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostSkeleton } from '@/components/bulletin/PostSkeleton';

// Mock shadcn components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe('PostSkeleton', () => {
  describe('Default rendering', () => {
    it('should render 3 skeleton cards by default', () => {
      render(<PostSkeleton />);

      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(3);
    });

    it('should render skeletons inside each card', () => {
      render(<PostSkeleton />);

      // Each card contains multiple skeletons
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(3);
    });
  });

  describe('Custom count', () => {
    it('should render specified number of cards', () => {
      render(<PostSkeleton count={5} />);

      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(5);
    });

    it('should render 1 card when count is 1', () => {
      render(<PostSkeleton count={1} />);

      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(1);
    });

    it('should render 0 cards when count is 0', () => {
      render(<PostSkeleton count={0} />);

      const cards = screen.queryAllByTestId('card');
      expect(cards).toHaveLength(0);
    });

    it('should render 10 cards when count is 10', () => {
      render(<PostSkeleton count={10} />);

      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(10);
    });
  });

  describe('Skeleton structure', () => {
    it('should have avatar skeleton (round shape)', () => {
      render(<PostSkeleton count={1} />);

      const skeletons = screen.getAllByTestId('skeleton');
      const roundSkeleton = skeletons.find(s => s.className?.includes('rounded-full'));
      expect(roundSkeleton).toBeDefined();
    });

    it('should have content skeletons with varying widths', () => {
      render(<PostSkeleton count={1} />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Should have full width, 3/4 width, and 1/2 width content lines
      const widthClasses = skeletons.map(s => s.className || '');
      expect(widthClasses.some(c => c.includes('w-full'))).toBe(true);
      expect(widthClasses.some(c => c.includes('w-3/4'))).toBe(true);
      expect(widthClasses.some(c => c.includes('w-1/2'))).toBe(true);
    });

    it('should have tag badge skeleton', () => {
      render(<PostSkeleton count={1} />);

      const skeletons = screen.getAllByTestId('skeleton');
      // Tag badge should have rounded-full class
      const badgeSkeleton = skeletons.find(
        s => s.className?.includes('rounded-full') && s.className?.includes('h-5')
      );
      expect(badgeSkeleton).toBeDefined();
    });
  });

  describe('Layout', () => {
    it('should wrap cards in a spaced container', () => {
      const { container } = render(<PostSkeleton count={2} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('space-y-4');
    });

    it('should render card content with padding', () => {
      render(<PostSkeleton count={1} />);

      const cardContent = screen.getByTestId('card-content');
      expect(cardContent).toHaveClass('py-4');
    });
  });

  describe('Edge cases', () => {
    it('should handle negative count gracefully', () => {
      // Negative count should result in 0 cards (Array.from handles this)
      render(<PostSkeleton count={-1} />);

      const cards = screen.queryAllByTestId('card');
      expect(cards).toHaveLength(0);
    });

    it('should handle large count', () => {
      render(<PostSkeleton count={100} />);

      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(100);
    });
  });
});
