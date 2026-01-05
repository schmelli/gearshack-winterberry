/**
 * Setting Item Component
 *
 * Feature: settings-update
 * Reusable component for individual setting rows.
 */

import { cn } from '@/lib/utils';

interface SettingItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SettingItem({
  label,
  description,
  children,
  className,
  disabled = false,
}: SettingItemProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        disabled && 'opacity-50',
        className
      )}
    >
      <div className="space-y-0.5">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
