/**
 * YouTubePreview Component Tests
 *
 * Tests for the YouTube video preview component that displays
 * thumbnails and metadata using the oEmbed API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { YouTubePreview } from '@/components/bulletin/YouTubePreview';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Play: ({ className }: { className?: string }) => (
    <svg data-testid="play-icon" className={className} />
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <svg data-testid="external-link-icon" className={className} />
  ),
}));

// Mock shadcn components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/aspect-ratio', () => ({
  AspectRatio: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="aspect-ratio" className={className}>{children}</div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockVideoMetadata = {
  title: 'PCT Gear Review 2024',
  author_name: 'Andrew Skurka',
  thumbnail_url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
};

describe('YouTubePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Loading state', () => {
    it('should show skeleton while loading', () => {
      // Keep fetch pending to maintain loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<YouTubePreview videoId="abc123" url="https://youtube.com/watch?v=abc123" />);

      expect(screen.getAllByTestId('skeleton')).toHaveLength(3);
    });

    it('should show aspect ratio skeleton for video placeholder', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<YouTubePreview videoId="test123" url="https://youtube.com/watch?v=test123" />);

      expect(screen.getByTestId('aspect-ratio')).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    it('should display video title after loading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      render(<YouTubePreview videoId="abc123" url="https://youtube.com/watch?v=abc123" />);

      await waitFor(() => {
        expect(screen.getByText('PCT Gear Review 2024')).toBeInTheDocument();
      });
    });

    it('should display author name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      render(<YouTubePreview videoId="abc123" url="https://youtube.com/watch?v=abc123" />);

      await waitFor(() => {
        expect(screen.getByText('Andrew Skurka')).toBeInTheDocument();
      });
    });

    it('should display thumbnail image', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      render(<YouTubePreview videoId="abc123" url="https://youtube.com/watch?v=abc123" />);

      await waitFor(() => {
        const img = screen.getByAltText('PCT Gear Review 2024');
        expect(img).toHaveAttribute('src', mockVideoMetadata.thumbnail_url);
      });
    });

    it('should render link to YouTube video', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      const testUrl = 'https://youtube.com/watch?v=abc123';
      render(<YouTubePreview videoId="abc123" url={testUrl} />);

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', testUrl);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should show play icon overlay', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      render(<YouTubePreview videoId="abc123" url="https://youtube.com/watch?v=abc123" />);

      await waitFor(() => {
        expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Error state', () => {
    it('should show fallback link when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const testUrl = 'https://youtube.com/watch?v=abc123';
      render(<YouTubePreview videoId="abc123" url={testUrl} />);

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', testUrl);
      });
    });

    it('should show URL text in fallback', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const testUrl = 'https://youtube.com/watch?v=abc123';
      render(<YouTubePreview videoId="abc123" url={testUrl} />);

      await waitFor(() => {
        expect(screen.getByText(testUrl)).toBeInTheDocument();
      });
    });

    it('should show external link icon in fallback', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<YouTubePreview videoId="abc123" url="https://youtube.com/watch?v=abc123" />);

      await waitFor(() => {
        expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
      });
    });

    it('should show fallback when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const testUrl = 'https://youtube.com/watch?v=notfound';
      render(<YouTubePreview videoId="notfound" url={testUrl} />);

      await waitFor(() => {
        expect(screen.getByText(testUrl)).toBeInTheDocument();
      });
    });
  });

  describe('API interaction', () => {
    it('should call oEmbed API with correct video ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      render(<YouTubePreview videoId="myVideoId123" url="https://youtube.com/watch?v=myVideoId123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=myVideoId123&format=json'
        );
      });
    });

    it('should only fetch once per mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      render(<YouTubePreview videoId="abc123" url="https://youtube.com/watch?v=abc123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const testUrl = 'https://youtube.com/watch?v=abc123';
      render(<YouTubePreview videoId="abc123" url={testUrl} />);

      // Empty metadata should trigger fallback (error state)
      await waitFor(() => {
        // The component shows fallback link when metadata is null/empty
        expect(screen.getByRole('link')).toHaveAttribute('href', testUrl);
      });
    });

    it('should handle special characters in video ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVideoMetadata),
      });

      render(<YouTubePreview videoId="a-b_c123" url="https://youtube.com/watch?v=a-b_c123" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('v=a-b_c123')
        );
      });
    });
  });
});
