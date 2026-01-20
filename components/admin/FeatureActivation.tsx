/**
 * FeatureActivation Component
 *
 * Feature: Admin Feature Activation
 *
 * Admin component for managing feature flags.
 * Displays features in a hierarchical structure with toggle controls
 * and user group restrictions.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  MessageSquare,
  Scale,
  UserPlus,
  BookOpen,
  Bot,
  Mail,
  ChevronDown,
  ChevronRight,
  Loader2,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAdminFeatureFlags } from '@/hooks/admin/useAdminFeatureFlags';
import type {
  FeatureFlag,
  FeatureFlagWithChildren,
  FeatureUserGroup,
} from '@/types/feature-flags';

// Icon mapping for features
const FEATURE_ICONS: Record<string, React.ElementType> = {
  community: Users,
  community_bulletin: MessageSquare,
  community_shakedowns: Scale,
  community_social: UserPlus,
  community_wiki: BookOpen,
  ai_gear_assistant: Bot,
  messaging: Mail,
};

// Colors for feature cards
const FEATURE_COLORS: Record<string, string> = {
  community: 'border-l-blue-500',
  ai_gear_assistant: 'border-l-purple-500',
  messaging: 'border-l-green-500',
};

// User groups that can be selected
const SELECTABLE_GROUPS: FeatureUserGroup[] = [
  'admins',
  'trailblazer',
  'beta',
  'vip',
  'merchant',
];

interface FeatureCardProps {
  feature: FeatureFlag;
  isChild?: boolean;
  onToggle: (featureKey: string, enabled: boolean) => void;
  onGroupsChange: (featureKey: string, groups: FeatureUserGroup[]) => void;
  isUpdating: boolean;
  t: ReturnType<typeof useTranslations>;
}

function FeatureCard({
  feature,
  isChild = false,
  onToggle,
  onGroupsChange,
  isUpdating,
  t,
}: FeatureCardProps) {
  const Icon = FEATURE_ICONS[feature.feature_key] || Users;
  const colorClass = isChild ? '' : FEATURE_COLORS[feature.feature_key] || 'border-l-gray-500';

  const handleGroupToggle = useCallback(
    (group: FeatureUserGroup, checked: boolean) => {
      const newGroups = checked
        ? [...feature.allowed_groups, group]
        : feature.allowed_groups.filter((g) => g !== group);
      onGroupsChange(feature.feature_key, newGroups);
    },
    [feature.feature_key, feature.allowed_groups, onGroupsChange]
  );

  return (
    <div
      className={`rounded-lg border bg-card p-4 ${
        isChild ? 'ml-6 border-l-2 border-l-muted-foreground/30' : `border-l-4 ${colorClass}`
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Feature Info */}
        <div className="flex items-start gap-3 flex-1">
          <div
            className={`rounded-lg p-2 ${
              feature.is_enabled
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{feature.feature_name}</h3>
              {feature.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{feature.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {feature.is_enabled ? (
                <Badge variant="default" className="bg-green-600">
                  {t('enabled')}
                </Badge>
              ) : (
                <Badge variant="secondary">{t('disabled')}</Badge>
              )}
              {feature.is_enabled &&
                feature.allowed_groups.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {t('restrictedTo', { count: feature.allowed_groups.length })}
                  </Badge>
                )}
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2">
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
          <Switch
            checked={feature.is_enabled}
            onCheckedChange={(checked) => onToggle(feature.feature_key, checked)}
            disabled={isUpdating}
          />
        </div>
      </div>

      {/* User Group Restrictions */}
      {feature.is_enabled && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-3">
            {t('restrictAccess')}
          </p>
          <div className="flex flex-wrap gap-4">
            {SELECTABLE_GROUPS.map((group) => (
              <div key={group} className="flex items-center space-x-2">
                <Checkbox
                  id={`${feature.feature_key}-${group}`}
                  checked={feature.allowed_groups.includes(group)}
                  onCheckedChange={(checked) =>
                    handleGroupToggle(group, checked === true)
                  }
                  disabled={isUpdating}
                />
                <Label
                  htmlFor={`${feature.feature_key}-${group}`}
                  className="text-sm cursor-pointer"
                >
                  {t(`groups.${group}`)}
                </Label>
              </div>
            ))}
          </div>
          {feature.allowed_groups.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {t('availableToAll')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface FeatureGroupProps {
  feature: FeatureFlagWithChildren;
  onToggle: (featureKey: string, enabled: boolean) => void;
  onGroupsChange: (featureKey: string, groups: FeatureUserGroup[]) => void;
  isUpdating: boolean;
  t: ReturnType<typeof useTranslations>;
}

function FeatureGroup({
  feature,
  onToggle,
  onGroupsChange,
  isUpdating,
  t,
}: FeatureGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = feature.children.length > 0;

  return (
    <div className="space-y-3">
      {/* Parent Feature */}
      {hasChildren ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="space-y-3">
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer">
                <FeatureCard
                  feature={feature}
                  onToggle={onToggle}
                  onGroupsChange={onGroupsChange}
                  isUpdating={isUpdating}
                  t={t}
                />
                <div className="flex items-center gap-2 ml-4 mt-2 text-sm text-muted-foreground">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span>
                    {t('subFeatures', { count: feature.children.length })}
                  </span>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 mt-3">
                {feature.children.map((child) => (
                  <FeatureCard
                    key={child.id}
                    feature={child}
                    isChild
                    onToggle={onToggle}
                    onGroupsChange={onGroupsChange}
                    isUpdating={isUpdating}
                    t={t}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ) : (
        <FeatureCard
          feature={feature}
          onToggle={onToggle}
          onGroupsChange={onGroupsChange}
          isUpdating={isUpdating}
          t={t}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeatureActivation() {
  const t = useTranslations('Admin.features');
  const {
    features,
    flatFeatures,
    loadingState,
    error,
    updateFeature,
    refetch,
  } = useAdminFeatureFlags();

  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (featureKey: string, enabled: boolean) => {
      const feature = flatFeatures.find((f) => f.feature_key === featureKey);
      if (!feature) return;

      setUpdatingKey(featureKey);
      try {
        await updateFeature({
          featureKey,
          isEnabled: enabled,
          allowedGroups: feature.allowed_groups,
        });
      } finally {
        setUpdatingKey(null);
      }
    },
    [flatFeatures, updateFeature]
  );

  const handleGroupsChange = useCallback(
    async (featureKey: string, groups: FeatureUserGroup[]) => {
      const feature = flatFeatures.find((f) => f.feature_key === featureKey);
      if (!feature) return;

      setUpdatingKey(featureKey);
      try {
        await updateFeature({
          featureKey,
          isEnabled: feature.is_enabled,
          allowedGroups: groups,
        });
      } finally {
        setUpdatingKey(null);
      }
    },
    [flatFeatures, updateFeature]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loadingState === 'loading'}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                loadingState === 'loading' ? 'animate-spin' : ''
              }`}
            />
            {t('refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loadingState === 'loading' && features.length === 0 && (
          <LoadingSkeleton />
        )}

        {/* Features List */}
        {features.length > 0 && (
          <div className="space-y-6">
            {features.map((feature) => (
              <FeatureGroup
                key={feature.id}
                feature={feature}
                onToggle={handleToggle}
                onGroupsChange={handleGroupsChange}
                isUpdating={
                  loadingState === 'submitting' &&
                  (updatingKey === feature.feature_key ||
                    feature.children.some((c) => c.feature_key === updatingKey))
                }
                t={t}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {loadingState !== 'loading' && features.length === 0 && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('noFeatures')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
