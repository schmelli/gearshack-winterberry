/**
 * ConversationList Component Tests
 *
 * Tests for the ConversationList component used in the messaging system.
 * Tests rendering of conversations, loading states, and interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationList } from '@/components/messaging/ConversationList';
import type { ConversationListItem } from '@/types/messaging';

// =============================================================================
// Mocks
// =============================================================================

const mockConversations: ConversationListItem[] = [];
let mockIsLoading = false;
let mockError: string | null = null;

vi.mock('@/hooks/messaging/useConversations', () => ({
  useConversations: () => ({
    conversations: mockConversations,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

vi.mock('@/hooks/messaging/useFriends', () => ({
  useFriends: () => ({
    isFriend: (userId: string) => userId === 'friend-user',
  }),
}));

vi.mock('@/hooks/messaging/usePresenceStatus', () => ({
  usePresenceStatus: () => ({
    isUserOnline: (userId: string) => userId === 'online-user',
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Heart: ({ className }: { className?: string }) => (
    <svg data-testid="heart-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
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

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockConversation = (
  overrides: Partial<ConversationListItem> = {}
): ConversationListItem => ({
  conversation: {
    id: 'conv-001',
    type: 'direct',
    name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  participants: [
    {
      id: 'user-002',
      display_name: 'Jane Doe',
      avatar_url: 'https://example.com/jane.jpg',
    },
  ],
  unread_count: 0,
  last_message: {
    message_type: 'text',
    content: 'Hey there!',
    created_at: new Date().toISOString(),
    sender_name: 'Jane Doe',
  },
  is_muted: false,
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('ConversationList', () => {
  const mockOnSelectConversation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConversations.length = 0;
    mockIsLoading = false;
    mockError = null;
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should render skeletons when loading', () => {
      mockIsLoading = true;
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Error State Tests
  // ===========================================================================

  describe('Error State', () => {
    it('should render error message when error occurs', () => {
      mockError = 'Network error';
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText(/Failed to load conversations/)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Empty State Tests
  // ===========================================================================

  describe('Empty State', () => {
    it('should render empty state when no conversations', () => {
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Start a new conversation to connect/)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render conversation items', () => {
      mockConversations.push(createMockConversation());
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('should render avatar with initials', () => {
      mockConversations.push(createMockConversation());
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should render last message preview', () => {
      mockConversations.push(createMockConversation());
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Hey there!')).toBeInTheDocument();
    });

    it('should render time ago', () => {
      mockConversations.push(createMockConversation());
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    });

    it('should render multiple conversations', () => {
      mockConversations.push(
        createMockConversation(),
        createMockConversation({
          conversation: {
            id: 'conv-002',
            type: 'direct',
            name: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          participants: [
            {
              id: 'user-003',
              display_name: 'Bob Smith',
              avatar_url: null,
            },
          ],
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Message Type Preview Tests
  // ===========================================================================

  describe('Message Type Previews', () => {
    it('should show "Sent an image" for image messages', () => {
      mockConversations.push(
        createMockConversation({
          last_message: {
            message_type: 'image',
            content: null,
            created_at: new Date().toISOString(),
            sender_name: 'Jane',
          },
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Sent an image')).toBeInTheDocument();
    });

    it('should show "Sent a voice message" for voice messages', () => {
      mockConversations.push(
        createMockConversation({
          last_message: {
            message_type: 'voice',
            content: null,
            created_at: new Date().toISOString(),
            sender_name: 'Jane',
          },
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Sent a voice message')).toBeInTheDocument();
    });

    it('should show "Shared a location" for location messages', () => {
      mockConversations.push(
        createMockConversation({
          last_message: {
            message_type: 'location',
            content: null,
            created_at: new Date().toISOString(),
            sender_name: 'Jane',
          },
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Shared a location')).toBeInTheDocument();
    });

    it('should show "Shared gear item" for gear references', () => {
      mockConversations.push(
        createMockConversation({
          last_message: {
            message_type: 'gear_reference',
            content: null,
            created_at: new Date().toISOString(),
            sender_name: 'Jane',
          },
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Shared gear item')).toBeInTheDocument();
    });

    it('should show "No messages yet" when no last message', () => {
      mockConversations.push(
        createMockConversation({
          last_message: null,
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Unread Count Tests
  // ===========================================================================

  describe('Unread Count', () => {
    it('should render unread badge when unread count > 0', () => {
      mockConversations.push(createMockConversation({ unread_count: 5 }));
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show 99+ for large unread counts', () => {
      mockConversations.push(createMockConversation({ unread_count: 150 }));
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should not render unread badge when count is 0', () => {
      mockConversations.push(createMockConversation({ unread_count: 0 }));
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      // No badges should be rendered at all when unread is 0 and not muted
      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Muted State Tests
  // ===========================================================================

  describe('Muted State', () => {
    it('should render Muted badge when conversation is muted', () => {
      mockConversations.push(createMockConversation({ is_muted: true }));
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Muted')).toBeInTheDocument();
    });

    it('should not render Muted badge when not muted', () => {
      mockConversations.push(createMockConversation({ is_muted: false }));
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.queryByText('Muted')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Online Status Tests
  // ===========================================================================

  describe('Online Status', () => {
    it('should show online indicator for online users', () => {
      mockConversations.push(
        createMockConversation({
          participants: [
            { id: 'online-user', display_name: 'Online User', avatar_url: null },
          ],
        })
      );
      const { container } = render(
        <ConversationList onSelectConversation={mockOnSelectConversation} />
      );

      const onlineIndicator = container.querySelector('.bg-green-500');
      expect(onlineIndicator).toBeInTheDocument();
    });

    it('should not show online indicator for offline users', () => {
      mockConversations.push(
        createMockConversation({
          participants: [
            { id: 'offline-user', display_name: 'Offline User', avatar_url: null },
          ],
        })
      );
      const { container } = render(
        <ConversationList onSelectConversation={mockOnSelectConversation} />
      );

      const onlineIndicator = container.querySelector('.bg-green-500');
      expect(onlineIndicator).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Friend Status Tests
  // ===========================================================================

  describe('Friend Status', () => {
    it('should show friend heart icon for friends', () => {
      mockConversations.push(
        createMockConversation({
          participants: [
            { id: 'friend-user', display_name: 'Friend User', avatar_url: null },
          ],
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    });

    it('should not show friend heart for non-friends', () => {
      mockConversations.push(
        createMockConversation({
          participants: [
            { id: 'not-friend', display_name: 'Not Friend', avatar_url: null },
          ],
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.queryByTestId('heart-icon')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Group Conversation Tests
  // ===========================================================================

  describe('Group Conversations', () => {
    it('should render group name for group conversations', () => {
      mockConversations.push(
        createMockConversation({
          conversation: {
            id: 'conv-group',
            type: 'group',
            name: 'Hiking Buddies',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText('Hiking Buddies')).toBeInTheDocument();
    });

    it('should show sender name in group messages', () => {
      mockConversations.push(
        createMockConversation({
          conversation: {
            id: 'conv-group',
            type: 'group',
            name: 'Hiking Buddies',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          last_message: {
            message_type: 'text',
            content: 'Hello everyone!',
            created_at: new Date().toISOString(),
            sender_name: 'John',
          },
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByText(/John:/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onSelectConversation when clicked', () => {
      const mockConv = createMockConversation();
      mockConversations.push(mockConv);
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      fireEvent.click(screen.getByText('Jane Doe'));

      expect(mockOnSelectConversation).toHaveBeenCalledWith(mockConv);
    });
  });

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty participant list', () => {
      mockConversations.push(
        createMockConversation({
          participants: [],
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?');
    });

    it('should handle null avatar URL', () => {
      mockConversations.push(
        createMockConversation({
          participants: [
            { id: 'user-002', display_name: 'No Avatar', avatar_url: null },
          ],
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('NA');
    });

    it('should handle single name for initials', () => {
      mockConversations.push(
        createMockConversation({
          participants: [
            { id: 'user-002', display_name: 'John', avatar_url: null },
          ],
        })
      );
      render(<ConversationList onSelectConversation={mockOnSelectConversation} />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J');
    });
  });
});
