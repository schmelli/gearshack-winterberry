# API Contract: Metrics Endpoint

**Endpoint**: `GET /api/mastra/metrics`
**Version**: 1.0.0
**Created**: 2025-12-20

---

## Overview

Exposes Prometheus-compatible metrics for Mastra agent operations, workflows, memory queries, and voice interactions.

---

## Request

### HTTP Method
`GET`

### URL
```
/api/mastra/metrics
```

### Headers

| Header | Required | Value | Description |
|--------|----------|-------|-------------|
| `X-API-Key` | Yes | Secret key | Internal authentication |

### Authentication

**Required**: Yes (Internal only)

Uses API key authentication for internal monitoring systems (e.g., Prometheus, Grafana).

**Unauthorized Response**:
```
# Error: Unauthorized
# Missing or invalid X-API-Key header
```
Status: `401 Unauthorized`

**Configuration**:
```env
MASTRA_METRICS_API_KEY=your-secret-api-key-here
```

---

## Response

### Content Type

```
Content-Type: text/plain; version=0.0.4
```

Prometheus text exposition format.

---

### Metrics Catalog

#### 1. Chat Endpoint Metrics

**Total Requests by Operation Type**:
```
# HELP mastra_chat_requests_total Total number of chat requests
# TYPE mastra_chat_requests_total counter
mastra_chat_requests_total{operation_type="simple_query"} 1234
mastra_chat_requests_total{operation_type="workflow"} 56
```

**Response Latency (ms)**:
```
# HELP mastra_chat_latency_ms Response latency in milliseconds
# TYPE mastra_chat_latency_ms histogram
mastra_chat_latency_ms_bucket{le="500"} 234
mastra_chat_latency_ms_bucket{le="1000"} 567
mastra_chat_latency_ms_bucket{le="2000"} 890
mastra_chat_latency_ms_bucket{le="5000"} 1100
mastra_chat_latency_ms_bucket{le="10000"} 1200
mastra_chat_latency_ms_bucket{le="+Inf"} 1234
mastra_chat_latency_ms_sum 1456789
mastra_chat_latency_ms_count 1234
```

**Error Rates by Type**:
```
# HELP mastra_chat_errors_total Total number of errors
# TYPE mastra_chat_errors_total counter
mastra_chat_errors_total{error_type="rate_limit"} 12
mastra_chat_errors_total{error_type="agent_failure"} 3
mastra_chat_errors_total{error_type="memory_unavailable"} 5
mastra_chat_errors_total{error_type="mcp_timeout"} 8
mastra_chat_errors_total{error_type="validation"} 15
```

---

#### 2. Workflow Execution Metrics

**Total Workflow Executions by Name**:
```
# HELP mastra_workflow_executions_total Total number of workflow executions
# TYPE mastra_workflow_executions_total counter
mastra_workflow_executions_total{workflow_name="trip_planner"} 234
mastra_workflow_executions_total{workflow_name="gear_comparison"} 123
```

**Workflow Duration (ms)**:
```
# HELP mastra_workflow_duration_ms Workflow execution duration in milliseconds
# TYPE mastra_workflow_duration_ms histogram
mastra_workflow_duration_ms_bucket{workflow_name="trip_planner",le="5000"} 45
mastra_workflow_duration_ms_bucket{workflow_name="trip_planner",le="10000"} 210
mastra_workflow_duration_ms_bucket{workflow_name="trip_planner",le="20000"} 230
mastra_workflow_duration_ms_bucket{workflow_name="trip_planner",le="+Inf"} 234
mastra_workflow_duration_ms_sum{workflow_name="trip_planner"} 1987654
mastra_workflow_duration_ms_count{workflow_name="trip_planner"} 234
```

**Workflow Status Breakdown**:
```
# HELP mastra_workflow_status_total Workflow executions by final status
# TYPE mastra_workflow_status_total counter
mastra_workflow_status_total{status="completed"} 210
mastra_workflow_status_total{status="failed"} 18
mastra_workflow_status_total{status="timeout"} 6
```

