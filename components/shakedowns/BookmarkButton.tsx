/**
 * BookmarkButton Component
 *
 * Feature: 001-community-shakedowns
 * Task: T064
 *
 * Allows users to bookmark shakedowns for later reference.
 * Supports adding optional notes to bookmarks via dropdown menu.
 *
 * States:
 * - Not bookmarked: Outline Bookmark icon
 * - Bookmarked: Filled Bookmark icon (accent color)
 * - Loading: Spinner while toggling
 * - Has note: Small indicator dot when note exists
 *
 * Accessibility Features:
 * - aria-pressed indicates bookmark state
 * - aria-busy indicates loading state
 * - Tooltips describe the action that will be taken
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck, Loader2, StickyNote, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface BookmarkButtonProps {
  /** ID of the shakedown to bookmark */
  shakedownId: string;
  /** Whether the shakedown is currently bookmarked */
  isBookmarked: boolean;
  /** Callback when bookmark status changes */
  onToggle: (shakedownId: string, isBookmarked: boolean) => Promise<void>;
  /** Button size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Whether to show text label alongside icon */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
  /** Optional: Current note content */
  note?: string;
  /** Optional: Callback when note is updated */
  onNoteUpdate?: (shakedownId: string, note: string | null) => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_NOTE_LENGTH = 200;

// =============================================================================
// Component
// =============================================================================

