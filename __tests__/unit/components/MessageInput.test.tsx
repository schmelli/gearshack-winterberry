/**
 * MessageInput Component Tests
 *
 * Tests for the MessageInput component used in the messaging system.
 * Tests rendering, input handling, keyboard shortcuts, and attachments.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageInput } from '@/components/messaging/MessageInput';

// =============================================================================
// Mocks
// =============================================================================

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Send: ({ className }: { className?: string }) => (
    <svg data-testid="send-icon" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader-icon" className={className} />
  ),
  Paperclip: ({ className }: { className?: string }) => (
    <svg data-testid="paperclip-icon" className={className} />
  ),
  Image: ({ className }: { className?: string }) => (
    <svg data-testid="image-icon" className={className} />
  ),
  MapPin: ({ className }: { className?: string }) => (
    <svg data-testid="mappin-icon" className={className} />
  ),
  Package: ({ className }: { className?: string }) => (
    <svg data-testid="package-icon" className={className} />
  ),
  Mic: ({ className }: { className?: string }) => (
    <svg data-testid="mic-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid={size === 'icon' ? 'icon-button' : 'button'}
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    onKeyDown,
    placeholder,
    disabled,
    rows,
    className,
    ref,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    className?: string;
    ref?: React.Ref<HTMLTextAreaElement>;
  }) => (
    <textarea
      data-testid="message-textarea"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={className}
    />
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({
    children,
    align,
    className,
  }: {
    children: React.ReactNode;
    align?: string;
    className?: string;
  }) => (
    <div data-testid="popover-content" data-align={align} className={className}>
      {children}
    </div>
  ),
}));

// Mock sub-components
vi.mock('@/components/messaging/ImageAttachmentPreview', () => ({
  ImageAttachmentPreview: ({
    imageUrl,
    isUploading,
    onRemove,
  }: {
    imageUrl: string;
    isUploading?: boolean;
    onRemove: () => void;
  }) => (
    <div data-testid="image-preview" data-uploading={isUploading}>
      <button onClick={onRemove} data-testid="remove-image">
        Remove
      </button>
    </div>
  ),
}));

vi.mock('@/components/messaging/GearPicker', () => ({
  GearPicker: ({
    open,
    onOpenChange,
    onSelect,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (metadata: unknown) => void;
  }) => (open ? <div data-testid="gear-picker">Gear Picker</div> : null),
}));

vi.mock('@/components/messaging/LocationPicker', () => ({
  LocationPicker: ({
    open,
    onOpenChange,
    onSelect,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (metadata: unknown) => void;
  }) => (open ? <div data-testid="location-picker">Location Picker</div> : null),
}));

vi.mock('@/components/messaging/VoiceRecorder', () => ({
  VoiceRecorder: ({
    onSend,
    onCancel,
    disabled,
  }: {
    onSend: (blob: Blob, duration: number) => void;
    onCancel: () => void;
    disabled?: boolean;
  }) => (
    <div data-testid="voice-recorder">
      <button onClick={onCancel} data-testid="cancel-recording">
        Cancel
      </button>
    </div>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// =============================================================================
// Tests
// =============================================================================

describe('MessageInput', () => {
  const mockOnSend = vi.fn().mockResolvedValue(undefined);
  const mockOnSendWithMedia = vi.fn().mockResolvedValue(undefined);
  const mockOnTyping = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the textarea', () => {
      render(<MessageInput onSend={mockOnSend} />);

      expect(screen.getByTestId('message-textarea')).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      render(<MessageInput onSend={mockOnSend} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<MessageInput onSend={mockOnSend} placeholder="Write something..." />);

      expect(screen.getByPlaceholderText('Write something...')).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const buttons = screen.getAllByTestId('icon-button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render attachment menu when onSendWithMedia provided', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      expect(screen.getByTestId('popover')).toBeInTheDocument();
      expect(screen.getByTestId('paperclip-icon')).toBeInTheDocument();
    });

    it('should not render attachment menu when onSendWithMedia not provided', () => {
      render(<MessageInput onSend={mockOnSend} />);

      expect(screen.queryByTestId('paperclip-icon')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('Disabled State', () => {
    it('should disable textarea when disabled prop is true', () => {
      render(<MessageInput onSend={mockOnSend} disabled={true} />);

      expect(screen.getByTestId('message-textarea')).toBeDisabled();
    });

    it('should disable send button when disabled', () => {
      render(<MessageInput onSend={mockOnSend} disabled={true} />);

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1]; // Last button is send
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when message is empty', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      expect(sendButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Input Handling Tests
  // ===========================================================================

  describe('Input Handling', () => {
    it('should update value on input change', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(textarea).toHaveValue('Hello');
    });

    it('should enable send button when message has content', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      expect(sendButton).not.toBeDisabled();
    });

    it('should call onTyping when typing', () => {
      render(<MessageInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'H' } });

      expect(mockOnTyping).toHaveBeenCalledWith(true);
    });
  });

  // ===========================================================================
  // Keyboard Shortcuts Tests
  // ===========================================================================

  describe('Keyboard Shortcuts', () => {
    it('should send on Enter key', async () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith('Hello');
      });
    });

    it('should not send on Shift+Enter', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('should not send on Enter with empty message', () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Send Button Tests
  // ===========================================================================

  describe('Send Button', () => {
    it('should call onSend with trimmed message on click', async () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: '  Hello World  ' } });

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSend).toHaveBeenCalledWith('Hello World');
      });
    });

    it('should clear message after successful send', async () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should stop typing indicator on send', async () => {
      render(<MessageInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      vi.clearAllMocks(); // Clear the typing call

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnTyping).toHaveBeenCalledWith(false);
      });
    });
  });

  // ===========================================================================
  // Attachment Options Tests
  // ===========================================================================

  describe('Attachment Options', () => {
    it('should render photo option in attachment menu', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      expect(screen.getByText('Photo')).toBeInTheDocument();
    });

    it('should render location option in attachment menu', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('should render gear item option in attachment menu', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      expect(screen.getByText('Gear Item')).toBeInTheDocument();
    });

    it('should render mic button when no text and onSendWithMedia', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
    });

    it('should hide mic button when text is entered', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(screen.queryByTestId('mic-icon')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have sr-only text for attach button', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      expect(screen.getByText('Attach')).toHaveClass('sr-only');
    });

    it('should have sr-only text for send button', () => {
      render(<MessageInput onSend={mockOnSend} />);

      expect(screen.getByText('Send message')).toHaveClass('sr-only');
    });

    it('should have sr-only text for voice button', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      expect(screen.getByText('Record voice message')).toHaveClass('sr-only');
    });
  });

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MessageInput onSend={mockOnSend} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle whitespace-only messages', async () => {
      render(<MessageInput onSend={mockOnSend} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: '   ' } });

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      expect(sendButton).toBeDisabled();
    });
  });
});
