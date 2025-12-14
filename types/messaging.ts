/**
 * Types for User Messaging System
 * Feature: 046-user-messaging-system
 */

// ----- Enums / Union Types -----

export type MessageType =
  | 'text'
  | 'image'
  | 'voice'
  | 'location'
  | 'gear_reference'
  | 'gear_trade'
  | 'trip_invitation';

export type MessageDeletionState =
  | 'active'
  | 'deleted_for_sender'
  | 'deleted_for_all';

export type MessagingPrivacy = 'everyone' | 'friends_only' | 'nobody';

export type ConversationType = 'direct' | 'group';

export type ParticipantRole = 'member' | 'admin';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';

export type RsvpStatus = 'going' | 'maybe' | 'not_going';

export type GearTradeStatus = 'open' | 'accepted' | 'declined';

// ----- Core Entities -----

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  is_muted: boolean;
  is_archived: boolean;
  unread_count: number;
  last_read_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: MessageType;
  media_url: string | null;
  metadata: MessageMetadata;
  deletion_state: MessageDeletionState;
  created_at: string;
  updated_at: string;
}

export interface MessageDeletion {
  message_id: string;
  user_id: string;
  deleted_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: ReactionEmoji;
  created_at: string;
}

export type ReactionEmoji = '👍' | '❤️' | '😂' | '😮' | '😢';

export interface UserFriend {
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface UserBlock {
  user_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

// ----- Privacy Settings (Profile Extension) -----

export interface MessagingPrivacySettings {
  messaging_privacy: MessagingPrivacy;
  online_status_privacy: MessagingPrivacy;
  discoverable: boolean;
  read_receipts_enabled: boolean;
}

// ----- Message Metadata Types -----

export type MessageMetadata =
  | TextMetadata
  | ImageMetadata
  | VoiceMetadata
  | LocationMetadata
  | GearReferenceMetadata
  | GearTradeMetadata
  | TripInvitationMetadata;

export type TextMetadata = Record<string, never>;

export interface ImageMetadata {
  width: number;
  height: number;
  thumbnail_url: string;
}

export interface VoiceMetadata {
  duration_seconds: number;
  waveform: number[];
}

export interface LocationMetadata {
  latitude: number;
  longitude: number;
  place_name: string;
}

export interface GearReferenceMetadata {
  gear_item_id: string;
  name: string;
  image_url: string;
}

export interface GearTradeMetadata {
  offered_items: GearTradeItem[];
  wanted_items: GearTradeItem[];
  conditions: string;
  status: GearTradeStatus;
}

export interface GearTradeItem {
  id: string;
  name: string;
}

export interface TripInvitationMetadata {
  dates: {
    start: string;
    end: string;
  };
  location: {
    name: string;
    lat?: number;
    lng?: number;
  };
  activity_type: string;
  gear_suggestions: string[];
  rsvp_status: Record<string, RsvpStatus>;
}

// ----- View Models (for UI) -----

export interface ConversationListItem {
  conversation: Conversation;
  role: ParticipantRole;
  is_muted: boolean;
  is_archived: boolean;
  unread_count: number;
  last_read_at: string | null;
  last_message?: MessagePreview;
  participants: ParticipantInfo[];
}

export interface MessagePreview {
  id: string;
  content: string | null;
  message_type: MessageType;
  sender_id: string | null;
  sender_name: string | null;
  created_at: string;
}

export interface ParticipantInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: ParticipantRole;
  joined_at: string;
}

export interface MessageWithSender extends Message {
  sender: UserInfo | null;
  reactions: MessageReaction[];
}

export interface UserInfo {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface FriendInfo extends UserInfo {
  created_at: string;
}

export interface BlockedUserInfo extends UserInfo {
  blocked_at: string;
}

export interface SearchableUser extends UserInfo {
  can_message: boolean;
}

// ----- API Request/Response Types -----

export interface StartConversationRequest {
  recipientId: string;
  initialMessage?: string;
}

export interface StartConversationResponse {
  success: boolean;
  conversationId?: string;
  error?: 'blocked' | 'privacy_restricted' | 'not_found';
}

export interface UserSearchRequest {
  query: string;
  limit?: number;
}

export interface UserSearchResponse {
  users: SearchableUser[];
}

export interface MessageSearchRequest {
  query: string;
  conversationId?: string;
  limit?: number;
}

export interface MessageSearchResult {
  message: {
    id: string;
    content: string | null;
    created_at: string;
  };
  conversation: {
    id: string;
    name: string | null;
    type: ConversationType;
  };
  highlight: string;
}

export interface MessageSearchResponse {
  results: MessageSearchResult[];
}

export interface ReportRequest {
  reportedUserId: string;
  messageId?: string;
  reason: ReportReason;
  details?: string;
}

export interface ReportResponse {
  success: boolean;
  reportId: string;
}

export interface UnreadCountResponse {
  totalUnread: number;
}

// ----- Realtime Event Types -----

export interface TypingEvent {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface PresenceUser {
  user_id: string;
  online_at: string;
}

export interface MessageChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Message | null;
  old: Message | null;
}

// ----- Form/Input Types -----

export interface SendMessageInput {
  conversationId: string;
  content?: string;
  messageType: MessageType;
  mediaUrl?: string;
  metadata?: MessageMetadata;
}

export interface CreateGroupInput {
  name: string;
  participantIds: string[];
}

export interface UpdatePrivacySettingsInput {
  messagingPrivacy?: MessagingPrivacy;
  onlineStatusPrivacy?: MessagingPrivacy;
  discoverable?: boolean;
  readReceiptsEnabled?: boolean;
}

// ----- Error Types -----

export type MessagingErrorCode =
  | 'blocked'
  | 'privacy_restricted'
  | 'not_found'
  | 'not_participant'
  | 'not_admin'
  | 'group_full'
  | 'invalid_message_type'
  | 'media_upload_failed';

export interface MessagingError {
  code: MessagingErrorCode;
  message: string;
}
