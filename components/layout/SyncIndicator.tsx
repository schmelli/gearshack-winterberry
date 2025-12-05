/**
 * SyncIndicator Component
 *
 * Feature: 010-firestore-sync
 * T021: Visual indicator showing cloud sync status
 *
 * Displays real-time sync status with appropriate icons and tooltips:
 * - idle: Connected to cloud (static cloud icon)
 * - syncing: Actively syncing (spinning loader icon)
 * - error: Sync failed (cloud-off icon in destructive color)
 */

'use client';

import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useSyncState } from '@/hooks/useStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function SyncIndicator() {
  const syncState = useSyncState();

  const getIcon = () => {
    switch (syncState.status) {
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin text-white" />;
      case 'error':
        return <CloudOff className="h-4 w-4 text-red-300" />;
      case 'idle':
      default:
        return <Cloud className="h-4 w-4 text-white" />;
    }
  };

  const getTooltipContent = () => {
    switch (syncState.status) {
      case 'syncing':
        return 'Syncing with cloud...';
      case 'error':
        return `Sync error: ${syncState.error || 'Unknown error'}`;
      case 'idle':
        return syncState.lastSyncedAt
          ? `Last synced: ${syncState.lastSyncedAt.toLocaleTimeString()}`
          : 'Connected to cloud';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="flex items-center justify-center p-2 rounded-md hover:bg-white/10"
            aria-label={getTooltipContent()}
          >
            {getIcon()}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
