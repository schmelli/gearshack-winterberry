/**
 * Category Suggestion Logic
 *
 * Provides intelligent category suggestions based on product name and description
 * using keyword matching. Used as fallback when no catalog match is found.
 *
 * Feature: URL-basierter Produktimport
 * Task: T007 - Kategorie-Mapping Logik erstellen
 */

import { createClient } from '@/lib/supabase/client';
import type { Category } from '@/types/category';
import type { Database } from '@/types/database';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a category suggestion operation
 */
export interface CategorySuggestion {
  /** UUID of the matched category (level 3 product type) */
  categoryId: string;
  /** Localized path: "Bekleidung > Jacken > Isolationsjacken" */
  categoryPath: string;
  /** Confidence score 0-1 based on keyword match ratio */
  confidence: number;
  /** Keywords that matched from the input text */
  matchedKeywords: string[];
}

/**
 * Category keyword mapping entry
 */
interface KeywordMapping {
  /** Slug identifier matching the categories table */
  categorySlug: string;
  /** Keywords to match (DE + EN, lowercase) */
  keywords: string[];
}

// ============================================================================
// Keyword Mappings (DE + EN)
// ============================================================================

/**
 * Comprehensive keyword mappings for category detection.
 * Covers all major gear categories with German and English terms.
 *
 * Structure: Maps to product type (level 3) slugs where possible,
 * falls back to subcategory (level 2) for generic matches.
 */
