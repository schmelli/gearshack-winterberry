/**
 * VipMention Component Tests
 *
 * Tests for the VipMention component that renders VIP profile links.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VipMention } from '@/components/bulletin/VipMention';

// Mock next-intl navigation
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className} data-testid="vip-link">{children}</a>
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  User: ({ className }: { className?: string }) => (
    <svg data-testid="user-icon" className={className} />
  ),
}));

describe('VipMention', () => {
  describe('Rendering with slug only', () => {
    it('should render with @slug format when no name provided', () => {
      render(<VipMention slug="andrew-skurka" />);

      expect(screen.getByText('@andrew-skurka')).toBeInTheDocument();
    });

    it('should link to correct VIP profile URL', () => {
      render(<VipMention slug="darwin-on-trail" />);

      const link = screen.getByTestId('vip-link');
      expect(link).toHaveAttribute('href', '/vip/darwin-on-trail');
    });

    it('should render user icon', () => {
      render(<VipMention slug="gear-skeptic" />);

      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });
  });

  describe('Rendering with name provided', () => {
    it('should display name instead of @slug', () => {
      render(<VipMention slug="andrew-skurka" name="Andrew Skurka" />);

      expect(screen.getByText('Andrew Skurka')).toBeInTheDocument();
      expect(screen.queryByText('@andrew-skurka')).not.toBeInTheDocument();
    });

    it('should still link to correct VIP profile URL when name provided', () => {
      render(<VipMention slug="jupiter-hikes" name="Jupiter" />);

      const link = screen.getByTestId('vip-link');
      expect(link).toHaveAttribute('href', '/vip/jupiter-hikes');
    });
  });

  describe('Styling and accessibility', () => {
    it('should have proper styling classes', () => {
      render(<VipMention slug="test-vip" />);

      const link = screen.getByTestId('vip-link');
      expect(link).toHaveClass('inline-flex');
      expect(link).toHaveClass('items-center');
      expect(link).toHaveClass('text-primary');
    });

    it('should render as inline element for text flow', () => {
      render(
        <p>
          Check out <VipMention slug="test-vip" name="Test VIP" /> for more info
        </p>
      );

      expect(screen.getByText('Test VIP')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle slugs with special characters', () => {
      render(<VipMention slug="vip-123-test" />);

      const link = screen.getByTestId('vip-link');
      expect(link).toHaveAttribute('href', '/vip/vip-123-test');
    });

    it('should handle empty name by falling back to @slug', () => {
      render(<VipMention slug="test-slug" name="" />);

      // Empty string is falsy, so should show @slug
      expect(screen.getByText('@test-slug')).toBeInTheDocument();
    });
  });
});
