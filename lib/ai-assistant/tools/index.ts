/**
 * AI Assistant Tools Index
 * Feature 050: AI Assistant - Lean & Flexible Database Access
 *
 * Minimal set of powerful tools that give the AI maximum flexibility
 * without technical debt or complexity.
 *
 * Philosophy: 3 flexible tools > 11 fixed tools
 * - queryUserData: Universal database access (replaces 5 limited tools)
 * - searchCatalog: Flexible product search
 * - searchWeb: Real-time web information
 */

// Query User Data Tool - Universal database access
export {
  queryUserDataTool,
  queryUserDataParametersSchema,
  executeQueryUserData,
  type QueryUserDataParameters,
  type QueryUserDataResponse,
} from './query-user-data';

// Search Catalog Tool - Flexible product search
export {
  searchCatalogTool,
  searchCatalogParametersSchema,
  executeSearchCatalog,
  type SearchCatalogParameters,
  type SearchCatalogResponse,
  type CatalogSearchResult,
} from './search-catalog';

// Search Web Tool - Real-time web information
export {
  searchWebTool,
  searchWebParametersSchema,
  executeSearchWeb,
  formatSearchResultsForAI,
  type SearchWebParameters,
  type SearchWebResponse,
} from './search-web';
