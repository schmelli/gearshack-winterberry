# Research Deliverable 06: Observability Instrumentation Strategy

**Research Question**: What observability hooks does Mastra expose (logging, metrics, tracing)? Is OpenTelemetry supported?

**Status**: ✅ Resolved
**Decision**: **Custom instrumentation required** - No built-in observability in Mastra
**Date**: 2025-12-20

---

## Executive Summary

Mastra provides **basic console logging only** - no structured logging, metrics collection, or distributed tracing. **Custom instrumentation required** using Pino (logging), prom-client (Prometheus metrics), and manual span creation (tracing). Add **1 day to Phase 3** for implementation.

---

## Current Mastra Observability Limitations

**What Mastra Provides**:
- ❌ Console.log() only (not structured JSON)
- ❌ No metrics collection
- ❌ No OpenTelemetry integration
- ❌ No lifecycle event hooks (beforeInvoke, afterInvoke, etc.)

**What We Need** (FR-019, FR-020, FR-021):
- ✅ Structured logging (JSON format)
- ✅ Prometheus-compatible metrics (P50/P95/P99 latencies)
- ✅ Distributed tracing for multi-step workflows

**Solution**: Wrap all Mastra operations with custom instrumentation.

---

## Structured Logging with Pino

### Installation

```bash
npm install pino pino-pretty
```

### Logger Configuration

```typescript
// lib/observability/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() })
  },
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    : undefined, // Production: JSON output for log aggregation
  base: {
    env: process.env.NODE_ENV,
    service: 'gearshack-mastra'
  }
});
```

### Log Event Schema

```typescript
// types/log-events.ts
export type LogEvent =
  | { type: 'agent.invoke.start'; userId: string; query: string; timestamp: number }
  | { type: 'agent.invoke.complete'; userId: string; duration: number; tokens: number }
  | { type: 'agent.invoke.error'; userId: string; error: string; duration: number }
  | { type: 'tool.call.start'; toolName: string; params: unknown }
  | { type: 'tool.call.complete'; toolName: string; duration: number }
  | { type: 'tool.call.error'; toolName: string; error: string; duration: number }
  | { type: 'workflow.step.start'; workflow: string; step: string }
  | { type: 'workflow.step.complete'; workflow: string; step: string; duration: number }
  | { type: 'memory.save'; userId: string; messageCount: number; duration: number }
  | { type: 'memory.retrieve'; userId: string; conversationId: string; limit: number; results: number }
  | { type: 'mcp.tool.fallback'; toolName: string; reason: string; fallbackUsed: string };

// Usage
logger.info({
  type: 'agent.invoke.start',
  userId: 'user-123',
  query: 'What is my lightest tent?',
  timestamp: Date.now()
} satisfies LogEvent);
```

---

## Prometheus Metrics with prom-client

### Installation

```bash
npm install prom-client
```

### Metrics Registry

