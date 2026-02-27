/**
 * Unit Tests: computeEffectiveMinReplies — pure function
 * Feature: Hybrid RAG — Qualitätsfilter (Vorschlag 6, Kap. 19)
 *
 * Direct unit tests for the `computeEffectiveMinReplies` helper that merges
 * `minReplies` and `excludeNoEngagement` into a single DB parameter value.
 *
 * These tests are intentionally dependency-free (no mocking of Supabase or
 * embedder) so they run fast and remain stable regardless of infrastructure.
 * They complement the integration-style tests in search.test.ts which verify
 * the correct parameters are forwarded through the full search stack.
 *
 * See search.test.ts for tests that verify the RPC call receives correct args.
 */

import { describe, it, expect } from 'vitest';
import { computeEffectiveMinReplies } from '@/lib/community-rag/search';

describe('computeEffectiveMinReplies', () => {
  // =========================================================================
  // No filter — both options absent
  // =========================================================================

  it('returns null when neither minReplies nor excludeNoEngagement is set', () => {
    expect(computeEffectiveMinReplies({})).toBeNull();
  });

  it('returns null when excludeNoEngagement is explicitly false and minReplies is absent', () => {
    expect(computeEffectiveMinReplies({ excludeNoEngagement: false })).toBeNull();
  });

  it('returns null when minReplies is null', () => {
    expect(computeEffectiveMinReplies({ minReplies: null })).toBeNull();
  });

  // =========================================================================
  // minReplies only (no excludeNoEngagement)
  // =========================================================================

  it('returns minReplies: 3 when only minReplies is set', () => {
    expect(computeEffectiveMinReplies({ minReplies: 3 })).toBe(3);
  });

  it('returns 0 when minReplies is explicitly 0', () => {
    // 0 is a valid value meaning "no replies required" — distinct from null (no filter)
    expect(computeEffectiveMinReplies({ minReplies: 0 })).toBe(0);
  });

  it('returns 1 when minReplies is 1', () => {
    expect(computeEffectiveMinReplies({ minReplies: 1 })).toBe(1);
  });

  it('handles large minReplies values', () => {
    expect(computeEffectiveMinReplies({ minReplies: 100 })).toBe(100);
  });

  // =========================================================================
  // excludeNoEngagement only (shorthand for minReplies: 1)
  // =========================================================================

  it('returns 1 when excludeNoEngagement is true and minReplies is absent', () => {
    expect(computeEffectiveMinReplies({ excludeNoEngagement: true })).toBe(1);
  });

  // =========================================================================
  // Both excludeNoEngagement and minReplies — more restrictive wins
  // =========================================================================

  it('takes Math.max when excludeNoEngagement + minReplies: 3 → 3', () => {
    // Math.max(3, 1) = 3
    expect(computeEffectiveMinReplies({ excludeNoEngagement: true, minReplies: 3 })).toBe(3);
  });

  it('clamps to 1 when excludeNoEngagement + minReplies: 0 → 1', () => {
    // Math.max(0, 1) = 1
    expect(computeEffectiveMinReplies({ excludeNoEngagement: true, minReplies: 0 })).toBe(1);
  });

  it('returns 1 when excludeNoEngagement + minReplies: 1', () => {
    // Math.max(1, 1) = 1
    expect(computeEffectiveMinReplies({ excludeNoEngagement: true, minReplies: 1 })).toBe(1);
  });

  it('returns higher minReplies when excludeNoEngagement + minReplies: 10', () => {
    // Math.max(10, 1) = 10
    expect(computeEffectiveMinReplies({ excludeNoEngagement: true, minReplies: 10 })).toBe(10);
  });

  // =========================================================================
  // excludeNoEngagement: false + minReplies (behaves like minReplies only)
  // =========================================================================

  it('uses minReplies when excludeNoEngagement is explicitly false', () => {
    expect(computeEffectiveMinReplies({ excludeNoEngagement: false, minReplies: 5 })).toBe(5);
  });

  it('returns null when excludeNoEngagement is false and minReplies is null', () => {
    expect(computeEffectiveMinReplies({ excludeNoEngagement: false, minReplies: null })).toBeNull();
  });
});
