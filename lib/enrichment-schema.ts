/**
 * Enrichment schema — single source of truth for catalog product enrichment structure.
 *
 * Shared by:
 * - `scripts/enrich-catalog-items.ts` (runtime validation of LLM output via Zod)
 * - `types/catalog.ts` (TypeScript type for the SearchEnrichment data model)
 *
 * Using `z.infer<typeof EnrichmentSchema>` as the TypeScript type ensures that
 * the Zod schema (which validates LLM output at runtime) and the TypeScript type
 * (used in the data model) cannot drift out of sync when the enrichment structure evolves.
 *
 * To add a new enrichment field (e.g., `relatedActivities`):
 * 1. Add it here to `EnrichmentSchema`
 * 2. Update the SQL migration's `catalog_enrichment_text()` if the field should be searchable
 * 3. Update the Supabase column comment in the migration
 * 4. All TypeScript consumers pick up the change automatically via `z.infer`
 *
 * @see supabase/migrations/20260226000001_catalog_search_enrichment.sql
 * @see scripts/enrich-catalog-items.ts
 */

import { z } from 'zod';

/**
 * Zod schema for validating LLM-generated enrichment output.
 * The canonical definition of the search_enrichment JSONB structure.
 */
export const EnrichmentSchema = z.object({
  /**
   * When/where this item excels (e.g., "multi-day alpine expedition in wet conditions").
   * Used to improve search for scenario-based queries ("what should I bring to Scotland?").
   */
  useCases: z.array(z.string())
    .describe('When/where would this item excel? Include specific scenarios like "multi-day alpine expedition", "wet weather hiking in Scotland", "ultralight thru-hiking"'),

  /**
   * How users might search for this item (e.g., "rain jacket", "Regenjacke", "waterproof shell").
   * Includes synonyms, German translations, abbreviations, and colloquial terms.
   */
  alternativeSearchTerms: z.array(z.string())
    .describe('How might users search for this? Include synonyms, German translations, abbreviations, and colloquial terms. E.g., "rain jacket", "Regenjacke", "waterproof shell", "hardshell"'),

  /**
   * Weather/terrain conditions this item suits (e.g., "cold rain", "snow", "Scottish Highlands").
   */
  conditions: z.array(z.string())
    .describe('Weather/terrain conditions this item suits. E.g., "cold rain", "sub-zero temperatures", "wet Scottish Highlands", "alpine snow", "desert heat"'),

  /**
   * What gear this works well with (e.g., "base layer", "hardshell pants", "gaiters").
   */
  compatibleWith: z.array(z.string())
    .describe('What gear categories or items does this work well with? E.g., "hardshell pants", "base layer", "trekking poles", "bear canister"'),

  /**
   * When NOT to use this item (e.g., "not suitable for summer hiking due to weight").
   * Optional — not all items have meaningful contraindications.
   */
  avoidFor: z.string().optional()
    .describe('When should this item NOT be used? E.g., "not suitable for extended sub-zero conditions", "too heavy for ultralight setups"'),
});

/**
 * TypeScript type for LLM-generated semantic metadata for improved search discoverability.
 * Stored as JSONB in the `catalog_products.search_enrichment` column.
 *
 * Derived from `EnrichmentSchema` via `z.infer` to ensure the runtime Zod validation
 * and the compile-time TypeScript type always describe exactly the same structure.
 */
export type SearchEnrichment = z.infer<typeof EnrichmentSchema>;