```typescript
// lib/observability/metrics.ts
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create registry
export const register = new Registry();

// ===== AGENT METRICS =====

export const agentRequestsTotal = new Counter({
  name: 'mastra_agent_requests_total',
  help: 'Total Mastra agent requests',
  labelNames: ['status'], // status: success | error
  registers: [register]
});

export const agentDuration = new Histogram({
  name: 'mastra_agent_duration_seconds',
  help: 'Mastra agent response latency (P50/P95/P99)',
  buckets: [0.1, 0.5, 1, 2, 5, 10], // 100ms to 10s
  labelNames: ['query_type'], // query_type: simple | medium | complex
  registers: [register]
});

export const agentTokensUsed = new Counter({
  name: 'mastra_agent_tokens_total',
  help: 'Total LLM tokens consumed',
  labelNames: ['model', 'type'], // type: prompt | completion
  registers: [register]
});

// ===== TOOL METRICS =====

export const toolCallsTotal = new Counter({
  name: 'mastra_tool_calls_total',
  help: 'Total tool invocations',
  labelNames: ['tool_name', 'status'], // status: success | error | timeout | fallback
  registers: [register]
});

export const toolDuration = new Histogram({
  name: 'mastra_tool_duration_seconds',
  help: 'Tool invocation latency',
  buckets: [0.05, 0.1, 0.5, 1, 2, 5], // 50ms to 5s
  labelNames: ['tool_name'],
  registers: [register]
});

// ===== WORKFLOW METRICS =====

export const workflowExecutionsTotal = new Counter({
  name: 'mastra_workflow_executions_total',
  help: 'Total workflow executions',
  labelNames: ['workflow_name', 'status'],
  registers: [register]
});

export const workflowStepDuration = new Histogram({
  name: 'mastra_workflow_step_duration_seconds',
  help: 'Workflow step latency',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  labelNames: ['workflow_name', 'step_name'],
  registers: [register]
});

// ===== MEMORY METRICS =====

export const memoryOperationsTotal = new Counter({
  name: 'mastra_memory_operations_total',
  help: 'Total memory adapter operations',
  labelNames: ['operation', 'status'], // operation: save | retrieve | delete
  registers: [register]
});

export const memoryQueryDuration = new Histogram({
  name: 'mastra_memory_query_duration_seconds',
  help: 'Memory query latency',
  buckets: [0.01, 0.05, 0.1, 0.5, 1], // 10ms to 1s
  labelNames: ['operation'],
  registers: [register]
});

// ===== MCP METRICS =====

export const mcpToolCallsTotal = new Counter({
  name: 'mastra_mcp_tool_calls_total',
  help: 'Total MCP tool invocations',
  labelNames: ['tool_name', 'status', 'transport'], // transport: stdio | http
  registers: [register]
});

export const mcpToolDuration = new Histogram({
  name: 'mastra_mcp_tool_duration_seconds',
  help: 'MCP tool invocation latency',
  buckets: [0.1, 0.5, 1, 2, 5],
  labelNames: ['tool_name', 'transport'],
  registers: [register]
});

export const mcpFallbackTotal = new Counter({
  name: 'mastra_mcp_fallback_total',
  help: 'MCP tool fallbacks to catalog search',
  labelNames: ['tool_name', 'reason'], // reason: timeout | error | unavailable
  registers: [register]
});

// ===== VOICE METRICS =====

export const voiceTranscriptionDuration = new Histogram({
  name: 'mastra_voice_transcription_duration_seconds',
  help: 'Whisper transcription latency',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const voiceSynthesisDuration = new Histogram({
  name: 'mastra_voice_synthesis_duration_seconds',
  help: 'TTS synthesis latency (first chunk)',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

export const voiceEndToEndDuration = new Histogram({
  name: 'mastra_voice_end_to_end_duration_seconds',
  help: 'Total voice interaction latency',
  buckets: [1, 2, 3, 5, 10],
  labelNames: ['query_type'],
  registers: [register]
});
```

### Metrics Endpoint

```typescript
// app/api/metrics/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { register } from '@/lib/observability/metrics';

export async function GET() {
  const metrics = await register.metrics();

  return new NextResponse(metrics, {
    headers: {
      'Content-Type': register.contentType
    }
  });
}
```

---

## Custom Instrumentation Wrappers

### Agent Instrumentation

```typescript
// lib/mastra/instrumentation/agent.ts
import { Agent } from '@mastra/core';
import { logger } from '@/lib/observability/logger';
import { agentRequestsTotal, agentDuration, agentTokensUsed } from '@/lib/observability/metrics';

export function instrumentAgent(agent: Agent) {
  const originalInvoke = agent.invoke.bind(agent);

  agent.invoke = async (input: unknown) => {
    const startTime = Date.now();
    const userId = (input as any).userId || 'unknown';
    const query = (input as any).query || '';

    // Log start
    logger.info({
      type: 'agent.invoke.start',
      userId,
      query,
      timestamp: startTime
    });

    try {
      // Execute agent
      const result = await originalInvoke(input);
      const duration = (Date.now() - startTime) / 1000;

      // Log success
      logger.info({
        type: 'agent.invoke.complete',
        userId,
        duration: duration * 1000,
        tokens: result.usage?.total_tokens || 0
      });

      // Emit metrics
      agentRequestsTotal.inc({ status: 'success' });
      agentDuration.observe({ query_type: classifyQuery(query) }, duration);

      if (result.usage) {
        agentTokensUsed.inc({ model: 'gpt-4', type: 'prompt' }, result.usage.prompt_tokens);
        agentTokensUsed.inc({ model: 'gpt-4', type: 'completion' }, result.usage.completion_tokens);
      }

      return result;

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      // Log error
      logger.error({
        type: 'agent.invoke.error',
        userId,
        error: error.message,
        duration: duration * 1000
      });

      // Emit metrics
      agentRequestsTotal.inc({ status: 'error' });
      agentDuration.observe({ query_type: classifyQuery(query) }, duration);

      throw error;
    }
  };

  return agent;
}

// Classify query complexity for metrics
function classifyQuery(query: string): 'simple' | 'medium' | 'complex' {
  if (query.includes('plan') || query.includes('workflow')) return 'complex';
  if (query.includes('find') || query.includes('recommend')) return 'medium';
  return 'simple';
}
```

### Tool Instrumentation

