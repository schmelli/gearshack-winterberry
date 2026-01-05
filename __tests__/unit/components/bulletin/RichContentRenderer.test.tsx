/**
 * RichContentRenderer Component Tests
 *
 * Tests for the rich content renderer that parses markdown,
 * YouTube links, VIP mentions, and gear item references.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RichContentRenderer } from '@/components/bulletin/RichContentRenderer';

// Mock child components using full paths
vi.mock('@/components/bulletin/YouTubePreview', () => ({
  YouTubePreview: ({ videoId, url }: { videoId: string; url: string }) => (
    <div data-testid="youtube-preview" data-video-id={videoId} data-url={url}>
      YouTube: {videoId}
    </div>
  ),
}));

vi.mock('@/components/bulletin/VipMention', () => ({
  VipMention: ({ slug, name }: { slug: string; name?: string }) => (
    <span data-testid="vip-mention" data-slug={slug}>
      VIP: {name || slug}
    </span>
  ),
}));

vi.mock('@/components/bulletin/GearItemReference', () => ({
  GearItemReference: ({ itemId, name }: { itemId: string; name?: string }) => (
    <div data-testid="gear-item" data-item-id={itemId}>
      Gear: {name || itemId}
    </div>
  ),
}));

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

describe('RichContentRenderer', () => {
  describe('Plain text rendering', () => {
    it('should render plain text content', () => {
      render(<RichContentRenderer content="Hello, world!" />);

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('should render multiline text', () => {
      render(<RichContentRenderer content="Line one\nLine two\nLine three" />);

      expect(screen.getByText(/Line one/)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <RichContentRenderer content="Test" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('YouTube URL detection', () => {
    it('should detect youtu.be short URLs as standalone lines', () => {
      // YouTube URLs must be on their own line and start with http to be detected
      render(
        <RichContentRenderer content="https://youtu.be/dQw4w9WgXcQ" />
      );

      expect(screen.getByTestId('youtube-preview')).toBeInTheDocument();
      expect(screen.getByTestId('youtube-preview')).toHaveAttribute(
        'data-video-id',
        'dQw4w9WgXcQ'
      );
    });

    it('should detect youtube.com/embed URLs', () => {
      render(
        <RichContentRenderer content="https://www.youtube.com/embed/dQw4w9WgXcQ" />
      );

      expect(screen.getByTestId('youtube-preview')).toBeInTheDocument();
      expect(screen.getByTestId('youtube-preview')).toHaveAttribute(
        'data-video-id',
        'dQw4w9WgXcQ'
      );
    });

    it('should detect youtube.com/watch URLs', () => {
      render(
        <RichContentRenderer content="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
      );

      expect(screen.getByTestId('youtube-preview')).toBeInTheDocument();
    });
  });

  describe('VIP mention detection', () => {
    it('should detect VIP profile links', () => {
      render(
        <RichContentRenderer content="Check out [Andrew Skurka](/vip/andrew-skurka) for tips!" />
      );

      const mention = screen.getByTestId('vip-mention');
      expect(mention).toBeInTheDocument();
      expect(mention).toHaveAttribute('data-slug', 'andrew-skurka');
      expect(screen.getByText('VIP: Andrew Skurka')).toBeInTheDocument();
    });

    it('should handle multiple VIP mentions', () => {
      render(
        <RichContentRenderer content="[Jupiter](/vip/jupiter-hikes) and [Darwin](/vip/darwin-on-trail) are great!" />
      );

      const mentions = screen.getAllByTestId('vip-mention');
      expect(mentions).toHaveLength(2);
    });
  });

  describe('Gear item reference detection', () => {
    it('should detect gear item references', () => {
      render(
        <RichContentRenderer content="I love my [Zpacks Duplex](#gear:duplex-123)!" />
      );

      const gearItem = screen.getByTestId('gear-item');
      expect(gearItem).toBeInTheDocument();
      expect(gearItem).toHaveAttribute('data-item-id', 'duplex-123');
    });

    it('should display gear name from link text', () => {
      render(
        <RichContentRenderer content="My [Custom Quilt](#gear:quilt-456) is warm." />
      );

      expect(screen.getByText('Gear: Custom Quilt')).toBeInTheDocument();
    });
  });

  describe('Mixed content', () => {
    it('should handle VIP mentions and gear items together', () => {
      render(
        <RichContentRenderer content="[Andrew](/vip/andrew) recommends the [Tent](#gear:tent-1)!" />
      );

      expect(screen.getByTestId('vip-mention')).toBeInTheDocument();
      expect(screen.getByTestId('gear-item')).toBeInTheDocument();
    });

    it('should render VIP mentions inline with text', () => {
      render(
        <RichContentRenderer content="Check out [Jupiter](/vip/jupiter-hikes) for tips!" />
      );

      expect(screen.getByTestId('vip-mention')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content', () => {
      const { container } = render(<RichContentRenderer content="" />);

      // Should render empty container without errors
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle content with only whitespace', () => {
      const { container } = render(<RichContentRenderer content="   \n   \n   " />);

      expect(container.firstChild).toBeInTheDocument();
    });

    it('should not detect YouTube IDs in regular text', () => {
      render(
        <RichContentRenderer content="The code dQw4w9WgXcQ is important" />
      );

      expect(screen.queryByTestId('youtube-preview')).not.toBeInTheDocument();
    });

    it('should handle URLs that are not YouTube', () => {
      render(
        <RichContentRenderer content="Visit https://example.com for more info" />
      );

      expect(screen.queryByTestId('youtube-preview')).not.toBeInTheDocument();
      expect(screen.getByText(/Visit https:\/\/example.com/)).toBeInTheDocument();
    });
  });
});
