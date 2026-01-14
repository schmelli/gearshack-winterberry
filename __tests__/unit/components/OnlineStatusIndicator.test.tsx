/**
 * OnlineStatusIndicator Component Tests
 *
 * Tests for the OnlineStatusIndicator, AvatarStatusOverlay, and StatusSelector components.
 * Tests rendering of status dots, variants, sizes, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  OnlineStatusIndicator,
  AvatarStatusOverlay,
  StatusSelector,
} from '@/components/social/OnlineStatusIndicator';
import type { OnlineStatus } from '@/types/social';

// =============================================================================
// Mocks
// =============================================================================

// Mock useOnlineStatus hook
const mockOnlineStatus = {
  isUserOnline: vi.fn().mockReturnValue(false),
  getUserLastActive: vi.fn().mockReturnValue(null),
  isRealtimeConnected: true,
};

vi.mock('@/hooks/social/useOnlineStatus', () => ({
  useOnlineStatus: () => mockOnlineStatus,
  getStatusInfo: (status: OnlineStatus) => {
    const statusMap = {
      online: { dotClass: 'bg-green-500', color: 'text-green-600', label: 'Online' },
      away: { dotClass: 'bg-yellow-500', color: 'text-yellow-600', label: 'Away' },
      offline: { dotClass: 'bg-gray-400', color: 'text-gray-500', label: 'Offline' },
      invisible: { dotClass: 'bg-gray-400', color: 'text-gray-500', label: 'Invisible' },
    };
    return statusMap[status];
  },
  formatLastActive: (_timestamp: string) => {
    return '5 minutes ago';
  },
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'presence.online': 'Online',
      'presence.away': 'Away',
      'presence.offline': 'Offline',
      'presence.invisible': 'Invisible',
      'presence.updating': 'Updating...',
      'presence.lastActive': `Last active ${params?.time ?? ''}`,
    };
    return translations[key] ?? key;
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Circle: ({ className }: { className?: string }) => (
    <svg data-testid="circle-icon" className={className} />
  ),
  Moon: ({ className }: { className?: string }) => (
    <svg data-testid="moon-icon" className={className} />
  ),
  Eye: ({ className }: { className?: string }) => (
    <svg data-testid="eye-icon" className={className} />
  ),
  EyeOff: ({ className }: { className?: string }) => (
    <svg data-testid="eye-off-icon" className={className} />
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg data-testid="chevron-down-icon" className={className} />
  ),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      data-testid="status-button"
      data-variant={variant}
      data-size={size}
      disabled={disabled}
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
    <button
      data-testid="dropdown-item"
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

// =============================================================================
// OnlineStatusIndicator Tests
// =============================================================================

describe('OnlineStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnlineStatus.isUserOnline.mockReturnValue(false);
    mockOnlineStatus.getUserLastActive.mockReturnValue(null);
    mockOnlineStatus.isRealtimeConnected = true;
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render status dot by default', () => {
      render(<OnlineStatusIndicator status="online" />);

      const dot = document.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('should render with override status', () => {
      render(<OnlineStatusIndicator status="online" />);

      const dot = document.querySelector('.bg-green-500');
      expect(dot).toBeInTheDocument();
    });

    it('should render offline status when no user or override', () => {
      render(<OnlineStatusIndicator />);

      const dot = document.querySelector('.bg-gray-400');
      expect(dot).toBeInTheDocument();
    });

    it('should check online status when userId provided', () => {
      mockOnlineStatus.isUserOnline.mockReturnValue(true);
      render(<OnlineStatusIndicator userId="user-123" />);

      expect(mockOnlineStatus.isUserOnline).toHaveBeenCalledWith('user-123');
    });
  });

  // ===========================================================================
  // Variant Tests
  // ===========================================================================

  describe('Variants', () => {
    it('should render dot-only variant by default', () => {
      render(<OnlineStatusIndicator status="online" variant="dot" />);

      // Should not have label text
      expect(screen.queryByText('Online')).not.toBeInTheDocument();
    });

    it('should render badge variant with label', () => {
      render(<OnlineStatusIndicator status="online" variant="badge" />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should render dot with label when showLabel is true', () => {
      render(<OnlineStatusIndicator status="online" variant="dot" showLabel />);

      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should render full variant with last active time', () => {
      render(
        <OnlineStatusIndicator
          status="offline"
          variant="full"
          lastActive="2024-12-30T10:00:00Z"
        />
      );

      expect(screen.getByText(/Last active/)).toBeInTheDocument();
    });

    it('should show "Away" for away status in badge variant', () => {
      render(<OnlineStatusIndicator status="away" variant="badge" />);

      expect(screen.getByText('Away')).toBeInTheDocument();
    });

    it('should show "Offline" when offline without lastActive in full variant', () => {
      render(
        <OnlineStatusIndicator
          status="offline"
          variant="full"
          lastActive={null}
        />
      );

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Size Tests
  // ===========================================================================

  describe('Sizes', () => {
    it('should apply small size classes', () => {
      render(<OnlineStatusIndicator status="online" size="sm" />);

      const dot = document.querySelector('.h-2.w-2');
      expect(dot).toBeInTheDocument();
    });

    it('should apply medium size classes by default', () => {
      render(<OnlineStatusIndicator status="online" />);

      const dot = document.querySelector('.h-2\\.5');
      expect(dot).toBeInTheDocument();
    });

    it('should apply large size classes', () => {
      render(<OnlineStatusIndicator status="online" size="lg" />);

      const dot = document.querySelector('.h-3.w-3');
      expect(dot).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Status Color Tests
  // ===========================================================================

  describe('Status Colors', () => {
    it('should apply green for online status', () => {
      render(<OnlineStatusIndicator status="online" />);

      expect(document.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('should apply yellow for away status', () => {
      render(<OnlineStatusIndicator status="away" />);

      expect(document.querySelector('.bg-yellow-500')).toBeInTheDocument();
    });

    it('should apply gray for offline status', () => {
      render(<OnlineStatusIndicator status="offline" />);

      expect(document.querySelector('.bg-gray-400')).toBeInTheDocument();
    });

    it('should animate pulse for online status', () => {
      render(<OnlineStatusIndicator status="online" />);

      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should not animate for offline status', () => {
      render(<OnlineStatusIndicator status="offline" />);

      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Realtime Connection Tests
  // ===========================================================================

  describe('Realtime Connection', () => {
    it('should show updating state when realtime disconnected and not online', () => {
      mockOnlineStatus.isRealtimeConnected = false;
      render(<OnlineStatusIndicator status="offline" variant="badge" />);

      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('should not show updating for online status even when disconnected', () => {
      mockOnlineStatus.isRealtimeConnected = false;
      render(<OnlineStatusIndicator status="online" variant="badge" />);

      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should hide updating when showUpdating is false', () => {
      mockOnlineStatus.isRealtimeConnected = false;
      render(
        <OnlineStatusIndicator
          status="offline"
          variant="badge"
          showUpdating={false}
        />
      );

      expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have aria-hidden on status dot', () => {
      render(<OnlineStatusIndicator status="online" />);

      const dot = document.querySelector('.rounded-full');
      expect(dot).toHaveAttribute('aria-hidden', 'true');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <OnlineStatusIndicator status="online" className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

// =============================================================================
// AvatarStatusOverlay Tests
// =============================================================================

describe('AvatarStatusOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnlineStatus.isUserOnline.mockReturnValue(false);
  });

  describe('Rendering', () => {
    it('should render when status is online', () => {
      render(<AvatarStatusOverlay status="online" />);

      const overlay = document.querySelector('.absolute');
      expect(overlay).toBeInTheDocument();
    });

    it('should not render when status is offline', () => {
      render(<AvatarStatusOverlay status="offline" />);

      const overlay = document.querySelector('.absolute');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should render for away status', () => {
      render(<AvatarStatusOverlay status="away" />);

      const overlay = document.querySelector('.absolute');
      expect(overlay).toBeInTheDocument();
    });

    it('should check userId online status', () => {
      mockOnlineStatus.isUserOnline.mockReturnValue(true);
      render(<AvatarStatusOverlay userId="user-456" />);

      expect(mockOnlineStatus.isUserOnline).toHaveBeenCalledWith('user-456');
    });
  });

  describe('Positions', () => {
    it('should apply bottom-right position by default', () => {
      render(<AvatarStatusOverlay status="online" />);

      expect(document.querySelector('.bottom-0.right-0')).toBeInTheDocument();
    });

    it('should apply bottom-left position', () => {
      render(<AvatarStatusOverlay status="online" position="bottom-left" />);

      expect(document.querySelector('.bottom-0.left-0')).toBeInTheDocument();
    });

    it('should apply top-right position', () => {
      render(<AvatarStatusOverlay status="online" position="top-right" />);

      expect(document.querySelector('.top-0.right-0')).toBeInTheDocument();
    });

    it('should apply top-left position', () => {
      render(<AvatarStatusOverlay status="online" position="top-left" />);

      expect(document.querySelector('.top-0.left-0')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label with status info', () => {
      render(<AvatarStatusOverlay status="online" />);

      const overlay = document.querySelector('.absolute');
      expect(overlay).toHaveAttribute('aria-label', 'Online');
    });
  });
});

// =============================================================================
// StatusSelector Tests
// =============================================================================

describe('StatusSelector', () => {
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe('Rendering', () => {
    it('should render dropdown menu', () => {
      render(<StatusSelector value="online" onChange={mockOnChange} />);

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
    });

    it('should render current status in trigger', () => {
      render(<StatusSelector value="online" onChange={mockOnChange} />);

      // Multiple "Online" texts - one in trigger, one in dropdown items
      const onlineTexts = screen.getAllByText('Online');
      expect(onlineTexts.length).toBeGreaterThan(0);
    });

    it('should render all status options', () => {
      render(<StatusSelector value="online" onChange={mockOnChange} />);

      const items = screen.getAllByTestId('dropdown-item');
      expect(items).toHaveLength(4); // online, away, invisible, offline
    });

    it('should render chevron icon', () => {
      render(<StatusSelector value="online" onChange={mockOnChange} />);

      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onChange when option clicked', () => {
      render(<StatusSelector value="online" onChange={mockOnChange} />);

      const items = screen.getAllByTestId('dropdown-item');
      fireEvent.click(items[1]); // Click "away" option

      expect(mockOnChange).toHaveBeenCalledWith('away');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<StatusSelector value="online" onChange={mockOnChange} disabled />);

      expect(screen.getByTestId('status-button')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should apply custom className', () => {
      render(
        <StatusSelector
          value="online"
          onChange={mockOnChange}
          className="custom-selector"
        />
      );

      expect(screen.getByTestId('status-button')).toHaveClass('custom-selector');
    });

    it('should highlight current selection', () => {
      render(<StatusSelector value="online" onChange={mockOnChange} />);

      const items = screen.getAllByTestId('dropdown-item');
      expect(items[0]).toHaveClass('bg-muted');
    });
  });
});
