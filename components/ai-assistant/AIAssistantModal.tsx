/**
 * AI Assistant Modal Component
 * Feature 050: AI Assistant - T031
 *
 * Full-screen modal dialog for AI chat interface.
 * Trailblazer-only feature with subscription check.
 */

'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChatInterface } from './ChatInterface';
import { useSubscriptionCheck } from '@/hooks/ai-assistant/useSubscriptionCheck';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

interface AIAssistantModalProps {
  open: boolean;
  onClose: () => void;
}

export function AIAssistantModal({ open, onClose }: AIAssistantModalProps) {
  const { user } = useAuthContext();
  const { isTrailblazer, isLoading } = useSubscriptionCheck(user?.uid || null);

  // Prevent non-Trailblazer users from accessing
  if (!isTrailblazer && !isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="h-[90vh] max-h-[900px] w-[95vw] max-w-5xl p-0">
        <ChatInterface onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
