/**
 * PostMenu Component Tests
 *
 * Tests for the PostMenu component used in the bulletin board.
 * Tests rendering of dropdown menu, author actions, and report option.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostMenu } from '@/components/bulletin/PostMenu';

// =============================================================================
// Mocks
// =============================================================================

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'menu.edit': 'Edit',
      'menu.editWindowExpired': 'Edit (expired)',
      'menu.delete': 'Delete',
      'menu.report': 'Report',
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
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
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      data-testid="menu-trigger"
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div
      data-testid="dropdown-menu"
      data-open={open}
      onClick={() => onOpenChange?.(!open)}
    >
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({
    children,
    asChild: _asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({
    children,
    align,
  }: {
    children: React.ReactNode;
    align?: string;
  }) => (
    <div data-testid="dropdown-content" data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="dropdown-item"
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-disabled={disabled}
    >
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

// =============================================================================
// Tests
// =============================================================================

describe('PostMenu', () => {
  const defaultProps = {
    isOpen: false,
    onOpenChange: vi.fn(),
    isAuthor: false,
    canEdit: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReport: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the dropdown menu', () => {
      render(<PostMenu {...defaultProps} />);

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('should render the trigger button', () => {
      render(<PostMenu {...defaultProps} />);

      expect(screen.getByTestId('menu-trigger')).toBeInTheDocument();
    });

    it('should render the more icon', () => {
      render(<PostMenu {...defaultProps} />);

      expect(screen.getByTestId('more-icon')).toBeInTheDocument();
    });

    it('should have sr-only text for accessibility', () => {
      render(<PostMenu {...defaultProps} />);

      expect(screen.getByText('Open menu')).toHaveClass('sr-only');
    });

    it('should always render report option', () => {
      render(<PostMenu {...defaultProps} />);

      expect(screen.getByText('Report')).toBeInTheDocument();
      expect(screen.getByTestId('flag-icon')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Props Tests - Open State
  // ===========================================================================

  describe('Open State', () => {
    it('should pass open state to dropdown', () => {
      render(<PostMenu {...defaultProps} isOpen={true} />);

      expect(screen.getByTestId('dropdown-menu')).toHaveAttribute('data-open', 'true');
    });

    it('should pass closed state to dropdown', () => {
      render(<PostMenu {...defaultProps} isOpen={false} />);

      expect(screen.getByTestId('dropdown-menu')).toHaveAttribute('data-open', 'false');
    });

    it('should call onOpenChange when menu toggled', () => {
      const onOpenChange = vi.fn();
      render(<PostMenu {...defaultProps} isOpen={false} onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByTestId('dropdown-menu'));

      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  // ===========================================================================
  // Author Actions Tests
  // ===========================================================================

  describe('Author Actions', () => {
    it('should render edit option for author', () => {
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={true} />);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByTestId('pencil-icon')).toBeInTheDocument();
    });

    it('should render delete option for author', () => {
      render(<PostMenu {...defaultProps} isAuthor={true} />);

      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
    });

    it('should not render edit/delete for non-author', () => {
      render(<PostMenu {...defaultProps} isAuthor={false} />);

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('should render separator between author actions and report', () => {
      render(<PostMenu {...defaultProps} isAuthor={true} />);

      expect(screen.getByTestId('dropdown-separator')).toBeInTheDocument();
    });

    it('should not render separator for non-author', () => {
      render(<PostMenu {...defaultProps} isAuthor={false} />);

      expect(screen.queryByTestId('dropdown-separator')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edit Window Tests
  // ===========================================================================

  describe('Edit Window', () => {
    it('should enable edit when canEdit is true', () => {
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={true} />);

      const editButton = screen.getByText('Edit').closest('button');
      expect(editButton).not.toBeDisabled();
    });

    it('should render edit button regardless of canEdit prop (unlimited edit window)', () => {
      // Component design: "Authors can edit their posts at any time"
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={false} />);

      // Edit is always available - no disabled state
      const editButton = screen.getByText('Edit');
      expect(editButton).toBeInTheDocument();
    });

    it('should always show regular Edit text (no expiry state)', () => {
      // The component doesn't implement edit expiry
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={false} />);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText('Edit (expired)')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('Interactions', () => {
    it('should call onEdit when edit clicked', () => {
      const onEdit = vi.fn();
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={true} onEdit={onEdit} />);

      fireEvent.click(screen.getByText('Edit'));

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when delete clicked', () => {
      const onDelete = vi.fn();
      render(<PostMenu {...defaultProps} isAuthor={true} onDelete={onDelete} />);

      fireEvent.click(screen.getByText('Delete'));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should call onReport when report clicked', () => {
      const onReport = vi.fn();
      render(<PostMenu {...defaultProps} onReport={onReport} />);

      fireEvent.click(screen.getByText('Report'));

      expect(onReport).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit even when canEdit is false (unlimited edit)', () => {
      // Component design: Authors can always edit, canEdit doesn't disable the button
      const onEdit = vi.fn();
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={false} onEdit={onEdit} />);

      const editButton = screen.getByText('Edit').closest('button');
      if (editButton) fireEvent.click(editButton);

      // Edit is always clickable
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have sr-only text for trigger', () => {
      render(<PostMenu {...defaultProps} />);

      expect(screen.getByText('Open menu')).toBeInTheDocument();
      expect(screen.getByText('Open menu')).toHaveClass('sr-only');
    });

    it('should not have aria-disabled on edit (always editable)', () => {
      // Component design: Authors can always edit, no disabled state
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={false} />);

      const editButton = screen.getByText('Edit').closest('button');
      expect(editButton).not.toHaveAttribute('aria-disabled');
    });

    it('should align dropdown to end', () => {
      render(<PostMenu {...defaultProps} />);

      expect(screen.getByTestId('dropdown-content')).toHaveAttribute('data-align', 'end');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle missing onEdit callback', () => {
      render(<PostMenu {...defaultProps} isAuthor={true} canEdit={true} onEdit={undefined} />);

      // Should not throw when clicking
      fireEvent.click(screen.getByText('Edit'));
    });

    it('should handle missing onDelete callback', () => {
      render(<PostMenu {...defaultProps} isAuthor={true} onDelete={undefined} />);

      fireEvent.click(screen.getByText('Delete'));
    });

    it('should handle missing onReport callback', () => {
      render(<PostMenu {...defaultProps} onReport={undefined} />);

      fireEvent.click(screen.getByText('Report'));
    });

    it('should apply destructive styling to delete', () => {
      render(<PostMenu {...defaultProps} isAuthor={true} />);

      const deleteButton = screen.getByText('Delete').closest('button');
      expect(deleteButton).toHaveClass('text-destructive');
    });
  });
});
