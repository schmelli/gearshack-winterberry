/**
 * Community RAG Module - Public API
 * Feature: Community-RAG Integration (Vorschlag 15)
 *
 * Re-exports the main functions used by external consumers:
 * - searchCommunityKnowledge: For the Mastra agent tools
 * - formatCommunityResults: For formatting search results
 * - Indexing utilities: For the indexing script and API routes
 */

// Search (used by agent tools)
export { searchCommunityKnowledge, formatCommunityResults } from './search';

// Embedder (used by indexing script and API routes)
export {
  generateQueryEmbedding,
  generateChunkEmbeddings,
  upsertChunksWithEmbeddings,
  deleteChunksForSource,
} from './embedder';

// Chunker (used by indexing script and API routes)
export {
  buildPostChunks,
  buildReplyChunks,
  extractBrandNames,
  extractGearNames,
} from './chunker';

// Types
export type {
  CommunityChunk,
  CommunitySearchResult,
  CommunitySearchOptions,
  CommunitySourceType,
  IndexingResult,
  BulletinPostForIndexing,
  BulletinReplyForIndexing,
} from './types';

export { COMMUNITY_RAG_CONFIG } from './types';
