/**
 * Community Hub Types
 *
 * Feature: Community Hub Enhancement
 * Type definitions for announcements, panels, and community features
 */

// ===== Announcements =====
export type AnnouncementType = 'info' | 'warning' | 'success' | 'promo';

export interface CommunityAnnouncement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  priority: number;
  link_url: string | null;
  link_text: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementDismissal {
  announcementId: string;
  dismissedAt: number;
}

// ===== Announcement Admin Types =====
export type AnnouncementStatus = 'scheduled' | 'active' | 'expired' | 'disabled';

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  expired: 'Expired',
  disabled: 'Disabled',
};

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  info: 'Info',
  warning: 'Warning',
  success: 'Success',
  promo: 'Promo',
};

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  type: AnnouncementType;
  priority: number;
  link_url: string | null;
  link_text: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export interface CommunityAnnouncementWithStatus extends CommunityAnnouncement {
  status: AnnouncementStatus;
}

/**
 * Compute announcement status based on current time and visibility window
 */
export function computeAnnouncementStatus(announcement: CommunityAnnouncement): AnnouncementStatus {
  if (!announcement.is_active) {
    return 'disabled';
  }

  const now = new Date();
  const start = new Date(announcement.starts_at);

  if (now < start) {
    return 'scheduled';
  }

  if (announcement.ends_at) {
    const end = new Date(announcement.ends_at);
    if (now > end) {
      return 'expired';
    }
  }

  return 'active';
}

// ===== Community Navigation =====
export type CommunityTabId = 'board' | 'shakedowns' | 'vip-loadouts' | 'marketplace';

export interface CommunityTab {
  id: CommunityTabId;
  translationKey: string;
  href: string;
  enabled: boolean;
  badge?: number;
}

// ===== Friends Panel =====
export interface FriendsPanelData {
  pendingRequestsCount: number;
  onlineFriendsCount: number;
  totalFriendsCount: number;
}

// ===== Wishlist Offers Panel =====
export interface WishlistOfferSummary {
  id: string;
  merchantName: string;
  merchantLogoUrl: string | null;
  productName: string;
  discountPercent: number;
  expiresAt: string;
  isNew: boolean;
}

export interface WishlistOffersPanelData {
  offers: WishlistOfferSummary[];
  newOffersCount: number;
  totalOffersCount: number;
}

// ===== Hook Return Types =====
export interface UseAnnouncementsReturn {
  announcements: CommunityAnnouncement[];
  isLoading: boolean;
  error: string | null;
  dismissAnnouncement: (id: string) => void;
  isDismissed: (id: string) => boolean;
  refresh: () => Promise<void>;
}

// ===== Community Hub Props =====
export interface CommunityHubProps {
  initialAnnouncements?: CommunityAnnouncement[];
}

export interface CommunitySidebarProps {
  className?: string;
  collapsedOnMobile?: boolean;
}

export interface FriendsPanelProps {
  className?: string;
  compact?: boolean;
  limit?: number;
}

export interface WishlistOffersPanelProps {
  className?: string;
  limit?: number;
}

export interface FriendActivityPanelProps {
  className?: string;
  limit?: number;
}

export interface AnnouncementsBannerProps {
  announcements?: CommunityAnnouncement[];
  className?: string;
}

export interface CommunityNavTabsProps {
  activeTab?: CommunityTabId;
  className?: string;
}