```typescript
// lib/mastra/instrumentation/tools.ts
import { createTool } from '@mastra/core';
import { logger } from '@/lib/observability/logger';
import { toolCallsTotal, toolDuration } from '@/lib/observability/metrics';

export function instrumentTool(tool: ReturnType<typeof createTool>) {
  const originalExecute = tool.execute.bind(tool);

  tool.execute = async (params: unknown) => {
    const startTime = Date.now();

    // Log start
    logger.info({
      type: 'tool.call.start',
      toolName: tool.id,
      params
    });

    try {
      // Execute tool
      const result = await originalExecute(params);
      const duration = (Date.now() - startTime) / 1000;

      // Log success
      logger.info({
        type: 'tool.call.complete',
        toolName: tool.id,
        duration: duration * 1000
      });

      // Emit metrics
      toolCallsTotal.inc({ tool_name: tool.id, status: 'success' });
      toolDuration.observe({ tool_name: tool.id }, duration);

      return result;

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;

      // Log error
      logger.error({
        type: 'tool.call.error',
        toolName: tool.id,
        error: error.message,
        duration: duration * 1000
      });

      // Emit metrics
      toolCallsTotal.inc({ tool_name: tool.id, status: 'error' });
      toolDuration.observe({ tool_name: tool.id }, duration);

      throw error;
    }
  };

  return tool;
}
```

### Workflow Instrumentation

```typescript
// lib/mastra/instrumentation/workflow.ts
import { createWorkflow } from '@mastra/core';
import { logger } from '@/lib/observability/logger';
import { workflowExecutionsTotal, workflowStepDuration } from '@/lib/observability/metrics';

export function instrumentWorkflow(workflow: ReturnType<typeof createWorkflow>) {
  const workflowName = workflow.name;

  // Wrap each step
  const instrumentedSteps = Object.fromEntries(
    Object.entries(workflow.steps).map(([stepName, stepFn]) => [
      stepName,
      async (context: unknown) => {
        const startTime = Date.now();

        // Log step start
        logger.info({
          type: 'workflow.step.start',
          workflow: workflowName,
          step: stepName
        });

        try {
          const result = await stepFn(context);
          const duration = (Date.now() - startTime) / 1000;

          // Log step complete
          logger.info({
            type: 'workflow.step.complete',
            workflow: workflowName,
            step: stepName,
            duration: duration * 1000
          });

          // Emit metrics
          workflowStepDuration.observe({ workflow_name: workflowName, step_name: stepName }, duration);

          return result;

        } catch (error) {
          logger.error({
            type: 'workflow.step.error',
            workflow: workflowName,
            step: stepName,
            error: error.message
          });

          throw error;
        }
      }
    ])
  );

  return createWorkflow({
    name: workflowName,
    steps: instrumentedSteps
  });
}
```

---

## Distributed Tracing (Manual Spans)

### Trace Context Propagation

```typescript
// lib/observability/tracing.ts
import { randomUUID } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
  status: 'ok' | 'error';
}

const activeSpans = new Map<string, Span>();

export function createSpan(
  name: string,
  context?: TraceContext
): { span: Span; end: () => void } {
  const span: Span = {
    traceId: context?.traceId || randomUUID(),
    spanId: randomUUID(),
    parentSpanId: context?.spanId,
    name,
    startTime: Date.now(),
    attributes: {},
    status: 'ok'
  };

  activeSpans.set(span.spanId, span);

  return {
    span,
    end: () => {
      span.endTime = Date.now();
      activeSpans.delete(span.spanId);

      // Log span (for export to Jaeger/Zipkin)
      logger.info({
        type: 'trace.span',
        ...span,
        duration: span.endTime - span.startTime
      });
    }
  };
}

export function setSpanAttribute(spanId: string, key: string, value: unknown) {
  const span = activeSpans.get(spanId);
  if (span) {
    span.attributes[key] = value;
  }
}

export function setSpanStatus(spanId: string, status: 'ok' | 'error', error?: string) {
  const span = activeSpans.get(spanId);
  if (span) {
    span.status = status;
    if (error) {
      span.attributes.error = error;
    }
  }
}
```

### Workflow Tracing Example

```typescript
// lib/mastra/workflows/trip-planner-traced.ts
import { createSpan } from '@/lib/observability/tracing';

export const tripPlannerWorkflow = createWorkflow({
  name: 'tripPlanner',

  steps: {
    analyzeIntent: async ({ input }) => {
      const { span, end } = createSpan('tripPlanner.analyzeIntent');

      try {
        const result = parseUserQuery(input.query);
        setSpanAttribute(span.spanId, 'location', result.location);
        setSpanAttribute(span.spanId, 'season', result.season);
        setSpanStatus(span.spanId, 'ok');
        return result;
      } catch (error) {
        setSpanStatus(span.spanId, 'error', error.message);
        throw error;
      } finally {
        end();
      }
    },

    gatherData: async ({ prev }) => {
      const { span, end } = createSpan('tripPlanner.gatherData', {
        traceId: prev._traceContext?.traceId,
        spanId: prev._traceContext?.spanId
      });

      try {
        // Child spans for parallel tasks
        const weatherSpan = createSpan('fetchWeather', { traceId: span.traceId, spanId: span.spanId });
        const inventorySpan = createSpan('queryInventory', { traceId: span.traceId, spanId: span.spanId });

        const [weather, inventory] = await Promise.all([
          fetchWeatherData(prev.location, prev.season).finally(() => weatherSpan.end()),
          queryUserInventory(prev.userId).finally(() => inventorySpan.end())
        ]);

        setSpanStatus(span.spanId, 'ok');
        return { weather, inventory, _traceContext: { traceId: span.traceId, spanId: span.spanId } };
      } catch (error) {
        setSpanStatus(span.spanId, 'error', error.message);
        throw error;
      } finally {
        end();
      }
    }
  }
});
```

