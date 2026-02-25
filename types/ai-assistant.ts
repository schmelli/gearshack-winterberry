/**
 * TypeScript interfaces for GearShack AI Assistant
 * Feature 050: AI Assistant
 * Source: specs/050-ai-assistant/data-model.md
 */

// =====================================================
// Core Entities
// =====================================================

export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  contextSnapshot: ContextSnapshot | null;
}

export interface ContextSnapshot {
  screen: string; // e.g., "inventory", "loadout-detail"
  locale: string; // e.g., "en", "de"
  inventoryCount: number;
  currentLoadoutId?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  inlineCards: InlineCard[] | null;
  actions: Action[] | null;
  context: MessageContext | null;
  tokensUsed: number | null;
}

export interface MessageContext {
  screen: string;
  locale: string;
  inventoryCount: number;
  currentLoadoutId?: string;
  timestamp: string; // ISO 8601
}

// =====================================================
// Inline Cards
// =====================================================

export type InlineCard = GearAlternativeCard | CommunityOfferCard;

export interface GearAlternativeCard {
  type: 'gear_alternative';
  gearItemId: string; // References gear_items table
  name: string;
  brand: string;
  weight: number; // grams
  price: number | null; // USD
  imageUrl: string | null; // Cloudinary URL
  reason: string; // AI explanation (e.g., "20% lighter than your current tent")
}

export interface CommunityOfferCard {
  type: 'community_offer';
  offerId: string; // References community_posts table
  userName: string;
  userAvatarUrl: string | null;
  itemName: string;
  price: number | null; // USD
  location: string; // City, State/Country
  imageUrl: string | null;
  distance: number | null; // kilometers (if user location available)
}

// =====================================================
// Actions
// =====================================================

export type Action =
  | AddToWishlistAction
  | SendMessageAction
  | CompareAction
  | NavigateAction;

// NOTE: AI confirmation prompts (add-to-loadout) use ConfirmActionData from
// types/mastra.ts and the ConfirmAddToLoadout component — not an Action type.

export interface AddToWishlistAction {
  type: 'add_to_wishlist';
  gearItemId: string;
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}

export interface SendMessageAction {
  type: 'send_message';
  recipientUserId: string;
  messagePreview: string; // First 50 chars
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}

export interface CompareAction {
  type: 'compare';
  gearItemIds: string[]; // 2-4 items
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}

export interface NavigateAction {
  type: 'navigate';
  destination: string; // e.g., "/inventory", "/loadouts/abc123"
  status: 'pending' | 'completed' | 'failed';
  error: string | null;
}

// =====================================================
// Rate Limiting
// =====================================================

export interface RateLimit {
  userId: string;
  endpoint: string;
  count: number;
  windowStart: Date;
  lastMessageAt: Date | null;
}

export interface RateLimitStatus {
  remaining: number; // messages remaining in current hour
  resetsAt: Date; // when window resets
  isLimited: boolean; // true if count >= 30
}

// =====================================================
// Cached Responses
// =====================================================

export interface CachedResponse {
  id: string;
  queryPattern: string;
  responseEn: string;
  responseDe: string;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

// =====================================================
// User Context (for prompt building)
// =====================================================

export interface UserContext {
  screen: string; // Current route/page
  locale: string; // User's language preference
  inventoryCount: number; // Total gear items owned
  currentLoadoutId?: string; // Active loadout being viewed
  userId: string; // For permission checks
  subscriptionTier: 'standard' | 'trailblazer'; // Access control
}
