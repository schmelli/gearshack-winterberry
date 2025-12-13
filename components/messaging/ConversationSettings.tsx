/**
 * ConversationSettings - Conversation Settings Menu
 *
 * Feature: 046-user-messaging-system
 * Task: T064
 *
 * Dropdown menu for conversation actions (mute, archive, leave, etc.)
 */

'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Bell,
  BellOff,
  Archive,
  ArchiveRestore,
  LogOut,
  UserPlus,
  Flag,
} from 'lucide-react';
import type { ConversationListItem } from '@/types/messaging';
import { useConversations } from '@/hooks/messaging/useConversations';
import { toast } from 'sonner';

interface ConversationSettingsProps {
  conversation: ConversationListItem;
  onAddParticipant?: () => void;
  onReport?: () => void;
}

/**
 * Settings dropdown menu for a conversation.
 */
export function ConversationSettings({
  conversation,
  onAddParticipant,
  onReport,
}: ConversationSettingsProps) {
  const { muteConversation, archiveConversation, leaveGroup } = useConversations();

  const isGroup = conversation.conversation.type === 'group';
  const isMuted = conversation.is_muted;
  const isArchived = conversation.is_archived;
  // Check if user is admin by looking at their role in the conversation
  const isConversationAdmin = conversation.role === 'admin';

  const handleMute = async () => {
    try {
      await muteConversation(conversation.conversation.id, !isMuted);
      toast.success(isMuted ? 'Notifications enabled' : 'Notifications muted');
    } catch {
      toast.error('Failed to update notification settings');
    }
  };

  const handleArchive = async () => {
    try {
      await archiveConversation(conversation.conversation.id, !isArchived);
      toast.success(isArchived ? 'Conversation restored' : 'Conversation archived');
    } catch {
      toast.error('Failed to update archive status');
    }
  };

  const handleLeave = async () => {
    if (!isGroup) return;

    try {
      await leaveGroup(conversation.conversation.id);
      toast.success('Left the group');
    } catch {
      toast.error('Failed to leave group');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Conversation settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Mute/Unmute */}
        <DropdownMenuItem onClick={handleMute}>
          {isMuted ? (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </>
          ) : (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Mute Notifications
            </>
          )}
        </DropdownMenuItem>

        {/* Archive/Unarchive */}
        <DropdownMenuItem onClick={handleArchive}>
          {isArchived ? (
            <>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Restore from Archive
            </>
          ) : (
            <>
              <Archive className="mr-2 h-4 w-4" />
              Archive Conversation
            </>
          )}
        </DropdownMenuItem>

        {/* Group-specific actions */}
        {isGroup && (
          <>
            <DropdownMenuSeparator />
            {isConversationAdmin && onAddParticipant && (
              <DropdownMenuItem onClick={onAddParticipant}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Participant
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleLeave}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Leave Group
            </DropdownMenuItem>
          </>
        )}

        {/* Report */}
        <DropdownMenuSeparator />
        {onReport && (
          <DropdownMenuItem
            onClick={onReport}
            className="text-destructive focus:text-destructive"
          >
            <Flag className="mr-2 h-4 w-4" />
            Report Conversation
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
