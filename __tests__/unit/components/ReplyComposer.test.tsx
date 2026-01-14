/**
 * ReplyComposer Component Tests
 *
 * Tests for the ReplyComposer component used in the bulletin board.
 * Tests rendering, input handling, keyboard shortcuts, and submission.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReplyComposer } from '@/components/bulletin/ReplyComposer';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'reply.placeholder': 'Write a reply...',
      'reply.markdownHint': 'You can use **bold** and *italic* formatting',
      'reply.submit': 'Reply',
      'common.cancel': 'Cancel',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Send: ({ className }: { className?: string }) => (
    <svg data-testid="send-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    onKeyDown,
    disabled,
    className,
    rows,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
    className?: string;
    rows?: number;
  }) => (
    <textarea
      data-testid="reply-textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className={className}
      rows={rows}
    />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button
      data-testid={variant === 'ghost' ? 'cancel-button' : 'submit-button'}
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

// =============================================================================
// Tests
// =============================================================================

describe('ReplyComposer', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the textarea', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('reply-textarea')).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} placeholder="Custom placeholder" />);

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should render the submit button', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    it('should render send icon in submit button', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('send-icon')).toBeInTheDocument();
    });

    it('should render markdown hint', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByText(/bold/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests - Cancel Button
  // ===========================================================================

  describe('Cancel Button', () => {
    it('should render cancel button when onCancel provided', () => {
      const onCancel = vi.fn();
      render(<ReplyComposer onSubmit={mockOnSubmit} onCancel={onCancel} />);

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel not provided', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
    });

    it('should render X icon in cancel button', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} onCancel={vi.fn()} />);

      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('should call onCancel when cancel clicked', () => {
      const onCancel = vi.fn();
      render(<ReplyComposer onSubmit={mockOnSubmit} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('Disabled State', () => {
    it('should disable textarea when disabled prop is true', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} disabled={true} />);

      expect(screen.getByTestId('reply-textarea')).toBeDisabled();
    });

    it('should disable submit button when disabled prop is true', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} disabled={true} />);

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should disable submit when content is empty', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should disable submit when content is whitespace only', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('reply-textarea'), {
        target: { value: '   ' },
      });

      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should enable submit when content has text', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('reply-textarea'), {
        target: { value: 'Hello' },
      });

      expect(screen.getByTestId('submit-button')).not.toBeDisabled();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should update content on input change', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('reply-textarea'), {
        target: { value: 'Test reply content' },
      });

      expect(screen.getByTestId('reply-textarea')).toHaveValue('Test reply content');
    });

    it('should call onSubmit with trimmed content when submit clicked', async () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('reply-textarea'), {
        target: { value: '  Test reply  ' },
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Test reply');
      });
    });

    it('should clear content after successful submit', async () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('reply-textarea'), {
        target: { value: 'Test reply' },
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(screen.getByTestId('reply-textarea')).toHaveValue('');
      });
    });

    it('should not submit when content is empty', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      // Submit button should be disabled, but let's verify clicking doesn't do anything
      const submitButton = screen.getByTestId('submit-button');
      // Button is disabled, click won't fire
      expect(submitButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Keyboard Shortcut Tests
  // ===========================================================================

  describe('Keyboard Shortcuts', () => {
    it('should submit on Ctrl+Enter', async () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      const textarea = screen.getByTestId('reply-textarea');
      fireEvent.change(textarea, { target: { value: 'Test reply' } });
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Test reply');
      });
    });

    it('should submit on Cmd+Enter (Mac)', async () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      const textarea = screen.getByTestId('reply-textarea');
      fireEvent.change(textarea, { target: { value: 'Test reply' } });
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('Test reply');
      });
    });

    it('should not submit on plain Enter', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      const textarea = screen.getByTestId('reply-textarea');
      fireEvent.change(textarea, { target: { value: 'Test reply' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should not submit on Ctrl+Enter with empty content', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      const textarea = screen.getByTestId('reply-textarea');
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Submitting State Tests
  // ===========================================================================

  describe('Submitting State', () => {
    it('should disable textarea while submitting', async () => {
      let resolveSubmit: () => void;
      const slowSubmit = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
      );

      render(<ReplyComposer onSubmit={slowSubmit} />);

      fireEvent.change(screen.getByTestId('reply-textarea'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      // Should be disabled while submitting
      expect(screen.getByTestId('reply-textarea')).toBeDisabled();

      // Resolve the submit
      resolveSubmit!();

      await waitFor(() => {
        expect(screen.getByTestId('reply-textarea')).not.toBeDisabled();
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should re-enable after submit completes', async () => {
      // Test that the component re-enables after a successful submit
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByTestId('reply-textarea'), {
        target: { value: 'Test' },
      });
      fireEvent.click(screen.getByTestId('submit-button'));

      // Should re-enable after submit completes
      await waitFor(() => {
        expect(screen.getByTestId('reply-textarea')).not.toBeDisabled();
      });
    });

    it('should have correct textarea rows', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('reply-textarea')).toHaveAttribute('rows', '2');
    });

    it('should have resize-none class on textarea', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('reply-textarea')).toHaveClass('resize-none');
    });

    it('should use sm size for buttons', () => {
      render(<ReplyComposer onSubmit={mockOnSubmit} onCancel={vi.fn()} />);

      expect(screen.getByTestId('submit-button')).toHaveAttribute('data-size', 'sm');
      expect(screen.getByTestId('cancel-button')).toHaveAttribute('data-size', 'sm');
    });
  });
});
