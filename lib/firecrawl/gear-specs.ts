/**
 * Gear Specifications Extraction Module
 *
 * Feature: Firecrawl Integration
 * Provides Zod schemas and extraction functions for parsing gear specifications
 * from web content, supporting both German and English formats.
 *
 * Based on gearcrew-mastra implementation with enhanced multilingual support.
 */

import { z } from 'zod';

// =============================================================================
// Weight Unit Types and Normalization
// =============================================================================

export type GearWeightUnit = 'g' | 'kg' | 'oz' | 'lb';

/**
 * Normalize weight unit strings to standard enum values
 * Handles German and English variations
 */
export function normalizeWeightUnit(unit: string): GearWeightUnit {
  const normalized = unit.toLowerCase().trim();

  // Kilograms
  if (normalized.includes('kg') || normalized.includes('kilogram') || normalized.includes('kilo')) {
    return 'kg';
  }

  // Ounces
  if (normalized.includes('oz') || normalized.includes('ounce') || normalized.includes('unze')) {
    return 'oz';
  }

  // Pounds
  if (normalized.includes('lb') || normalized.includes('pound') || normalized.includes('pfund')) {
    return 'lb';
  }

  // Default to grams
  return 'g';
}

// =============================================================================
// Volume Unit Types and Normalization
// =============================================================================

export type GearVolumeUnit = 'L' | 'ml' | 'cu in';

/**
 * Normalize volume unit strings to standard enum values
 * Handles German and English variations
 */
export function normalizeVolumeUnit(unit: string): GearVolumeUnit {
  const normalized = unit.toLowerCase().trim();

  // Milliliters
  if (normalized.includes('ml') || normalized.includes('milliliter')) {
    return 'ml';
  }

  // Cubic inches
  if (
    normalized.includes('cu') ||
    normalized.includes('cubic') ||
    normalized.includes('kubik')
  ) {
    return 'cu in';
  }

  // Default to liters
  return 'L';
}

// =============================================================================
// Dimension Unit Types and Normalization
// =============================================================================

export type GearDimensionUnit = 'cm' | 'in' | 'mm';

/**
 * Normalize dimension unit strings to standard enum values
 */
export function normalizeDimensionUnit(unit: string): GearDimensionUnit {
  const normalized = unit.toLowerCase().trim();

  if (normalized === 'in' || normalized.includes('inch') || normalized.includes('zoll')) {
    return 'in';
  }

  if (normalized === 'mm' || normalized.includes('millimeter')) {
    return 'mm';
  }

  // Default to centimeters
  return 'cm';
}

// =============================================================================
// Temperature Unit Types
// =============================================================================

export type GearTemperatureUnit = 'C' | 'F';

// =============================================================================
// Category-Specific Types
// =============================================================================

export type SeasonRating = '3-season' | '3.5-season' | '4-season' | 'summer' | 'winter';

export type FrameType = 'internal' | 'external' | 'frameless' | 'removable';

export type FuelType =
  | 'canister'
  | 'alcohol'
  | 'wood'
  | 'solid'
  | 'multi-fuel'
  | 'white-gas'
  | 'propane';

export type ConstructionType =
  | 'freestanding'
  | 'semi-freestanding'
  | 'non-freestanding'
  | 'trekking-pole'
  | 'a-frame'
  | 'tunnel'
  | 'dome'
  | 'pyramid';

export type ConnectorType =
  | 'usb-c'
  | 'usb-a'
  | 'micro-usb'
  | 'usb-mini'
  | 'lightning'
  | 'proprietary';

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for weight with value and unit
 */
export const WeightSchema = z.object({
  value: z.number().positive(),
  unit: z.enum(['g', 'kg', 'oz', 'lb']),
});

/**
 * Schema for price with value and currency
 * Note: Price parsing is handled separately in parsePrice module
 */
export const PriceSchema = z.object({
  value: z.number().positive(),
  currency: z.string().min(1).max(3),
});

