/**
 * Lighterpack import API route.
 *
 * POST /api/loadouts/import-lighterpack
 * - { mode: "preview", url: "https://lighterpack.com/r/<id>" }
 * - { mode: "finalize", ...preview payload with user selections }
 */

import { NextRequest, NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { createClient } from '@/lib/supabase/server';
import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import type { TablesInsert, Json } from '@/types/supabase';
import {
  buildInventoryCandidates,
  buildPreviewSummary,
  chooseFinalWeight,
  hasStrongInventoryMatch,
  mapCatalogCandidate,
  normalizeLighterpackUrl,
  parseLighterpackHtml,
} from '@/lib/lighterpack/import';
import type {
  ExternalResearchResult,
  GearGraphMatchCandidate,
  LighterpackErrorResponse,
  LighterpackFinalizeItemInput,
  LighterpackFinalizeResponse,
  LighterpackFinalizeSummary,
  LighterpackPreviewItem,
  LighterpackPreviewResponse,
  LighterpackResolutionType,
  ParsedItem,
} from '@/types/lighterpack-import';
import { lighterpackRequestSchema } from '@/lib/validations/lighterpack-schema';

const REQUEST_TIMEOUT_MS = 15000;
const PREVIEW_CONCURRENCY = 6;
const MIN_GEARGRAPH_MATCH_SCORE = 0.55;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SerperOrganicResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
}

interface InventoryRow {
  id: string;
  name: string;
  brand: string | null;
  weight_grams: number | null;
  status: 'own' | 'wishlist' | 'sold' | 'lent' | 'retired';
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(text: string): { value: number; currency: string } | null {
  const pattern = /([$€£]|USD|EUR|GBP|CHF)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*([$€£]|USD|EUR|GBP|CHF)?/gi;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(text)) !== null) {
    const left = match[1] ?? '';
    const right = match[3] ?? '';
    const rawNumber = match[2] ?? '';
    const currencyToken = (left || right).toUpperCase();
    const currency = currencyToken === '$' ? 'USD'
      : currencyToken === '€' ? 'EUR'
        : currencyToken === '£' ? 'GBP'
          : ['USD', 'EUR', 'GBP', 'CHF'].includes(currencyToken) ? currencyToken
            : '';

    if (!currency) continue;

    let normalized = rawNumber.replace(/\s+/g, '');
    if (normalized.includes(',') && normalized.includes('.')) {
      const lastComma = normalized.lastIndexOf(',');
      const lastDot = normalized.lastIndexOf('.');
      normalized = lastComma > lastDot
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }

    const value = Number.parseFloat(normalized);
    if (Number.isFinite(value) && value > 0 && value < 50000) {
      return { value, currency };
    }
  }

  return null;
}

function toUnitGrams(weight: number, unit: string): number | null {
  const normalizedUnit = unit.trim().toLowerCase();
  if (!Number.isFinite(weight)) return null;
  if (normalizedUnit === 'g') return weight;
  if (normalizedUnit === 'kg') return weight * 1000;
  if (normalizedUnit === 'oz') return weight * 28.349523125;
  if (normalizedUnit === 'lb' || normalizedUnit === 'lbs') return weight * 453.59237;
  return null;
}

function parseWeight(text: string): number | null {
  const pattern = /(\d+(?:[.,]\d+)?)\s*(kg|g|oz|lb|lbs)\b/i;
  const match = text.match(pattern);
  if (!match) return null;

  const value = Number.parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const grams = toUnitGrams(value, match[2]);
  if (grams == null) return null;
  return Math.round(grams * 1000) / 1000;
}

function extractBrandAndModel(title: string): { brand: string | null; model: string | null } {
  const cleaned = title
    .replace(/\s*[-|:].*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return { brand: null, model: null };

  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return { brand: parts[0], model: null };
  }

  const brand = parts[0] || null;
  const model = parts.slice(1).join(' ').trim() || null;
  return { brand, model };
}

function inferCategory(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\btent|zelt|shelter\b/.test(lower)) return 'Shelter';
  if (/\bpack|rucksack|backpack\b/.test(lower)) return 'Pack';
  if (/\bsleep|sleeping bag|quilt|mat|isomatte\b/.test(lower)) return 'Sleep System';
  if (/\bstove|cook|kocher|pot|fuel\b/.test(lower)) return 'Cooking';
  if (/\bwater|filter|bottle|hydration\b/.test(lower)) return 'Hydration';
  if (/\bjacket|pants|shirt|sock|clothing|wear\b/.test(lower)) return 'Clothing';
  return null;
}

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function buildSourceAttribution(
  sourceUrl: string,
  extra: Record<string, Json> = {}
): Json {
  return {
    type: 'lighterpack_import',
    source: 'lighterpack import',
    sourceUrl,
    importedAt: new Date().toISOString(),
    ...extra,
  };
}