**Workflow Step Duration (ms)**:
```
# HELP mastra_workflow_step_duration_ms Duration of individual workflow steps
# TYPE mastra_workflow_step_duration_ms histogram
mastra_workflow_step_duration_ms_bucket{workflow_name="trip_planner",step="weather_api",le="1000"} 150
mastra_workflow_step_duration_ms_bucket{workflow_name="trip_planner",step="weather_api",le="2000"} 200
mastra_workflow_step_duration_ms_bucket{workflow_name="trip_planner",step="weather_api",le="5000"} 210
mastra_workflow_step_duration_ms_bucket{workflow_name="trip_planner",step="weather_api",le="+Inf"} 210
mastra_workflow_step_duration_ms_sum{workflow_name="trip_planner",step="weather_api"} 234567
mastra_workflow_step_duration_ms_count{workflow_name="trip_planner",step="weather_api"} 210
```

---

#### 3. Memory Operation Metrics

**Memory Queries (reads)**:
```
# HELP mastra_memory_queries_total Total number of memory queries
# TYPE mastra_memory_queries_total counter
mastra_memory_queries_total{operation="get_messages"} 3456
mastra_memory_queries_total{operation="search_messages"} 234
```

**Memory Writes**:
```
# HELP mastra_memory_writes_total Total number of memory writes
# TYPE mastra_memory_writes_total counter
mastra_memory_writes_total{operation="save_messages"} 1234
mastra_memory_writes_total{operation="delete_messages"} 12
```

**Memory Query Latency (ms)**:
```
# HELP mastra_memory_query_latency_ms Memory query latency in milliseconds
# TYPE mastra_memory_query_latency_ms histogram
mastra_memory_query_latency_ms_bucket{operation="get_messages",le="100"} 2345
mastra_memory_query_latency_ms_bucket{operation="get_messages",le="500"} 3400
mastra_memory_query_latency_ms_bucket{operation="get_messages",le="1000"} 3450
mastra_memory_query_latency_ms_bucket{operation="get_messages",le="+Inf"} 3456
mastra_memory_query_latency_ms_sum{operation="get_messages"} 456789
mastra_memory_query_latency_ms_count{operation="get_messages"} 3456
```

**GDPR Deletion Operations**:
```
# HELP mastra_memory_deletions_total Total number of GDPR deletion requests
# TYPE mastra_memory_deletions_total counter
mastra_memory_deletions_total{status="requested"} 45
mastra_memory_deletions_total{status="completed"} 42
mastra_memory_deletions_total{status="failed"} 3
```

**GDPR Deletion Duration (ms)**:
```
# HELP mastra_memory_deletion_duration_ms GDPR deletion duration in milliseconds
# TYPE mastra_memory_deletion_duration_ms histogram
mastra_memory_deletion_duration_ms_bucket{le="60000"} 15
mastra_memory_deletion_duration_ms_bucket{le="300000"} 30
mastra_memory_deletion_duration_ms_bucket{le="3600000"} 40
mastra_memory_deletion_duration_ms_bucket{le="+Inf"} 42
mastra_memory_deletion_duration_ms_sum 18976543
mastra_memory_deletion_duration_ms_count 42
```

---

#### 4. Voice Operation Metrics

**Voice Transcriptions**:
```
# HELP mastra_voice_transcriptions_total Total number of voice transcriptions
# TYPE mastra_voice_transcriptions_total counter
mastra_voice_transcriptions_total{provider="whisper"} 456
```

**Transcription Latency (ms)**:
```
# HELP mastra_voice_transcription_latency_ms Transcription latency in milliseconds
# TYPE mastra_voice_transcription_latency_ms histogram
mastra_voice_transcription_latency_ms_bucket{le="1000"} 234
mastra_voice_transcription_latency_ms_bucket{le="2000"} 400
mastra_voice_transcription_latency_ms_bucket{le="5000"} 450
mastra_voice_transcription_latency_ms_bucket{le="+Inf"} 456
mastra_voice_transcription_latency_ms_sum 567890
mastra_voice_transcription_latency_ms_count 456
```

**Transcription Confidence Scores**:
```
# HELP mastra_voice_transcription_confidence Transcription confidence scores (0.0-1.0)
# TYPE mastra_voice_transcription_confidence histogram
mastra_voice_transcription_confidence_bucket{le="0.5"} 12
mastra_voice_transcription_confidence_bucket{le="0.7"} 45
mastra_voice_transcription_confidence_bucket{le="0.9"} 350
mastra_voice_transcription_confidence_bucket{le="1.0"} 456
mastra_voice_transcription_confidence_sum 420.5
mastra_voice_transcription_confidence_count 456
```