/**
 * Schema for dimensions (L x W x H)
 */
export const DimensionsSchema = z.object({
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  unit: z.enum(['cm', 'in', 'mm']),
});

/**
 * Schema for capacity/volume
 */
export const CapacitySchema = z.object({
  value: z.number().positive(),
  unit: z.enum(['L', 'ml', 'cu in']),
});

/**
 * Schema for temperature rating (sleeping bags, etc.)
 */
export const TemperatureRatingSchema = z.object({
  value: z.number(),
  unit: z.enum(['C', 'F']),
});

/**
 * Complete Gear Specifications Schema
 * Includes all common and category-specific fields
 */
export const GearSpecsSchema = z.object({
  // Basic identification
  name: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),

  // Core specifications
  weight: WeightSchema.optional(),
  price: PriceSchema.optional(),
  dimensions: DimensionsSchema.optional(),
  capacity: CapacitySchema.optional(),
  temperatureRating: TemperatureRatingSchema.optional(),

  // Materials and features
  materials: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),

  // Descriptive content
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),

  // Metadata
  scrapedAt: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1).optional(),

  // Category-specific: Tents
  capacityPersons: z.number().int().positive().optional(),
  seasonRating: z
    .enum(['3-season', '3.5-season', '4-season', 'summer', 'winter'])
    .optional(),
  constructionType: z
    .enum([
      'freestanding',
      'semi-freestanding',
      'non-freestanding',
      'trekking-pole',
      'a-frame',
      'tunnel',
      'dome',
      'pyramid',
    ])
    .optional(),

  // Category-specific: Backpacks
  frameType: z.enum(['internal', 'external', 'frameless', 'removable']).optional(),

  // Category-specific: Stoves
  fuelType: z
    .enum(['canister', 'alcohol', 'wood', 'solid', 'multi-fuel', 'white-gas', 'propane'])
    .optional(),

  // Category-specific: Electronics
  connectorType: z
    .enum(['usb-c', 'usb-a', 'micro-usb', 'usb-mini', 'lightning', 'proprietary'])
    .optional(),

  // Size designation
  size: z.string().optional(),
});

export type GearSpecs = z.infer<typeof GearSpecsSchema>;
export type Weight = z.infer<typeof WeightSchema>;
export type Price = z.infer<typeof PriceSchema>;
export type Dimensions = z.infer<typeof DimensionsSchema>;
export type Capacity = z.infer<typeof CapacitySchema>;
export type TemperatureRating = z.infer<typeof TemperatureRatingSchema>;

// =============================================================================
// Material Keywords (DE + EN)
// =============================================================================

const MATERIAL_KEYWORDS = [
  // Fabrics
  'nylon',
  'polyester',
  'ripstop',
  'cordura',
  'dyneema',
  'cuben fiber',
  'silnylon',
  'dcf',
  'x-pac',
  'xpac',
  'spectra',
  'ultra',
  'kevlar',
  'canvas',
  'baumwolle', // cotton (DE)
  'cotton',

  // Waterproof/Weather
  'gore-tex',
  'goretex',
  'pertex',
  'silpoly',
  'pu-coated',
  'pu beschichtet', // PU coated (DE)
  'wasserdicht', // waterproof (DE)
  'waterproof',
  'dwr',
  'event',

  // Insulation
  'down',
  'daunen', // down (DE)
  'primaloft',
  'synthetic',
  'synthetik', // synthetic (DE)
  'climashield',
  'apex',
  'thinsulate',

  // Metals
  'aluminum',
  'aluminium',
  'titanium',
  'titan', // titanium (DE)
  'carbon fiber',
  'carbon',
  'kohlefaser', // carbon fiber (DE)
  'steel',
  'stahl', // steel (DE)
  'edelstahl', // stainless steel (DE)
  'stainless',

  // Plastics/Composites
  'hdpe',
  'ldpe',
  'abs',
  'polycarbonate',
  'polycarbonat',
  'delrin',
  'eva',
  'foam',
  'schaumstoff', // foam (DE)
  'closed-cell',
  'geschlossenzellig', // closed-cell (DE)

  // Natural
  'leather',
  'leder', // leather (DE)
  'merino',
  'wool',
  'wolle', // wool (DE)
  'silk',
  'seide', // silk (DE)
  'hemp',
  'hanf', // hemp (DE)
];

