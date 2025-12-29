/**
 * Moderation Reports Hook
 *
 * Feature: 051-community-bulletin-board
 * Task: T060
 *
 * Fetches pending reports and provides moderation actions.
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ReportStatus, ModerationAction } from '@/types/bulletin';

export interface ModerationReport {
  id: string;
  target_type: 'post' | 'reply';
  target_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  report_count: number;
  created_at: string;
  reporter_name: string;
  target_content: string;
  target_author_id: string;
  target_author_name: string;
}

interface ModerationState {
  reports: ModerationReport[];
  isLoading: boolean;
  error: string | null;
}

export function useModerationReports() {
  const supabase = createClient();
  const [state, setState] = useState<ModerationState>({
    reports: [],
    isLoading: false,
    error: null,
  });

  const loadReports = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the moderation view
      // Note: Type assertion needed - view exists but types need regeneration
      const { data, error } = await (supabase as any)
        .from('v_bulletin_reports_for_mods')
        .select('*')
        .eq('status', 'pending')
        .order('report_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setState({
        reports: (data ?? []) as ModerationReport[],
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load reports',
      }));
    }
  }, [supabase]);

  const resolveReport = useCallback(
    async (
      reportId: string,
      action: ModerationAction,
      targetAuthorId: string
    ) => {
      try {
        // Update report status
        // Note: Type assertion needed - table exists but types need regeneration
        const { error: reportError } = await (supabase as any)
          .from('bulletin_reports')
          .update({
            status: 'resolved' as ReportStatus,
            resolved_by: (await supabase.auth.getUser()).data.user?.id,
            resolved_at: new Date().toISOString(),
            action_taken: action,
          })
          .eq('id', reportId);

        if (reportError) throw reportError;

        // Apply action based on type
        if (action === 'delete_content') {
          // Find the report to get target info
          const report = state.reports.find((r) => r.id === reportId);
          if (report) {
            if (report.target_type === 'post') {
              // Note: Type assertion needed - table exists but types need regeneration
              await (supabase as any)
                .from('bulletin_posts')
                .update({ is_deleted: true })
                .eq('id', report.target_id);
            } else {
              // Note: Type assertion needed - table exists but types need regeneration
              await (supabase as any)
                .from('bulletin_replies')
                .update({ is_deleted: true })
                .eq('id', report.target_id);
            }
          }
        } else if (action === 'warn_user') {
          // Send a notification to the user about the warning
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('notifications').insert({
              user_id: targetAuthorId,
              type: 'moderation_warning',
              title: 'Community Guidelines Warning',
              message: 'Your content was reported and reviewed by moderators. Please ensure your future posts comply with community guidelines.',
              created_by: user.id,
            });
          }
        } else if (
          action === 'ban_1d' ||
          action === 'ban_7d' ||
          action === 'ban_permanent'
        ) {
          const banDurations: Record<string, number | null> = {
            ban_1d: 1,
            ban_7d: 7,
            ban_permanent: null,
          };
          const days = banDurations[action];
          const expiresAt = days
            ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
            : null;

          // Note: Type assertion needed - table exists but types need regeneration
          await (supabase as any).from('user_bulletin_bans').insert({
            user_id: targetAuthorId,
            reason: 'Violation of community guidelines',
            expires_at: expiresAt,
            banned_by: (await supabase.auth.getUser()).data.user?.id,
          });
        }

        // Remove from local state
        setState((prev) => ({
          ...prev,
          reports: prev.reports.filter((r) => r.id !== reportId),
        }));

        return true;
      } catch (err) {
        console.error('Failed to resolve report:', err);
        return false;
      }
    },
    [supabase, state.reports]
  );

  const dismissReport = useCallback(
    async (reportId: string) => {
      try {
        // Note: Type assertion needed - table exists but types need regeneration
        const { error } = await (supabase as any)
          .from('bulletin_reports')
          .update({
            status: 'dismissed' as ReportStatus,
            resolved_by: (await supabase.auth.getUser()).data.user?.id,
            resolved_at: new Date().toISOString(),
            action_taken: 'dismiss',
          })
          .eq('id', reportId);

        if (error) throw error;

        setState((prev) => ({
          ...prev,
          reports: prev.reports.filter((r) => r.id !== reportId),
        }));

        return true;
      } catch (err) {
        console.error('Failed to dismiss report:', err);
        return false;
      }
    },
    [supabase]
  );

  return {
    reports: state.reports,
    isLoading: state.isLoading,
    error: state.error,
    loadReports,
    resolveReport,
    dismissReport,
  };
}