**Voice Synthesis**:
```
# HELP mastra_voice_synthesis_total Total number of voice synthesis requests
# TYPE mastra_voice_synthesis_total counter
mastra_voice_synthesis_total{model="tts-1"} 389
mastra_voice_synthesis_total{model="tts-1-hd"} 67
```

**Synthesis Latency (ms)**:
```
# HELP mastra_voice_synthesis_latency_ms Synthesis latency in milliseconds
# TYPE mastra_voice_synthesis_latency_ms histogram
mastra_voice_synthesis_latency_ms_bucket{model="tts-1",le="1000"} 234
mastra_voice_synthesis_latency_ms_bucket{model="tts-1",le="2000"} 350
mastra_voice_synthesis_latency_ms_bucket{model="tts-1",le="5000"} 385
mastra_voice_synthesis_latency_ms_bucket{model="tts-1",le="+Inf"} 389
mastra_voice_synthesis_latency_ms_sum{model="tts-1"} 456789
mastra_voice_synthesis_latency_ms_count{model="tts-1"} 389
```

---

#### 5. MCP Tool Invocation Metrics

**Tool Calls by Tool Name**:
```
# HELP mastra_mcp_tool_calls_total Total number of MCP tool invocations
# TYPE mastra_mcp_tool_calls_total counter
mastra_mcp_tool_calls_total{tool="searchGear"} 567
mastra_mcp_tool_calls_total{tool="findAlternatives"} 234
mastra_mcp_tool_calls_total{tool="queryGearGraph"} 123
```

**MCP Tool Latency (ms)**:
```
# HELP mastra_mcp_tool_latency_ms MCP tool invocation latency in milliseconds
# TYPE mastra_mcp_tool_latency_ms histogram
mastra_mcp_tool_latency_ms_bucket{tool="searchGear",le="500"} 400
mastra_mcp_tool_latency_ms_bucket{tool="searchGear",le="1000"} 550
mastra_mcp_tool_latency_ms_bucket{tool="searchGear",le="2000"} 565
mastra_mcp_tool_latency_ms_bucket{tool="searchGear",le="+Inf"} 567
mastra_mcp_tool_latency_ms_sum{tool="searchGear"} 345678
mastra_mcp_tool_latency_ms_count{tool="searchGear"} 567
```

**MCP Tool Errors**:
```
# HELP mastra_mcp_tool_errors_total Total number of MCP tool errors
# TYPE mastra_mcp_tool_errors_total counter
mastra_mcp_tool_errors_total{tool="searchGear",error_type="timeout"} 12
mastra_mcp_tool_errors_total{tool="searchGear",error_type="connection_refused"} 5
```

---

#### 6. Rate Limiting Metrics

**Rate Limit Hits by Operation Type**:
```
# HELP mastra_rate_limit_hits_total Total number of rate limit hits
# TYPE mastra_rate_limit_hits_total counter
mastra_rate_limit_hits_total{operation_type="workflow"} 23
mastra_rate_limit_hits_total{operation_type="voice"} 15
```

**Active Rate Limit Windows**:
```
# HELP mastra_rate_limit_active_windows Current number of active rate limit windows
# TYPE mastra_rate_limit_active_windows gauge
mastra_rate_limit_active_windows{operation_type="workflow"} 45
mastra_rate_limit_active_windows{operation_type="voice"} 67
```

---

#### 7. System Health Metrics

**Mastra Agent Uptime (seconds)**:
```
# HELP mastra_agent_uptime_seconds Mastra agent uptime in seconds
# TYPE mastra_agent_uptime_seconds gauge
mastra_agent_uptime_seconds 86400
```

**Active Conversations**:
```
# HELP mastra_active_conversations Current number of active conversations
# TYPE mastra_active_conversations gauge
mastra_active_conversations 23
```

**Total Users with Memory**:
```
# HELP mastra_users_with_memory_total Total number of users with stored conversation memory
# TYPE mastra_users_with_memory_total gauge
mastra_users_with_memory_total 250
```

---

## Example Response