// =============================================================================
// Weight Extraction Patterns (DE + EN)
// =============================================================================

const WEIGHT_PATTERNS: RegExp[] = [
  // Standard format: "weight: 12.7 oz" or "Weight 288g" or "Gewicht: 820 g"
  /(?:weight|wt\.?|gewicht)[:\s]*(\d+(?:[.,]\d+)?)\s*(g|kg|oz|lbs?|ounces?|grams?|kilograms?|gramm?)/i,

  // Format with newline/markdown: "Weight\n12.7 oz"
  /(?:weight|wt\.?|gewicht)\s*[)\]\n\s]+(\d+(?:[.,]\d+)?)\s*(g|kg|oz|lbs?|ounces?|grams?|kilograms?|gramm?)/i,

  // Standalone weight value in parentheses: "(288g)" or "(820 g)"
  /\((\d+(?:[.,]\d+)?)\s*(g|kg|oz|lbs?|ounces?|grams?|kilograms?|gramm?)\)/i,

  // Weight with parentheses conversion: "10.2 oz (288g)" or "288g (10.2 oz)"
  /(\d+(?:[.,]\d+)?)\s*(oz|lbs?|ounces?)\s*\((\d+(?:[.,]\d+)?)\s*(g|grams?|gramm?)\)/i,
  /(\d+(?:[.,]\d+)?)\s*(g|grams?|gramm?)\s*\((\d+(?:[.,]\d+)?)\s*(oz|ounces?)\)/i,

  // Abbreviated with colon: "Wt: 820g"
  /(?:wt|gew)[.:]?\s*(\d+(?:[.,]\d+)?)\s*(g|kg|oz|lb)/i,

  // German format with slash: "Gewicht / Weight: 820g"
  /(?:gewicht\s*\/?\s*weight|weight\s*\/?\s*gewicht)[:\s]*(\d+(?:[.,]\d+)?)\s*(g|kg|oz|lb|gramm?)/i,

  // Spec table format: "| Weight | 820g |" or "| Gewicht | 820 g |"
  /\|\s*(?:weight|gewicht)\s*\|\s*(\d+(?:[.,]\d+)?)\s*(g|kg|oz|lb|gramm?)\s*\|/i,

  // List format: "- Weight: 820g" or "* Gewicht: 820 g"
  /[-*]\s*(?:weight|gewicht)[:\s]*(\d+(?:[.,]\d+)?)\s*(g|kg|oz|lb|gramm?)/i,

  // ca./approx. format: "ca. 820g" or "approx. 288g"
  /(?:ca\.|approx\.?|etwa|ungefähr)\s*(\d+(?:[.,]\d+)?)\s*(g|kg|oz|lb|gramm?)/i,
];

// =============================================================================
// Dimension Extraction Patterns (DE + EN)
// =============================================================================

const DIMENSION_PATTERNS: RegExp[] = [
  // Standard format: "dimensions: 30 x 20 x 10 cm" or "Maße: 30 x 20 x 10 cm"
  /(?:dimensions?|size|maße|abmessungen?|größe)[:\s]*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:[x×]\s*(\d+(?:[.,]\d+)?))?\s*(cm|in|mm|inch|zoll)?/i,

  // Packed/Storage dimensions: "packed size: 30 x 10 cm" or "Packmaß: 30 x 10 cm"
  /(?:packed\s*size|pack\s*size|packmaß|packgröße)[:\s]*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:[x×]\s*(\d+(?:[.,]\d+)?))?\s*(cm|in|mm)?/i,

  // L x W x H format: "L30 x W20 x H10 cm" or with German letters
  /[LlBb]?\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*[WwTt]?\s*(\d+(?:[.,]\d+)?)\s*[x×]?\s*[HhHöh]?\s*(\d+(?:[.,]\d+)?)?\s*(cm|in|mm)?/i,

  // Diameter format: "diameter: 10 cm" or "Durchmesser: 10 cm"
  /(?:diameter|durchmesser|dm)[:\s]*(\d+(?:[.,]\d+)?)\s*(cm|in|mm)?/i,
];

