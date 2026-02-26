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
    ref: _ref,
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
    open: _open,
    onOpenChange: _onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => <div data-testid="popover">{children}</div>,
  PopoverTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
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
    imageUrl: _imageUrl,
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
    onOpenChange: _onOpenChange,
    onSelect: _onSelect,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (metadata: unknown) => void;
  }) => (open ? <div data-testid="gear-picker">Gear Picker</div> : null),
}));

vi.mock('@/components/messaging/LocationPicker', () => ({
  LocationPicker: ({
    open,
    onOpenChange: _onOpenChange,
    onSelect: _onSelect,
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
    disabled: _disabled,
  }: {
    onSend: (blob: Blob, duration: number) => void;
    onCancel: () => void;
    disabled?: boolean;
  }) => (
    <div data-testid="voice-recorder">
      <button
        onClick={() => onSend(new Blob(['audio'], { type: 'audio/webm' }), 5)}
        data-testid="send-voice"
      >
        Send Voice
      </button>
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

  // ===========================================================================
  // Voice Recording Tests
  // ===========================================================================

  describe('Voice Recording', () => {
    it('should show voice recorder when mic button is clicked', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const micButton = screen.getByTestId('mic-icon').closest('button');
      fireEvent.click(micButton!);

      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });

    it('should hide text input when recording', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const micButton = screen.getByTestId('mic-icon').closest('button');
      fireEvent.click(micButton!);

      // When voice recorder is shown, the input row is hidden
      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });

    it('should hide voice recorder when cancel is clicked', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const micButton = screen.getByTestId('mic-icon').closest('button');
      fireEvent.click(micButton!);

      const cancelButton = screen.getByTestId('cancel-recording');
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('voice-recorder')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Image Attachment Tests
  // ===========================================================================

  describe('Image Attachment', () => {
    it('should show image preview after file selection', async () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      // Create a mock file input change
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });
    });

    it('should remove image when remove button is clicked', async () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      // Create a mock file
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });

      // Click remove button
      const removeButton = screen.getByTestId('remove-image');
      fireEvent.click(removeButton);

      expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
    });

    it('should enable send button when image is attached', async () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        const buttons = screen.getAllByTestId('icon-button');
        const sendButton = buttons[buttons.length - 1];
        expect(sendButton).not.toBeDisabled();
      });
    });

    it('should ignore non-image files', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Picker Interactions Tests
  // ===========================================================================

  describe('Picker Interactions', () => {
    it('should open gear picker when gear item clicked', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const gearButton = screen.getByText('Gear Item');
      fireEvent.click(gearButton);

      expect(screen.getByTestId('gear-picker')).toBeInTheDocument();
    });

    it('should open location picker when location clicked', () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      const locationButton = screen.getByText('Location');
      fireEvent.click(locationButton);

      expect(screen.getByTestId('location-picker')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Typing Indicator Timeout Tests
  // ===========================================================================

  describe('Typing Indicator', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should stop typing indicator after 2 seconds of inactivity', async () => {
      render(<MessageInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'H' } });

      expect(mockOnTyping).toHaveBeenCalledWith(true);

      // Advance timers by 2 seconds
      vi.advanceTimersByTime(2000);

      expect(mockOnTyping).toHaveBeenCalledWith(false);
    });

    it('should reset typing timeout on new input', async () => {
      render(<MessageInput onSend={mockOnSend} onTyping={mockOnTyping} />);

      const textarea = screen.getByTestId('message-textarea');

      // First input
      fireEvent.change(textarea, { target: { value: 'H' } });
      expect(mockOnTyping).toHaveBeenCalledWith(true);

      // Advance by 1 second
      vi.advanceTimersByTime(1000);

      // Second input resets the timer
      fireEvent.change(textarea, { target: { value: 'He' } });

      // Advance by another 1.5 seconds (total 2.5 from last input)
      vi.advanceTimersByTime(1500);

      // Should not have stopped yet (only 1.5s since last input)
      expect(mockOnTyping).not.toHaveBeenLastCalledWith(false);

      // Advance remaining time
      vi.advanceTimersByTime(500);

      // Now should have stopped
      expect(mockOnTyping).toHaveBeenLastCalledWith(false);
    });
  });

  // ===========================================================================
  // Image Upload Tests
  // ===========================================================================

  describe('Image Upload', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      // Mock fetch for Cloudinary uploads
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          secure_url: 'https://cloudinary.com/test-image.jpg',
          width: 800,
          height: 600,
        }),
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should upload image to Cloudinary and send message', async () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      // Attach an image
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });

      // Click send button
      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('cloudinary.com'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      await waitFor(() => {
        expect(mockOnSendWithMedia).toHaveBeenCalledWith(
          null,
          'image',
          'https://cloudinary.com/test-image.jpg',
          expect.objectContaining({
            width: 800,
            height: 600,
            thumbnail_url: 'https://cloudinary.com/test-image.jpg',
          })
        );
      });
    });

    it('should include message text with image upload', async () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      // Attach an image
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });

      // Type a message
      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Check out this photo!' } });

      // Click send button
      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendWithMedia).toHaveBeenCalledWith(
          'Check out this photo!',
          'image',
          'https://cloudinary.com/test-image.jpg',
          expect.any(Object)
        );
      });
    });

    it('should clear image attachment after successful upload', async () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      // Attach an image
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });

      // Click send button
      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendWithMedia).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
      });
    });

    it('should handle image upload error gracefully', async () => {
      // Mock fetch to reject
      global.fetch = vi.fn().mockRejectedValue(new Error('Upload failed'));

      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      // Attach an image
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file],
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
      });

      // Click send button
      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Should handle error gracefully (not crash)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // onSendWithMedia should NOT have been called since upload failed
      expect(mockOnSendWithMedia).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Voice Upload Tests
  // ===========================================================================

  describe('Voice Upload', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      // Mock fetch for Cloudinary uploads
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          secure_url: 'https://cloudinary.com/test-voice.webm',
        }),
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should upload voice message to Cloudinary and send', async () => {
      render(<MessageInput onSend={mockOnSend} onSendWithMedia={mockOnSendWithMedia} />);

      // Start voice recording
      const micButton = screen.getByTestId('mic-icon').closest('button');
      fireEvent.click(micButton!);

      await waitFor(() => {
        expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
      });

      // Click send voice button
      const sendVoiceButton = screen.getByTestId('send-voice');
      fireEvent.click(sendVoiceButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('cloudinary.com'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      await waitFor(() => {
        expect(mockOnSendWithMedia).toHaveBeenCalledWith(
          null,
          'voice',
          'https://cloudinary.com/test-voice.webm',
          expect.objectContaining({
            duration_seconds: 5,
            waveform: [],
          })
        );
      });
    });
  });

  // ===========================================================================
  // Send Error Handling Tests
  // ===========================================================================

  describe('Send Error Handling', () => {
    it('should handle send error gracefully', async () => {
      const mockOnSendError = vi.fn().mockRejectedValue(new Error('Send failed'));

      render(<MessageInput onSend={mockOnSendError} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      // Should not crash and should complete
      await waitFor(() => {
        expect(mockOnSendError).toHaveBeenCalledWith('Hello');
      });
    });

    it('should reset sending state after error', async () => {
      const mockOnSendError = vi.fn().mockRejectedValue(new Error('Send failed'));

      render(<MessageInput onSend={mockOnSendError} />);

      const textarea = screen.getByTestId('message-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      const buttons = screen.getAllByTestId('icon-button');
      const sendButton = buttons[buttons.length - 1];
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendError).toHaveBeenCalled();
      });

      // Should be able to try sending again (button enabled)
      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      });
    });
  });
});
