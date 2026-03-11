/**
 * Lighterpack import types.
 *
 * Feature: Lighterpack packlist import
 */

export interface ParsedItem {
  name: string;
  weightGrams: number | null;
  quantity: number;
  category?: string;
  imageUrl?: string;
  worn?: boolean;
  consumable?: boolean;
  notes?: string;
  sourceItemId?: string;
}

export interface InventoryMatchCandidate {
  inventoryItemId: string;
  name: string;
  brand: string | null;
  weightGrams: number | null;
  score: number;
  weightDeltaPercent: number | null;
}

export interface GearGraphMatchCandidate {
  catalogProductId: string;
  name: string;
  brand: string | null;
  description: string | null;
  productTypeId: string | null;
  weightGrams: number | null;
  priceUsd: number | null;
  score: number;
}

export interface ExternalResearchResult {
  query: string;
  sourceUrl: string | null;
  sourceDomain: string | null;
  brand: string | null;
  model: string | null;
  category: string | null;
  weightGrams: number | null;
  typicalPrice: number | null;
  currency: string | null;
  keyFeatures: string[];
  confidence: number;
}

export type LighterpackResolutionType =
  | 'link_inventory'
  | 'create_from_geargraph'
  | 'create_temporary'
  | 'unresolved';

export interface LighterpackPreviewItem {
  index: number;
  parsedItem: ParsedItem;
  inventoryCandidates: InventoryMatchCandidate[];
  gearGraphMatch: GearGraphMatchCandidate | null;
  externalResearch: ExternalResearchResult | null;
  suggestedResolution: LighterpackResolutionType;
  warnings: string[];
}

export interface LighterpackPreviewSummary {
  totalItems: number;
  matchedInventory: number;
  matchedGearGraph: number;
  externalResearched: number;
  unresolved: number;
}

export interface LighterpackPreviewData {
  sourceUrl: string;
  listName: string;
  items: LighterpackPreviewItem[];
  summary: LighterpackPreviewSummary;
}

export interface LighterpackPreviewResponse {
  success: true;
  data: LighterpackPreviewData;
}

export interface LighterpackErrorResponse {
  success: false;
  error: string;
}

export interface LighterpackFinalizeItemInput extends LighterpackPreviewItem {
  selectedResolution?: LighterpackResolutionType;
  selectedInventoryItemId?: string | null;
}

export interface LighterpackFinalizeRequest {
  mode: 'finalize';
  sourceUrl: string;
  listName: string;
  loadoutName?: string;
  items: LighterpackFinalizeItemInput[];
}

export interface LighterpackPreviewRequest {
  mode: 'preview';
  url: string;
}

export interface LighterpackFinalizeSummary {
  totalItems: number;
  matchedInventory: number;
  matchedGearGraph: number;
  addedToWishlist: number;
  unresolved: number;
  warnings: string[];
  loadoutId: string;
  loadoutName: string;
}

export interface LighterpackFinalizeResponse {
  success: true;
  data: LighterpackFinalizeSummary;
}
