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

import { type ReactElement } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WorkflowStep } from '@/hooks/ai-assistant/useMastraChat';

/** Map step names to emojis for visual context */
const STEP_EMOJIS: Record<string, string> = {
  memory: '👤',
  context: '🏕️',
  thinking: '🧠',
};

/** Map step statuses to icon elements */
const STATUS_ICONS: Record<WorkflowStep['status'], ReactElement> = {
  pending: <Loader2 className="h-3 w-3 shrink-0 text-muted-foreground" />,
  running: <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-500" />,
  completed: <Check className="h-3 w-3 shrink-0 text-green-500" />,
  failed: <X className="h-3 w-3 shrink-0 text-red-500" />,
};

interface WorkflowProgressProps {
  steps: WorkflowStep[];
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  const t = useTranslations('AIAssistant');

  // Build label map from known translation keys; unknown steps fall back to the step name
  const stepLabels: Record<string, string> = {
    memory: t('progress.memory'),
    context: t('progress.context'),
    thinking: t('progress.thinking'),
  };

  if (steps.length === 0) return null;

  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      {steps.map((s, i) => (
        <div key={`${s.step}-${i}`} className="flex items-center gap-2">
          {STATUS_ICONS[s.status]}
          <span>
            {STEP_EMOJIS[s.step] ?? '⚙️'} {stepLabels[s.step] ?? s.step}
          </span>
        </div>
      ))}
    </div>
  );
}