export function BookmarkButton({
  shakedownId,
  isBookmarked,
  onToggle,
  size = 'default',
  showLabel = false,
  className,
  note,
  onNoteUpdate,
}: BookmarkButtonProps) {
  const t = useTranslations('Shakedowns');

  // Local state for optimistic updates
  const [optimisticIsBookmarked, setOptimisticIsBookmarked] = useState(isBookmarked);
  const [optimisticNote, setOptimisticNote] = useState(note || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isNotePopoverOpen, setIsNotePopoverOpen] = useState(false);
  const [noteInput, setNoteInput] = useState(note || '');

  // FIXED: Sync with props when they change - moved to useEffect to avoid
  // state updates during render which can cause infinite loops
  useEffect(() => {
    if (!isLoading) {
      setOptimisticIsBookmarked(isBookmarked);
    }
  }, [isBookmarked, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setOptimisticNote(note || '');
      setNoteInput(note || '');
    }
  }, [note, isLoading]);

  // Determine if note features are enabled
  const hasNoteSupport = Boolean(onNoteUpdate);
  const hasNote = optimisticNote.length > 0;

  // Handle bookmark toggle with optimistic update
  const handleToggle = useCallback(async () => {
    if (isLoading) return;

    const previousIsBookmarked = optimisticIsBookmarked;
    const newIsBookmarked = !optimisticIsBookmarked;

    // Optimistic update
    setIsLoading(true);
    setOptimisticIsBookmarked(newIsBookmarked);

    try {
      await onToggle(shakedownId, newIsBookmarked);

      // Show success toast
      if (newIsBookmarked) {
        toast.success(t('success.bookmarkAdded'));
      } else {
        toast.success(t('success.bookmarkRemoved'));
        // Clear note when unbookmarking
        setOptimisticNote('');
        setNoteInput('');
      }
    } catch {
      // Rollback on error
      setOptimisticIsBookmarked(previousIsBookmarked);
      toast.error(t('errors.bookmarkFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [shakedownId, isLoading, onToggle, optimisticIsBookmarked, t]);

  // Handle note save
  const handleNoteSave = useCallback(async () => {
    if (!onNoteUpdate || isLoading) return;

    const previousNote = optimisticNote;
    const trimmedNote = noteInput.trim();

    setIsLoading(true);
    setOptimisticNote(trimmedNote);

    try {
      await onNoteUpdate(shakedownId, trimmedNote || null);
      setIsNotePopoverOpen(false);
      toast.success(trimmedNote ? t('success.bookmarkAdded') : t('success.bookmarkRemoved'));
    } catch {
      // Rollback on error
      setOptimisticNote(previousNote);
      setNoteInput(previousNote);
      toast.error(t('errors.bookmarkFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [shakedownId, isLoading, noteInput, onNoteUpdate, optimisticNote, t]);

  // Handle note clear
  const handleNoteClear = useCallback(async () => {
    if (!onNoteUpdate || isLoading) return;

    const previousNote = optimisticNote;

    setIsLoading(true);
    setOptimisticNote('');
    setNoteInput('');

    try {
      await onNoteUpdate(shakedownId, null);
      toast.success(t('success.bookmarkRemoved'));
    } catch {
      // Rollback on error
      setOptimisticNote(previousNote);
      setNoteInput(previousNote);
      toast.error(t('errors.bookmarkFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [shakedownId, isLoading, onNoteUpdate, optimisticNote, t]);

  // Get tooltip text based on state
  const getTooltipText = (): string => {
    if (optimisticIsBookmarked) {
      return t('actions.unbookmark');
    }
    return t('actions.bookmark');
  };

  // Size-specific styling
  const sizeConfig = {
    sm: {
      buttonClasses: 'h-7 px-2 text-xs',
      iconSize: 'size-3.5',
      labelGap: 'gap-1',
    },
    default: {
      buttonClasses: 'h-8 px-3 text-sm',
      iconSize: 'size-4',
      labelGap: 'gap-1.5',
    },
    lg: {
      buttonClasses: 'h-10 px-4 text-base',
      iconSize: 'size-5',
      labelGap: 'gap-2',
    },
  };

  const { buttonClasses, iconSize, labelGap } = sizeConfig[size];

  // Render bookmark icon based on state
  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className={cn(iconSize, 'animate-spin')} aria-hidden="true" />;
    }
    if (optimisticIsBookmarked) {
      return (
        <BookmarkCheck
          className={cn(iconSize, 'fill-current')}
          aria-hidden="true"
        />
      );
    }
    return <Bookmark className={iconSize} aria-hidden="true" />;
  };

  // Simple button without note support
  if (!hasNoteSupport) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={optimisticIsBookmarked ? 'secondary' : 'ghost'}
            size={size}
            onClick={handleToggle}
            disabled={isLoading}
            aria-pressed={optimisticIsBookmarked}
            aria-busy={isLoading}
            aria-label={getTooltipText()}
            className={cn(
              buttonClasses,
              labelGap,
              'transition-colors',
              // Bookmarked state styling
              optimisticIsBookmarked && [
                'bg-primary/10 text-primary',
                'dark:bg-primary/20 dark:text-primary',
                'hover:bg-primary/20 dark:hover:bg-primary/30',
              ],
              // Default/unbookmarked state
              !optimisticIsBookmarked && [
                'text-muted-foreground',
                'hover:text-primary dark:hover:text-primary',
              ],
              className
            )}
          >
            {renderIcon()}
            {showLabel && (
              <span>
                {optimisticIsBookmarked
                  ? t('actions.bookmarked')
                  : t('actions.bookmark')}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{getTooltipText()}</TooltipContent>
      </Tooltip>
    );
  }

  // Button with note support via dropdown
  return (
    <div className="relative inline-flex items-center">
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant={optimisticIsBookmarked ? 'secondary' : 'ghost'}
                size={size}
                disabled={isLoading}
                aria-pressed={optimisticIsBookmarked}
                aria-busy={isLoading}
                aria-label={getTooltipText()}
                className={cn(
                  buttonClasses,
                  labelGap,
                  'transition-colors relative',
                  // Bookmarked state styling
                  optimisticIsBookmarked && [
                    'bg-primary/10 text-primary',
                    'dark:bg-primary/20 dark:text-primary',
                    'hover:bg-primary/20 dark:hover:bg-primary/30',
                  ],
                  // Default/unbookmarked state
                  !optimisticIsBookmarked && [
                    'text-muted-foreground',
                    'hover:text-primary dark:hover:text-primary',
                  ],
                  className
                )}
              >
                {renderIcon()}
                {showLabel && (
                  <span>
                    {optimisticIsBookmarked
                      ? t('actions.bookmarked')
                      : t('actions.bookmark')}
                  </span>
                )}
                {/* Note indicator dot */}
                {hasNote && (
                  <span
                    className={cn(
                      'absolute -top-0.5 -right-0.5',
                      'size-2 rounded-full',
                      'bg-amber-500 dark:bg-amber-400',
                      'ring-2 ring-background'
                    )}
                    aria-label="Has note"
                  />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">{getTooltipText()}</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-48">
          {/* Toggle bookmark */}
          <DropdownMenuItem
            onClick={handleToggle}
            disabled={isLoading}
            className="gap-2"
          >
            {optimisticIsBookmarked ? (
              <>
                <Bookmark className="size-4" />
                {t('actions.unbookmark')}
              </>
            ) : (
              <>
                <BookmarkCheck className="size-4" />
                {t('actions.bookmark')}
              </>
            )}
          </DropdownMenuItem>

          {/* Note options (only when bookmarked) */}
          {optimisticIsBookmarked && (
            <>
              <DropdownMenuSeparator />
              <Popover open={isNotePopoverOpen} onOpenChange={setIsNotePopoverOpen}>
                <PopoverTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsNotePopoverOpen(true);
                    }}
                    className="gap-2"
                  >
                    <StickyNote className="size-4" />
                    {hasNote ? 'Edit Note' : 'Add Note'}
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent
                  side="left"
                  align="start"
                  className="w-72 p-3"
                  onInteractOutside={(e) => {
                    // Prevent closing when clicking outside
                    e.preventDefault();
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {hasNote ? 'Edit Note' : 'Add Note'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setIsNotePopoverOpen(false)}
                      >
                        <X className="size-3.5" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </div>
                    <Textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                      placeholder="Add a note..."
                      className="min-h-[80px] text-sm resize-none"
                      maxLength={MAX_NOTE_LENGTH}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {noteInput.length}/{MAX_NOTE_LENGTH}
                      </span>
                      <div className="flex gap-2">
                        {hasNote && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleNoteClear}
                            disabled={isLoading}
                            className="text-destructive hover:text-destructive"
                          >
                            Clear
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={handleNoteSave}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Clear note option (only when note exists) */}
              {hasNote && (
                <DropdownMenuItem
                  onClick={handleNoteClear}
                  disabled={isLoading}
                  variant="destructive"
                  className="gap-2"
                >
                  <X className="size-4" />
                  Clear Note
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// =============================================================================
// Compact Variant
// =============================================================================

/**
 * Minimal bookmark button for use in lists and compact spaces.
 * Icon-only version without note support.
 */
export function BookmarkButtonCompact({
  shakedownId,
  isBookmarked,
  onToggle,
  className,
}: Pick<BookmarkButtonProps, 'shakedownId' | 'isBookmarked' | 'onToggle' | 'className'>) {
  return (
    <BookmarkButton
      shakedownId={shakedownId}
      isBookmarked={isBookmarked}
      onToggle={onToggle}
      size="sm"
      showLabel={false}
      className={className}
    />
  );
}

// =============================================================================
// Exports
// =============================================================================

export default BookmarkButton;
