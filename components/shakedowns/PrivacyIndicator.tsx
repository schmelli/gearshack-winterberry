/**
 * PrivacyIndicator Component
 *
 * Feature: 001-community-shakedowns
 * Extracted from: ShakedownDetail.tsx
 *
 * Displays privacy status with icon and label.
 */

import { useTranslations } from 'next-intl';
import { Globe, Lock, Users } from 'lucide-react';

import type { ShakedownPrivacy } from '@/types/shakedown';
import { cn } from '@/lib/utils';

interface PrivacyIndicatorProps {
  privacy: ShakedownPrivacy;
  className?: string;
}

const PRIVACY_CONFIG = {
  public: {
    icon: Globe,
    labelKey: 'public' as const,
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  friends_only: {
    icon: Users,
    labelKey: 'friendsOnly' as const,
    className: 'text-blue-600 dark:text-blue-400',
  },
  private: {
    icon: Lock,
    labelKey: 'private' as const,
    className: 'text-gray-600 dark:text-gray-400',
  },
} as const;

export function PrivacyIndicator({ privacy, className }: PrivacyIndicatorProps): React.ReactElement {
  const t = useTranslations('Shakedowns.privacyOptions');
  const config = PRIVACY_CONFIG[privacy];
  const Icon = config.icon;

  return (
    <span className={cn('flex items-center gap-1.5 text-sm', config.className, className)}>
      <Icon className="size-4" />
      <span>{t(config.labelKey)}</span>
    </span>
  );
}

export default PrivacyIndicator;
