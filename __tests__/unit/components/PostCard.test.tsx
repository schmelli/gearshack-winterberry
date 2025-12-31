/**
 * PostCard Component Tests
 *
 * Tests for the PostCard component used in the bulletin board.
 * Tests rendering of author info, content, tags, replies, and actions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PostCard } from '@/components/bulletin/PostCard';
import type { BulletinPostWithAuthor, PostTag } from '@/types/bulletin';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'post.deleted': 'This post has been deleted',
      'post.editedLabel': '(edited)',
      'post.archived': 'Archived',
      'post.replies': `${params?.count ?? 0} replies`,
      'tags.question': 'Question',
      'tags.shakedown': 'Shakedown',
      'tags.trade': 'Trade',
      'tags.tripplanning': 'Trip Planning',
      'tags.gearadvice': 'Gear Advice',
      'tags.other': 'Other',
    };
    return translations[key] ?? key;
  },
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageSquare: ({ className }: { className?: string }) => (
    <svg data-testid="message-icon" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-down-icon" className={className} />
  ),
  ChevronUp: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-up-icon" className={className} />
  ),
  MoreHorizontal: ({ className }: { className?: string }) => (
    <svg data-testid="more-icon" className={className} />
  ),
  Pencil: ({ className }: { className?: string }) => (
    <svg data-testid="pencil-icon" className={className} />
  ),
  Trash2: ({ className }: { className?: string }) => (
    <svg data-testid="trash-icon" className={className} />
  ),
  Flag: ({ className }: { className?: string }) => (
    <svg data-testid="flag-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
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
  }) => {
    // Distinguish buttons by their content/size
    const isReplyButton = size === 'sm' && className?.includes('text-muted');
    return (
      <button
        data-testid={isReplyButton ? 'replies-button' : 'menu-trigger-button'}
        data-variant={variant}
        data-size={size}
        onClick={onClick}
        className={className}
      >
        {children}
      </button>
    );
  },
}));

// Mock PostMenu
vi.mock('@/components/bulletin/PostMenu', () => ({
  PostMenu: ({
    isAuthor,
    canEdit,
    onEdit,
    onDelete,
    onReport,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isAuthor: boolean;
    canEdit: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onReport: () => void;
  }) => (
    <div
      data-testid="post-menu"
      data-is-author={isAuthor}
      data-can-edit={canEdit}
    >
      <button data-testid="menu-edit" onClick={onEdit}>Edit</button>
      <button data-testid="menu-delete" onClick={onDelete}>Delete</button>
      <button data-testid="menu-report" onClick={onReport}>Report</button>
    </div>
  ),
}));

// Mock LinkedContentPreview
vi.mock('@/components/bulletin/LinkedContentPreview', () => ({
  LinkedContentPreview: ({
    contentType,
    contentId,
  }: {
    contentType: string;
    contentId: string;
  }) => (
    <div data-testid="linked-content" data-type={contentType} data-id={contentId}>
      Linked Content
    </div>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockPost = (
  overrides: Partial<BulletinPostWithAuthor> = {}
): BulletinPostWithAuthor => ({
  id: 'post-001',
  author_id: 'user-001',
  author_name: 'John Doe',
  author_avatar: 'https://example.com/avatar.jpg',
  content: 'This is a test post about hiking gear.',
  tag: 'gear_advice' as PostTag,
  linked_content_type: null,
  linked_content_id: null,
  is_deleted: false,
  is_archived: false,
  reply_count: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('PostCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-12-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the post card', () => {
      render(<PostCard post={createMockPost()} />);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should render author name', () => {
      render(<PostCard post={createMockPost()} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render author avatar', () => {
      render(<PostCard post={createMockPost()} />);

      const avatar = screen.getByTestId('avatar-image');
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should render avatar fallback with initials', () => {
      render(<PostCard post={createMockPost()} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should render post content', () => {
      render(<PostCard post={createMockPost()} />);

      expect(screen.getByText('This is a test post about hiking gear.')).toBeInTheDocument();
    });

    it('should render time ago', () => {
      render(<PostCard post={createMockPost()} />);

      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
    });

    it('should render reply count', () => {
      render(<PostCard post={createMockPost({ reply_count: 5 })} />);

      expect(screen.getByText('5 replies')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests - Tag Display
  // ===========================================================================

  describe('Tag Display', () => {
    it('should render tag badge when tag is provided', () => {
      render(<PostCard post={createMockPost({ tag: 'question' })} />);

      const badges = screen.getAllByTestId('badge');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should not render tag badge when tag is null', () => {
      render(<PostCard post={createMockPost({ tag: null })} />);

      // Should only have badge if archived, not for tag
      const badges = screen.queryAllByTestId('badge');
      expect(badges.length).toBe(0);
    });

    it('should apply correct color class for question tag', () => {
      render(<PostCard post={createMockPost({ tag: 'question' })} />);

      const badge = screen.getAllByTestId('badge')[0];
      expect(badge).toHaveClass('bg-blue-100');
    });
  });

  // ===========================================================================
  // Props Tests - States
  // ===========================================================================

  describe('States', () => {
    it('should render deleted message for deleted posts', () => {
      render(<PostCard post={createMockPost({ is_deleted: true })} />);

      expect(screen.getByText('This post has been deleted')).toBeInTheDocument();
    });

    it('should not render content for deleted posts', () => {
      render(<PostCard post={createMockPost({ is_deleted: true })} />);

      expect(screen.queryByText('This is a test post')).not.toBeInTheDocument();
    });

    it('should render archived badge for archived posts', () => {
      render(<PostCard post={createMockPost({ is_archived: true })} />);

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('should show edited label when post was updated', () => {
      const post = createMockPost({
        created_at: '2024-12-30T10:00:00Z',
        updated_at: '2024-12-30T11:00:00Z',
      });
      render(<PostCard post={post} />);

      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('should not show edited label when post was not updated', () => {
      const timestamp = '2024-12-30T10:00:00Z';
      const post = createMockPost({
        created_at: timestamp,
        updated_at: timestamp,
      });
      render(<PostCard post={post} />);

      expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onToggleReplies when reply button is clicked', () => {
      const onToggleReplies = vi.fn();
      render(
        <PostCard
          post={createMockPost()}
          onToggleReplies={onToggleReplies}
        />
      );

      fireEvent.click(screen.getByTestId('replies-button'));

      expect(onToggleReplies).toHaveBeenCalledWith('post-001');
    });

    it('should call onEdit when edit is triggered', () => {
      const onEdit = vi.fn();
      render(
        <PostCard
          post={createMockPost()}
          currentUserId="user-001"
          onEdit={onEdit}
        />
      );

      fireEvent.click(screen.getByTestId('menu-edit'));

      expect(onEdit).toHaveBeenCalledWith('post-001');
    });

    it('should call onDelete when delete is triggered', () => {
      const onDelete = vi.fn();
      render(
        <PostCard
          post={createMockPost()}
          currentUserId="user-001"
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByTestId('menu-delete'));

      expect(onDelete).toHaveBeenCalledWith('post-001');
    });

    it('should call onReport when report is triggered', () => {
      const onReport = vi.fn();
      render(
        <PostCard
          post={createMockPost()}
          onReport={onReport}
        />
      );

      fireEvent.click(screen.getByTestId('menu-report'));

      expect(onReport).toHaveBeenCalledWith('post-001');
    });
  });

  // ===========================================================================
  // Expanded State Tests
  // ===========================================================================

  describe('Expanded State', () => {
    it('should show chevron down when collapsed and has replies', () => {
      render(
        <PostCard
          post={createMockPost({ reply_count: 3 })}
          isExpanded={false}
        />
      );

      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    it('should show chevron up when expanded', () => {
      render(
        <PostCard
          post={createMockPost({ reply_count: 3 })}
          isExpanded={true}
        />
      );

      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
    });

    it('should not show chevron when no replies', () => {
      render(
        <PostCard
          post={createMockPost({ reply_count: 0 })}
          isExpanded={false}
        />
      );

      expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chevron-up-icon')).not.toBeInTheDocument();
    });

    it('should render children when expanded', () => {
      render(
        <PostCard post={createMockPost()} isExpanded={true}>
          <div data-testid="reply-thread">Reply content</div>
        </PostCard>
      );

      expect(screen.getByTestId('reply-thread')).toBeInTheDocument();
    });

    it('should not render children when collapsed', () => {
      render(
        <PostCard post={createMockPost()} isExpanded={false}>
          <div data-testid="reply-thread">Reply content</div>
        </PostCard>
      );

      expect(screen.queryByTestId('reply-thread')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Linked Content Tests
  // ===========================================================================

  describe('Linked Content', () => {
    it('should render linked content preview when present', () => {
      render(
        <PostCard
          post={createMockPost({
            linked_content_type: 'loadout',
            linked_content_id: 'loadout-123',
          })}
        />
      );

      expect(screen.getByTestId('linked-content')).toBeInTheDocument();
    });

    it('should not render linked content when not present', () => {
      render(<PostCard post={createMockPost()} />);

      expect(screen.queryByTestId('linked-content')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Author Permissions Tests
  // ===========================================================================

  describe('Author Permissions', () => {
    it('should set isAuthor true when currentUserId matches author_id', () => {
      render(
        <PostCard
          post={createMockPost({ author_id: 'user-001' })}
          currentUserId="user-001"
        />
      );

      const menu = screen.getByTestId('post-menu');
      expect(menu).toHaveAttribute('data-is-author', 'true');
    });

    it('should set isAuthor false when currentUserId does not match', () => {
      render(
        <PostCard
          post={createMockPost({ author_id: 'user-001' })}
          currentUserId="user-002"
        />
      );

      const menu = screen.getByTestId('post-menu');
      expect(menu).toHaveAttribute('data-is-author', 'false');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle single name for initials', () => {
      render(<PostCard post={createMockPost({ author_name: 'John' })} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J');
    });

    it('should handle empty name for initials', () => {
      render(<PostCard post={createMockPost({ author_name: '' })} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?');
    });

    it('should handle multiple names for initials', () => {
      render(<PostCard post={createMockPost({ author_name: 'John Middle Doe' })} />);

      // Should use first and last name
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should handle missing avatar URL', () => {
      render(<PostCard post={createMockPost({ author_avatar: null })} />);

      const avatar = screen.getByTestId('avatar-image');
      // When avatar is null, src attribute might be undefined
      expect(avatar).toBeInTheDocument();
    });
  });
});
