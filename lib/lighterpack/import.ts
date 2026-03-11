/**
 * Lighterpack import parsing and matching helpers.
 */

import type {
  GearGraphMatchCandidate,
  InventoryMatchCandidate,
  LighterpackPreviewItem,
  LighterpackPreviewSummary,
  ParsedItem,
} from '@/types/lighterpack-import';

interface BalancedBlock {
  block: string;
  endIndex: number;
}

interface InventoryCandidateInput {
  id: string;
  name: string;
  brand: string | null;
  weightGrams: number | null;
}

interface CatalogCandidateInput {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  productTypeId: string | null;
  weightGrams: number | null;
  priceUsd: number | null;
  score: number;
}

const LIGHTERPACK_URL_REGEX = /^https?:\/\/(?:www\.)?lighterpack\.com\/r\/([a-zA-Z0-9]+)(?:\/)?(?:\?.*)?$/i;

const DEFAULT_LIST_NAME = 'Imported Lighterpack';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseLocaleNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!cleaned) return null;

  // If both separators are present, infer decimal separator by final position.
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      const normalized = cleaned.replace(/\./g, '').replace(',', '.');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    const normalized = cleaned.replace(/,/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Only comma present, treat as decimal separator.
  if (cleaned.includes(',')) {
    const normalized = cleaned.replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    nbsp: ' ',
  };

  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return named[entity] ?? match;
  });
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;

  const lenA = a.length;
  const lenB = b.length;
  const matrix: number[][] = Array.from({ length: lenA + 1 }, () => new Array<number>(lenB + 1).fill(0));

  for (let i = 0; i <= lenA; i++) matrix[i][0] = i;
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[lenA][lenB];
  return 1 - distance / Math.max(lenA, lenB);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function toUnitGrams(weight: number, unit: string): number | null {
  const normalizedUnit = unit.trim().toLowerCase();
  if (!Number.isFinite(weight)) return null;
  if (normalizedUnit === 'g' || normalizedUnit === 'gram' || normalizedUnit === 'grams') return weight;
  if (normalizedUnit === 'kg' || normalizedUnit === 'kilogram' || normalizedUnit === 'kilograms') return weight * 1000;
  if (normalizedUnit === 'oz' || normalizedUnit === 'ounce' || normalizedUnit === 'ounces') return weight * 28.349523125;
  if (normalizedUnit === 'lb' || normalizedUnit === 'lbs' || normalizedUnit === 'pound' || normalizedUnit === 'pounds') return weight * 453.59237;
  return null;
}

function extractBalancedLiBlock(html: string, startIndex: number): BalancedBlock | null {
  const tagRegex = /<\/?li\b[^>]*>/gi;
  tagRegex.lastIndex = startIndex;
  const firstTag = tagRegex.exec(html);

  if (!firstTag || firstTag.index !== startIndex || firstTag[0].startsWith('</')) {
    return null;
  }

  let depth = 1;
  let currentTag: RegExpExecArray | null = null;

  while ((currentTag = tagRegex.exec(html)) !== null) {
    if (currentTag[0].startsWith('</')) {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      return {
        block: html.slice(startIndex, tagRegex.lastIndex),
        endIndex: tagRegex.lastIndex,
      };
    }
  }

  return null;
}

function extractLiBlocksByClass(html: string, className: string): string[] {
  const blocks: string[] = [];
  const startRegex = new RegExp(`<li\\b[^>]*class="[^"]*\\b${escapeRegExp(className)}\\b[^"]*"[^>]*>`, 'gi');
  let match: RegExpExecArray | null = null;

  while ((match = startRegex.exec(html)) !== null) {
    const balanced = extractBalancedLiBlock(html, match.index);
    if (!balanced) {
      continue;
    }
    blocks.push(balanced.block);
    startRegex.lastIndex = balanced.endIndex;
  }

  return blocks;
}

function extractClassHtml(block: string, className: string, tagName?: string): string | null {
  const tagPart = tagName ? escapeRegExp(tagName) : '[a-zA-Z0-9]+';
  const regex = new RegExp(
    `<(${tagPart})\\b[^>]*class="[^"]*\\b${escapeRegExp(className)}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`,
    'i'
  );
  const match = block.match(regex);
  return match?.[2] ?? null;
}

function extractClassAttribute(block: string, className: string, attribute: string): string | null {
  const regex = new RegExp(
    `<[^>]*class="[^"]*\\b${escapeRegExp(className)}\\b[^"]*"[^>]*\\b${escapeRegExp(attribute)}="([^"]*)"[^>]*>`,
    'i'
  );
  const match = block.match(regex);
  return match?.[1] ?? null;
}

