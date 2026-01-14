/**
 * MessageBubble Component Tests
 *
 * Tests for the MessageBubble component used in the messaging system.
 * Tests rendering of message types, delivery status, reactions, and actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageBubble } from '@/components/messaging/MessageBubble';
import type { MessageWithSender } from '@/types/messaging';

// =============================================================================
// Mocks
// =============================================================================

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
  format: () => 'December 30, 2024 at 10:00 AM',
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: ({ className }: { className?: string }) => (
    <svg data-testid="check-icon" className={className} />
  ),
  CheckCheck: ({ className }: { className?: string }) => (
    <svg data-testid="checkcheck-icon" className={className} />
  ),
  MoreVertical: ({ className }: { className?: string }) => (
    <svg data-testid="more-icon" className={className} />
  ),
  Copy: ({ className }: { className?: string }) => (
    <svg data-testid="copy-icon" className={className} />
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
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
}));

// Mock sub-components
vi.mock('@/components/messaging/LocationCard', () => ({
  LocationCard: () => <div data-testid="location-card">Location Card</div>,
}));

vi.mock('@/components/messaging/GearReferenceCard', () => ({
  GearReferenceCard: () => <div data-testid="gear-reference-card">Gear Reference</div>,
}));

vi.mock('@/components/messaging/VoicePlayer', () => ({
  VoicePlayer: () => <div data-testid="voice-player">Voice Player</div>,
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockMessage = (overrides: Partial<MessageWithSender> = {}): MessageWithSender => ({
  id: 'msg-001',
  conversation_id: 'conv-001',
  sender_id: 'user-001',
  content: 'Hello, this is a test message!',
  message_type: 'text',
  media_url: null,
  metadata: null,
  is_edited: false,
  is_deleted: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  reactions: [],
  sender: {
    id: 'user-001',
    display_name: 'John Doe',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  ...overrides,
});

// =============================================================================
// Tests
// =============================================================================

describe('MessageBubble', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render text message content', () => {
      render(<MessageBubble message={createMockMessage()} isOwnMessage={false} />);

      expect(screen.getByText('Hello, this is a test message!')).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      render(<MessageBubble message={createMockMessage()} isOwnMessage={false} />);

      expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
    });

    it('should render sender name when showSender is true', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          showSender={true}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should not render sender name when showSender is false', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          showSender={false}
        />
      );

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should render avatar when not own message and showSender', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          showSender={true}
        />
      );

      expect(screen.getByTestId('avatar')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('should not render avatar for own messages', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          showSender={true}
        />
      );

      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Message Types Tests
  // ===========================================================================

  describe('Message Types', () => {
    it('should render image message', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'image',
            media_url: 'https://example.com/image.jpg',
          })}
          isOwnMessage={false}
        />
      );

      const image = screen.getByAltText('Shared image');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should render voice message', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'voice',
            media_url: 'https://example.com/audio.mp3',
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByTestId('voice-player')).toBeInTheDocument();
    });

    it('should render location message', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'location',
            metadata: { latitude: 40.7128, longitude: -74.006 },
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByTestId('location-card')).toBeInTheDocument();
    });

    it('should render gear reference message', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'gear_reference',
            metadata: { gear_item_id: 'gear-001', name: 'Test Gear' },
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByTestId('gear-reference-card')).toBeInTheDocument();
    });

    it('should render fallback for voice without URL', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'voice',
            media_url: null,
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('Voice message unavailable')).toBeInTheDocument();
    });

    it('should render fallback for location without coordinates', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'location',
            metadata: null,
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('Shared location')).toBeInTheDocument();
    });

    it('should render fallback for gear_reference without gear_item_id', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'gear_reference',
            metadata: { name: 'Test Gear' },
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('Shared gear item')).toBeInTheDocument();
    });

    it('should render gear_trade message type', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'gear_trade',
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('Gear trade post')).toBeInTheDocument();
    });

    it('should render trip_invitation message type', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'trip_invitation',
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('Trip invitation')).toBeInTheDocument();
    });

    it('should render default message type', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'unknown_type' as never,
            content: 'Unknown message content',
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('Unknown message content')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Delivery Status Tests
  // ===========================================================================

  describe('Delivery Status', () => {
    it('should show single check for sent status', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          deliveryStatus="sent"
        />
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should show double check for delivered status', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          deliveryStatus="delivered"
        />
      );

      expect(screen.getByTestId('checkcheck-icon')).toBeInTheDocument();
    });

    it('should show blue double check for read status', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          deliveryStatus="read"
        />
      );

      const icon = screen.getByTestId('checkcheck-icon');
      expect(icon).toHaveClass('text-blue-500');
    });

    it('should not show delivery status for other messages', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          deliveryStatus="sent"
        />
      );

      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });

    it('should not show icon for unknown delivery status', () => {
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          deliveryStatus={'pending' as never}
        />
      );

      // Unknown status should not render any icon
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('checkcheck-icon')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Reactions Tests
  // ===========================================================================

  describe('Reactions', () => {
    it('should render reactions when present', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            reactions: [
              { emoji: '👍', user_id: 'user-002' },
              { emoji: '👍', user_id: 'user-003' },
              { emoji: '❤️', user_id: 'user-004' },
            ] as never,
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Count for thumbs up
      expect(screen.getByText('❤️')).toBeInTheDocument();
    });

    it('should not render reactions section when empty', () => {
      render(
        <MessageBubble
          message={createMockMessage({ reactions: [] })}
          isOwnMessage={false}
        />
      );

      expect(screen.queryByText('👍')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should render action menu', () => {
      render(<MessageBubble message={createMockMessage()} isOwnMessage={true} />);

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('should render reaction emojis when onReact provided', () => {
      const onReact = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          onReact={onReact}
        />
      );

      // Dropdown content should have emoji buttons
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
    });

    it('should render delete options for own messages', () => {
      const onDelete = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          onDelete={onDelete}
        />
      );

      expect(screen.getByText('Delete for me')).toBeInTheDocument();
      expect(screen.getByText('Delete for everyone')).toBeInTheDocument();
    });

    it('should not render delete for other messages', () => {
      const onDelete = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          onDelete={onDelete}
        />
      );

      expect(screen.queryByText('Delete for me')).not.toBeInTheDocument();
    });

    it('should render report option for other messages', () => {
      const onReport = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          onReport={onReport}
        />
      );

      expect(screen.getByText('Report')).toBeInTheDocument();
    });

    it('should call onDelete with false when delete for me clicked', () => {
      const onDelete = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete for me'));
      expect(onDelete).toHaveBeenCalledWith(false);
    });

    it('should call onDelete with true when delete for everyone clicked', () => {
      const onDelete = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete for everyone'));
      expect(onDelete).toHaveBeenCalledWith(true);
    });

    it('should call onReport when report clicked', () => {
      const onReport = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          onReport={onReport}
        />
      );

      fireEvent.click(screen.getByText('Report'));
      expect(onReport).toHaveBeenCalledTimes(1);
    });

    it('should call onReact when emoji clicked', () => {
      const onReact = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={false}
          onReact={onReact}
        />
      );

      // Find and click thumbs up emoji
      const thumbsUpButton = screen.getByText('👍');
      fireEvent.click(thumbsUpButton);
      expect(onReact).toHaveBeenCalledWith('👍');
    });

    it('should copy message and call onCopy callback', async () => {
      // Mock clipboard
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText },
      });

      const onCopy = vi.fn();
      render(
        <MessageBubble
          message={createMockMessage()}
          isOwnMessage={true}
          onCopy={onCopy}
        />
      );

      fireEvent.click(screen.getByText('Copy'));
      expect(mockWriteText).toHaveBeenCalledWith('Hello, this is a test message!');
      expect(onCopy).toHaveBeenCalled();
    });

    it('should not show copy option when message has no content', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            content: null,
            message_type: 'image',
            media_url: 'https://example.com/image.jpg',
          })}
          isOwnMessage={true}
        />
      );

      expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    });

    it('should show actions on mouse enter', () => {
      const { container } = render(
        <MessageBubble message={createMockMessage()} isOwnMessage={true} />
      );

      // Find the bubble wrapper div
      const wrapper = container.firstChild as Element;
      fireEvent.mouseEnter(wrapper);

      // Actions dropdown should be visible (opacity-100)
      const actionsDiv = container.querySelector('.opacity-100');
      expect(actionsDiv).toBeInTheDocument();
    });

    it('should hide actions on mouse leave', () => {
      const { container } = render(
        <MessageBubble message={createMockMessage()} isOwnMessage={true} />
      );

      const wrapper = container.firstChild as Element;
      fireEvent.mouseEnter(wrapper);
      fireEvent.mouseLeave(wrapper);

      // Actions should be hidden (opacity-0)
      const actionsDiv = container.querySelector('.opacity-0');
      expect(actionsDiv).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle null sender', () => {
      render(
        <MessageBubble
          message={createMockMessage({ sender: null as unknown as undefined })}
          isOwnMessage={false}
          showSender={true}
        />
      );

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('?');
    });

    it('should handle single name for initials', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            sender: { id: 'user-001', display_name: 'John', avatar_url: null },
          })}
          isOwnMessage={false}
          showSender={true}
        />
      );

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('J');
    });

    it('should apply flex-row-reverse for own messages', () => {
      const { container } = render(
        <MessageBubble message={createMockMessage()} isOwnMessage={true} />
      );

      const wrapper = container.querySelector('.flex-row-reverse');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply flex-row for other messages', () => {
      const { container } = render(
        <MessageBubble message={createMockMessage()} isOwnMessage={false} />
      );

      const wrapper = container.querySelector('.flex-row');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render image with caption', () => {
      render(
        <MessageBubble
          message={createMockMessage({
            message_type: 'image',
            media_url: 'https://example.com/image.jpg',
            content: 'Check this out!',
          })}
          isOwnMessage={false}
        />
      );

      expect(screen.getByText('Check this out!')).toBeInTheDocument();
    });
  });
});