async function fetchLighterpackHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GearShack Lighterpack Importer',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Lighterpack list not found or not publicly accessible.');
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('This Lighterpack list is private or requires authentication.');
      }
      throw new Error(`Failed to fetch Lighterpack list (${response.status}).`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timed out while fetching Lighterpack list.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function validateFetchedHtml(html: string): void {
  const lower = html.toLowerCase();
  if (lower.includes('this list is private') || lower.includes('this pack is private')) {
    throw new Error('This Lighterpack list is private.');
  }

  if (!lower.includes('lpcategory') || !lower.includes('lpitem')) {
    throw new Error('Could not parse items from this Lighterpack list.');
  }
}

async function runExternalResearch(
  query: string,
  categoryHint?: string
): Promise<ExternalResearchResult | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${query} backpacking gear specifications weight price`,
        num: 5,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json() as SerperResponse;
    const results = (data.organic ?? []).filter((entry) => entry.link && entry.title);
    if (results.length === 0) return null;

    const best = results[0];
    const snippets = results.slice(0, 3).map((entry) => entry.snippet ?? '').filter(Boolean);
    const combinedText = `${best.title ?? ''} ${snippets.join(' ')}`.trim();
    const weightGrams = parseWeight(combinedText);
    const price = parsePrice(combinedText);
    const { brand, model } = extractBrandAndModel(best.title ?? query);
    const category = inferCategory(combinedText) ?? categoryHint ?? null;
    const keyFeatures = snippets
      .flatMap((snippet) => snippet.split(/[.;]/))
      .map((feature) => feature.trim())
      .filter((feature) => feature.length > 6)
      .slice(0, 3);

    let confidence = 0.35;
    if (weightGrams != null) confidence += 0.2;
    if (price != null) confidence += 0.2;
    if (brand || model) confidence += 0.1;
    if (keyFeatures.length > 0) confidence += 0.1;

    return {
      query,
      sourceUrl: best.link ?? null,
      sourceDomain: best.link ? new URL(best.link).hostname.replace('www.', '') : null,
      brand,
      model,
      category,
      weightGrams,
      typicalPrice: price?.value ?? null,
      currency: price?.currency ?? null,
      keyFeatures,
      confidence: Math.min(1, confidence),
    };
  } catch {
    return null;
  }
}

async function createOwnItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  parsedItem: ParsedItem,
  sourceUrl: string,
  options: {
    name?: string;
    brand?: string | null;
    description?: string | null;
    notes?: string | null;
    productTypeId?: string | null;
    weightGrams?: number | null;
    sourceAttribution?: Record<string, Json>;
  } = {}
): Promise<string> {
  const quantity = Number.isFinite(parsedItem.quantity) && parsedItem.quantity > 0
    ? Math.floor(parsedItem.quantity)
    : 1;
  const rawWeight = options.weightGrams ?? parsedItem.weightGrams;
  const weightGrams = typeof rawWeight === 'number' && Number.isFinite(rawWeight) ? rawWeight : null;

  const insertData: TablesInsert<'gear_items'> = {
    user_id: userId,
    name: options.name ?? parsedItem.name,
    brand: options.brand ?? null,
    description: options.description ?? null,
    notes: options.notes ?? parsedItem.notes ?? null,
    product_type_id: options.productTypeId ?? null,
    weight_grams: weightGrams,
    weight_display_unit: 'g',
    quantity,
    status: 'own',
    condition: 'used',
    source_attribution: buildSourceAttribution(sourceUrl, options.sourceAttribution ?? {}),
  };

  const { data, error } = await supabase
    .from('gear_items')
    .insert(insertData)
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create gear item "${parsedItem.name}": ${error?.message ?? 'Unknown error'}`);
  }

  return data.id;
}