function normalizeImageUrl(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const decoded = decodeHtmlEntities(raw).trim();
  if (!decoded) return undefined;
  if (decoded.startsWith('//')) return `https:${decoded}`;
  if (decoded.startsWith('/')) return `https://lighterpack.com${decoded}`;
  return decoded;
}

function extractQtyFromCell(block: string): number | null {
  const attrMatch = block.match(/<span\b[^>]*class="[^"]*\blpQtyCell\b[^"]*"[^>]*\bqty(-?\d+)\b[^>]*>/i);
  if (attrMatch?.[1]) {
    const parsed = Number.parseInt(attrMatch[1], 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const valueMatch = extractClassHtml(block, 'lpQtyCell', 'span');
  if (!valueMatch) return null;
  const text = stripTags(valueMatch);
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractWeightGrams(itemBlock: string): number | null {
  const mgValue = extractClassAttribute(itemBlock, 'lpMG', 'value');
  if (mgValue) {
    const mg = parseLocaleNumber(mgValue);
    if (mg !== null) {
      const grams = mg / 1000;
      return Number.isFinite(grams) ? Math.round(grams * 1000) / 1000 : null;
    }
  }

  const weightHtml = extractClassHtml(itemBlock, 'lpWeight', 'span');
  const unitHtml = extractClassHtml(itemBlock, 'lpDisplay', 'span');
  if (!weightHtml || !unitHtml) return null;

  const weight = parseLocaleNumber(stripTags(weightHtml));
  if (weight === null) return null;
  const unit = stripTags(unitHtml).toLowerCase();
  const grams = toUnitGrams(weight, unit);
  if (grams === null) return null;
  return Math.round(grams * 1000) / 1000;
}

function extractIconActive(itemBlock: string, iconClass: string): boolean {
  const regex = new RegExp(`<i\\b[^>]*class="([^"]*\\b${escapeRegExp(iconClass)}\\b[^"]*)"[^>]*>`, 'i');
  const match = itemBlock.match(regex);
  if (!match) return false;
  return /\blpActive\b/i.test(match[1]);
}

export function normalizeLighterpackUrl(url: string): { id: string; url: string } | null {
  const trimmed = url.trim();
  const match = trimmed.match(LIGHTERPACK_URL_REGEX);
  if (!match) return null;
  const id = match[1];
  return { id, url: `https://lighterpack.com/r/${id}` };
}

export function parseLighterpackHtml(html: string): { listName: string; items: ParsedItem[] } {
  const listNameHtml = extractClassHtml(html, 'lpListName', 'h1');
  const listName = listNameHtml ? stripTags(listNameHtml) : DEFAULT_LIST_NAME;

  const categoryBlocks = extractLiBlocksByClass(html, 'lpCategory');
  const items: ParsedItem[] = [];

  for (const categoryBlock of categoryBlocks) {
    const categoryNameHtml = extractClassHtml(categoryBlock, 'lpCategoryName', 'h2');
    const categoryName = categoryNameHtml ? stripTags(categoryNameHtml) : undefined;
    const itemBlocks = extractLiBlocksByClass(categoryBlock, 'lpItem');

    for (const itemBlock of itemBlocks) {
      const nameHtml = extractClassHtml(itemBlock, 'lpName', 'span');
      const descriptionHtml = extractClassHtml(itemBlock, 'lpDescription', 'span');
      const imageSrc = extractClassAttribute(itemBlock, 'lpItemImage', 'src');
      const nameText = nameHtml ? stripTags(nameHtml) : '';
      const descriptionText = descriptionHtml ? stripTags(descriptionHtml) : '';
      const quantity = extractQtyFromCell(itemBlock);
      const weightGrams = extractWeightGrams(itemBlock);
      const itemIdMatch = itemBlock.match(/\bid="([^"]+)"/i);

      const resolvedName = nameText || descriptionText || 'Unnamed item';
      const notes = descriptionText && descriptionText !== resolvedName ? descriptionText : undefined;

      items.push({
        name: resolvedName,
        weightGrams,
        quantity: quantity ?? 1,
        category: categoryName,
        imageUrl: normalizeImageUrl(imageSrc),
        worn: extractIconActive(itemBlock, 'lpWorn'),
        consumable: extractIconActive(itemBlock, 'lpConsumable'),
        notes,
        sourceItemId: itemIdMatch?.[1],
      });
    }
  }

  return {
    listName,
    items,
  };
}

export function buildInventoryCandidates(
  parsedItem: ParsedItem,
  inventoryItems: InventoryCandidateInput[],
  maxCandidates: number = 3
): InventoryMatchCandidate[] {
  const query = normalizeName(parsedItem.name);
  if (!query) return [];

  const candidates = inventoryItems
    .map<InventoryMatchCandidate | null>((item) => {
      const itemName = normalizeName(item.name);
      const brandAndName = normalizeName(`${item.brand ?? ''} ${item.name}`);

      const nameScore = calculateSimilarity(query, itemName);
      const combinedScore = calculateSimilarity(query, brandAndName);

      let score = Math.max(nameScore, combinedScore);
      if (itemName.includes(query) || query.includes(itemName)) {
        score += 0.08;
      }

      let weightDeltaPercent: number | null = null;
      if (parsedItem.weightGrams && item.weightGrams && parsedItem.weightGrams > 0 && item.weightGrams > 0) {
        weightDeltaPercent = (Math.abs(parsedItem.weightGrams - item.weightGrams) / parsedItem.weightGrams) * 100;
        if (weightDeltaPercent <= 5) score += 0.15;
        else if (weightDeltaPercent <= 10) score += 0.1;
        else if (weightDeltaPercent <= 20) score += 0.04;
        else if (weightDeltaPercent >= 50) score -= 0.1;
      }

      const finalScore = clamp(score, 0, 1);
      if (finalScore < 0.45) return null;

      return {
        inventoryItemId: item.id,
        name: item.name,
        brand: item.brand,
        weightGrams: item.weightGrams,
        score: Math.round(finalScore * 1000) / 1000,
        weightDeltaPercent: weightDeltaPercent == null ? null : Math.round(weightDeltaPercent * 100) / 100,
      };
    })
    .filter((candidate): candidate is InventoryMatchCandidate => candidate !== null)
    .sort((a, b) => b.score - a.score);

  return candidates.slice(0, maxCandidates);
}

export function hasStrongInventoryMatch(candidates: InventoryMatchCandidate[]): boolean {
  return candidates.length > 0 && candidates[0].score >= 0.74;
}

export function mapCatalogCandidate(candidate: CatalogCandidateInput): GearGraphMatchCandidate {
  return {
    catalogProductId: candidate.id,
    name: candidate.name,
    brand: candidate.brand,
    description: candidate.description,
    productTypeId: candidate.productTypeId,
    weightGrams: candidate.weightGrams,
    priceUsd: candidate.priceUsd,
    score: Math.round(candidate.score * 1000) / 1000,
  };
}

export function buildPreviewSummary(items: LighterpackPreviewItem[]): LighterpackPreviewSummary {
  const summary: LighterpackPreviewSummary = {
    totalItems: items.length,
    matchedInventory: 0,
    matchedGearGraph: 0,
    externalResearched: 0,
    unresolved: 0,
  };

  for (const item of items) {
    switch (item.suggestedResolution) {
      case 'link_inventory':
        summary.matchedInventory += 1;
        break;
      case 'create_from_geargraph':
        summary.matchedGearGraph += 1;
        break;
      case 'create_temporary':
        summary.externalResearched += 1;
        break;
      case 'unresolved':
        summary.unresolved += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

export function chooseFinalWeight(
  lighterpackWeight: number | null,
  researchedWeight: number | null
): {
  finalWeight: number | null;
  researchedWeightAccepted: boolean;
  weightDeltaPercent: number | null;
} {
  if (lighterpackWeight == null && researchedWeight == null) {
    return { finalWeight: null, researchedWeightAccepted: false, weightDeltaPercent: null };
  }

  if (lighterpackWeight == null && researchedWeight != null) {
    return { finalWeight: researchedWeight, researchedWeightAccepted: true, weightDeltaPercent: null };
  }

  if (lighterpackWeight != null && researchedWeight == null) {
    return { finalWeight: lighterpackWeight, researchedWeightAccepted: false, weightDeltaPercent: null };
  }

  const lp = lighterpackWeight as number;
  const researched = researchedWeight as number;
  const deltaPercent = lp > 0 ? (Math.abs(lp - researched) / lp) * 100 : null;
  const accepted = deltaPercent != null && deltaPercent < 10;

  return {
    finalWeight: accepted ? researched : lp,
    researchedWeightAccepted: accepted,
    weightDeltaPercent: deltaPercent == null ? null : Math.round(deltaPercent * 100) / 100,
  };
}
