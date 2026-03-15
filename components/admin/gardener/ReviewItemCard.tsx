'use client';

import { memo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Tag,
  Link2,
  Lightbulb,
  SkipForward,
  Trash2,
} from 'lucide-react';
import type { GardenerReviewItem } from '@/types/gardener';

interface ReviewItemCardProps {
  item: GardenerReviewItem;
  onApprove: (notes?: string) => Promise<void>;
  onReject: (notes?: string) => Promise<void>;
  onSkip: () => Promise<void>;
  onDelete: (notes?: string) => Promise<void>;
  isProcessing: boolean;
}

/**
 * Badge color mapping for node types
 */
const nodeTypeConfig: Record<string, { className: string; icon: React.ElementType }> = {
  GearItem: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: Package },
  Brand: { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: Tag },
  Category: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: Tag },
  ProductFamily: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: Package },
  Technology: { className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', icon: Lightbulb },
  UsageScenario: { className: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', icon: Tag },
  Insight: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Lightbulb },
};

/**
 * Confidence indicator component
 */
function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const colorClass =
    percentage >= 80
      ? 'text-green-600 dark:text-green-400'
      : percentage >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <span className={`font-medium ${colorClass}`}>{percentage}%</span>
  );
}

/**
 * ReviewItemCard component
 * Displays details of a single review item with approve/reject actions
 */
function ReviewItemCardComponent({
  item,
  onApprove,
  onReject,
  onSkip,
  onDelete,
  isProcessing,
}: ReviewItemCardProps) {
  const t = useTranslations('Admin.gardener.review');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showRelationships, setShowRelationships] = useState(false);

  const config = nodeTypeConfig[item.nodeType] || {
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    icon: Package,
  };
  const TypeIcon = config.icon;

  const handleApprove = async () => {
    await onApprove(notes.trim() || undefined);
    setNotes('');
    setShowNotes(false);
  };

  const handleReject = async () => {
    await onReject(notes.trim() || undefined);
    setNotes('');
    setShowNotes(false);
  };

  const handleSkip = async () => {
    await onSkip();
  };

  const handleDelete = async () => {
    await onDelete(notes.trim() || undefined);
    setNotes('');
    setShowNotes(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl font-semibold truncate">
              {item.name}
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className={config.className}>
                <TypeIcon className="mr-1 h-3 w-3" />
                {item.nodeType}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {t('confidence')}: <ConfidenceIndicator confidence={item.confidence} />
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Problem Description */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {t('problem')}
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {item.problem}
              </p>
            </div>
          </div>
        </div>

        {/* Current Data */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('currentData')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {item.currentData.brand && (
              <div>
                <span className="text-muted-foreground">{t('brand')}:</span>{' '}
                <span className="font-medium">{item.currentData.brand}</span>
              </div>
            )}
            {item.currentData.category && (
              <div>
                <span className="text-muted-foreground">{t('category')}:</span>{' '}
                <span className="font-medium">{item.currentData.category}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{t('relationships')}:</span>{' '}
              <span className="font-medium">{item.currentData.relationshipCount}</span>
            </div>
          </div>

          {/* Relationships Collapsible */}
          {item.currentData.relationships.length > 0 && (
            <Collapsible open={showRelationships} onOpenChange={setShowRelationships}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    {t('viewRelationships', { count: item.currentData.relationships.length })}
                  </span>
                  {showRelationships ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {item.currentData.relationships.map((rel, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{rel.type}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{rel.targetName}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <Separator />

        {/* Suggested Resolution */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {t('suggestedResolution')}
              </p>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                {item.suggestedResolution}
              </p>
            </div>
          </div>
        </div>

        {/* Notes Input */}
        <Collapsible open={showNotes} onOpenChange={setShowNotes}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              {showNotes ? t('hideNotes') : t('addNotes')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={3}
              className="resize-none"
            />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {t('approve')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {t('reject')}
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isProcessing}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            {t('skip')}
          </Button>
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {t('delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Custom comparison function for ReviewItemCard memoization.
 * Compares item by approvalId and processing state to detect meaningful changes.
 */
function areReviewItemCardPropsEqual(
  prevProps: ReviewItemCardProps,
  nextProps: ReviewItemCardProps
): boolean {
  return (
    prevProps.item.approvalId === nextProps.item.approvalId &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.confidence === nextProps.item.confidence &&
    prevProps.isProcessing === nextProps.isProcessing
  );
}

export const ReviewItemCard = memo(ReviewItemCardComponent, areReviewItemCardPropsEqual);
