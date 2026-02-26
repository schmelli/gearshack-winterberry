'use client';

/**
 * Signup CTA Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T021
 *
 * Displays a compelling call-to-action for anonymous users to sign up
 * and add the shared loadout to their collection.
 */

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignupCTAProps {
  /** The share token to store for post-signup import */
  shareToken: string;
}

export function SignupCTA({ shareToken }: SignupCTAProps) {
  const t = useTranslations('SharedLoadout');
  const router = useRouter();

  const handleSignup = () => {
    // Store the share token for post-signup import (T023)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingImport', shareToken);
    }
    router.push('/auth');
  };

  const handleLogin = () => {
    // Store the share token for post-login import (T023)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingImport', shareToken);
    }
    router.push('/auth');
  };

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent p-6 shadow-xl backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">
            {t('signupCta')}
          </h3>
          <p className="text-sm text-slate-200">
            {t('signupDescription')}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button
            onClick={handleSignup}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t('signupButton')}
          </Button>

          <button
            onClick={handleLogin}
            className="text-sm text-slate-300 hover:text-white underline-offset-4 hover:underline transition-colors"
          >
            <LogIn className="inline mr-1 h-3 w-3" />
            {t('loginButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
