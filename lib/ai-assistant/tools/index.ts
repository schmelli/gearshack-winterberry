/**
 * AI Assistant Tools Index
 * Feature 050: AI Assistant - Phase 3
 *
 * Exports all tool definitions and execute functions for the AI assistant.
 */

// Search Catalog Tool
export {
  searchCatalogTool,
  searchCatalogParametersSchema,
  executeSearchCatalog,
  type SearchCatalogParameters,
  type SearchCatalogResponse,
  type CatalogSearchResult,
} from './search-catalog';

// Analyze Inventory Tool
export {
  analyzeInventoryTool,
  analyzeInventoryParametersSchema,
  executeAnalyzeInventory,
  type AnalyzeInventoryParameters,
  type AnalyzeInventoryResponse,
  type BaseWeightResult,
  type CategoryBreakdownResult,
  type PriceAnalysisResult,
} from './analyze-inventory';

// Compare Items Tool
export {
  compareItemsTool,
  compareItemsParametersSchema,
  executeCompareItems,
  type CompareItemsParameters,
  type CompareItemsResponse,
  type ComparisonItem,
  type ComparisonMetric,
} from './compare-items';

// Get Community Offers Tool
export {
  getCommunityOffersTool,
  getCommunityOffersParametersSchema,
  executeGetCommunityOffers,
  type GetCommunityOffersParameters,
  type GetCommunityOffersResponse,
  type CommunityOffer,
} from './get-community-offers';

// Get Insights Tool
export {
  getInsightsTool,
  getInsightsParametersSchema,
  executeGetInsights,
  type GetInsightsParameters,
  type GetInsightsResponse,
  type GearInsight,
} from './get-insights';

// Execute Calculation Tool
export {
  executeCalculationTool,
  executeCalculationParametersSchema,
  executeExecuteCalculation,
  type ExecuteCalculationParameters,
  type ExecuteCalculationResponse,
} from './execute-calculation';

// Search Web Tool (Phase 2B)
export {
  searchWebTool,
  searchWebParametersSchema,
  executeSearchWeb,
  formatSearchResultsForAI,
  type SearchWebParameters,
  type SearchWebResponse,
} from './search-web';
