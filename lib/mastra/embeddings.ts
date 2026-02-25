/**
 * Multilingual Embedding Configuration
 * Feature: Vorschlag 16 - Multilinguale Embeddings für Deutsch/Englisch-Suche
 *
 * Provides configurable embedding model selection with support for:
 * - openai/text-embedding-3-small (1536 dims, English-optimized, default for backward compat)
 * - cohere/embed-multilingual-v3.0 (1024 dims, true multilingual DE/EN parity)
 *
 * The multilingual model ensures German queries ("Winterschlafsack für -15°C")
 * produce equivalent results to English queries ("winter sleeping bag for -15°C"),
 * which is critical for this project's bilingual i18n architecture.
 *
 * @see https://docs.cohere.com/docs/embed-2#multilingual-models
 * @see https://ai-gateway.vercel.sh/docs
 */

import { createGateway } from '@ai-sdk/gateway';

// =============================================================================
// Types
// =============================================================================

export type EmbeddingModelId =
  | 'openai/text-embedding-3-small'
  | 'cohere/embed-multilingual-v3.0';

export interface EmbeddingModelConfig {
  /** Model identifier for Vercel AI Gateway */
  modelId: EmbeddingModelId;
  /** Output vector dimensions */
  dimensions: number;
  /** Whether the model has native multilingual support */
  multilingual: boolean;
  /** Supported languages (ISO 639-1 codes) */
  languages: readonly string[];
}

// =============================================================================
// Model Registry
// =============================================================================

export const EMBEDDING_MODELS: Record<EmbeddingModelId, EmbeddingModelConfig> = {
  'openai/text-embedding-3-small': {
    modelId: 'openai/text-embedding-3-small',
    dimensions: 1536,
    multilingual: false,
    languages: ['en'],
  },
  'cohere/embed-multilingual-v3.0': {
    modelId: 'cohere/embed-multilingual-v3.0',
    dimensions: 1024,
    multilingual: true,
    languages: ['en', 'de', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh', 'ar'],
  },
} as const;

// =============================================================================
// Configuration
// =============================================================================

/**
 * Get the configured embedding model ID from environment.
 *
 * Reads EMBEDDING_MODEL env var. Defaults to openai/text-embedding-3-small
 * for backward compatibility with existing 1536-dim vector columns.
 *
 * Set EMBEDDING_MODEL=cohere/embed-multilingual-v3.0 to enable
 * multilingual embeddings (recommended for DE/EN bilingual apps).
 */
export function getEmbeddingModelId(): EmbeddingModelId {
  const envModel = process.env.EMBEDDING_MODEL;
  if (envModel && envModel in EMBEDDING_MODELS) {
    return envModel as EmbeddingModelId;
  }
  return 'openai/text-embedding-3-small';
}

/**
 * Get the full config for the active embedding model.
 */
export function getEmbeddingModelConfig(): EmbeddingModelConfig {
  return EMBEDDING_MODELS[getEmbeddingModelId()];
}

/**
 * Get the vector dimensions for the active embedding model.
 * Used by migrations and vector storage configuration.
 */
export function getEmbeddingDimensions(): number {
  return getEmbeddingModelConfig().dimensions;
}

/**
 * Check whether the active embedding model supports a given locale natively.
 */
export function isLocaleSupported(locale: string): boolean {
  const config = getEmbeddingModelConfig();
  return config.languages.includes(locale);
}

// =============================================================================
// Embedder Factory
// =============================================================================

// Log active model once at module load (env-driven, static per deployment)
const _activeConfig = getEmbeddingModelConfig();
console.log(`[Embeddings] Active model: ${_activeConfig.modelId} (${_activeConfig.dimensions} dims, multilingual: ${_activeConfig.multilingual})`);

/**
 * Create an embedder instance for the configured model via Vercel AI Gateway.
 *
 * This is the single source of truth for embedding model selection.
 * Used by:
 * - Mastra Memory (semantic recall)
 * - Catalog product embeddings
 * - Any future vector search features
 *
 * @param gateway - Vercel AI Gateway instance (lazy-loaded in mastra-agent.ts)
 */
export function createEmbedder(gateway: ReturnType<typeof createGateway>) {
  return gateway.textEmbeddingModel(getEmbeddingModelId());
}