// =============================================================================
// Capacity Extraction Patterns (DE + EN)
// =============================================================================

const CAPACITY_PATTERNS: RegExp[] = [
  // Standard format: "capacity: 65L" or "Volumen: 65 L"
  /(?:capacity|volume|volumen|fassungsvermögen)[:\s]*(\d+(?:[.,]\d+)?)\s*(L|liters?|liter|ml|cu\.?\s*in)/i,

  // Backpack size: "65L backpack" or "65 Liter Rucksack"
  /(\d+(?:[.,]\d+)?)\s*(L|liter|liters?)\s*(?:backpack|rucksack|pack)/i,

  // Water capacity: "1L water capacity" or "Wasserbehälter: 1L"
  /(?:water\s*)?(?:capacity|fassungsvermögen|wasserbehälter)[:\s]*(\d+(?:[.,]\d+)?)\s*(L|ml|liters?|liter)/i,
];

// =============================================================================
// Temperature Rating Patterns (DE + EN)
// =============================================================================

const TEMPERATURE_PATTERNS: RegExp[] = [
  // Comfort/Limit rating: "comfort: -5°C" or "Komfort: -5 °C"
  /(?:comfort|komfort|limit|grenzbereich|rated?|temperatur)[:\s]*(-?\d+)\s*°?\s*([CF])/i,

  // EN rating format: "EN comfort -5°C" or "EN lower limit -10°C"
  /EN\s*(?:comfort|lower\s*limit|grenz)[:\s]*(-?\d+)\s*°?\s*([CF])/i,

  // Temperature range: "rated to -5°C" or "bis -5°C"
  /(?:rated\s*to|bis|down\s*to)[:\s]*(-?\d+)\s*°?\s*([CF])/i,

  // Season with temp: "3-season (-5°C)"
  /(?:3|4|summer|winter)[-\s]?season\s*\((-?\d+)\s*°?\s*([CF])\)/i,
];

// =============================================================================
// Person Capacity Patterns (DE + EN)
// =============================================================================

const PERSON_CAPACITY_PATTERNS: RegExp[] = [
  // Standard: "2-person" or "2P" or "2-Personen"
  /(\d+)\s*[-–]?\s*(?:person|man|p(?:ers)?|personen|plätze|sleeps)/i,

  // Descriptive: "sleeps 2" or "für 2 Personen"
  /(?:sleeps|for|für)\s*(\d+)\s*(?:person|people|personen)?/i,

  // Tent designation: "2P tent" or "3-Mann Zelt"
  /(\d+)[-\s]?(?:p|person|mann)\s*(?:tent|zelt)/i,
];

// =============================================================================
// Season Rating Patterns (DE + EN)
// =============================================================================

const SEASON_PATTERNS: RegExp[] = [
  // Standard format: "3-season" or "4-season" or "3-Jahreszeiten"
  /(?:season|jahreszeit(?:en)?)[:\s]*(3\.?5|3|4|summer|winter|sommer)[-\s]?(?:season|jahreszeit(?:en)?)?/i,

  // Prefix format: "3-season tent" or "4-Jahreszeiten Zelt"
  /(3\.?5|3|4)[-\s]?(?:season|jahreszeit(?:en)?)/i,

  // Summer/Winter: "summer tent" or "Winterschlafsack"
  /\b(summer|winter|sommer)[-\s]?(?:tent|sleeping\s*bag|zelt|schlafsack)\b/i,
];

