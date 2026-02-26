/**
 * Account Settings Page
 *
 * Feature: settings-update
 * Account management including email, password, subscription, and deletion.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, Lock, CreditCard, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingItem } from '@/components/settings/SettingItem';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const t = useTranslations('settings.account');
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('password.mismatch'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('password.tooShort'));
      return;
    }

    setIsChangingPassword(true);
    try {
      // TODO: Implement password change via Supabase
      toast.success(t('password.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error(t('password.error'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error(t('delete.confirmationError'));
      return;
    }

    setIsDeleting(true);
    try {
      // TODO: Implement account deletion via API
      toast.success(t('delete.success'));
      await signOut();
    } catch {
      toast.error(t('delete.error'));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Section */}
      <SettingsSection
        title={t('email.title')}
        description={t('email.description')}
      >
        <SettingItem label={t('email.current')} disabled>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{user?.email ?? '-'}</span>
          </div>
        </SettingItem>

        <div className="pt-2">
          <Button variant="outline" size="sm" disabled>
            {t('email.changeButton')}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('email.comingSoon')}
          </p>
        </div>
      </SettingsSection>

      {/* Password Section */}
      <SettingsSection
        title={t('password.title')}
        description={t('password.description')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t('password.current')}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t('password.new')}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t('password.confirm')}</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={
              isChangingPassword ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            <Lock className="mr-2 h-4 w-4" />
            {isChangingPassword ? t('password.changing') : t('password.changeButton')}
          </Button>
        </div>
      </SettingsSection>

      {/* Subscription Section */}
      <SettingsSection
        title={t('subscription.title')}
        description={t('subscription.description')}
      >
        <SettingItem label={t('subscription.plan')}>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('subscription.free')}</span>
          </div>
        </SettingItem>

        <div className="pt-2">
          <Button variant="default" size="sm" disabled>
            {t('subscription.upgrade')}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('subscription.comingSoon')}
          </p>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection
        title={t('delete.title')}
        description={t('delete.description')}
        className="border-destructive"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('delete.warning.title')}</AlertTitle>
          <AlertDescription>
            {t('delete.warning.description')}
          </AlertDescription>
        </Alert>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('delete.button')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delete.dialog.title')}</DialogTitle>
              <DialogDescription>
                {t('delete.dialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm">
                {t('delete.dialog.instruction')}
              </p>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                {t('delete.dialog.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== 'DELETE'}
              >
                {isDeleting ? t('delete.dialog.deleting') : t('delete.dialog.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SettingsSection>
    </div>
  );
}
