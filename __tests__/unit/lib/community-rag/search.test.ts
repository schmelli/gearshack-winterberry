/**
 * Unit Tests: Community RAG Search — Quality Filter Logic
 * Feature: Hybrid RAG — Qualitätsfilter (Vorschlag 6, Kap. 19)
 *
 * Covers the effectiveMinReplies calculation (interaction between minReplies
 * and excludeNoEngagement options) and ensures the correct parameters are
 * forwarded to the Supabase RPC call.
 *
 * These tests act as regression guards for the behavior described in the
 * quality filter implementation PR review (PR #260).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCommunityKnowledge } from '@/lib/community-rag/search';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock('@/lib/community-rag/embedder', () => ({
  generateQueryEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
}));

import { createServiceRoleClient } from '@/lib/supabase/server';
const mockCreateServiceRoleClient = vi.mocked(createServiceRoleClient);

// =============================================================================
// Mock RPC Helper
// =============================================================================

/**
 * Sets up a mock Supabase client whose .rpc() method returns empty results.
 * Returns the mockRpc function for assertion.
 */
function setupMockRpc(returnData: unknown[] = []) {
  const mockRpc = vi.fn().mockResolvedValue({ data: returnData, error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockCreateServiceRoleClient.mockReturnValue({ rpc: mockRpc } as any);
  return mockRpc;
}

// =============================================================================
// Tests
// =============================================================================

describe('searchCommunityKnowledge — quality filter options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Default behaviour (no options)
  // ---------------------------------------------------------------------------

  describe('defaults', () => {
    it('passes null for filter_min_replies when no engagement option is set', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('tent recommendations');

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: null })
      );
    });

    it('passes null for filter_max_age_months when maxAgeMonths is not set', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('sleeping bag');

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_max_age_months: null })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // minReplies
  // ---------------------------------------------------------------------------

  describe('minReplies', () => {
    it('passes minReplies directly as filter_min_replies', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('stove', { minReplies: 3 });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: 3 })
      );
    });

    it('passes minReplies: 1 as filter_min_replies', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('stove', { minReplies: 1 });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: 1 })
      );
    });

    it('normalises minReplies: 0 to null (0 === no filter; avoids redundant WHERE predicate)', async () => {
      // `reply_count >= 0` is always true, identical to IS NULL (no filter).
      // searchCommunityKnowledge normalises 0 → null for canonical DB semantics.
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('stove', { minReplies: 0 });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: null })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // excludeNoEngagement shorthand
  // ---------------------------------------------------------------------------

  describe('excludeNoEngagement shorthand', () => {
    it('uses effectiveMinReplies: 1 when excludeNoEngagement is true and minReplies is not set', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('rain jacket', { excludeNoEngagement: true });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: 1 })
      );
    });

    it('uses Math.max(minReplies, 1) when both excludeNoEngagement and minReplies are set', async () => {
      const mockRpc = setupMockRpc();

      // minReplies: 3, excludeNoEngagement: true → Math.max(3, 1) = 3
      await searchCommunityKnowledge('backpack', { minReplies: 3, excludeNoEngagement: true });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: 3 })
      );
    });

    it('uses 1 (not 0) when minReplies is 0 and excludeNoEngagement is true', async () => {
      const mockRpc = setupMockRpc();

      // minReplies: 0 → fallback to ?? 0 → Math.max(0, 1) = 1
      await searchCommunityKnowledge('boots', { minReplies: 0, excludeNoEngagement: true });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: 1 })
      );
    });

    it('has no effect when excludeNoEngagement is false (minReplies governs)', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('poles', { minReplies: 2, excludeNoEngagement: false });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: 2 })
      );
    });

    it('passes null when excludeNoEngagement is false and no minReplies', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('poles', { excludeNoEngagement: false });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_min_replies: null })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // maxAgeMonths
  // ---------------------------------------------------------------------------

  describe('maxAgeMonths', () => {
    it('passes maxAgeMonths as filter_max_age_months', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('waterproof jacket', { maxAgeMonths: 12 });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_max_age_months: 12 })
      );
    });

    it('passes null filter_max_age_months when not specified', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('tent');

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_max_age_months: null })
      );
    });

    it('normalises maxAgeMonths: 0 to null (prevents empty-result footgun)', async () => {
      // SQL: NOW() - (0 * interval '1 month') = NOW(), so only content timestamped
      // *after the current moment* would pass — returning zero results.
      // 0 should mean "disabled" (no recency filter), not "nothing matches".
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('boots', { maxAgeMonths: 0 });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({ filter_max_age_months: null })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Combined quality filters
  // ---------------------------------------------------------------------------

  describe('combined quality filters', () => {
    it('passes both maxAgeMonths and minReplies to the RPC', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('sleeping pad', {
        maxAgeMonths: 24,
        minReplies: 2,
      });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({
          filter_max_age_months: 24,
          filter_min_replies: 2,
        })
      );
    });

    it('passes correct RPC params for topK and threshold', async () => {
      const mockRpc = setupMockRpc();

      await searchCommunityKnowledge('tarp', { topK: 3, threshold: 0.7 });

      expect(mockRpc).toHaveBeenCalledWith(
        'search_community_knowledge',
        expect.objectContaining({
          max_results: 3,
          similarity_threshold: 0.7,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Graceful degradation
  // ---------------------------------------------------------------------------

  describe('graceful degradation', () => {
    it('returns empty array on Supabase RPC error', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC failed' } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreateServiceRoleClient.mockReturnValue({ rpc: mockRpc } as any);

      const result = await searchCommunityKnowledge('test query');

      expect(result).toEqual([]);
    });

    it('returns empty array when embedding generation throws', async () => {
      const { generateQueryEmbedding } = await import('@/lib/community-rag/embedder');
      vi.mocked(generateQueryEmbedding).mockRejectedValueOnce(new Error('API unavailable'));

      const result = await searchCommunityKnowledge('stove recommendations');

      expect(result).toEqual([]);
    });

    it('returns empty array when Supabase client creation throws', async () => {
      // generateQueryEmbedding succeeds but client creation fails
      mockCreateServiceRoleClient.mockImplementationOnce(() => {
        throw new Error('No service role key');
      });

      const result = await searchCommunityKnowledge('waterproof boots');

      expect(result).toEqual([]);
    });

    it('returns mapped results on success', async () => {
      const mockResults = [
        {
          id: 'chunk-1',
          source_type: 'bulletin_post',
          source_id: 'post-1',
          chunk_text: 'Great tent for summer',
          tags: ['gear_advice'],
          gear_names: ['Big Agnes Copper Spur'],
          brand_names: ['Big Agnes'],
          author_id: 'user-1',
          source_created_at: '2025-06-01T00:00:00Z',
          similarity: 0.85,
        },
      ];
      const mockRpc = setupMockRpc(mockResults);

      const result = await searchCommunityKnowledge('tent');

      expect(result).toHaveLength(1);
      expect(result[0].chunk_text).toBe('Great tent for summer');
      expect(result[0].similarity).toBe(0.85);
      expect(mockRpc).toHaveBeenCalledOnce();
    });
  });
});
