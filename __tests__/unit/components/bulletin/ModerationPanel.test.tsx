/**
 * ModerationPanel Component Tests
 *
 * Tests for the moderation panel component that displays
 * reported content and allows moderation actions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationPanel } from '@/components/bulletin/ModerationPanel';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string | number>) => {
    const translations: Record<string, string> = {
      'moderation.title': 'Content Moderation',
      'moderation.noReports': 'No pending reports',
      'moderation.noReportsSubtitle': 'All clear! No content needs review.',
      'moderation.pendingCount': `${params?.count || 0} pending`,
      'moderation.reportCount': `${params?.count || 0} reports`,
      'moderation.reportedBy': `Reported by ${params?.name || 'Unknown'}`,
      'moderation.targetPost': 'Post',
      'moderation.targetReply': 'Reply',
      'moderation.contentBy': `By ${params?.name || 'Unknown'}`,
      'moderation.additionalDetails': 'Additional details:',
      'moderation.takeAction': 'Take Action',
      'moderation.deleteContent': 'Delete Content',
      'moderation.warnUser': 'Warn User',
      'moderation.ban1Day': 'Ban 1 Day',
      'moderation.ban7Days': 'Ban 7 Days',
      'moderation.banPermanent': 'Permanent Ban',
      'moderation.dismiss': 'Dismiss',
      'moderation.actionSuccess': 'Action completed',
      'moderation.actionFailed': 'Action failed',
      'moderation.dismissed': 'Report dismissed',
      'report.reasons.spam': 'Spam',
      'report.reasons.harassment': 'Harassment',
      'report.reasons.inappropriate': 'Inappropriate Content',
    };
    return translations[key] || key;
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-triangle" className={className} />
  ),
  Trash2: ({ className }: { className?: string }) => (
    <svg data-testid="trash-icon" className={className} />
  ),
  Ban: ({ className }: { className?: string }) => (
    <svg data-testid="ban-icon" className={className} />
  ),
  X: ({ className }: { className?: string }) => (
    <svg data-testid="x-icon" className={className} />
  ),
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="loader" className={className} />
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg data-testid="shield-icon" className={className} />
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <svg data-testid="alert-circle" className={className} />
  ),
}));

// Mock the moderation reports hook
const mockLoadReports = vi.fn();
const mockResolveReport = vi.fn();
const mockDismissReport = vi.fn();
let mockReports: unknown[] = [];
let mockIsLoading = false;
let mockError: string | null = null;

vi.mock('@/hooks/bulletin/useModerationReports', () => ({
  useModerationReports: () => ({
    reports: mockReports,
    isLoading: mockIsLoading,
    error: mockError,
    loadReports: mockLoadReports,
    resolveReport: mockResolveReport,
    dismissReport: mockDismissReport,
  }),
}));

// Mock shadcn components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      data-testid={variant === 'destructive' ? 'action-button' : 'dismiss-button'}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid="dropdown-item" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
}));

describe('ModerationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReports = [];
    mockIsLoading = false;
    mockError = null;
  });

  describe('Loading state', () => {
    it('should show loader while loading', () => {
      mockIsLoading = true;
      render(<ModerationPanel />);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should show error message when error occurs', () => {
      mockError = 'Failed to load reports';
      render(<ModerationPanel />);

      expect(screen.getByText('Failed to load reports')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no reports', () => {
      mockReports = [];
      render(<ModerationPanel />);

      expect(screen.getByText('No pending reports')).toBeInTheDocument();
      expect(screen.getByText('All clear! No content needs review.')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    });
  });

  describe('Reports list', () => {
    const mockReport = {
      id: 'report-1',
      reason: 'spam',
      report_count: 3,
      reporter_name: 'John Doe',
      target_type: 'post' as const,
      target_id: 'post-1',
      target_author_id: 'author-1',
      target_author_name: 'Jane Smith',
      target_content: 'This is spam content...',
      details: 'Additional details here',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should display reports', () => {
      mockReports = [mockReport];
      render(<ModerationPanel />);

      expect(screen.getByText('Content Moderation')).toBeInTheDocument();
      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });

    it('should display report reason', () => {
      mockReports = [mockReport];
      render(<ModerationPanel />);

      expect(screen.getByText('Spam')).toBeInTheDocument();
    });

    it('should display report count', () => {
      mockReports = [mockReport];
      render(<ModerationPanel />);

      expect(screen.getByText('3 reports')).toBeInTheDocument();
    });

    it('should display reporter name', () => {
      mockReports = [mockReport];
      render(<ModerationPanel />);

      expect(screen.getByText(/Reported by John Doe/)).toBeInTheDocument();
    });

    it('should display target type badge', () => {
      mockReports = [mockReport];
      render(<ModerationPanel />);

      expect(screen.getByText('Post')).toBeInTheDocument();
    });

    it('should display content preview', () => {
      mockReports = [mockReport];
      render(<ModerationPanel />);

      expect(screen.getByText('This is spam content...')).toBeInTheDocument();
    });

    it('should display additional details', () => {
      mockReports = [mockReport];
      render(<ModerationPanel />);

      expect(screen.getByText('Additional details here')).toBeInTheDocument();
    });

    it('should show high priority badge variant for 5+ reports', () => {
      mockReports = [{ ...mockReport, report_count: 5 }];
      render(<ModerationPanel />);

      // High priority reports should have destructive badge variant
      const badges = screen.getAllByTestId('badge');
      const reportCountBadge = badges.find(b => b.textContent?.includes('5 reports'));
      expect(reportCountBadge).toHaveAttribute('data-variant', 'destructive');
    });
  });

  describe('Actions', () => {
    const mockReport = {
      id: 'report-1',
      reason: 'harassment',
      report_count: 2,
      reporter_name: 'Reporter',
      target_type: 'post' as const,
      target_id: 'post-1',
      target_author_id: 'author-1',
      target_author_name: 'Author',
      target_content: 'Content',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should call resolveReport when action taken', async () => {
      mockReports = [mockReport];
      mockResolveReport.mockResolvedValueOnce(true);

      render(<ModerationPanel />);

      // Click delete content action
      const deleteButton = screen.getAllByTestId('dropdown-item')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockResolveReport).toHaveBeenCalledWith(
          'report-1',
          'delete_content',
          'author-1'
        );
      });
    });

    it('should show success toast on successful action', async () => {
      mockReports = [mockReport];
      mockResolveReport.mockResolvedValueOnce(true);

      render(<ModerationPanel />);

      const deleteButton = screen.getAllByTestId('dropdown-item')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Action completed');
      });
    });

    it('should show error toast on failed action', async () => {
      mockReports = [mockReport];
      mockResolveReport.mockResolvedValueOnce(false);

      render(<ModerationPanel />);

      const deleteButton = screen.getAllByTestId('dropdown-item')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Action failed');
      });
    });

    it('should call dismissReport when dismiss clicked', async () => {
      mockReports = [mockReport];
      mockDismissReport.mockResolvedValueOnce(true);

      render(<ModerationPanel />);

      const dismissButton = screen.getByTestId('dismiss-button');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(mockDismissReport).toHaveBeenCalledWith('report-1');
      });
    });

    it('should show success toast when dismissed', async () => {
      mockReports = [mockReport];
      mockDismissReport.mockResolvedValueOnce(true);

      render(<ModerationPanel />);

      const dismissButton = screen.getByTestId('dismiss-button');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Report dismissed');
      });
    });
  });

  describe('Lifecycle', () => {
    it('should call loadReports on mount', () => {
      render(<ModerationPanel />);

      expect(mockLoadReports).toHaveBeenCalledTimes(1);
    });
  });
});
