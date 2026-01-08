/**
 * useWikiGenerator Hook
 *
 * Feature: Admin Section Enhancement
 *
 * Hook for LLM-based wiki article generation from URLs.
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  WikiGenerationInput,
  WikiGenerationResult,
  WikiGenerationStatus,
  UseWikiGeneratorReturn,
} from '@/types/admin';

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWikiGenerator(): UseWikiGeneratorReturn {
  const [status, setStatus] = useState<WikiGenerationStatus>('idle');
  const [result, setResult] = useState<WikiGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (input: WikiGenerationInput) => {
    setStatus('fetching');
    setError(null);
    setResult(null);

    try {
      // Call the API route
      const response = await fetch('/api/admin/wiki/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate wiki article');
      }

      setStatus('generating');

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult({
        title_en: data.title_en,
        title_de: data.title_de,
        content_en: data.content_en,
        content_de: data.content_de,
        suggestedCategory: data.suggestedCategory,
        keyTopics: data.keyTopics,
        sourceSummary: data.sourceSummary,
        // Duplicate detection results
        similarArticles: data.similarArticles,
        hasPotentialDuplicates: data.hasPotentialDuplicates,
      });
      setStatus('success');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate article';
      setError(message);
      setStatus('error');
      console.error('[useWikiGenerator] Error:', err);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    generate,
    reset,
  };
}