const CATEGORY_KEYWORDS: Record<string, KeywordMapping> = {
  // -------------------------------------------------------------------------
  // Clothing > Outerwear
  // -------------------------------------------------------------------------
  'rain-jackets': {
    categorySlug: 'rain_jackets',
    keywords: [
      'rain jacket', 'regenjacke', 'rain shell', 'waterproof jacket',
      'wasserdichte jacke', 'hardshell', 'gore-tex jacket', 'gtx jacket',
      'regenmantel', 'rain coat', 'storm jacket'
    ]
  },
  'insulated-jackets': {
    categorySlug: 'insulated_jackets',
    keywords: [
      'insulated jacket', 'isolationsjacke', 'down jacket', 'daunenjacke',
      'puffy', 'puffer jacket', 'primaloft jacket', 'synthetic jacket',
      'wärmejacke', 'winter jacket', 'winterjacke', 'daunen'
    ]
  },
  'softshell-jackets': {
    categorySlug: 'softshell_jackets',
    keywords: [
      'softshell', 'soft shell', 'softshelljacke', 'stretch jacket'
    ]
  },
  'wind-jackets': {
    categorySlug: 'wind_jackets',
    keywords: [
      'wind jacket', 'windjacke', 'windbreaker', 'windshirt',
      'wind shell', 'pertex', 'wind stopper'
    ]
  },
  'vests': {
    categorySlug: 'vests',
    keywords: [
      'vest', 'weste', 'gilet', 'down vest', 'daunenweste',
      'insulated vest', 'isolationsweste'
    ]
  },
  'ponchos': {
    categorySlug: 'ponchos',
    keywords: ['poncho', 'rain poncho', 'regenponcho', 'regencape']
  },
  'hiking-jackets': {
    categorySlug: 'hiking_jackets',
    keywords: [
      'hiking jacket', 'wanderjacke', 'trekking jacket', 'outdoor jacket',
      'outdoorjacke', 'trekkingsjacke'
    ]
  },

  // -------------------------------------------------------------------------
  // Clothing > Mid-Layers
  // -------------------------------------------------------------------------
  'fleece-jackets': {
    categorySlug: 'fleece_jackets',
    keywords: [
      'fleece', 'fleecejacke', 'fleece jacket', 'polartec',
      'thermal pro', 'grid fleece', 'micro fleece'
    ]
  },
  'insulated-mid-layers': {
    categorySlug: 'insulated_mid_layers',
    keywords: [
      'insulated midlayer', 'isolierte zwischenschicht', 'active insulation',
      'hybrid jacket', 'alpha direct', 'octa'
    ]
  },
  'sweaters-hoodies': {
    categorySlug: 'sweaters_hoodies',
    keywords: [
      'hoodie', 'sweater', 'pullover', 'kapuzenpulli', 'hoody',
      'sweatshirt', 'r1 hoody', 'better sweater'
    ]
  },
  'long-sleeve-shirts': {
    categorySlug: 'long_sleeve_shirts',
    keywords: [
      'long sleeve', 'langarm', 'langarmshirt', 'longsleeve', 'merino shirt'
    ]
  },
  'sun-shirts': {
    categorySlug: 'sun_shirts',
    keywords: [
      'sun shirt', 'sonnenschutzshirt', 'upf shirt', 'sun hoody',
      'sun protection', 'tropic comfort'
    ]
  },

  // -------------------------------------------------------------------------
  // Clothing > Base Layers
  // -------------------------------------------------------------------------
  'short-sleeve-base-layers': {
    categorySlug: 'short_sleeve_base_layers',
    keywords: [
      'base layer short', 'kurzarm baselayer', 'short sleeve base',
      't-shirt merino', 'merino tee', 'base tee'
    ]
  },
  'long-sleeve-base-layers': {
    categorySlug: 'long_sleeve_base_layers',
    keywords: [
      'base layer long', 'langarm baselayer', 'long sleeve base',
      'merino baselayer', 'thermal underwear top', 'merino 150',
      'merino 200', 'merino 250', 'capilene'
    ]
  },
  'base-layer-bottoms': {
    categorySlug: 'base_layer_bottoms',
    keywords: [
      'base layer bottom', 'unterhose', 'thermal bottom', 'long johns',
      'merino leggings', 'baselayer hose', 'thermo unterhose'
    ]
  },

  // -------------------------------------------------------------------------
  // Clothing > Bottoms
  // -------------------------------------------------------------------------
  'hiking-pants': {
    categorySlug: 'hiking_pants',
    keywords: [
      'hiking pants', 'wanderhose', 'trekking pants', 'outdoor pants',
      'trekkingshose', 'walking pants', 'bergsteighose', 'hiking trousers'
    ]
  },
  'hiking-shorts': {
    categorySlug: 'hiking_shorts',
    keywords: [
      'hiking shorts', 'wandershorts', 'outdoor shorts', 'trekking shorts',
      'running shorts', 'active shorts'
    ]
  },
  'convertible-pants': {
    categorySlug: 'convertible_pants',
    keywords: [
      'convertible pants', 'zip-off', 'zipoff', 'abzippbar',
      'zip off hose', 'convertible hose'
    ]
  },
  'rain-pants': {
    categorySlug: 'rain_pants',
    keywords: [
      'rain pants', 'regenhose', 'waterproof pants', 'rain trousers',
      'hardshell pants', 'storm pants'
    ]
  },
  'insulated-pants': {
    categorySlug: 'insulated_pants',
    keywords: [
      'insulated pants', 'isolationshose', 'down pants', 'daunenhose',
      'primaloft pants', 'winter pants', 'thermohose'
    ]
  },

  // -------------------------------------------------------------------------
  // Clothing > Headwear
  // -------------------------------------------------------------------------
  'hats': {
    categorySlug: 'hats',
    keywords: ['hat', 'hut', 'sun hat', 'sonnenhut', 'bucket hat', 'boonie']
  },
  'caps': {
    categorySlug: 'caps',
    keywords: ['cap', 'kappe', 'baseball cap', 'trucker cap', 'running cap']
  },
  'beanies': {
    categorySlug: 'beanies',
    keywords: ['beanie', 'mütze', 'wool hat', 'wollmütze', 'skull cap', 'toque']
  },
  'headbands': {
    categorySlug: 'headbands',
    keywords: ['headband', 'stirnband', 'ear warmer', 'ohrenwärmer']
  },
  'neck-gaiters': {
    categorySlug: 'neck_gaiters_buffs',
    keywords: [
      'neck gaiter', 'halstuch', 'buff', 'neck tube', 'schlauchschal',
      'multifunktionstuch', 'bandana'
    ]
  },

  // -------------------------------------------------------------------------
  // Clothing > Handwear
  // -------------------------------------------------------------------------
  'gloves': {
    categorySlug: 'gloves',
    keywords: [
      'gloves', 'handschuhe', 'hiking gloves', 'running gloves',
      'touchscreen gloves', 'liner gloves'
    ]
  },
  'mittens': {
    categorySlug: 'mittens',
    keywords: ['mittens', 'fäustlinge', 'down mittens', 'daunenfäustlinge']
  },

  // -------------------------------------------------------------------------
  // Clothing > Socks
  // -------------------------------------------------------------------------
  'hiking-socks': {
    categorySlug: 'hiking_socks',
    keywords: [
      'hiking socks', 'wandersocken', 'trekking socks', 'merino socks',
      'wool socks', 'smartwool', 'darn tough'
    ]
  },
  'liner-socks': {
    categorySlug: 'liner_socks',
    keywords: ['liner socks', 'liner-socken', 'sock liner', 'inlay socks']
  },

  // -------------------------------------------------------------------------
  // Clothing > Footwear
  // -------------------------------------------------------------------------
  'hiking-boots': {
    categorySlug: 'hiking_boots',
    keywords: [
      'hiking boots', 'wanderstiefel', 'bergstiefel', 'trekking boots',
      'backpacking boots', 'mountaineering boots'
    ]
  },
  'hiking-shoes': {
    categorySlug: 'hiking_shoes',
    keywords: [
      'hiking shoes', 'wanderschuhe', 'approach shoes', 'zustiegsschuhe',
      'trekking shoes', 'light hikers'
    ]
  },
  'trail-running-shoes': {
    categorySlug: 'trail_running_shoes',
    keywords: [
      'trail running', 'trailrunning', 'trail runner', 'trail shoes',
      'trailschuhe', 'speedgoat', 'ultra', 'salomon'
    ]
  },
  'camp-shoes': {
    categorySlug: 'camp_shoes_sandals',
    keywords: [
      'camp shoes', 'campingschuhe', 'camp sandals', 'sandalen',
      'hut shoes', 'hüttenschuhe', 'flip flops', 'crocs'
    ]
  },
  'gaiters': {
    categorySlug: 'gaiters',
    keywords: ['gaiters', 'gamaschen', 'leg gaiters', 'trail gaiters']
  },

  // -------------------------------------------------------------------------
  // Packs > Backpacks
  // -------------------------------------------------------------------------
  'ultralight-packs': {
    categorySlug: 'ultralight_packs',
    keywords: [
      'ultralight pack', 'ul rucksack', 'frameless pack', 'ultralight backpack',
      'dcf pack', 'cuben pack', 'thru-hike pack'
    ]
  },
  'trekking-packs': {
    categorySlug: 'trekking_packs',
    keywords: [
      'trekking pack', 'trekkingrucksack', 'backpacking pack', 'expedition pack',
      'multi-day pack', 'touring pack', '50l', '60l', '70l'
    ]
  },
  'daypacks': {
    categorySlug: 'daypacks',
    keywords: [
      'daypack', 'tagesrucksack', 'day pack', 'day bag', 'summit pack',
      'attack pack', 'lightweight daypack', '20l', '25l', '30l'
    ]
  },
  'running-packs': {
    categorySlug: 'running_packs',
    keywords: [
      'running pack', 'running vest', 'laufweste', 'hydration vest',
      'trail running pack', 'race vest', 'laufrucksack'
    ]
  },

  // -------------------------------------------------------------------------
  // Packs > Accessories
  // -------------------------------------------------------------------------
  'stuff-sacks': {
    categorySlug: 'stuff_sacks',
    keywords: [
      'stuff sack', 'packsack', 'dry bag', 'compression sack', 'ditty bag',
      'organizer bag', 'pack liner', 'dry sack'
    ]
  },
  'hip-belt-pockets': {
    categorySlug: 'hip_belt_pockets',
    keywords: [
      'hip belt pocket', 'hüftgurttasche', 'waist pocket', 'belt pouch',
      'accessory pocket'
    ]
  },

  // -------------------------------------------------------------------------
  // Shelter > Tents
  // -------------------------------------------------------------------------
  'freestanding-tents': {
    categorySlug: 'freestanding_tents',
    keywords: [
      'freestanding tent', 'freistehendes zelt', 'dome tent', 'kuppelzelt',
      'geodesic', 'geodät', 'tunnel tent'
    ]
  },
  'non-freestanding-tents': {
    categorySlug: 'non_freestanding_tents',
    keywords: [
      'non-freestanding', 'trekking pole tent', 'trekkingstockzelt',
      'single wall tent', 'ultralight tent', 'mid', 'pyramid tent'
    ]
  },
  'tents-generic': {
    categorySlug: 'freestanding_tents',
    keywords: [
      'tent', 'zelt', '1p tent', '2p tent', '3p tent', 'backpacking tent',
      'ultraleichtzelt', 'camping tent', 'trekkingzelt'
    ]
  },

  // -------------------------------------------------------------------------
  // Shelter > Tarps
  // -------------------------------------------------------------------------
  'tarps': {
    categorySlug: 'flat_tarps',
    keywords: [
      'tarp', 'plane', 'flat tarp', 'shelter tarp', 'rain tarp',
      'fliegenplane', 'dcf tarp', 'silnylon tarp', 'silpoly'
    ]
  },
  'tarp-tents': {
    categorySlug: 'tarp_tents',
    keywords: [
      'tarp tent', 'tarptent', 'shaped tarp', 'a-frame tarp',
      'mid tarp', 'pyramid tarp'
    ]
  },

  // -------------------------------------------------------------------------
  // Shelter > Bivaque
  // -------------------------------------------------------------------------
  'bivy-sacks': {
    categorySlug: 'bivy_sacks',
    keywords: [
      'bivy', 'biwak', 'bivy sack', 'biwaksack', 'bivouac', 'emergency bivy',
      'survival bivy', 'alpine bivy'
    ]
  },
  'hammocks': {
    categorySlug: 'hammock_camping_systems',
    keywords: [
      'hammock', 'hängematte', 'camping hammock', 'hennessy', 'warbonnet',
      'gathered end', 'bridge hammock'
    ]
  },

  // -------------------------------------------------------------------------
  // Sleeping > Sleeping Bags
  // -------------------------------------------------------------------------
  'down-sleeping-bags': {
    categorySlug: 'down_sleeping_bags',
    keywords: [
      'down sleeping bag', 'daunenschlafsack', 'down bag', 'ultralight sleeping bag',
      '850 fill', '900 fill', 'goose down'
    ]
  },
  'synthetic-sleeping-bags': {
    categorySlug: 'synthetic_sleeping_bags',
    keywords: [
      'synthetic sleeping bag', 'kunstfaser schlafsack', 'primaloft sleeping bag',
      'synthetic bag', 'climashield'
    ]
  },
  'sleeping-bags-generic': {
    categorySlug: 'down_sleeping_bags',
    keywords: [
      'sleeping bag', 'schlafsack', 'mummy bag', 'mumienschlafsack',
      'comfort rating', 'limit rating'
    ]
  },

  // -------------------------------------------------------------------------
  // Sleeping > Quilts
  // -------------------------------------------------------------------------
  'quilts': {
    categorySlug: 'top_quilts',
    keywords: [
      'quilt', 'top quilt', 'topquilt', 'backpacking quilt', 'ultralight quilt',
      'apex quilt', 'down quilt', 'daunenquilt'
    ]
  },
  'underquilts': {
    categorySlug: 'under_quilts',
    keywords: [
      'underquilt', 'under quilt', 'hammock underquilt', 'bottom insulation'
    ]
  },

  // -------------------------------------------------------------------------
  // Sleeping > Pads & Pillows
  // -------------------------------------------------------------------------
  'sleeping-pads': {
    categorySlug: 'inflatable_pads',
    keywords: [
      'sleeping pad', 'isomatte', 'mattress', 'air pad', 'luftmatratze',
      'therm-a-rest', 'neoair', 'xlite', 'xtherm', 'sea to summit'
    ]
  },
  'foam-pads': {
    categorySlug: 'foam_pads',
    keywords: [
      'foam pad', 'schaumstoffmatte', 'z-lite', 'ccf pad', 'closed cell foam',
      'ridge rest', 'evazote', 'thinlight'
    ]
  },
  'pillows': {
    categorySlug: 'camping_pillows',
    keywords: [
      'pillow', 'kissen', 'camping pillow', 'inflatable pillow',
      'travel pillow', 'compressible pillow'
    ]
  },

  // -------------------------------------------------------------------------
  // Cooking > Stoves
  // -------------------------------------------------------------------------
  'canister-stoves': {
    categorySlug: 'canister_stoves',
    keywords: [
      'canister stove', 'gaskocher', 'jetboil', 'msr pocket rocket',
      'upright stove', 'screw-on stove', 'remote canister'
    ]
  },
  'alcohol-stoves': {
    categorySlug: 'alcohol_stoves',
    keywords: [
      'alcohol stove', 'spirituskocher', 'spirit burner', 'meths stove',
      'trangia', 'caldera cone', 'cat food stove'
    ]
  },
  'wood-stoves': {
    categorySlug: 'wood_burning_stoves',
    keywords: [
      'wood stove', 'holzkocher', 'wood burning stove', 'bushbox',
      'firebox', 'solo stove', 'twig stove'
    ]
  },
  'esbit-stoves': {
    categorySlug: 'solid_fuel_stoves',
    keywords: [
      'esbit', 'solid fuel', 'hexamine', 'tab stove', 'fuel tablet stove'
    ]
  },

  // -------------------------------------------------------------------------
  // Cooking > Cookware
  // -------------------------------------------------------------------------
  'pots': {
    categorySlug: 'pots',
    keywords: [
      'pot', 'topf', 'cooking pot', 'kochtopf', 'titanium pot',
      'aluminum pot', 'toaks', 'evernew', 'msr titan'
    ]
  },
  'mugs': {
    categorySlug: 'mugs_cups',
    keywords: [
      'mug', 'tasse', 'cup', 'becher', 'insulated mug', 'titanium mug',
      'double wall mug', 'camp cup'
    ]
  },
  'utensils': {
    categorySlug: 'utensils',
    keywords: [
      'spork', 'utensils', 'besteck', 'spoon', 'löffel', 'fork', 'gabel',
      'long spoon', 'titanium spork', 'sea to summit spork'
    ]
  },

  // -------------------------------------------------------------------------
  // Hydration
  // -------------------------------------------------------------------------
  'water-bottles': {
    categorySlug: 'water_bottles',
    keywords: [
      'water bottle', 'wasserflasche', 'nalgene', 'smart water',
      'collapsible bottle', 'faltflasche', 'hydration bottle'
    ]
  },
  'water-bladders': {
    categorySlug: 'hydration_bladders',
    keywords: [
      'bladder', 'trinkblase', 'hydration bladder', 'water reservoir',
      'platypus', 'osprey hydraulics', 'camelbak'
    ]
  },
  'water-filters': {
    categorySlug: 'water_filters',
    keywords: [
      'water filter', 'wasserfilter', 'sawyer', 'katadyn', 'befree',
      'squeeze filter', 'gravity filter', 'pump filter'
    ]
  },
  'water-treatment': {
    categorySlug: 'water_purification',
    keywords: [
      'water purification', 'wasserentkeimung', 'aquamira', 'water tablets',
      'chlorine dioxide', 'steripen', 'uv treatment'
    ]
  },

  // -------------------------------------------------------------------------
  // Electronics > Lighting
  // -------------------------------------------------------------------------
  'headlamps': {
    categorySlug: 'headlamps',
    keywords: [
      'headlamp', 'stirnlampe', 'head torch', 'petzl', 'nitecore nu25',
      'black diamond', 'kopflampe'
    ]
  },
  'flashlights': {
    categorySlug: 'flashlights_lanterns',
    keywords: [
      'flashlight', 'taschenlampe', 'lantern', 'laterne', 'camp light',
      'tent light', 'mini lantern'
    ]
  },

  // -------------------------------------------------------------------------
  // Electronics > Power
  // -------------------------------------------------------------------------
  'power-banks': {
    categorySlug: 'power_banks',
    keywords: [
      'power bank', 'powerbank', 'battery pack', 'akkupack', 'portable charger',
      'nitecore', 'anker', 'usb battery'
    ]
  },
  'solar-panels': {
    categorySlug: 'solar_panels',
    keywords: [
      'solar panel', 'solarpanel', 'solar charger', 'solarladegerät',
      'goal zero', 'biolite', 'portable solar'
    ]
  },

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  'compasses': {
    categorySlug: 'compasses',
    keywords: [
      'compass', 'kompass', 'baseplate compass', 'silva', 'suunto', 'brunton'
    ]
  },
  'gps-devices': {
    categorySlug: 'gps_devices',
    keywords: [
      'gps', 'gps device', 'garmin', 'inreach', 'satellite communicator',
      'gps tracker', 'gps navigation'
    ]
  },

  // -------------------------------------------------------------------------
  // Tools & Accessories
  // -------------------------------------------------------------------------
  'trekking-poles': {
    categorySlug: 'trekking_poles',
    keywords: [
      'trekking pole', 'wanderstöcke', 'hiking pole', 'walking pole',
      'trekkingstock', 'carbon pole', 'leki', 'black diamond poles'
    ]
  },
  'knives': {
    categorySlug: 'knives',
    keywords: [
      'knife', 'messer', 'pocket knife', 'taschenmesser', 'mora',
      'victorinox', 'opinel', 'fixed blade'
    ]
  },
  'multitools': {
    categorySlug: 'multi_tools',
    keywords: [
      'multitool', 'multi-tool', 'leatherman', 'gerber', 'swiss army knife',
      'schweizer messer'
    ]
  },
  'repair-kits': {
    categorySlug: 'repair_kits',
    keywords: [
      'repair kit', 'reparaturset', 'patch kit', 'tenacious tape',
      'gear aid', 'field repair', 'sewing kit'
    ]
  },

  // -------------------------------------------------------------------------
  // Safety & Emergency
  // -------------------------------------------------------------------------
  'first-aid-kits': {
    categorySlug: 'first_aid_kits',
    keywords: [
      'first aid', 'erste hilfe', 'first aid kit', 'erste-hilfe-set',
      'medical kit', 'medkit', 'adventure medical'
    ]
  },
  'emergency-shelters': {
    categorySlug: 'emergency_shelters',
    keywords: [
      'emergency shelter', 'notunterkunft', 'emergency blanket', 'rettungsdecke',
      'survival blanket', 'space blanket', 'mylar blanket'
    ]
  },
  'whistles': {
    categorySlug: 'signaling_devices',
    keywords: [
      'whistle', 'pfeife', 'safety whistle', 'signalpfeife', 'emergency whistle'
    ]
  },

  // -------------------------------------------------------------------------
  // Consumables
  // -------------------------------------------------------------------------
  'trail-food': {
    categorySlug: 'trail_snacks_energy',
    keywords: [
      'trail mix', 'studentenfutter', 'energy bar', 'riegel', 'cliff bar',
      'nut butter', 'dried fruit', 'jerky', 'gels'
    ]
  },
  'freeze-dried': {
    categorySlug: 'freeze_dried_meals',
    keywords: [
      'freeze dried', 'gefriergetrocknet', 'mountain house', 'backpacker pantry',
      'dehydrated meal', 'trekking mahlzeit', 'real turmat'
    ]
  },
  'fuel-canisters': {
    categorySlug: 'canister_fuel',
    keywords: [
      'fuel canister', 'gaskartusche', 'isobutane', 'propane mix',
      'msr isopro', 'jetboil fuel', 'primus gas'
    ]
  }
};