// =============================================================================
// Frame Type Patterns (DE + EN)
// =============================================================================

const FRAME_TYPE_PATTERNS: Array<{ pattern: RegExp; value: FrameType }> = [
  { pattern: /\binternal\s*frame\b|\binnengestell\b|\binnenrahmen\b/i, value: 'internal' },
  { pattern: /\bexternal\s*frame\b|\baußengestell\b|\baußenrahmen\b/i, value: 'external' },
  { pattern: /\bframeless\b|\brahmenlos\b|\bohne\s*gestell\b/i, value: 'frameless' },
  {
    pattern: /\bremovable\s*frame\b|\babnehmbares?\s*gestell\b|\babnehmbar(?:er|es)?\s*rahmen\b/i,
    value: 'removable',
  },
];

// =============================================================================
// Fuel Type Patterns (DE + EN)
// =============================================================================

const FUEL_TYPE_PATTERNS: Array<{ pattern: RegExp; value: FuelType }> = [
  { pattern: /canister\s*(?:stove|fuel|gas)|gaskartusche|kartusche/i, value: 'canister' },
  { pattern: /alcohol\s*(?:stove|burner|fuel)|spiritus(?:kocher|brenner)?/i, value: 'alcohol' },
  { pattern: /wood\s*(?:burning|stove)|holz(?:kocher|ofen)/i, value: 'wood' },
  { pattern: /esbit|solid\s*fuel|festbrennstoff|trockenbrennstoff/i, value: 'solid' },
  { pattern: /multi[-\s]?fuel|mehrstoff(?:kocher)?/i, value: 'multi-fuel' },
  { pattern: /white\s*gas|reinbenzin|waschbenzin/i, value: 'white-gas' },
  { pattern: /propane|propan/i, value: 'propane' },
];

// =============================================================================
// Construction Type Patterns (DE + EN)
// =============================================================================

const CONSTRUCTION_TYPE_PATTERNS: Array<{ pattern: RegExp; value: ConstructionType }> = [
  { pattern: /semi[-\s]?freestanding|halb\s*freistehend/i, value: 'semi-freestanding' },
  { pattern: /non[-\s]?freestanding|nicht\s*freistehend/i, value: 'non-freestanding' },
  { pattern: /\bfreestanding\b|\bfreistehend\b/i, value: 'freestanding' },
  { pattern: /trekking[-\s]?pole|trekkingstock[-\s]?zelt/i, value: 'trekking-pole' },
  { pattern: /\ba[-\s]?frame\b/i, value: 'a-frame' },
  { pattern: /\btunnel\b|\btunnelzelt\b/i, value: 'tunnel' },
  { pattern: /\bdome\b|\bkuppel(?:zelt)?\b/i, value: 'dome' },
  { pattern: /\bpyramid\b|\bmid\b|\bpyramidenzelt\b|\btipi\b/i, value: 'pyramid' },
];

// =============================================================================
// Connector Type Patterns (DE + EN)
// =============================================================================

const CONNECTOR_TYPE_PATTERNS: Array<{ pattern: RegExp; value: ConnectorType }> = [
  { pattern: /usb[-\s]?c|type[-\s]?c|usb\s*typ\s*c/i, value: 'usb-c' },
  { pattern: /usb[-\s]?a|type[-\s]?a|usb\s*typ\s*a/i, value: 'usb-a' },
  { pattern: /micro[-\s]?usb/i, value: 'micro-usb' },
  { pattern: /mini[-\s]?usb/i, value: 'usb-mini' },
  { pattern: /lightning/i, value: 'lightning' },
  { pattern: /proprietary|proprietär|herstellerspezifisch/i, value: 'proprietary' },
];

// =============================================================================
// Size Patterns (DE + EN)
// =============================================================================

