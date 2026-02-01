/**
 * ProductSuggestionsTab Component
 *
 * Feature: URL-Import & Contributions Tracking
 * Task: 13 - Admin Dashboard UI for Product Suggestions
 *
 * Displays user-submitted product suggestions with filtering,
 * status management, and gardener queue integration.
 */

'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  useProductSuggestions,
  type ContributionType,
  type SuggestionStatus,
  type ProductSuggestion,
} from '@/hooks/admin/useProductSuggestions';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Bot,
  X,
  Package,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

// =============================================================================
// SuggestionCard Component
// =============================================================================

interface SuggestionCardProps {
  suggestion: ProductSuggestion;
  onSendToGardener: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  isProcessing: boolean;
}

function SuggestionCard({
  suggestion,
  onSendToGardener,
  onReject,
  isProcessing,
}: SuggestionCardProps) {
  const t = useTranslations('Admin.contributions.productSuggestions');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  // Safe data access with fallbacks to prevent runtime errors from malformed data
  const safeEnrichmentData = {
    name: suggestion.enrichmentData?.name,
    brand: suggestion.enrichmentData?.brand,
    weightGrams: suggestion.enrichmentData?.weightGrams,
    priceValue: suggestion.enrichmentData?.priceValue,
    currency: suggestion.enrichmentData?.currency ?? 'EUR',
    description: suggestion.enrichmentData?.description,
    sourceUrl: suggestion.enrichmentData?.sourceUrl,
    delta: suggestion.enrichmentData?.delta,
  };

  // Icons for contribution types
  const typeIcon: Record<ContributionType, React.ReactNode> = {
    new_product: <Package className="h-4 w-4 text-green-500" />,
    incomplete_match: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    data_update: <RefreshCw className="h-4 w-4 text-blue-500" />,
  };

  // Status badge variants
  const statusVariant: Record<SuggestionStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    pending: 'default',
    queued_for_review: 'secondary',
    in_gardener_queue: 'secondary',
    processed: 'outline',
    rejected: 'destructive',
  };

  // Get display name for product with safe fallbacks
  const displayName =
    safeEnrichmentData.name ||
    suggestion.productName ||
    t('unnamed');

  // Get source URL from enrichment data or direct field
  const sourceUrl =
    safeEnrichmentData.sourceUrl || suggestion.sourceUrl;

  // Handle actions with toast notifications
  const handleSendToGardener = async () => {
    try {
      await onSendToGardener(suggestion.id);
      toast.success(t('sentToGardener'));
    } catch {
      toast.error(t('actionFailed'));
    }
  };

  const handleReject = async () => {
    try {
      await onReject(suggestion.id);
      toast.success(t('rejected'));
    } catch {
      toast.error(t('actionFailed'));
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0">{typeIcon[suggestion.contributionType]}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {t(`types.${suggestion.contributionType}`)}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <CardTitle className="text-sm truncate" title={displayName}>
              {displayName}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant[suggestion.suggestionStatus]}>
              {t(`status.${suggestion.suggestionStatus}`)}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs flex items-center gap-1 flex-wrap">
          {safeEnrichmentData.brand && (
            <span className="font-medium">{safeEnrichmentData.brand}</span>
          )}
          {safeEnrichmentData.brand && <span className="text-muted-foreground/50">|</span>}
          <span>
            {formatDistanceToNow(new Date(suggestion.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
          {sourceUrl && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {t('viaUrl')}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs break-all">
                    {sourceUrl}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          {suggestion.countryCode && (
            <>
              <span className="text-muted-foreground/50">|</span>
              <span className="inline-flex items-center gap-0.5">
                <Globe className="h-3 w-3" />
                {suggestion.countryCode.toUpperCase()}
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
          {safeEnrichmentData.weightGrams && (
            <div className="text-muted-foreground">
              <span className="font-medium">{t('weight')}:</span>{' '}
              {safeEnrichmentData.weightGrams}g
            </div>
          )}
          {safeEnrichmentData.priceValue && (
            <div className="text-muted-foreground">
              <span className="font-medium">{t('price')}:</span>{' '}
              {safeEnrichmentData.currency}
              {safeEnrichmentData.priceValue}
            </div>
          )}
          {safeEnrichmentData.description && (
            <div className="col-span-2 text-muted-foreground truncate" title={safeEnrichmentData.description}>
              <span className="font-medium">{t('description')}:</span>{' '}
              {safeEnrichmentData.description.slice(0, 80)}
              {safeEnrichmentData.description.length > 80 && '...'}
            </div>
          )}
        </div>

        {/* Match Score */}
        {suggestion.catalogMatchScore !== null && (
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <span className="font-medium">{t('matchScore')}:</span>
            <span
              className={
                suggestion.catalogMatchScore >= 0.8
                  ? 'text-green-600 dark:text-green-400'
                  : suggestion.catalogMatchScore >= 0.5
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              }
            >
              {Math.round(suggestion.catalogMatchScore * 100)}%
            </span>
          </div>
        )}

        {/* Delta (for data_update type) */}
        {safeEnrichmentData.delta &&
          Object.keys(safeEnrichmentData.delta).length > 0 && (
            <div className="bg-muted/50 rounded-md p-2 mb-3 text-xs">
              <div className="font-medium mb-1">{t('changes')}:</div>
              <div className="space-y-0.5">
                {Object.entries(safeEnrichmentData.delta).map(
                  ([key, { old: oldVal, new: newVal }]) => (
                    <div key={key} className="flex items-center gap-1">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="line-through text-red-500/70">
                        {String(oldVal ?? '-')}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-600 dark:text-green-400">
                        {String(newVal ?? '-')}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSendToGardener}
            disabled={isProcessing || suggestion.suggestionStatus !== 'pending'}
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Bot className="h-3 w-3 mr-1" />
            )}
            {t('sendToGardener')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing || suggestion.suggestionStatus !== 'pending'}
          >
            <X className="h-3 w-3 mr-1" />
            {t('reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ProductSuggestionsTab Component
// =============================================================================

export function ProductSuggestionsTab() {
  const t = useTranslations('Admin.contributions.productSuggestions');
  const [localFilters, setLocalFilters] = useState<{
    contributionType?: ContributionType;
    status?: SuggestionStatus;
  }>({ status: 'pending' });

  const {
    suggestions,
    loading,
    error,
    totalCount,
    setFilters,
    fetchSuggestions,
    sendToGardener,
    rejectSuggestion,
    isProcessing,
  } = useProductSuggestions({ status: 'pending', limit: 20 });

  // Sync local filters with hook filters
  const handleTypeFilterChange = (value: string) => {
    const newType = value === 'all' ? undefined : (value as ContributionType);
    setLocalFilters((prev) => ({ ...prev, contributionType: newType }));
    setFilters((prev) => ({ ...prev, contributionType: newType }));
  };

  const handleStatusFilterChange = (value: string) => {
    const newStatus = value === 'all' ? undefined : (value as SuggestionStatus);
    setLocalFilters((prev) => ({ ...prev, status: newStatus }));
    setFilters((prev) => ({ ...prev, status: newStatus }));
  };

  // Loading state
  if (loading && suggestions.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-destructive mb-2">{t('error')}</div>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchSuggestions()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Contribution Type Filter */}
        <Select
          value={localFilters.contributionType ?? 'all'}
          onValueChange={handleTypeFilterChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filters.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
            <SelectItem value="new_product">{t('types.new_product')}</SelectItem>
            <SelectItem value="incomplete_match">
              {t('types.incomplete_match')}
            </SelectItem>
            <SelectItem value="data_update">{t('types.data_update')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={localFilters.status ?? 'all'}
          onValueChange={handleStatusFilterChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filters.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
            <SelectItem value="pending">{t('status.pending')}</SelectItem>
            <SelectItem value="in_gardener_queue">
              {t('status.in_gardener_queue')}
            </SelectItem>
            <SelectItem value="processed">{t('status.processed')}</SelectItem>
            <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Refresh Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchSuggestions()}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('refresh')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Count */}
      <div className="text-sm text-muted-foreground mb-4">
        {t('suggestionsFound', { count: totalCount })}
      </div>

      {/* List */}
      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('noSuggestions')}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onSendToGardener={sendToGardener}
              onReject={rejectSuggestion}
              isProcessing={isProcessing}
            />
          ))}
        </div>
      )}

      {/* Loading indicator for background refresh */}
      {loading && suggestions.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