// ============================================================================
// Database Helpers
// ============================================================================

/**
 * Transforms database row to Category type
 */
function transformCategory(row: CategoryRow): Category {
  const rawI18n = row.i18n as Record<string, string> | null;
  const i18n = {
    en: rawI18n?.en ?? row.label,
    ...(rawI18n?.de ? { de: rawI18n.de } : {}),
  };

  return {
    id: row.id,
    parentId: row.parent_id,
    level: row.level as 1 | 2 | 3,
    label: row.label,
    slug: row.slug,
    i18n,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

/**
 * Fetches a category by its slug from the database.
 *
 * @param slug - The category slug to search for
 * @returns The category or null if not found
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('[getCategoryBySlug] Error:', error.message);
    return null;
  }

  return transformCategory(data as CategoryRow);
}

/**
 * Builds the full category path by traversing parent relationships.
 *
 * @param categoryId - The category ID to start from
 * @param locale - Locale for labels ('en' | 'de')
 * @returns Path string like "Clothing > Outerwear > Rain Jackets"
 */
export async function buildCategoryPath(
  categoryId: string,
  locale: string = 'en'
): Promise<string> {
  const supabase = createClient();

  // Fetch all categories to build the path (efficient for small set)
  const { data: allCategories, error } = await supabase
    .from('categories')
    .select('*');

  if (error || !allCategories) {
    console.error('[buildCategoryPath] Error fetching categories:', error?.message);
    return '';
  }

  const categoryMap = new Map(
    allCategories.map((cat) => [cat.id, transformCategory(cat as CategoryRow)])
  );

  const path: string[] = [];
  let current = categoryMap.get(categoryId);

  while (current) {
    const label = current.i18n?.[locale] ?? current.i18n?.en ?? current.label;
    path.unshift(label);
    current = current.parentId ? categoryMap.get(current.parentId) : undefined;
  }

  return path.join(' > ');
}

// ============================================================================
// Keyword Matching Logic
// ============================================================================

/**
 * Normalizes text for keyword matching.
 * Converts to lowercase and removes special characters.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-äöüß]/g, ' ') // Keep German umlauts and hyphens
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Finds matching keywords in the input text.
 *
 * @param text - Normalized input text
 * @param keywords - Array of keywords to match
 * @returns Array of matched keywords
 */
function findMatchingKeywords(text: string, keywords: string[]): string[] {
  const matches: string[] = [];

  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (text.includes(normalizedKeyword)) {
      matches.push(keyword);
    }
  }

  return matches;
}

/**
 * Calculates confidence score based on match quality.
 *
 * @param matchedKeywords - Array of matched keywords
 * @param totalKeywords - Total keywords in the mapping
 * @param inputLength - Length of input text (used for normalization)
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(
  matchedKeywords: string[],
  totalKeywords: number,
  inputLength: number
): number {
  if (matchedKeywords.length === 0) return 0;

  // Base score from match ratio
  const matchRatio = matchedKeywords.length / Math.min(totalKeywords, 5);

  // Bonus for longer keyword matches (more specific)
  const avgKeywordLength =
    matchedKeywords.reduce((sum, kw) => sum + kw.length, 0) / matchedKeywords.length;
  const lengthBonus = Math.min(avgKeywordLength / 20, 0.2); // Up to 0.2 bonus

  // Bonus for multiple matches
  const multiMatchBonus = Math.min((matchedKeywords.length - 1) * 0.1, 0.3);

  // Penalty for very short input (less context)
  const shortInputPenalty = inputLength < 10 ? 0.2 : 0;

  const rawScore = matchRatio + lengthBonus + multiMatchBonus - shortInputPenalty;

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, rawScore));
}

// ============================================================================
// Main Suggestion Function
// ============================================================================

/**
 * Suggests a category based on product name and description.
 *
 * Uses keyword matching to find the most likely category.
 * Falls back to null if no confident match is found.
 *
 * @param name - Product name
 * @param description - Optional product description
 * @param locale - Locale for category path ('en' | 'de')
 * @returns CategorySuggestion or null if no match found
 *
 * @example
 * ```ts
 * const suggestion = await suggestCategory(
 *   'Arc'teryx Atom LT Jacket',
 *   'Lightweight insulated midlayer'
 * );
 * // Returns: {
 * //   categoryId: 'uuid-...',
 * //   categoryPath: 'Clothing > Mid-Layers > Insulated Mid-Layers',
 * //   confidence: 0.85,
 * //   matchedKeywords: ['insulated', 'jacket', 'midlayer']
 * // }
 * ```
 */
export async function suggestCategory(
  name: string,
  description?: string,
  locale: string = 'en'
): Promise<CategorySuggestion | null> {
  // Combine name and description for keyword matching
  const searchText = normalizeText([name, description].filter(Boolean).join(' '));

  if (!searchText) {
    return null;
  }

  // Find best matching category
  let bestMatch: {
    mappingKey: string;
    slug: string;
    matchedKeywords: string[];
    confidence: number;
  } | null = null;

  for (const [mappingKey, mapping] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchedKeywords = findMatchingKeywords(searchText, mapping.keywords);

    if (matchedKeywords.length === 0) continue;

    const confidence = calculateConfidence(
      matchedKeywords,
      mapping.keywords.length,
      searchText.length
    );

    // Only consider matches with reasonable confidence
    if (confidence < 0.2) continue;

    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        mappingKey,
        slug: mapping.categorySlug,
        matchedKeywords,
        confidence,
      };
    }
  }

  if (!bestMatch) {
    return null;
  }

  // Look up the category in the database
  const category = await getCategoryBySlug(bestMatch.slug);

  if (!category) {
    console.warn(
      `[suggestCategory] Category not found for slug: ${bestMatch.slug}`
    );
    return null;
  }

  // Build the full category path
  const categoryPath = await buildCategoryPath(category.id, locale);

  return {
    categoryId: category.id,
    categoryPath,
    confidence: bestMatch.confidence,
    matchedKeywords: bestMatch.matchedKeywords,
  };
}

