/**
 * ReplyThread Component Tests
 *
 * Tests for the ReplyThread component used in the bulletin board.
 * Tests rendering of replies, nested replies, interactions, and loading states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplyThread } from '@/components/bulletin/ReplyThread';
import type { ReplyNode } from '@/types/bulletin';

// =============================================================================
// Mocks
// =============================================================================

// Mock reply tree data
const mockReplyTree: ReplyNode[] = [];
const mockLoadReplies = vi.fn();
const mockCreateReply = vi.fn();
const mockDeleteReply = vi.fn().mockResolvedValue(true);
let mockIsLoading = false;

vi.mock('@/hooks/bulletin', () => ({
  useReplies: () => ({
    replyTree: mockReplyTree,
    isLoading: mockIsLoading,
    loadReplies: mockLoadReplies,
    createReply: mockCreateReply,
    deleteReply: mockDeleteReply,
  }),
  isPostError: (error: unknown) => error && typeof error === 'object' && 'type' in error,
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'reply.placeholder': 'Write a reply...',
      'reply.replyTo': `Replying to ${params?.name ?? ''}`,
      'reply.deleted': '[Deleted]',
      'menu.delete': 'Delete',
      'menu.report': 'Report',
      'errors.rateLimitReplies': `Rate limited: ${params?.limit ?? 0}`,
      'errors.banned': 'You are banned',
      'errors.replyFailed': 'Reply failed',
    };
    return translations[key] ?? key;
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <p data-testid="markdown-content">{children}</p>,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-icon" className={className} />
  ),
  Reply: ({ className }: { className?: string }) => (
    <svg data-testid="reply-icon" className={className} />
  ),
  MoreHorizontal: ({ className }: { className?: string }) => (
    <svg data-testid="more-icon" className={className} />
  ),
  Trash2: ({ className }: { className?: string }) => (
    <svg data-testid="trash-icon" className={className} />
  ),
  Flag: ({ className }: { className?: string }) => (
    <svg data-testid="flag-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="avatar-fallback" className={className}>{children}</span>
  ),
}));

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
      data-testid={size === 'icon' ? 'icon-button' : 'button'}
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children, align }: { children: React.ReactNode; align?: string }) => (
    <div data-testid="dropdown-content" data-align={align}>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

// Mock ReplyComposer
vi.mock('@/components/bulletin/ReplyComposer', () => ({
  ReplyComposer: ({
    placeholder,
    onSubmit,
    onCancel,
    disabled,
  }: {
    placeholder?: string;
    onSubmit: (content: string) => void;
    onCancel?: () => void;
    disabled?: boolean;
  }) => (
    <div data-testid="reply-composer" data-disabled={disabled}>
      <input
        data-testid="reply-input"
        placeholder={placeholder}
        disabled={disabled}
      />
      <button
        data-testid="submit-reply"
        onClick={() => onSubmit('Test reply')}
        disabled={disabled}
      >
        Submit
      </button>
      {onCancel && (
        <button data-testid="cancel-reply" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// Mock bulletin types
vi.mock('@/types/bulletin', () => ({
  BULLETIN_CONSTANTS: {
    DAILY_REPLY_LIMIT: 50,
  },
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockReply = (overrides: Partial<ReplyNode> = {}): ReplyNode => ({
  id: 'reply-001',
  post_id: 'post-001',
  parent_reply_id: null,
  author_id: 'user-001',
  author_name: 'John Doe',
  author_avatar: 'https://example.com/avatar.jpg',
  content: 'This is a test reply.',
  is_deleted: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  children: [],
  ...overrides,
});

// Mock RichContentRenderer
vi.mock('@/components/bulletin/RichContentRenderer', () => ({
  RichContentRenderer: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="rich-content" className={className}>{content}</div>
  ),
}));

// =============================================================================
// Tests
// =============================================================================

describe('ReplyThread', () => {
  const defaultProps = {
    postId: 'post-001',
    currentUser: { id: 'user-001', name: 'John Doe', avatar: 'https://example.com/avatar.jpg' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReplyTree.length = 0;
    mockIsLoading = false;
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the reply composer', () => {
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    });

    it('should load replies on mount', () => {
      render(<ReplyThread {...defaultProps} />);

      expect(mockLoadReplies).toHaveBeenCalledWith('post-001');
    });

    it('should render reply list when replies exist', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('This is a test reply.')).toBeInTheDocument();
    });

    it('should render author name on replies', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render time ago on replies', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests
  // ===========================================================================

  describe('Props', () => {
    it('should disable composer when no current user', () => {
      render(<ReplyThread {...defaultProps} currentUser={null} />);

      expect(screen.getByTestId('reply-composer')).toHaveAttribute('data-disabled', 'true');
    });

    it('should enable composer when user is logged in', () => {
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByTestId('reply-composer')).toHaveAttribute('data-disabled', 'false');
    });
  });

  // ===========================================================================
  // Reply Item Tests
  // ===========================================================================

  describe('Reply Items', () => {
    it('should render avatar with fallback initials', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should render deleted message for deleted replies', () => {
      mockReplyTree.push(createMockReply({ is_deleted: true }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('[Deleted]')).toBeInTheDocument();
    });

    it('should not render content for deleted replies', () => {
      mockReplyTree.push(createMockReply({ is_deleted: true }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.queryByText('This is a test reply.')).not.toBeInTheDocument();
    });

    it('should render nested replies', () => {
      mockReplyTree.push(
        createMockReply({
          children: [
            createMockReply({
              id: 'reply-002',
              content: 'Nested reply content',
              parent_reply_id: 'reply-001',
            }),
          ],
        })
      );
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('Nested reply content')).toBeInTheDocument();
    });

    it('should show reply button only for depth 1 replies', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('Reply')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call createReply when submitting', async () => {
      mockCreateReply.mockResolvedValue({ id: 'new-reply' });
      render(<ReplyThread {...defaultProps} />);

      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(mockCreateReply).toHaveBeenCalled();
      });
    });

    it('should call onReplyCountChange with +1 when reply created', async () => {
      mockCreateReply.mockResolvedValue({ id: 'new-reply' });
      const onReplyCountChange = vi.fn();
      render(<ReplyThread {...defaultProps} onReplyCountChange={onReplyCountChange} />);

      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(onReplyCountChange).toHaveBeenCalledWith(1);
      });
    });

    it('should call deleteReply when delete clicked', async () => {
      mockReplyTree.push(createMockReply({ author_id: 'user-001' }));
      render(<ReplyThread {...defaultProps} />);

      // Find and click the delete menu item
      const deleteButtons = screen.getAllByTestId('dropdown-item');
      const deleteButton = deleteButtons.find((btn) => btn.textContent?.includes('Delete'));
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(mockDeleteReply).toHaveBeenCalledWith('reply-001');
      });
    });

    it('should call onReplyCountChange with -1 when reply deleted', async () => {
      mockReplyTree.push(createMockReply({ author_id: 'user-001' }));
      const onReplyCountChange = vi.fn();
      render(<ReplyThread {...defaultProps} onReplyCountChange={onReplyCountChange} />);

      const deleteButtons = screen.getAllByTestId('dropdown-item');
      const deleteButton = deleteButtons.find((btn) => btn.textContent?.includes('Delete'));
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(onReplyCountChange).toHaveBeenCalledWith(-1);
      });
    });

    it('should call onReportReply when report clicked', () => {
      mockReplyTree.push(createMockReply({ author_id: 'user-002' })); // Different author
      const onReportReply = vi.fn();
      render(
        <ReplyThread
          {...defaultProps}
          onReportReply={onReportReply}
        />
      );

      const reportButtons = screen.getAllByTestId('dropdown-item');
      const reportButton = reportButtons.find((btn) => btn.textContent?.includes('Report'));
      if (reportButton) {
        fireEvent.click(reportButton);
      }

      expect(onReportReply).toHaveBeenCalledWith('reply-001');
    });
  });

  // ===========================================================================
  // Author Permissions Tests
  // ===========================================================================

  describe('Author Permissions', () => {
    it('should show delete option for reply author', () => {
      mockReplyTree.push(createMockReply({ author_id: 'user-001' }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show report option for non-author', () => {
      mockReplyTree.push(createMockReply({ author_id: 'user-002' }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('Report')).toBeInTheDocument();
    });

    it('should not show report for own replies', () => {
      mockReplyTree.push(createMockReply({ author_id: 'user-001' }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.queryByText('Report')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty reply tree', () => {
      render(<ReplyThread {...defaultProps} />);

      // Only composer should be visible
      expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should handle single letter name for initials', () => {
      mockReplyTree.push(createMockReply({ author_name: 'J' }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J');
    });

    it('should handle empty name for initials', () => {
      mockReplyTree.push(createMockReply({ author_name: '' }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?');
    });

    it('should handle null avatar', () => {
      mockReplyTree.push(createMockReply({ author_avatar: null }));
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      mockIsLoading = true;
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should not show reply composer when loading', () => {
      mockIsLoading = true;
      render(<ReplyThread {...defaultProps} />);

      expect(screen.queryByTestId('reply-composer')).not.toBeInTheDocument();
    });

    it('should not show replies when loading', () => {
      mockIsLoading = true;
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      expect(screen.queryByText('This is a test reply.')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should show rate limit toast on rate_limit error', async () => {
      const { toast } = await import('sonner');
      mockCreateReply.mockRejectedValue({ type: 'rate_limit' });
      render(<ReplyThread {...defaultProps} />);

      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Rate limited: 50');
      });
    });

    it('should show banned toast on banned error', async () => {
      const { toast } = await import('sonner');
      mockCreateReply.mockRejectedValue({ type: 'banned' });
      render(<ReplyThread {...defaultProps} />);

      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('You are banned');
      });
    });

    it('should show generic error toast on unknown error type', async () => {
      const { toast } = await import('sonner');
      mockCreateReply.mockRejectedValue({ type: 'unknown_error' });
      render(<ReplyThread {...defaultProps} />);

      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Reply failed');
      });
    });

    it('should show generic error toast on non-PostError', async () => {
      const { toast } = await import('sonner');
      mockCreateReply.mockRejectedValue(new Error('Network error'));
      render(<ReplyThread {...defaultProps} />);

      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Reply failed');
      });
    });
  });

  // ===========================================================================
  // Reply State Tests
  // ===========================================================================

  describe('Reply State', () => {
    it('should set replyingTo state when clicking Reply button', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      fireEvent.click(screen.getByText('Reply'));

      // Check that the placeholder updated to show replying to
      expect(screen.getByPlaceholderText('Replying to John Doe')).toBeInTheDocument();
    });

    it('should show cancel button when replying to someone', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      fireEvent.click(screen.getByText('Reply'));

      expect(screen.getByTestId('cancel-reply')).toBeInTheDocument();
    });

    it('should clear replyingTo state when clicking cancel', () => {
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      // Click reply to set replyingTo
      fireEvent.click(screen.getByText('Reply'));
      expect(screen.getByTestId('cancel-reply')).toBeInTheDocument();

      // Click cancel
      fireEvent.click(screen.getByTestId('cancel-reply'));

      // Should return to default placeholder
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    it('should clear replyingTo state after successful reply', async () => {
      mockCreateReply.mockResolvedValue({ id: 'new-reply' });
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      // Click reply to set replyingTo
      fireEvent.click(screen.getByText('Reply'));
      expect(screen.getByPlaceholderText('Replying to John Doe')).toBeInTheDocument();

      // Submit the reply
      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        // Should return to default placeholder
        expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
      });
    });

    it('should not submit reply when no current user', async () => {
      render(<ReplyThread {...defaultProps} currentUser={null} />);

      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(mockCreateReply).not.toHaveBeenCalled();
      });
    });

    it('should pass parent_reply_id when replying to a reply', async () => {
      mockCreateReply.mockResolvedValue({ id: 'new-reply' });
      mockReplyTree.push(createMockReply());
      render(<ReplyThread {...defaultProps} />);

      // Click reply to set replyingTo
      fireEvent.click(screen.getByText('Reply'));

      // Submit the reply
      fireEvent.click(screen.getByTestId('submit-reply'));

      await waitFor(() => {
        expect(mockCreateReply).toHaveBeenCalledWith(
          expect.objectContaining({
            post_id: 'post-001',
            parent_reply_id: 'reply-001',
            content: 'Test reply',
          }),
          expect.any(Object)
        );
      });
    });
  });

  // ===========================================================================
  // Nested Reply Tests
  // ===========================================================================

  describe('Nested Replies', () => {
    it('should not show Reply button for depth 2 replies', () => {
      mockReplyTree.push(
        createMockReply({
          children: [
            createMockReply({
              id: 'reply-002',
              content: 'Nested reply',
              parent_reply_id: 'reply-001',
            }),
          ],
        })
      );
      render(<ReplyThread {...defaultProps} />);

      // Should only have one Reply button (for the parent)
      const replyButtons = screen.getAllByText('Reply');
      expect(replyButtons).toHaveLength(1);
    });

    it('should render deleted nested reply message', () => {
      mockReplyTree.push(
        createMockReply({
          children: [
            createMockReply({
              id: 'reply-002',
              is_deleted: true,
              parent_reply_id: 'reply-001',
            }),
          ],
        })
      );
      render(<ReplyThread {...defaultProps} />);

      expect(screen.getByText('[Deleted]')).toBeInTheDocument();
    });
  });
});
