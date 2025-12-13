/**
 * POST /api/messaging/conversations/start
 *
 * Feature: 046-user-messaging-system
 * Task: T018
 *
 * Creates or retrieves a direct conversation between two users.
 * Checks privacy settings and block status before creating.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { startConversationSchema } from '@/lib/validations/messaging-schema';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = startConversationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { recipientId, initialMessage } = validation.data;

    // Check if recipient exists - messaging_privacy column is added by migration 20251213_user_messaging.sql
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id, messaging_privacy')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json(
        { success: false, error: 'not_found' },
        { status: 404 }
      );
    }

    // Check if blocked (in either direction) - user_blocks table created by migration
    const { count: blockCount } = await supabase
      .from('user_blocks')
      .select('*', { count: 'exact', head: true })
      .or(
        `and(user_id.eq.${recipientId},blocked_id.eq.${user.id}),and(user_id.eq.${user.id},blocked_id.eq.${recipientId})`
      );

    if (blockCount && blockCount > 0) {
      return NextResponse.json(
        { success: false, error: 'blocked' },
        { status: 403 }
      );
    }

    // Check recipient's privacy settings
    const messagingPrivacy = recipient.messaging_privacy as string | null;
    if (messagingPrivacy === 'nobody') {
      return NextResponse.json(
        { success: false, error: 'privacy_restricted' },
        { status: 403 }
      );
    }

    if (messagingPrivacy === 'friends_only') {
      // Check if we're in recipient's friends list
      const { count: friendCount } = await supabase
        .from('user_friends')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', recipientId)
        .eq('friend_id', user.id);

      if (!friendCount || friendCount === 0) {
        return NextResponse.json(
          { success: false, error: 'privacy_restricted' },
          { status: 403 }
        );
      }
    }

    // Get or create direct conversation using the database function
    const { data: conversationId, error: convError } = await supabase.rpc(
      'get_or_create_direct_conversation',
      {
        p_user1: user.id,
        p_user2: recipientId,
      }
    );

    if (convError) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json(
        { success: false, error: 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // Send initial message if provided
    if (initialMessage?.trim()) {
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: initialMessage.trim(),
        message_type: 'text',
      });

      if (messageError) {
        console.error('Error sending initial message:', messageError);
        // Don't fail the whole request, conversation is still created
      }
    }

    return NextResponse.json({
      success: true,
      conversationId,
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
