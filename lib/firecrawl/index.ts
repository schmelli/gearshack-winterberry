/**
 * Firecrawl Integration Module
 *
 * Web scraping and gear specification extraction utilities
 * for the Gearshack application.
 */

// Gear specifications extraction
export {
  // Schemas
  GearSpecsSchema,
  WeightSchema,
  PriceSchema,
  DimensionsSchema,
  CapacitySchema,
  TemperatureRatingSchema,
  // Types
  type GearSpecs,
  type Weight,
  type Price,
  type Dimensions,
  type Capacity,
  type TemperatureRating,
  type GearWeightUnit,
  type GearVolumeUnit,
  type GearDimensionUnit,
  type GearTemperatureUnit,
  type SeasonRating,
  type FrameType,
  type FuelType,
  type ConstructionType,
  type ConnectorType,
  // Functions
  extractGearSpecs,
  mergeGearSpecs,
  normalizeWeightUnit,
  normalizeVolumeUnit,
  normalizeDimensionUnit,
  // Pattern exports for testing/extension
  MATERIAL_KEYWORDS,
  WEIGHT_PATTERNS,
  DIMENSION_PATTERNS,
  CAPACITY_PATTERNS,
  TEMPERATURE_PATTERNS,
} from './gear-specs';
