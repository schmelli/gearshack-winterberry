/**
 * Normalizes brand and name for gear item matching.
 *
 * This function creates a consistent string key from brand and name values,
 * used to match gear items between shared loadouts and user inventory.
 * The normalization ensures case-insensitive, whitespace-tolerant matching.
 *
 * @param brand - The brand name (or null)
 * @param name - The item name
 * @returns A normalized string in the format "brand|name" (both lowercase, trimmed)
 *
 * @example
 * normalizeForMatch('Osprey', 'Atmos AG 65') // => 'osprey|atmos ag 65'
 * normalizeForMatch(null, 'Tent Stakes') // => '|tent stakes'
 * normalizeForMatch('  REI  ', '  Flash 22  ') // => 'rei|flash 22'
 */
export const normalizeForMatch = (brand: string | null, name: string): string =>
  `${(brand || '').toLowerCase().trim()}|${name.toLowerCase().trim()}`;