const SIZE_PATTERNS: RegExp[] = [
  // Standard sizes: "size: M" or "Größe: L"
  /(?:size|größe)[:\s]*((?:X{1,3})?[SML]|regular|long|wide|short|klein|mittel|groß|lang|kurz)/i,

  // Abbreviated: "sz M" or "Gr. L"
  /(?:sz|gr\.?)[:\s]*((?:X{1,3})?[SML])/i,
];

// =============================================================================
// Main Extraction Function
// =============================================================================

/**
 * Extract gear specifications from text content
 *
 * @param content - Raw text content (markdown, HTML stripped, etc.)
 * @param sourceUrl - Optional source URL for reference
 * @returns GearSpecs object or null if no specs could be extracted
 */
export function extractGearSpecs(content: string, sourceUrl?: string): GearSpecs | null {
  const specs: GearSpecs = {
    sourceUrl,
    scrapedAt: new Date().toISOString(),
    confidence: 0,
  };

  let fieldsFound = 0;
  const totalPossibleFields = 15; // Update when adding new extractors

  // Normalize decimal separators for European format (1.234,56 -> 1234.56)
  const normalizeNumber = (str: string): number => {
    // Remove thousand separators and convert decimal comma to point
    const normalized = str.replace(/\.(?=\d{3})/g, '').replace(',', '.');
    return parseFloat(normalized);
  };

  // -----------------------------------------
  // Extract Weight
  // -----------------------------------------
  for (const pattern of WEIGHT_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      // Handle conversion format: "10.2 oz (288g)"
      if (match[3] && match[4]) {
        // Prefer grams if both units present
        const unit4 = normalizeWeightUnit(match[4]);
        if (unit4 === 'g') {
          specs.weight = { value: normalizeNumber(match[3]), unit: 'g' };
        } else {
          specs.weight = { value: normalizeNumber(match[1]!), unit: normalizeWeightUnit(match[2]!) };
        }
      } else {
        specs.weight = {
          value: normalizeNumber(match[1]!),
          unit: normalizeWeightUnit(match[2]!),
        };
      }
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Dimensions
  // -----------------------------------------
  for (const pattern of DIMENSION_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      specs.dimensions = {
        length: normalizeNumber(match[1]!),
        width: match[2] ? normalizeNumber(match[2]) : undefined,
        height: match[3] ? normalizeNumber(match[3]) : undefined,
        unit: match[4] ? normalizeDimensionUnit(match[4]) : 'cm',
      };
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Capacity/Volume
  // -----------------------------------------
  for (const pattern of CAPACITY_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      specs.capacity = {
        value: normalizeNumber(match[1]!),
        unit: normalizeVolumeUnit(match[2]!),
      };
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Temperature Rating
  // -----------------------------------------
  for (const pattern of TEMPERATURE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      specs.temperatureRating = {
        value: parseInt(match[1]!, 10),
        unit: match[2]!.toUpperCase() as GearTemperatureUnit,
      };
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Materials
  // -----------------------------------------
  const contentLower = content.toLowerCase();
  const foundMaterials: string[] = [];

  for (const material of MATERIAL_KEYWORDS) {
    // Use word boundary check to avoid partial matches
    const regex = new RegExp(`\\b${material.replace(/[-/]/g, '[-/]?')}\\b`, 'i');
    if (regex.test(contentLower)) {
      // Normalize to English term where applicable
      let normalizedMaterial = material.toLowerCase();

      // Map German terms to English
      const germanToEnglish: Record<string, string> = {
        daunen: 'down',
        titan: 'titanium',
        aluminium: 'aluminum',
        kohlefaser: 'carbon fiber',
        stahl: 'steel',
        edelstahl: 'stainless steel',
        leder: 'leather',
        wolle: 'wool',
        seide: 'silk',
        hanf: 'hemp',
        baumwolle: 'cotton',
        schaumstoff: 'foam',
        synthetik: 'synthetic',
        wasserdicht: 'waterproof',
        geschlossenzellig: 'closed-cell',
        polycarbonat: 'polycarbonate',
      };

      if (germanToEnglish[normalizedMaterial]) {
        normalizedMaterial = germanToEnglish[normalizedMaterial]!;
      }

      if (!foundMaterials.includes(normalizedMaterial)) {
        foundMaterials.push(normalizedMaterial);
      }
    }
  }

  if (foundMaterials.length > 0) {
    specs.materials = foundMaterials;
    fieldsFound++;
  }

  // -----------------------------------------
  // Extract Brand
  // -----------------------------------------
  const brandPatterns = [
    /(?:brand|marke|manufacturer|hersteller|made\s*by)[:\s]*([A-Z][a-zA-Z\s&]+?)(?:\s*[-–|]|\s*$)/,
    /(?:by|von)\s+([A-Z][a-zA-Z\s&]{2,20})\b/,
  ];

  for (const pattern of brandPatterns) {
    const match = content.match(pattern);
    if (match) {
      specs.brand = match[1]!.trim();
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Person Capacity
  // -----------------------------------------
  for (const pattern of PERSON_CAPACITY_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const persons = parseInt(match[1]!, 10);
      if (persons >= 1 && persons <= 20) {
        specs.capacityPersons = persons;
        fieldsFound++;
      }
      break;
    }
  }

  // -----------------------------------------
  // Extract Season Rating
  // -----------------------------------------
  for (const pattern of SEASON_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const rating = match[1]!.toLowerCase();
      if (rating === '3') {
        specs.seasonRating = '3-season';
      } else if (rating === '3.5' || rating === '35') {
        specs.seasonRating = '3.5-season';
      } else if (rating === '4') {
        specs.seasonRating = '4-season';
      } else if (rating === 'summer' || rating === 'sommer') {
        specs.seasonRating = 'summer';
      } else if (rating === 'winter') {
        specs.seasonRating = 'winter';
      }
      if (specs.seasonRating) {
        fieldsFound++;
      }
      break;
    }
  }

  // -----------------------------------------
  // Extract Frame Type (Backpacks)
  // -----------------------------------------
  for (const { pattern, value } of FRAME_TYPE_PATTERNS) {
    if (pattern.test(content)) {
      specs.frameType = value;
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Fuel Type (Stoves)
  // -----------------------------------------
  for (const { pattern, value } of FUEL_TYPE_PATTERNS) {
    if (pattern.test(content)) {
      specs.fuelType = value;
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Construction Type (Tents)
  // -----------------------------------------
  for (const { pattern, value } of CONSTRUCTION_TYPE_PATTERNS) {
    if (pattern.test(content)) {
      specs.constructionType = value;
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Connector Type (Electronics)
  // -----------------------------------------
  for (const { pattern, value } of CONNECTOR_TYPE_PATTERNS) {
    if (pattern.test(content)) {
      specs.connectorType = value;
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Extract Size
  // -----------------------------------------
  for (const pattern of SIZE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      let size = match[1]!.toUpperCase();
      // Normalize German size terms
      const sizeNormalization: Record<string, string> = {
        KLEIN: 'S',
        MITTEL: 'M',
        'GROSS': 'L',
        LANG: 'LONG',
        KURZ: 'SHORT',
      };
      if (sizeNormalization[size]) {
        size = sizeNormalization[size]!;
      }
      specs.size = size;
      fieldsFound++;
      break;
    }
  }

  // -----------------------------------------
  // Calculate Confidence
  // -----------------------------------------
  specs.confidence = Math.min(fieldsFound / totalPossibleFields, 1);

  // Return null if no meaningful specs were extracted
  return fieldsFound > 0 ? specs : null;
}

// =============================================================================
// Merge Function
// =============================================================================

/**
 * Merge gear specifications from multiple sources
 * Prioritizes higher confidence values and merges arrays
 *
 * @param specsList - Array of GearSpecs objects to merge
 * @returns Merged GearSpecs object
 */
export function mergeGearSpecs(specsList: GearSpecs[]): GearSpecs {
  if (specsList.length === 0) {
    return {
      scrapedAt: new Date().toISOString(),
      confidence: 0,
    };
  }

  if (specsList.length === 1) {
    return specsList[0]!;
  }

  const merged: GearSpecs = {
    scrapedAt: new Date().toISOString(),
    confidence: 0,
  };

  // Sort by confidence descending
  const sorted = [...specsList].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  // Take the highest confidence value for each simple field
  for (const specs of sorted) {
    // Basic identification
    if (specs.name && !merged.name) merged.name = specs.name;
    if (specs.brand && !merged.brand) merged.brand = specs.brand;
    if (specs.category && !merged.category) merged.category = specs.category;

    // Core specifications
    if (specs.weight && !merged.weight) merged.weight = specs.weight;
    if (specs.price && !merged.price) merged.price = specs.price;
    if (specs.dimensions && !merged.dimensions) merged.dimensions = specs.dimensions;
    if (specs.capacity && !merged.capacity) merged.capacity = specs.capacity;
    if (specs.temperatureRating && !merged.temperatureRating) {
      merged.temperatureRating = specs.temperatureRating;
    }

    // Descriptive content
    if (specs.description && !merged.description) merged.description = specs.description;
    if (specs.imageUrl && !merged.imageUrl) merged.imageUrl = specs.imageUrl;
    if (specs.sourceUrl && !merged.sourceUrl) merged.sourceUrl = specs.sourceUrl;

    // Category-specific specs
    if (specs.capacityPersons && !merged.capacityPersons) {
      merged.capacityPersons = specs.capacityPersons;
    }
    if (specs.seasonRating && !merged.seasonRating) merged.seasonRating = specs.seasonRating;
    if (specs.constructionType && !merged.constructionType) {
      merged.constructionType = specs.constructionType;
    }
    if (specs.frameType && !merged.frameType) merged.frameType = specs.frameType;
    if (specs.fuelType && !merged.fuelType) merged.fuelType = specs.fuelType;
    if (specs.connectorType && !merged.connectorType) merged.connectorType = specs.connectorType;
    if (specs.size && !merged.size) merged.size = specs.size;

    // Merge materials array (deduplicated)
    if (specs.materials && specs.materials.length > 0) {
      const materialsSet = new Set([...(merged.materials ?? []), ...specs.materials]);
      merged.materials = Array.from(materialsSet);
    }

    // Merge features array (deduplicated)
    if (specs.features && specs.features.length > 0) {
      const featuresSet = new Set([...(merged.features ?? []), ...specs.features]);
      merged.features = Array.from(featuresSet);
    }
  }

  // Calculate overall confidence based on populated fields
  let fieldsPopulated = 0;
  const totalFields = 15;

  if (merged.weight) fieldsPopulated++;
  if (merged.price) fieldsPopulated++;
  if (merged.dimensions) fieldsPopulated++;
  if (merged.capacity) fieldsPopulated++;
  if (merged.temperatureRating) fieldsPopulated++;
  if (merged.materials?.length) fieldsPopulated++;
  if (merged.brand) fieldsPopulated++;
  if (merged.capacityPersons) fieldsPopulated++;
  if (merged.seasonRating) fieldsPopulated++;
  if (merged.frameType) fieldsPopulated++;
  if (merged.fuelType) fieldsPopulated++;
  if (merged.connectorType) fieldsPopulated++;
  if (merged.constructionType) fieldsPopulated++;
  if (merged.size) fieldsPopulated++;
  if (merged.features?.length) fieldsPopulated++;

  merged.confidence = fieldsPopulated / totalFields;

  return merged;
}

// =============================================================================
// Utility Exports for External Use
// =============================================================================

export {
  MATERIAL_KEYWORDS,
  WEIGHT_PATTERNS,
  DIMENSION_PATTERNS,
  CAPACITY_PATTERNS,
  TEMPERATURE_PATTERNS,
};
