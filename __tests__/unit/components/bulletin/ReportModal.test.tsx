/**
 * ReportModal Component Tests
 *
 * Tests for the report modal component with reason selection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportModal } from '@/components/bulletin/ReportModal';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'report.title': 'Report Content',
      'report.subtitle': 'Help us understand the issue',
      'report.reasonLabel': 'Reason',
      'report.selectReason': 'Select a reason',
      'report.detailsLabel': 'Additional details (optional)',
      'report.detailsPlaceholder': 'Provide more context...',
      'report.cancel': 'Cancel',
      'report.submit': 'Submit Report',
      'report.submitting': 'Submitting...',
      'report.spam': 'Spam',
      'report.harassment': 'Harassment',
      'report.inappropriate': 'Inappropriate Content',
      'success.reportSubmitted': 'Report submitted',
      'errors.duplicateReport': 'You already reported this',
      'errors.reportFailed': 'Failed to submit report',
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

// Get the mocked toast after the mock is applied
import { toast as mockToast } from 'sonner';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({}),
}));

// Mock bulletin queries
const mockCreateReport = vi.fn();
vi.mock('@/lib/supabase/bulletin-queries', () => ({
  createBulletinReport: (...args: unknown[]) => mockCreateReport(...args),
}));

// Mock bulletin types
vi.mock('@/types/bulletin', () => ({
  REPORT_REASONS: [
    { value: 'spam', labelKey: 'report.spam' },
    { value: 'harassment', labelKey: 'report.harassment' },
    { value: 'inappropriate', labelKey: 'report.inappropriate' },
  ],
}));

// Mock bulletin hooks
vi.mock('@/hooks/bulletin', () => ({
  isPostError: (err: unknown) => err && typeof err === 'object' && 'type' in err,
}));

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    type
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    type?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      type={type as 'button' | 'submit' | 'reset' | undefined}
      data-testid={variant === 'outline' ? 'cancel-button' : 'submit-button'}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({
    id,
    value,
    onChange,
    placeholder,
    disabled,
    maxLength
  }: {
    id?: string;
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
    disabled?: boolean;
    maxLength?: number;
  }) => (
    <textarea
      id={id}
      data-testid="details-textarea"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} data-testid="label">{children}</label>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
    disabled
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid="select" data-value={value} data-disabled={disabled}>
      {children}
      <select
        data-testid="select-native"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select...</option>
        <option value="spam">Spam</option>
        <option value="harassment">Harassment</option>
        <option value="inappropriate">Inappropriate</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <div data-testid="select-trigger" id={id}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
}));

describe('ReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReport.mockReset();
  });

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <ReportModal
          isOpen={false}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should render title and subtitle', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('Report Content')).toBeInTheDocument();
      expect(screen.getByText('Help us understand the issue')).toBeInTheDocument();
    });

    it('should render reason selector', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByTestId('select')).toBeInTheDocument();
    });

    it('should render details textarea', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByTestId('details-textarea')).toBeInTheDocument();
    });

    it('should render Cancel and Submit buttons', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Submit Report')).toBeInTheDocument();
    });
  });

  describe('Form interactions', () => {
    it('should update details when typing', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      const textarea = screen.getByTestId('details-textarea');
      fireEvent.change(textarea, { target: { value: 'This is spam content' } });

      expect(textarea).toHaveValue('This is spam content');
    });

    it('should disable submit button when no reason selected', () => {
      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      const submitButton = screen.getByTestId('submit-button');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Submit behavior', () => {
    it('should call createBulletinReport on submit', async () => {
      mockCreateReport.mockResolvedValueOnce({});

      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      // Select a reason
      const select = screen.getByTestId('select-native');
      fireEvent.change(select, { target: { value: 'spam' } });

      // Click submit
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateReport).toHaveBeenCalled();
      });
    });

    it('should show success toast on successful submit', async () => {
      mockCreateReport.mockResolvedValueOnce({});

      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      const select = screen.getByTestId('select-native');
      fireEvent.change(select, { target: { value: 'spam' } });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Report submitted');
      });
    });

    it('should show error toast on failure', async () => {
      mockCreateReport.mockRejectedValueOnce(new Error('Failed'));

      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      const select = screen.getByTestId('select-native');
      fireEvent.change(select, { target: { value: 'spam' } });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to submit report');
      });
    });

    it('should show duplicate error for duplicate reports', async () => {
      mockCreateReport.mockRejectedValueOnce({ type: 'duplicate' });

      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="post"
          targetId="post-123"
        />
      );

      const select = screen.getByTestId('select-native');
      fireEvent.change(select, { target: { value: 'spam' } });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('You already reported this');
      });
    });
  });

  describe('Reply reporting', () => {
    it('should work for reply target type', async () => {
      mockCreateReport.mockResolvedValueOnce({});

      render(
        <ReportModal
          isOpen={true}
          onClose={vi.fn()}
          targetType="reply"
          targetId="reply-456"
        />
      );

      const select = screen.getByTestId('select-native');
      fireEvent.change(select, { target: { value: 'harassment' } });

      fireEvent.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockCreateReport).toHaveBeenCalled();
      });
    });
  });
});
