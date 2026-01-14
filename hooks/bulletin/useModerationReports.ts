/**
 * Moderation Reports Hook
 *
 * Feature: 051-community-bulletin-board
 * Task: T060
 *
 * Fetches pending reports and provides moderation actions.
 */

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BulletinReportStatus, ModerationAction } from '@/types/bulletin';

// Type helper for Supabase client with untyped views/tables
 
type SupabaseWithViews = ReturnType<typeof createClient> & {
  from: (table: string) => ReturnType<ReturnType<typeof createClient>['from']>;
};

export interface ModerationReport {
  id: string;
  target_type: 'post' | 'reply';
  target_id: string;
  reason: string;
  details: string | null;
  status: BulletinReportStatus;
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
  const supabase = useMemo(() => createClient() as SupabaseWithViews, []);
  const [state, setState] = useState<ModerationState>({
    reports: [],
    isLoading: false,
    error: null,
  });

  const loadReports = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the moderation view
      const { data, error } = await supabase
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
        const { error: reportError } = await supabase
          .from('bulletin_reports')
          .update({
            status: 'resolved' as BulletinReportStatus,
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
              await supabase
                .from('bulletin_posts')
                .update({ is_deleted: true })
                .eq('id', report.target_id);
            } else {
              await supabase
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

          await supabase.from('user_bulletin_bans').insert({
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
        const { error } = await supabase
          .from('bulletin_reports')
          .update({
            status: 'dismissed' as BulletinReportStatus,
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