---

## Observability Dashboard (Grafana)

### Prometheus Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'gearshack-mastra'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000'] # Next.js app
    metrics_path: '/api/metrics'
```

### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "Mastra Agent Observability",
    "panels": [
      {
        "title": "Agent Response Latency (P50/P95/P99)",
        "targets": [{
          "expr": "histogram_quantile(0.50, sum(rate(mastra_agent_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "P50"
        }, {
          "expr": "histogram_quantile(0.95, sum(rate(mastra_agent_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "P95"
        }, {
          "expr": "histogram_quantile(0.99, sum(rate(mastra_agent_duration_seconds_bucket[5m])) by (le))",
          "legendFormat": "P99"
        }]
      },
      {
        "title": "Tool Call Success Rate",
        "targets": [{
          "expr": "sum(rate(mastra_tool_calls_total{status=\"success\"}[5m])) / sum(rate(mastra_tool_calls_total[5m]))",
          "legendFormat": "Success Rate"
        }]
      },
      {
        "title": "Workflow Step Duration",
        "targets": [{
          "expr": "sum(rate(mastra_workflow_step_duration_seconds_sum[5m])) by (workflow_name, step_name) / sum(rate(mastra_workflow_step_duration_seconds_count[5m])) by (workflow_name, step_name)",
          "legendFormat": "{{workflow_name}}.{{step_name}}"
        }]
      },
      {
        "title": "MCP Fallback Rate",
        "targets": [{
          "expr": "sum(rate(mastra_mcp_fallback_total[5m])) by (tool_name, reason)",
          "legendFormat": "{{tool_name}} ({{reason}})"
        }]
      }
    ]
  }
}
```

---

## Structured Log Aggregation (Datadog/Logstash)

### Datadog Integration

```bash
npm install dd-trace pino-datadog
```

```typescript
// lib/observability/logger.ts (updated)
import pino from 'pino';
import { createWriteStream } from 'pino-datadog';

const datadogStream = createWriteStream({
  apiKey: process.env.DATADOG_API_KEY!,
  ddsource: 'nodejs',
  service: 'gearshack-mastra',
  hostname: process.env.HOSTNAME || 'localhost'
});

export const logger = pino(
  {
    level: 'info',
    formatters: {
      level: (label) => ({ level: label.toUpperCase() })
    }
  },
  process.env.DATADOG_API_KEY ? datadogStream : pino.destination(1) // stdout
);
```

---

## Implementation Checklist

### Phase 3: Observability Integration (1 day)

- [ ] Install dependencies: `pino`, `prom-client`, `pino-pretty`
- [ ] Create logger configuration (`lib/observability/logger.ts`)
- [ ] Define metrics registry (`lib/observability/metrics.ts`)
- [ ] Implement agent instrumentation wrapper
- [ ] Implement tool instrumentation wrapper
- [ ] Implement workflow instrumentation wrapper
- [ ] Create `/api/metrics` endpoint for Prometheus scraping
- [ ] Add distributed tracing utilities (`lib/observability/tracing.ts`)
- [ ] Configure Grafana dashboard with key metrics
- [ ] Test end-to-end: agent invocation → logs + metrics + traces emitted

---

## Conclusion

**Deliverable**: Complete observability instrumentation strategy with structured logging, Prometheus metrics, and manual distributed tracing.

**Key Components**:
1. **Structured Logging**: Pino with JSON output, log event types
2. **Metrics**: prom-client with P50/P95/P99 histograms for agent/tools/workflows
3. **Tracing**: Manual span creation with trace context propagation
4. **Dashboard**: Grafana panels for latency, success rates, fallback rates

**Timeline Impact**: Add **1 day to Phase 3** for instrumentation implementation.

**Next Steps**:
1. Implement logger + metrics modules
2. Wrap all Mastra operations (agent, tools, workflows) with instrumentation
3. Deploy Prometheus + Grafana for metrics visualization
4. Configure Datadog/Logstash for log aggregation (optional)
5. Create alerting rules for error rates and latency SLOs