```
# HELP mastra_chat_requests_total Total number of chat requests
# TYPE mastra_chat_requests_total counter
mastra_chat_requests_total{operation_type="simple_query"} 1234
mastra_chat_requests_total{operation_type="workflow"} 56

# HELP mastra_chat_latency_ms Response latency in milliseconds
# TYPE mastra_chat_latency_ms histogram
mastra_chat_latency_ms_bucket{le="500"} 234
mastra_chat_latency_ms_bucket{le="1000"} 567
mastra_chat_latency_ms_bucket{le="2000"} 890
mastra_chat_latency_ms_bucket{le="5000"} 1100
mastra_chat_latency_ms_bucket{le="10000"} 1200
mastra_chat_latency_ms_bucket{le="+Inf"} 1234
mastra_chat_latency_ms_sum 1456789
mastra_chat_latency_ms_count 1234

# HELP mastra_workflow_executions_total Total number of workflow executions
# TYPE mastra_workflow_executions_total counter
mastra_workflow_executions_total{workflow_name="trip_planner"} 234

# HELP mastra_memory_queries_total Total number of memory queries
# TYPE mastra_memory_queries_total counter
mastra_memory_queries_total{operation="get_messages"} 3456

# HELP mastra_voice_transcriptions_total Total number of voice transcriptions
# TYPE mastra_voice_transcriptions_total counter
mastra_voice_transcriptions_total{provider="whisper"} 456

# HELP mastra_mcp_tool_calls_total Total number of MCP tool invocations
# TYPE mastra_mcp_tool_calls_total counter
mastra_mcp_tool_calls_total{tool="searchGear"} 567

# HELP mastra_agent_uptime_seconds Mastra agent uptime in seconds
# TYPE mastra_agent_uptime_seconds gauge
mastra_agent_uptime_seconds 86400
```

---

## Prometheus Configuration

### Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mastra-agent'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/api/mastra/metrics'
    static_configs:
      - targets: ['localhost:3000']
    bearer_token: 'your-secret-api-key-here'
```

---

## Grafana Dashboards

### Recommended Panels

**1. Chat Performance Dashboard**:
- P50/P95/P99 latency graph (line chart)
- Request volume by operation type (stacked bar chart)
- Error rate by type (pie chart)
- Active conversations gauge

**2. Workflow Execution Dashboard**:
- Workflow duration distribution (histogram)
- Workflow success rate (gauge)
- Step-by-step latency breakdown (heatmap)
- Failed workflow alerts (table)

**3. Memory System Dashboard**:
- Memory query latency (line chart)
- Write/read operation volume (area chart)
- GDPR deletion SLA compliance (gauge)
- Total users with memory (number)

**4. Voice Interaction Dashboard**:
- End-to-end latency (P90/P99) (line chart)
- Transcription confidence distribution (histogram)
- Voice request volume (bar chart)
- Provider error rates (table)

---

## Alerts

### Recommended Prometheus Alerts

```yaml
# alerts.yml
groups:
  - name: mastra_agent
    rules:
      - alert: HighChatLatency
        expr: histogram_quantile(0.99, mastra_chat_latency_ms_bucket) > 10000
        for: 5m
        annotations:
          summary: "P99 chat latency exceeds 10s"

      - alert: WorkflowFailureRate
        expr: rate(mastra_workflow_status_total{status="failed"}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "Workflow failure rate exceeds 10%"

      - alert: MemoryUnavailable
        expr: rate(mastra_chat_errors_total{error_type="memory_unavailable"}[5m]) > 0
        for: 1m
        annotations:
          summary: "Memory store is unavailable"

      - alert: VoiceLatencyExceeded
        expr: histogram_quantile(0.90, mastra_voice_transcription_latency_ms_bucket) > 3000
        for: 5m
        annotations:
          summary: "P90 voice transcription latency exceeds 3s"

      - alert: RateLimitExceeded
        expr: rate(mastra_rate_limit_hits_total[5m]) > 5
        for: 5m
        annotations:
          summary: "High rate limit hit rate (potential abuse)"
```

---

## Security Considerations

1. **API Key Authentication**: Only accessible with valid `X-API-Key` header
2. **Internal Network Only**: Endpoint should not be exposed to public internet
3. **No Sensitive Data**: Metrics contain only aggregated, anonymized data (no userId, message content)
4. **Rate Limiting**: Not applicable (internal monitoring tool)

---

## Implementation Example

```typescript
// app/api/mastra/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collectMetrics } from '@/lib/mastra/metrics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Verify API key
  const apiKey = req.headers.get('X-API-Key');
  if (apiKey !== process.env.MASTRA_METRICS_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Collect metrics in Prometheus text format
  const metrics = await collectMetrics();

  return new NextResponse(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-20 | Initial contract definition |
