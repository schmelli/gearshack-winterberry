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
