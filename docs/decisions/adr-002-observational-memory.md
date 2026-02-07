# ADR-002: Observational Memory for AI Assistant

**Status**: ✅ Accepted
**Date**: 2026-02-06
**Decision Makers**: Development Team
**Related**: [Observational Memory Feature Doc](../features/observational-memory.md)

## Context

Gearshack's AI Assistant is tool-heavy. Most conversations involve multiple calls to:
- `queryUserData`: SQL queries returning 50+ gear items
- `queryCatalog`: Product search with detailed specs
- `queryGearGraph`: Analytics with graph relationships

**Problem:**
After 4-5 tool calls, the context window contains 20k+ tokens of raw tool results. After 10 turns, the context is full (~50k tokens with Claude Sonnet), causing:

1. **Context Rot**: Agent performance degrades with full context
2. **High Costs**: Large context = expensive API calls ($0.003/1k input tokens)
3. **Short Memory**: Only ~10 turns before context full
4. **Poor Coherence**: Agent "forgets" earlier discussion

**Example:**
```
Turn 1: User asks about backpacks
  → queryUserData returns 15 backpacks (5k tokens)
Turn 5: User asks about sleeping bags
  → queryUserData returns 8 bags (3k tokens)
Turn 8: User wants to compare jackets
  → queryCatalog returns 20 products (8k tokens)
Turn 10: Context full (45k tokens)
  → Agent has forgotten User prefers ultralight gear from Turn 1
```

## Decision

We will implement **Observational Memory (OM)** from Mastra v1.1.0+.

### Configuration

- **Scope**: `thread` (not `resource`)
- **Model**: `google/gemini-2.5-flash` (1M token context)
- **Message Threshold**: `20,000` tokens (lower than 30k default)
- **Observation Threshold**: `40,000` tokens

### Rationale

1. **Thread Scope**: Avoids slow migration of existing conversations (resource scope would process all threads at once)
2. **Gemini 2.5 Flash**: Large context (1M) for Reflector, cheap ($0.00025/1k), fast
3. **20k Threshold**: Lower than default 30k because our tools are token-heavy
4. **40k Observation**: Default is good, rarely reached

## Alternatives Considered

### 1. Semantic Recall Only

**Pro:**
- Already implemented
- Works for keyword-based retrieval

**Con:**
- Doesn't compress tool results
- Vector search finds similar messages, not contextual summary
- Still hits context limits

**Verdict:** Not sufficient for tool-heavy conversations

### 2. Manual Summarization

Periodic LLM call to summarize conversation:

```typescript
if (tokens > 20000) {
  const summary = await llm.summarize(messages);
  messages = [summary, ...recentMessages];
}
```

**Pro:**
- Simple to implement
- Full control over compression

**Con:**
- Manual management (when to trigger?)
- Loses details (one-time compression)
- No incremental compression
- No separation of observations vs reflections

**Verdict:** Less sophisticated than OM

### 3. Increase Context Window

Use Claude Opus 4 (200k context) or Gemini 2.5 Pro (1M context):

**Pro:**
- No compression needed
- Simple

**Con:**
- Doesn't solve context rot (performance degrades with full context)
- Still expensive ($0.015/1k for Opus input tokens)
- Wasteful (most tokens not needed)

**Verdict:** Treats symptom, not cause

### 4. Aggressive Message Pruning

Keep only last N messages, drop rest:

**Pro:**
- Simple
- Fast

**Con:**
- Loses important context
- Agent forgets user preferences
- Poor user experience

**Verdict:** Too aggressive

## Consequences

### Positive

1. **Longer Conversations**
   - Supports 50+ turns (vs 10 before)
   - Agent maintains coherence

2. **Cost Reduction**
   - 30-50% token reduction
   - Prompt caching (stable observations)
   - Estimated savings: $0.231 per 20-turn conversation

3. **Better Tool Handling**
   - 5-40× compression of tool results
   - Observer creates semantic summary
   - Reduces noise in context

4. **Improved Coherence**
   - Agent sees "User prefers ultralight" instead of raw JSON
   - Current task + suggested response help continuity

### Negative

1. **Complexity**
   - Two background agents (Observer + Reflector)
   - Additional failure modes

2. **Additional Costs**
   - Observer + Reflector API calls
   - ~$0.05 per observation (Gemini Flash)
   - **BUT**: Net savings due to compression

