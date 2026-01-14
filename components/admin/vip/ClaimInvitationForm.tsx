/**
 * ClaimInvitationForm Component
 *
 * Feature: 052-vip-loadouts
 * Task: T076
 *
 * Form for admins to send claim invitations to VIPs.
 * Allows specifying the VIP's email address for invitation.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Loader2, Mail, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useVipClaimInvitation } from '@/hooks/admin/vip/useVipClaimInvitation';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Validation Schema
// =============================================================================

const invitationFormSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type InvitationFormData = z.infer<typeof invitationFormSchema>;

// =============================================================================
// Types
// =============================================================================

interface ClaimInvitationFormProps {
  vip: VipWithStats;
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function ClaimInvitationForm({ vip, onSuccess }: ClaimInvitationFormProps) {
  const t = useTranslations('vip.admin.claim');
  const [open, setOpen] = useState(false);
  const { createInvitation, status: invitationStatus, error: invitationError, clearError } = useVipClaimInvitation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvitationFormData>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      email: '',
    },
  });

  const isLoading = invitationStatus === 'creating';
  const isAlreadyClaimed = vip.status === 'claimed';

  const onSubmit = async (data: InvitationFormData) => {
    clearError();

    const invitation = await createInvitation({
      vipId: vip.id,
      email: data.email,
    });

    if (invitation) {
      toast.success(t('invitationSent'), {
        description: t('invitationSentDescription', { email: data.email }),
      });
      reset();
      setOpen(false);
      onSuccess?.();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      reset();
      clearError();
    }
  };

  // Don't show button if VIP is already claimed
  if (isAlreadyClaimed) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          {t('sendInvitation')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>
            {t('inviteDescription', { name: vip.name })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* VIP Info Display */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            {vip.avatarUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={vip.avatarUrl}
                alt={vip.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-medium">{vip.name}</p>
              <p className="text-sm text-muted-foreground">
                {vip.loadoutCount} loadout{vip.loadoutCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {invitationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t(`errors.${invitationError}`, { defaultValue: t('errors.genericError') })}
              </AlertDescription>
            </Alert>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              {...register('email')}
              disabled={isLoading}
              aria-invalid={errors.email ? 'true' : 'false'}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('emailHint')}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('send')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ClaimInvitationForm;
