export type NotificationType =
  | 'loadout_comment'
  | 'message_received'
  | 'friend_request'
  | 'gear_trade'
  | 'system'
  | 'gear_enrichment'
  | 'shakedown_badge'
  | 'shakedown_feedback'
  | 'shakedown_reply'
  | 'offer_received'
  | 'merchant_approved'
  | 'merchant_rejected'
  | 'merchant_suspended';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  referenceType: string | null;
  referenceId: string | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
