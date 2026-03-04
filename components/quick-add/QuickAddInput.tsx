/**
 * QuickAddInput Component
 *
 * Feature: 054-zero-friction-input
 *
 * Unified input field for zero-friction gear import.
 * Supports text/URL typing, image paste, drag & drop, and camera capture.
 * UI-only local state (input value, drag). Business logic in useQuickAdd hook.
 */

'use client';

import { useRef, useState, useCallback } from 'react';
import { Loader2, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { QuickAddStatus } from '@/types/quick-add';

// =============================================================================
// Types
// =============================================================================

export interface QuickAddInputProps {
  status: QuickAddStatus;
  error: string | null;
  onSubmitText: (input: string) => void;
  onSubmitImage: (file: File) => void;
  onReset: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function QuickAddInput({
  status,
  error,
  onSubmitText,
  onSubmitImage,
  onReset,
}: QuickAddInputProps) {
  const t = useTranslations('QuickAdd');
  const [value, setValue] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = status === 'extracting' || status === 'saving';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  // ── Submit handler ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isProcessing) return;
    onSubmitText(trimmed);
    // Don't clear input here — clear on success only (isSuccess branch renders empty input).
    // Keeping the text on error lets users fix a typo and re-submit without retyping.
  }, [value, isProcessing, onSubmitText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // ── Image handling (shared) ─────────────────────────────────────────────
  // Validation is handled by useQuickAdd.processImage with user-facing error messages.
  const handleImageFile = useCallback(
    (file: File) => {
      onSubmitImage(file);
    },
    [onSubmitImage]
  );

  // ── Paste handler (image detection) ─────────────────────────────────────
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          handleImageFile(file);
        }
      }
    },
    [handleImageFile]
  );

  // ── Drag & drop ─────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        // All files (image or not) go through the hook for validation and error handling
        handleImageFile(file);
      }
    },
    [handleImageFile]
  );

  // ── Camera / file picker ────────────────────────────────────────────────
  const handleCameraClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageFile(file);
      }
      // Reset so same file can be selected again
      if (e.target) e.target.value = '';
    },
    [handleImageFile]
  );

  // ── Clear on success ───────────────────────────────────────────────────
  if (isSuccess) {
    // Show success briefly, input will be ready after useQuickAdd resets
    return (
      <div className="relative flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <Input
            disabled
            value=""
            placeholder={t('placeholder')}
            className="pr-10 border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center gap-2 w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (isError) onReset();
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isProcessing}
          placeholder={t('placeholder')}
          className={`pr-10 transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : isError
                ? 'border-destructive/50'
                : ''
          }`}
          aria-label={t('inputLabel')}
          aria-invalid={isError || undefined}
          aria-describedby={isError && error ? 'quick-add-error' : undefined}
        />

        {/* Status icon inside input */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isProcessing && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {isError && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {/* Camera button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={handleCameraClick}
        disabled={isProcessing}
        aria-label={t('cameraButton')}
      >
        <Camera className="h-4 w-4" />
      </Button>

      {/* Hidden file input for camera capture (rear camera on mobile).
          Note: capture="environment" is intentional here — the camera button's purpose
          is "Take photo" (see aria-label). Gallery picking is handled by drag-and-drop,
          paste, or the separate image search/import features. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Error message */}
      {isError && error && (
        <p
          id="quick-add-error"
          role="alert"
          className="absolute -bottom-6 left-0 text-xs text-destructive truncate max-w-full"
        >
          {error}
        </p>
      )}

      {/* Drag overlay hint */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/10 pointer-events-none z-10">
          <span className="text-sm font-medium text-primary">{t('dropHint')}</span>
        </div>
      )}
    </div>
  );
}
