/**
 * DeleteConfirmDialog Component Tests
 *
 * Tests for the delete confirmation dialog component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from '@/components/bulletin/DeleteConfirmDialog';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'delete.title': 'Delete Post',
      'delete.titleReply': 'Delete Reply',
      'delete.confirmPost': 'Are you sure you want to delete this post?',
      'delete.confirmReply': 'Are you sure you want to delete this reply?',
      'delete.confirmWithReplies': 'This post has replies. Delete anyway?',
      'delete.cancel': 'Cancel',
      'delete.confirm': 'Delete',
      'loading': 'Deleting...',
    };
    return translations[key] || key;
  },
}));

// Mock AlertDialog components
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="alert-dialog">{children}</div> : null
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  AlertDialogCancel: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => (
    <button data-testid="cancel-button" disabled={disabled}>{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
    className
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="confirm-button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe('DeleteConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Post deletion', () => {
    it('should render post deletion title', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
        />
      );

      expect(screen.getByText('Delete Post')).toBeInTheDocument();
    });

    it('should show post confirmation message', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
        />
      );

      expect(screen.getByText('Are you sure you want to delete this post?')).toBeInTheDocument();
    });

    it('should show warning when post has replies', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
          hasReplies={true}
        />
      );

      expect(screen.getByText('This post has replies. Delete anyway?')).toBeInTheDocument();
    });
  });

  describe('Reply deletion', () => {
    it('should render reply deletion title', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="reply"
        />
      );

      expect(screen.getByText('Delete Reply')).toBeInTheDocument();
    });

    it('should show reply confirmation message', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="reply"
        />
      );

      expect(screen.getByText('Are you sure you want to delete this reply?')).toBeInTheDocument();
    });
  });

  describe('Button interactions', () => {
    it('should call onConfirm when delete button clicked', () => {
      const mockConfirm = vi.fn();
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={mockConfirm}
          type="post"
        />
      );

      fireEvent.click(screen.getByTestId('confirm-button'));

      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });

    it('should show Cancel and Delete buttons', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading text when deleting', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
          isDeleting={true}
        />
      );

      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should disable buttons when deleting', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
          isDeleting={true}
        />
      );

      expect(screen.getByTestId('cancel-button')).toBeDisabled();
      expect(screen.getByTestId('confirm-button')).toBeDisabled();
    });

    it('should not disable buttons when not deleting', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
          isDeleting={false}
        />
      );

      expect(screen.getByTestId('cancel-button')).not.toBeDisabled();
      expect(screen.getByTestId('confirm-button')).not.toBeDisabled();
    });
  });

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <DeleteConfirmDialog
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
        />
      );

      expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
        />
      );

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply destructive styling to confirm button', () => {
      render(
        <DeleteConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          type="post"
        />
      );

      const confirmButton = screen.getByTestId('confirm-button');
      expect(confirmButton).toHaveClass('bg-destructive');
    });
  });
});