async function createWishlistItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  sourceUrl: string,
  items: Array<{
    parsedItem: ParsedItem;
    resolvedName: string;
    category: string | null;
    researchedWeight: number | null;
  }>
): Promise<number> {
  if (items.length === 0) return 0;

  const rows: TablesInsert<'gear_items'>[] = items.map((item) => {
    const quantity = Number.isFinite(item.parsedItem.quantity) && item.parsedItem.quantity > 0
      ? Math.floor(item.parsedItem.quantity)
      : 1;
    const noteParts = [
      item.parsedItem.notes ?? null,
      item.category ? `Category: ${item.category}` : null,
      item.researchedWeight != null ? `Researched weight: ${item.researchedWeight} g` : null,
      'Source: lighterpack import',
    ].filter(Boolean);

    const weight = typeof item.parsedItem.weightGrams === 'number' && Number.isFinite(item.parsedItem.weightGrams)
      ? item.parsedItem.weightGrams
      : null;

    return {
      user_id: userId,
      name: item.resolvedName,
      brand: null,
      notes: noteParts.join(' | '),
      weight_grams: weight,
      weight_display_unit: 'g',
      quantity,
      status: 'wishlist',
      condition: 'used',
      source_attribution: buildSourceAttribution(sourceUrl, {
        categoryHint: item.category,
      }),
    };
  });

  const { data, error } = await supabase
    .from('gear_items')
    .insert(rows)
    .select('id');

  if (error) {
    throw new Error(`Failed to create wishlist items: ${error.message}`);
  }

  return data?.length ?? 0;
}

async function handlePreview(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rawUrl: string
): Promise<NextResponse<LighterpackPreviewResponse | LighterpackErrorResponse>> {
  const normalized = normalizeLighterpackUrl(rawUrl);
  if (!normalized) {
    return NextResponse.json(
      { success: false, error: 'Invalid Lighterpack URL. Expected format: https://lighterpack.com/r/<id>' },
      { status: 400 }
    );
  }

  let html: string;
  try {
    html = await fetchLighterpackHtml(normalized.url);
    validateFetchedHtml(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Lighterpack list.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const parsed = parseLighterpackHtml(html);
  if (parsed.items.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No items found in this Lighterpack list.' },
      { status: 422 }
    );
  }

  const { data: inventoryRows, error: inventoryError } = await supabase
    .from('gear_items')
    .select('id, name, brand, weight_grams, status')
    .eq('user_id', userId)
    .eq('status', 'own');

  if (inventoryError) {
    return NextResponse.json(
      { success: false, error: `Failed to load inventory: ${inventoryError.message}` },
      { status: 500 }
    );
  }

  const inventory = (inventoryRows ?? []) as InventoryRow[];
  const inventoryInputs = inventory.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    weightGrams: row.weight_grams,
  }));

  const gearGraphCache = new Map<string, Promise<GearGraphMatchCandidate | null>>();
  const researchCache = new Map<string, Promise<ExternalResearchResult | null>>();
  const limit = pLimit(PREVIEW_CONCURRENCY);

  const getGearGraphMatch = async (name: string) => {
    const key = normalizeName(name);
    if (gearGraphCache.has(key)) {
      return gearGraphCache.get(key) as Promise<GearGraphMatchCandidate | null>;
    }

    const pending = (async () => {
      try {
        const results = await fuzzyProductSearch(supabase, name, { limit: 5 });
        const best = results.find((result) => result.score >= MIN_GEARGRAPH_MATCH_SCORE) ?? results[0] ?? null;
        if (!best || best.score < MIN_GEARGRAPH_MATCH_SCORE) return null;

        return mapCatalogCandidate({
          id: best.id,
          name: best.name,
          brand: best.brand?.name ?? null,
          description: best.description,
          productTypeId: best.productTypeId,
          weightGrams: best.weightGrams,
          priceUsd: best.priceUsd,
          score: best.score,
        });
      } catch {
        return null;
      }
    })();

    gearGraphCache.set(key, pending);
    return pending;
  };

  const getResearch = async (item: ParsedItem) => {
    const key = normalizeName(item.name);
    if (researchCache.has(key)) {
      return researchCache.get(key) as Promise<ExternalResearchResult | null>;
    }

    const pending = runExternalResearch(item.name, item.category);
    researchCache.set(key, pending);
    return pending;
  };

  const items = await Promise.all(
    parsed.items.map((item, index) => limit(async (): Promise<LighterpackPreviewItem> => {
      const warnings: string[] = [];
      if (!Number.isFinite(item.quantity) || item.quantity < 1) {
        warnings.push('Quantity is invalid (must be >= 1).');
      }
      if (item.weightGrams != null && !Number.isFinite(item.weightGrams)) {
        warnings.push('Weight is invalid (not numeric).');
      }

      const inventoryCandidates = buildInventoryCandidates(item, inventoryInputs);
      const strongInventoryMatch = hasStrongInventoryMatch(inventoryCandidates);

      let gearGraphMatch = null;
      let externalResearch = null;

      if (!strongInventoryMatch) {
        gearGraphMatch = await getGearGraphMatch(item.name);
      }

      if (!strongInventoryMatch && !gearGraphMatch) {
        externalResearch = await getResearch(item);
      }

      const suggestedResolution: LighterpackResolutionType = strongInventoryMatch
        ? 'link_inventory'
        : gearGraphMatch
          ? 'create_from_geargraph'
          : externalResearch
            ? 'create_temporary'
            : 'unresolved';

      if (suggestedResolution === 'unresolved') {
        warnings.push('No reliable inventory, GearGraph, or research match found.');
      }

      return {
        index,
        parsedItem: item,
        inventoryCandidates,
        gearGraphMatch,
        externalResearch,
        suggestedResolution,
        warnings,
      };
    }))
  );

  const summary = buildPreviewSummary(items);

  return NextResponse.json({
    success: true,
    data: {
      sourceUrl: normalized.url,
      listName: parsed.listName,
      items,
      summary,
    },
  });
}

