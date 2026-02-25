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

import { Check, X, Loader2 } from 'lucide-react';
import type { WorkflowStep } from '@/hooks/ai-assistant/useMastraChat';

/** Map step names to emojis for visual context */
const STEP_EMOJIS: Record<string, string> = {
  memory: '\uD83D\uDC64',
  context: '\uD83C\uDFD5\uFE0F',
  thinking: '\uD83E\uDDE0',
};

interface WorkflowProgressProps {
  steps: WorkflowStep[];
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      {steps.map((s) => (
        <div key={s.step} className="flex items-center gap-2">
          {s.status === 'running' && (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-500" />
          )}
          {s.status === 'completed' && (
            <Check className="h-3 w-3 shrink-0 text-green-500" />
          )}
          {s.status === 'failed' && (
            <X className="h-3 w-3 shrink-0 text-red-500" />
          )}
          <span>
            {STEP_EMOJIS[s.step] ?? '\u2699\uFE0F'} {s.message}
          </span>
        </div>
      ))}
    </div>
  );
}
