/**
 * Memory Save Retry Queue
 * Feature: 060-ai-agent-evolution
 *
 * Handles failed memory save operations with background retry logic.
 * Prevents data loss when fast-path memory saves fail due to network issues,
 * connection drops, or server restarts.
 */

import { logWarn, logInfo, logDebug } from './logging';

import type { SupabaseMemoryAdapter } from './memory-adapter';

export interface MemorySaveTask {
  id: string;
  adapter: SupabaseMemoryAdapter;
  userId: string;
  conversationId: string;
  message: string;
  response: string;
  isCorrection: boolean;
  timestamp: number;
  retryCount: number;
}

class MemoryRetryQueue {
  private queue: Map<string, MemorySaveTask> = new Map();
  private maxRetries = 3;
  private retryDelayMs = 5000; // 5 seconds
  private isProcessing = false;

  /**
   * Add a failed memory save to the retry queue
   */
  enqueue(task: Omit<MemorySaveTask, 'id' | 'timestamp' | 'retryCount'>): void {
    const id = `${task.userId}-${task.conversationId}-${Date.now()}`;
    const queueTask: MemorySaveTask = {
      ...task,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.set(id, queueTask);

    logDebug('Memory save task queued for retry', {
      metadata: {
        taskId: id,
        queueSize: this.queue.size,
      },
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the retry queue in the background
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.size === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      for (const [taskId, task] of this.queue.entries()) {
        // Check if task has exceeded max retries
        if (task.retryCount >= this.maxRetries) {
          logWarn('Memory save task exceeded max retries, removing from queue', {
            metadata: {
              taskId,
              retryCount: task.retryCount,
              userId: task.userId,
            },
          });
          this.queue.delete(taskId);
          continue;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));

        try {
          // Dynamically import to avoid circular dependencies
          const { saveToMemory } = await import('./memory-save');

          await saveToMemory(
            task.adapter,
            task.userId,
            task.conversationId,
            task.message,
            task.response,
            task.isCorrection
          );

          logInfo('Memory save task succeeded on retry', {
            metadata: {
              taskId,
              retryCount: task.retryCount + 1,
              userId: task.userId,
            },
          });

          this.queue.delete(taskId);
        } catch (error) {
          task.retryCount += 1;

          logWarn('Memory save task retry failed', {
            metadata: {
              taskId,
              retryCount: task.retryCount,
              maxRetries: this.maxRetries,
              error: error instanceof Error ? error.message : 'Unknown',
            },
          });

          // Update task in queue
          this.queue.set(taskId, task);
        }
      }
    } finally {
      this.isProcessing = false;

      // If queue still has items, schedule next processing
      if (this.queue.size > 0) {
        setTimeout(() => this.processQueue(), this.retryDelayMs);
      }
    }
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Clear all tasks (for testing/admin purposes)
   */
  clear(): void {
    this.queue.clear();
    logDebug('Memory retry queue cleared', {
      metadata: { clearedAt: new Date().toISOString() },
    });
  }
}

// Singleton instance
export const memoryRetryQueue = new MemoryRetryQueue();
