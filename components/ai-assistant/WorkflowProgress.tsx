/**
 * Workflow Progress Component
 * Displays granular step-by-step progress of the AI pipeline.
 *
 * Shows each workflow phase (memory, context, thinking) with
 * real-time status indicators (running spinner, completed check, failed X).
 *
 * Architecture: Feature-Sliced Light — stateless UI, receives data via props.
 */

'use client';

import { useMemo, type ReactElement } from 'react';
import { Check, X, Loader2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WorkflowStep } from '@/types/ai-assistant';

/** Map step names to emojis for visual context */
const STEP_EMOJIS: Record<string, string> = {
  memory: '👤',
  context: '🏕️',
  thinking: '🧠',
};

/**
 * Map step statuses to icon elements.
 * 'pending' is reserved for future use (e.g., showing queued steps before they start).
 * The backend currently only emits 'running' and 'failed'; 'completed' is inferred by the hook.
 *
 * Icons are intentionally distinct:
 *   pending  → Clock      (grey)  — queued, not yet started
 *   running  → Loader2    (amber) — actively processing with spin animation
 *   completed → Check     (green) — done
 *   failed   → X          (red)   — terminal failure
 */
const STATUS_ICONS: Record<WorkflowStep['status'], ReactElement> = {
  pending: <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />,
  running: <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-500" />,
  completed: <Check className="h-3 w-3 shrink-0 text-green-500" />,
  failed: <X className="h-3 w-3 shrink-0 text-red-500" />,
};

interface WorkflowProgressProps {
  steps: WorkflowStep[];
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  const t = useTranslations('AIAssistant');

  // Memoised label map — t() is stable across renders, so this only rebuilds when locale changes
  const stepLabels = useMemo<Record<string, string>>(() => ({
    memory: t('progress.memory'),
    context: t('progress.context'),
    thinking: t('progress.thinking'),
  }), [t]);

  if (steps.length === 0) return null;

  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      {steps.map((s) => (
        <div key={s.step} className="flex items-center gap-2">
          {STATUS_ICONS[s.status]}
          <span>
            {STEP_EMOJIS[s.step] ?? '⚙️'} {stepLabels[s.step] ?? t('progress.unknown')}
          </span>
        </div>
      ))}
    </div>
  );
}
