/**
 * Mastra Framework Instance
 *
 * Creates and exports the singleton Mastra instance that registers all
 * workflows for execution. This is the central entry point for running
 * Mastra Workflows in the application.
 *
 * Usage:
 * ```typescript
 * import { mastra } from '@/lib/mastra/instance';
 *
 * const workflow = mastra.getWorkflow('gear-assistant');
 * const run = await workflow.createRun();
 * const result = await run.start({ inputData: { ... } });
 * ```
 */

import { Mastra } from '@mastra/core';
import { gearAssistantWorkflow } from './workflows/gear-assistant-workflow';

/**
 * Singleton Mastra instance with all registered workflows.
 *
 * Workflows registered:
 * - gear-assistant: Intent classification → parallel prefetch → context assembly
 */
export const mastra = new Mastra({
  workflows: {
    'gear-assistant': gearAssistantWorkflow,
  },
});