/**
 * Suggests multiple categories sorted by confidence.
 * Useful for showing alternatives to the user.
 *
 * @param name - Product name
 * @param description - Optional product description
 * @param limit - Maximum number of suggestions (default: 3)
 * @param locale - Locale for category paths
 * @returns Array of CategorySuggestion sorted by confidence
 */
export async function suggestCategories(
  name: string,
  description?: string,
  limit: number = 3,
  locale: string = 'en'
): Promise<CategorySuggestion[]> {
  const searchText = normalizeText([name, description].filter(Boolean).join(' '));

  if (!searchText) {
    return [];
  }

  // Collect all matches with their scores
  const matches: Array<{
    slug: string;
    matchedKeywords: string[];
    confidence: number;
  }> = [];

  for (const [, mapping] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchedKeywords = findMatchingKeywords(searchText, mapping.keywords);

    if (matchedKeywords.length === 0) continue;

    const confidence = calculateConfidence(
      matchedKeywords,
      mapping.keywords.length,
      searchText.length
    );

    if (confidence >= 0.15) {
      matches.push({
        slug: mapping.categorySlug,
        matchedKeywords,
        confidence,
      });
    }
  }

  // Sort by confidence and take top N
  matches.sort((a, b) => b.confidence - a.confidence);
  const topMatches = matches.slice(0, limit);

  // Resolve categories from database
  const suggestions: CategorySuggestion[] = [];

  for (const match of topMatches) {
    const category = await getCategoryBySlug(match.slug);

    if (!category) continue;

    const categoryPath = await buildCategoryPath(category.id, locale);

    suggestions.push({
      categoryId: category.id,
      categoryPath,
      confidence: match.confidence,
      matchedKeywords: match.matchedKeywords,
    });
  }

  return suggestions;
}

/**
 * Gets the default/fallback category ID for uncategorized items.
 * Typically maps to "Tools & Accessories > Miscellaneous"
 *
 * @returns Category ID or null if not found
 */
export async function getDefaultCategoryId(): Promise<string | null> {
  const category = await getCategoryBySlug('miscellaneous_accessories');
  return category?.id ?? null;
}