async function handleFinalize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: {
    sourceUrl: string;
    listName: string;
    loadoutName?: string;
    items: LighterpackFinalizeItemInput[];
  }
): Promise<NextResponse<LighterpackFinalizeResponse | LighterpackErrorResponse>> {
  const normalized = normalizeLighterpackUrl(body.sourceUrl);
  if (!normalized) {
    return NextResponse.json({ success: false, error: 'Invalid source URL.' }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ success: false, error: 'No items to finalize.' }, { status: 400 });
  }

  const loadoutName = (body.loadoutName || `${body.listName} (Imported)`).trim().slice(0, 120) || 'Imported Lighterpack';

  const { data: existingRows, error: existingError } = await supabase
    .from('gear_items')
    .select('id, name, brand, weight_grams, status')
    .eq('user_id', userId)
    .in('status', ['own', 'wishlist']);

  if (existingError) {
    return NextResponse.json(
      { success: false, error: `Failed to load existing items: ${existingError.message}` },
      { status: 500 }
    );
  }

  const existing = (existingRows ?? []) as InventoryRow[];
  const ownById = new Map(existing.filter((row) => row.status === 'own').map((row) => [row.id, row]));
  const existingOwnNames = new Set(existing.filter((row) => row.status === 'own').map((row) => normalizeName(row.name)));
  const existingWishlistNames = new Set(existing.filter((row) => row.status === 'wishlist').map((row) => normalizeName(row.name)));

  const warnings: string[] = [];
  const createdFromCatalog = new Map<string, string>();
  const createdTemporary = new Map<string, string>();

  const loadoutRows: Array<{
    gearItemId: string;
    quantity: number;
    isWorn: boolean;
    isConsumable: boolean;
  }> = [];

  const wishlistSeeds = new Map<string, {
    parsedItem: ParsedItem;
    resolvedName: string;
    category: string | null;
    researchedWeight: number | null;
  }>();

  let matchedInventory = 0;
  let matchedGearGraph = 0;
  let unresolved = 0;

  const createUnresolvedPlaceholder = async (item: ParsedItem, reason: string): Promise<string> => {
    const placeholderName = item.name ? `Unresolved: ${item.name}` : 'Unresolved imported item';
    const notes = [
      reason,
      item.category ? `Category: ${item.category}` : null,
      item.notes ? `Original notes: ${item.notes}` : null,
      'Source: lighterpack import',
    ].filter(Boolean).join(' | ');

    return createOwnItem(supabase, userId, item, normalized.url, {
      name: placeholderName,
      notes,
      weightGrams: null,
      sourceAttribution: {
        unresolved: true,
      },
    });
  };

  for (const input of body.items) {
    const parsedItem = input.parsedItem;
    const hasInvalidWeight = parsedItem.weightGrams != null && !Number.isFinite(parsedItem.weightGrams);
    const resolution = hasInvalidWeight
      ? 'unresolved'
      : (input.selectedResolution ?? input.suggestedResolution);

    let resolvedItemId: string | null = null;
    let resolvedName = parsedItem.name;
    let researchedWeight: number | null = input.externalResearch?.weightGrams ?? null;
    const quantity = Number.isFinite(parsedItem.quantity) && parsedItem.quantity > 0 ? Math.floor(parsedItem.quantity) : 1;

    if (!Number.isFinite(parsedItem.quantity) || parsedItem.quantity < 1) {
      warnings.push(`"${parsedItem.name}" had invalid quantity (${parsedItem.quantity}); using unresolved placeholder.`);
    }

    if (hasInvalidWeight) {
      warnings.push(`"${parsedItem.name}" had non-numeric weight and was added as unresolved.`);
    }

    try {
      if (resolution === 'link_inventory') {
        const selectedInventoryId = input.selectedInventoryItemId
          ?? input.inventoryCandidates[0]?.inventoryItemId
          ?? null;

        if (selectedInventoryId && ownById.has(selectedInventoryId)) {
          resolvedItemId = selectedInventoryId;
          resolvedName = ownById.get(selectedInventoryId)?.name ?? parsedItem.name;
          matchedInventory += 1;
        } else {
          warnings.push(`"${parsedItem.name}" inventory link was invalid and became unresolved.`);
        }
      }

      if (!resolvedItemId && resolution === 'create_from_geargraph' && input.gearGraphMatch) {
        const catalogKey = input.gearGraphMatch.catalogProductId;
        resolvedName = input.gearGraphMatch.name;

        if (createdFromCatalog.has(catalogKey)) {
          resolvedItemId = createdFromCatalog.get(catalogKey) ?? null;
        } else {
          const createdId = await createOwnItem(supabase, userId, parsedItem, normalized.url, {
            name: input.gearGraphMatch.name,
            brand: input.gearGraphMatch.brand,
            description: input.gearGraphMatch.description,
            notes: [
              parsedItem.notes ?? null,
              parsedItem.category ? `Category: ${parsedItem.category}` : null,
              'Matched via GearGraph catalog',
            ].filter(Boolean).join(' | '),
            productTypeId: input.gearGraphMatch.productTypeId,
            weightGrams: input.gearGraphMatch.weightGrams ?? parsedItem.weightGrams,
            sourceAttribution: {
              catalogProductId: catalogKey,
              matchScore: input.gearGraphMatch.score,
            },
          });
          createdFromCatalog.set(catalogKey, createdId);
          resolvedItemId = createdId;
        }
        matchedGearGraph += 1;
      }

      if (!resolvedItemId && resolution === 'create_temporary') {
        const tempKey = normalizeName(parsedItem.name);
        if (createdTemporary.has(tempKey)) {
          resolvedItemId = createdTemporary.get(tempKey) ?? null;
        } else {
          const weightDecision = chooseFinalWeight(parsedItem.weightGrams, input.externalResearch?.weightGrams ?? null);
          researchedWeight = input.externalResearch?.weightGrams ?? null;
          if (!weightDecision.researchedWeightAccepted && weightDecision.weightDeltaPercent != null) {
            warnings.push(
              `"${parsedItem.name}" research weight differs by ${weightDecision.weightDeltaPercent}%; kept Lighterpack weight.`
            );
          }

          const createdId = await createOwnItem(supabase, userId, parsedItem, normalized.url, {
            name: parsedItem.name,
            brand: input.externalResearch?.brand ?? null,
            description: input.externalResearch?.keyFeatures.join('. ') || null,
            notes: [
              parsedItem.notes ?? null,
              parsedItem.category ? `Category: ${parsedItem.category}` : null,
              input.externalResearch?.sourceUrl ? `Research source: ${input.externalResearch.sourceUrl}` : null,
              input.externalResearch?.typicalPrice != null
                ? `Typical price: ${input.externalResearch.currency ?? ''} ${input.externalResearch.typicalPrice}`
                : null,
            ].filter(Boolean).join(' | '),
            weightGrams: weightDecision.finalWeight,
            sourceAttribution: {
              externalResearch: true,
              researchedWeightGrams: input.externalResearch?.weightGrams ?? null,
              researchedWeightAccepted: weightDecision.researchedWeightAccepted,
              researchedWeightDeltaPercent: weightDecision.weightDeltaPercent,
            },
          });
          createdTemporary.set(tempKey, createdId);
          resolvedItemId = createdId;
        }
      }

      if (!resolvedItemId || resolution === 'unresolved') {
        unresolved += 1;
        const reason = resolution === 'unresolved'
          ? 'Marked unresolved by user'
          : `Could not resolve selected action (${resolution})`;
        resolvedItemId = await createUnresolvedPlaceholder(parsedItem, reason);
      }

      if (!isUuid(resolvedItemId)) {
        unresolved += 1;
        warnings.push(`"${parsedItem.name}" generated an invalid item ID and was recreated as unresolved.`);
        resolvedItemId = await createUnresolvedPlaceholder(parsedItem, 'Invalid generated ID');
      }

      loadoutRows.push({
        gearItemId: resolvedItemId,
        quantity,
        isWorn: !!parsedItem.worn,
        isConsumable: !!parsedItem.consumable,
      });

      // Wishlist rule: if user did not already own the item before this import, add wishlist entry.
      if (resolution !== 'link_inventory') {
        const normalizedName = normalizeName(resolvedName || parsedItem.name);
        if (!existingOwnNames.has(normalizedName) && !existingWishlistNames.has(normalizedName) && !wishlistSeeds.has(normalizedName)) {
          wishlistSeeds.set(normalizedName, {
            parsedItem,
            resolvedName: resolvedName || parsedItem.name,
            category: parsedItem.category ?? input.externalResearch?.category ?? null,
            researchedWeight,
          });
        }
      }
    } catch (error) {
      unresolved += 1;
      warnings.push(
        `Failed to process "${parsedItem.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      const fallbackId = await createUnresolvedPlaceholder(parsedItem, 'Processing error');
      loadoutRows.push({
        gearItemId: fallbackId,
        quantity,
        isWorn: !!parsedItem.worn,
        isConsumable: !!parsedItem.consumable,
      });
    }
  }

  const { data: loadoutData, error: loadoutError } = await supabase
    .from('loadouts')
    .insert({
      user_id: userId,
      name: loadoutName,
      description: `Imported from ${normalized.url}`,
    })
    .select('id, name')
    .single();

  if (loadoutError || !loadoutData?.id) {
    return NextResponse.json(
      { success: false, error: `Failed to create loadout: ${loadoutError?.message ?? 'Unknown error'}` },
      { status: 500 }
    );
  }

  const aggregated = new Map<string, { quantity: number; isWorn: boolean; isConsumable: boolean }>();
  for (const row of loadoutRows) {
    const existingRow = aggregated.get(row.gearItemId);
    if (existingRow) {
      existingRow.quantity += row.quantity;
      existingRow.isWorn = existingRow.isWorn || row.isWorn;
      existingRow.isConsumable = existingRow.isConsumable || row.isConsumable;
    } else {
      aggregated.set(row.gearItemId, {
        quantity: row.quantity,
        isWorn: row.isWorn,
        isConsumable: row.isConsumable,
      });
    }
  }

  const loadoutInserts: TablesInsert<'loadout_items'>[] = Array.from(aggregated.entries()).map(
    ([gearItemId, row]) => ({
      loadout_id: loadoutData.id,
      gear_item_id: gearItemId,
      quantity: row.quantity,
      is_worn: row.isWorn,
      is_consumable: row.isConsumable,
    })
  );

  const { error: loadoutItemsError } = await supabase.from('loadout_items').insert(loadoutInserts);
  if (loadoutItemsError) {
    return NextResponse.json(
      { success: false, error: `Failed to create loadout items: ${loadoutItemsError.message}` },
      { status: 500 }
    );
  }

  const addedToWishlist = await createWishlistItems(
    supabase,
    userId,
    normalized.url,
    Array.from(wishlistSeeds.values())
  );

  const data: LighterpackFinalizeSummary = {
    totalItems: body.items.length,
    matchedInventory,
    matchedGearGraph,
    addedToWishlist,
    unresolved,
    warnings,
    loadoutId: loadoutData.id,
    loadoutName: loadoutData.name,
  };

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<LighterpackErrorResponse>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const rawBody: unknown = await request.json();
    const parsed = lighterpackRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json<LighterpackErrorResponse>(
        { success: false, error: parsed.error.issues.map((i) => i.message).join('; ') },
        { status: 400 }
      );
    }

    const body = parsed.data;

    if (body.mode === 'preview') {
      return handlePreview(supabase, user.id, body.url);
    }

    if (body.mode === 'finalize') {
      return handleFinalize(supabase, user.id, {
        sourceUrl: body.sourceUrl,
        listName: body.listName,
        loadoutName: body.loadoutName,
      items: body.items,
      });
    }

    return NextResponse.json<LighterpackErrorResponse>(
      { success: false, error: 'Invalid mode. Use "preview" or "finalize".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[LighterpackImport] Unexpected error:', error);
    return NextResponse.json<LighterpackErrorResponse>(
      { success: false, error: 'Internal server error during Lighterpack import.' },
      { status: 500 }
    );
  }
}