3. **Latency**
   - Observer: ~10-20s (background, doesn't block)
   - Reflector: ~15-30s (rare)

4. **Storage**
   - Observations stored in PostgreSQL
   - Negligible size (<10KB per thread)

### Neutral

1. **Migration**
   - No manual migration needed (lazy observation)
   - First observation per thread can be slow

2. **Monitoring**
   - Requires Mastra Studio for visibility
   - Added observability overhead

## Implementation Plan

### Phase 1: Configuration ✅
- [x] Add OM config to `mastra-agent.ts`
- [x] Set environment variables
- [x] Document in `.env.example`

### Phase 2: Testing
- [ ] Test with real conversations (>20 turns)
- [ ] Verify compression ratios (target: >20×)
- [ ] Monitor costs in Mastra Studio
- [ ] Validate coherence improvement

### Phase 3: Optimization
- [ ] Tune thresholds based on metrics
- [ ] Consider different models for Observer/Reflector
- [ ] Implement cost alerts

### Phase 4: Documentation ✅
- [x] Feature documentation
- [x] Mastra Studio guide
- [x] This ADR

## Metrics

We will track:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Compression Ratio | >20× | Mastra Studio → Memory Tab |
| Cost Reduction | >30% | Studio → Metrics Tab |
| Max Turns | >30 | Conversation length before quality drop |
| Coherence | Qualitative | User feedback + manual review |
| Observer Latency | <30s | Studio → Traces Tab |

## Risks & Mitigations

### Risk 1: Observer Fails

**Scenario**: Observer model unavailable or errors

**Mitigation**:
- Fallback to normal memory (without OM)
- Alert in logs
- Graceful degradation

**Implementation**:
```typescript
try {
  await observer.observe();
} catch (error) {
  console.error('Observer failed', error);
  // Continue without OM
}
```

### Risk 2: Poor Compression

**Scenario**: Compression ratio <5× (not worth the cost)

**Mitigation**:
- Monitor in Mastra Studio
- Tune thresholds or model
- Disable OM if ROI negative

**Threshold**:
```typescript
if (compressionRatio < 5) {
  // Alert: OM not effective
}
```

### Risk 3: High Costs

**Scenario**: Observer/Reflector costs exceed savings

**Mitigation**:
- Monthly cost review
- Set budget alerts
- Use cheaper models (Gemini Flash → DeepSeek)

**Budget Alert**:
```typescript
if (monthlyOMCost > monthlyTokenSavings) {
  // Alert: OM not cost-effective
}
```

## Review Schedule

- **Weekly** (first month): Check metrics, tune thresholds
- **Monthly** (ongoing): Review costs, compression ratios
- **Quarterly**: Evaluate alternative models

## References

- [Mastra OM Docs](https://mastra.ai/docs/memory/observational-memory)
- [Feature Doc](../features/observational-memory.md)
- [Mastra Studio Guide](../guides/mastra-studio.md)

## Appendix: Compression Example

**Before OM** (45k tokens):
```json
{
  "messages": [
    {"role": "user", "content": "What backpacks do I have?"},
    {"role": "assistant", "tool_calls": [...]},
    {"role": "tool", "content": "[{id:1, name:'Arc...', weight:450, ...}, {id:2, ...}, ...]"},  // 5k tokens
    {"role": "assistant", "content": "You have 15 backpacks..."},  // 200 tokens
    // ... 8 more turns with similar pattern
  ]
}
```

**After OM** (12k tokens):
```json
{
  "observations": [
    {
      "timestamp": "2026-02-06T12:10:23Z",
      "content": "🔴 User has 50 gear items (15 backpacks: ultralight Hyperlite/Gossamer)",
      "tokens": 102,  // compressed from 5k
      "compression": 49.0
    },
    {
      "content": "🟡 User comparing Arc'teryx Alpha SV vs Beta AR for alpine",
      "tokens": 87,
      "compression": 36.3
    }
  ],
  "recentMessages": [
    // Last 3 turns (uncompressed)
  ],
  "currentTask": "Help choose between two jackets",
  "suggestedResponse": "Based on your preference for synthetic..."
}
```

---

**Decision Date**: 2026-02-06
**Status**: Accepted & Implemented
**Next Review**: 2026-02-13 (1 week)
