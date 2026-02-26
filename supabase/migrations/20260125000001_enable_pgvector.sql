-- Enable pgvector extension for semantic embeddings
-- Feature: 042-catalog-sync-api (Phase 4 - Semantic Search)
--
-- This migration:
-- 1. Enables the pgvector extension
-- 2. Adds an embedding column to catalog_products
-- 3. Creates an HNSW index for fast similarity search

-- Enable pgvector extension (requires Supabase Pro or self-hosted with pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to catalog_products
-- Using 1536 dimensions to match OpenAI/Google text-embedding models
ALTER TABLE catalog_products
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for fast approximate nearest neighbor search
-- Parameters:
--   m = 16: Max connections per layer (higher = more accurate, slower build)
--   ef_construction = 64: Size of dynamic candidate list during index build
-- Using cosine distance (vector_cosine_ops) for normalized embeddings
CREATE INDEX IF NOT EXISTS idx_catalog_products_embedding_hnsw
ON catalog_products
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add comment for documentation
COMMENT ON COLUMN catalog_products.embedding IS
  'Semantic embedding vector (1536 dimensions) for similarity search. Synced from GearGraph or generated via AI embedding models.';
