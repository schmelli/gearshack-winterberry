# GEARGRAPH INGESTION PROMPT - SCHEMA-COMPLIANT

I need comprehensive research on a) the outdoor equipment manufacturer whose name I provided in the query field and b) ALL (!) of that manufacturer's current and past products, for integration into my graph-based database that powers "GearShack" - an app for gear cataloging and AI-powered loadout planning. Please conduct thorough research , do not use your training data. DO NOT HALUCINATE!!

## Mission
Research outdoor gear brands → create rich graph using **ONLY EXISTING schema**. Given brand name → research ALL products → 15-30 rich nodes per product.

## CRITICAL RULES
1. **Use ONLY existing node types** - NO new types!
2. **Use ONLY existing relationships** - NO new relations!
3. **Rich graph over flat properties** - Complex data = separate nodes

## IMPOPRTANT REMINDERS
1. SEARCH THE WEB NOW - do not use your training data!
2. Visit the brand's official website and use the Firecrawl MCP server to search the site and find and catalog ALL their products!
3. Search brand on REI.com, Backcountry.com, globetrotter.de, etc.!
4. Find EVERY SINGLE PRODUCT they make!
5. If possible, include discontinued products from the last years!
6. Provide the actual URLs where you found each product on the manufacturer's website!
7. Each product needs a descriptions with real specs!
---

## EXISTING NODE TYPES (USE THESE ONLY!)

### Core Product Nodes
- `OutdoorBrand` - Brand/company info
- `ProductFamily` - Product lines/families
- `GearItem` - Individual products
- `ProductType` - Product type classification

### Rich Data Nodes (CREATE THESE!)
- `UsageScenario` - Specific use cases
- `Insight` - Tips, mistakes, safety, contraindications
- `PerformanceContext` - Performance ratings
- `FeedbackPattern` - User feedback patterns
- `TemperatureRange` - Temperature constraints
- `WeatherCondition` - Weather performance

### Supporting Nodes
- `DataSource` - Data sources/attribution
- `MarketSegment` - Market positioning
- `Technology` - Technologies/materials
- `GlossaryTerm` - Technical terms
- `VideoSource` - Video references

---

## EXISTING RELATIONSHIPS (USE THESE ONLY!)

### Product Structure
- `MANUFACTURES` - Brand → ProductFamily
- `MANUFACTURES_ITEM` - Brand → GearItem
- `PRODUCED_BY` - GearItem → Brand
- `HAS_VARIANT` - ProductFamily → GearItem
- `IS_VARIANT_OF` - GearItem → ProductFamily
- `IS_TYPE` - GearItem → ProductType

### Rich Data (CRITICAL!)
- `SUITABLE_FOR` - GearItem → UsageScenario
- `HAS_TIP` - GearItem/Brand/Family → Insight
- `HAS_PERFORMANCE_METRICS` - GearItem → PerformanceContext
- `HAS_FEEDBACK` - GearItem → FeedbackPattern
- `HAS_TEMP_RANGE` - GearItem → TemperatureRange
- `PERFORMS_IN` - GearItem → WeatherCondition

### Compatibility
- `PAIRS_WITH` - GearItem → GearItem
- `COMPARE_TO` - GearItem → GearItem
- `UPGRADE_PATH` - GearItem → GearItem
- `ALTERNATIVE_TO` - GearItem → GearItem
- `CARRIES` - GearItem → GearItem (what carries what)

### Other
- `HAS_DATA_SOURCE` - Any → DataSource
- `BELONGS_TO_SEGMENT` - Brand → MarketSegment
- `COMPETES_WITH` - Brand → Brand
- `DEVELOPS_TECHNOLOGY` - Brand → Technology
- `RELATES_TO` - GearItem → GlossaryTerm
- `EXTRACTED_FROM` - GearItem → VideoSource

---

## NODE PROPERTIES (EXISTING SCHEMA)

### UsageScenario
```cypher
UsageScenario {
  scenarioName: "string" (UNIQUE),
  description: "string",
  difficultyLevel: "beginner|intermediate|advanced|expert",
  tripDuration: "day|overnight|weekend|multi-day|multi-week",
  baseWeight: "string",
  terrain: "string",
  season: "string",
  createdAt: datetime()
}
```
**Relationship:** `(GearItem)-[:SUITABLE_FOR {priority: int, reasoning: "string"}]->(UsageScenario)`

### Insight
```cypher
Insight {
  content: "string",
  summary: "string",
  category: "string",  // common_mistake, usage_tip, safety_warning, contraindication, specialized_feature
  
  // For common_mistake:
  consequence: "string",
  prevention: "string",
  affectedUserType: "string",
  
  // For usage_tip:
  reasoning: "string",
  idealConditions: "string",
  recommendedGear: "string",
  
  // For contraindication:
  affectedUsage: "string",
  alternativeSuggestion: "string",
  
  sourceUrl: "string",
  createdAt: datetime()
}
```
**Relationship:** `(GearItem)-[:HAS_TIP]->(Insight)`

### PerformanceContext
```cypher
PerformanceContext {
  id: "string" (UNIQUE),
  durabilityRating: int,        // 1-10
  durabilityNote: "string",
  easeOfUseRating: int,         // 1-10
  easeOfUseNote: "string",
  comfortRating: int,           // 1-10
  comfortNote: "string",
  packEfficiency: "string",     // excellent/good/fair/poor
  maintenanceRequirements: "string",  // low/medium/high
  weatherResistance: int,       // 1-10
  weatherResistanceNote: "string",
  packEfficiencyNote: "string"
}
```
**Relationship:** `(GearItem)-[:HAS_PERFORMANCE_METRICS]->(PerformanceContext)`

### FeedbackPattern
```cypher
FeedbackPattern {
  id: "string" (UNIQUE),
  patternType: "common_praise|common_complaint",
  feedbackText: "string",
  frequency: "very_high|high|medium|low",
  userGroup: "string",
  sentiment: "positive|negative|neutral"
}
```
**Relationship:** `(GearItem)-[:HAS_FEEDBACK]->(FeedbackPattern)`

### TemperatureRange
```cypher
TemperatureRange {
  id: "string" (UNIQUE),
  minTemp: int,
  maxTemp: int,
  unit: "F|C",
  optimalRange: "string",
  reasoning: "string"
}
```
**Relationship:** `(GearItem)-[:HAS_TEMP_RANGE]->(TemperatureRange)`

### WeatherCondition
```cypher
WeatherCondition {
  name: "string" (UNIQUE),  // rain, snow, wind, humid, etc.
  suitability: "excellent|good|fair|poor",
  notes: "string"
}
```
**Relationship:** `(GearItem)-[:PERFORMS_IN]->(WeatherCondition)`

---

## INGESTION WORKFLOW

### 1. Research (90-180 min)
- Company: Firecrawl + web search
- Products: Map site, check REI/Backcountry/Globetrotter
- Deep dive: Specs, scenarios, mistakes, feedback, performance
- Find **ALL** products, not just popular

### 2. Create Brand
```cypher
MERGE (brand:OutdoorBrand {name: "Brand"})
SET brand.yearFounded = 2010,
    brand.headquarters = "Location",
    brand.website = "https://...",
    brand.description = "...",
    brand.philosophy = "...",
    brand.businessModel = "DTC/Retail/Cottage",
    brand.targetMarket = "...",
    brand.priceSegment = "Budget/Mid/Premium/Ultra",
    brand.specialty = "...",
    brand.bestKnownFor = "...",
    brand.manufacturing = "...",
    brand.updatedAt = datetime()
```

### 3. Create Families (3-10)
```cypher
CREATE (fam:ProductFamily {
  familyId: "brand-family-slug",
  name: "Family Name",
  familyName: "Family",
  brandName: "Brand",
  category: "Backpack",
  productType: "Multi-day Backpack",
  description: "...",
  targetUser: "...",
  price_range: "$100-$200",
  capacity_range: "30-60L",
  key_features: ["..."],
  positioning: "...",
  createdAt: datetime()
})
CREATE (brand)-[:MANUFACTURES]->(fam)
```

### 4. Create Items (Basic props!)
```cypher
CREATE (item:GearItem {
  gearId: "brand-item-slug",
  name: "Product",
  brand: "Brand",
  category: "Backpack",
  productType: "Multi-day",
  model: "Model",
  yearIntroduced: 2020,
  status: "current",
  
  price_usd: 395.00,
  weight_grams: 850,
  weight_oz: 30.0,
  volume_liters: 55,
  capacity: "...",
  dimensions: "...",
  
  materials: ["..."],
  features: ["..."],
  description: "...",
  skillLevel: "intermediate",
  productUrl: "...",
  made_in: "...",
  createdAt: datetime()
})

CREATE (brand)-[:MANUFACTURES_ITEM]->(item)
CREATE (item)-[:PRODUCED_BY]->(brand)
CREATE (fam)-[:HAS_VARIANT]->(item)
CREATE (item)-[:IS_VARIANT_OF]->(fam)
```

### 5. CREATE RICH NODES (15-30 per item!)

```cypher
// A) UsageScenarios (2-5)
MERGE (s:UsageScenario {scenarioName: "3-day Sierra Nevada summer fastpack"})
ON CREATE SET 
  s.description = "...",
  s.difficultyLevel = "advanced",
  s.tripDuration = "weekend",
  s.baseWeight = "10-15 lbs",
  s.terrain = "trails",
  s.season = "summer",
  s.createdAt = datetime()
CREATE (item)-[:SUITABLE_FOR {priority: 1, reasoning: "..."}]->(s)

// B) Insights (5-8)
CREATE (i:Insight {
  content: "Overloading frameless pack beyond 15 lbs",
  summary: "Users exceed weight limits",
  category: "common_mistake",
  consequence: "Back pain, instability",
  prevention: "Weigh pack, limit to 15 lbs",
  affectedUserType: "beginners",
  sourceUrl: "...",
  createdAt: datetime()
})
CREATE (item)-[:HAS_TIP]->(i)

// C) Performance (1)
CREATE (p:PerformanceContext {
  id: "item-perf",
  durabilityRating: 9,
  durabilityNote: "...",
  easeOfUseRating: 8,
  easeOfUseNote: "...",
  comfortRating: 8,
  comfortNote: "...",
  packEfficiency: "excellent",
  maintenanceRequirements: "low",
  weatherResistance: 10
})
CREATE (item)-[:HAS_PERFORMANCE_METRICS]->(p)

// D) Feedback (3-5)
CREATE (f:FeedbackPattern {
  id: "item-praise-1",
  patternType: "common_praise",
  feedbackText: "Incredibly lightweight",
  frequency: "very_high",
  userGroup: "thru_hikers",
  sentiment: "positive"
})
CREATE (item)-[:HAS_FEEDBACK]->(f)

// E) Environmental (when relevant)
MERGE (t:TemperatureRange {id: "item-temp"})
ON CREATE SET
  t.minTemp = 20,
  t.maxTemp = 85,
  t.unit = "F",
  t.optimalRange = "35-75F",
  t.reasoning = "..."
CREATE (item)-[:HAS_TEMP_RANGE]->(t)

MERGE (w:WeatherCondition {name: "rain"})
ON CREATE SET
  w.suitability = "excellent",
  w.notes = "100% waterproof"
CREATE (item)-[:PERFORMS_IN]->(w)

// F) Comparisons (when applicable)
MATCH (comp:GearItem {gearId: "competitor-id"})
CREATE (item)-[:COMPARE_TO {
  difference: "...",
  useCase: "..."
}]->(comp)

MATCH (upgrade:GearItem {gearId: "upgrade-id"})
CREATE (item)-[:UPGRADE_PATH {
  destination: "...",
  reason: "...",
  triggerCondition: "..."
}]->(upgrade)
```

---

## QUALITY TARGETS

**Minimum:** 2+ UsageScenarios, 3+ Insights, 1 PerformanceContext  
**Target:** 4-5 Scenarios, 7-8 Insights, 1 Perf, 4-5 Feedback, Environmental  
**Goal:** **15-30 rich nodes per product**

---

## VERIFICATION

```cypher
// Count rich nodes per item
MATCH (item:GearItem {gearId: "..."})
OPTIONAL MATCH (item)-[:SUITABLE_FOR]->(s)
OPTIONAL MATCH (item)-[:HAS_TIP]->(i)
OPTIONAL MATCH (item)-[:HAS_PERFORMANCE_METRICS]->(p)
OPTIONAL MATCH (item)-[:HAS_FEEDBACK]->(f)
RETURN 
  item.name,
  count(DISTINCT s) as scenarios,
  count(DISTINCT i) as insights,
  count(DISTINCT p) as performance,
  count(DISTINCT f) as feedback,
  (count(DISTINCT s) + count(DISTINCT i) + count(DISTINCT p) + count(DISTINCT f)) as total_rich_nodes
```

**Must have:** 15-30 rich nodes per product minimum

---

## KEY PRINCIPLES

1. **Schema-Compliant** - Use ONLY existing types and relationships
2. **Rich Graph** - Complex data = nodes, NOT properties
3. **15-30 Rich Nodes** - Per product minimum
4. **All Products** - Not just popular ones
5. **Source Attribution** - Include sourceUrl in Insights
6. **MERGE for shared** - Use MERGE for UsageScenarios and WeatherConditions (reusable)
7. **CREATE for unique** - Use CREATE for Insights, FeedbackPatterns, PerformanceContext (product-specific)

---

## IMPORTANT: MERGE vs CREATE

**MERGE (Reusable nodes):**
- UsageScenario - Same scenario across products
- WeatherCondition - Shared weather types
- TemperatureRange - Can be shared if identical

**CREATE (Product-specific):**
- Insight - Unique to each product
- FeedbackPattern - Specific feedback
- PerformanceContext - Individual ratings

---

## EXAMPLE: Schema-Compliant Ingestion

```cypher
// 1. Brand
MERGE (brand:OutdoorBrand {name: "Katabatic Gear"})
SET brand.yearFounded = 2008, brand.headquarters = "Colorado, USA"

// 2. Family
CREATE (fam:ProductFamily {
  familyId: "katabatic-quilts",
  name: "Ultralight Quilts",
  brandName: "Katabatic Gear",
  category: "Sleep System",
  productType: "Backpacking Quilt"
})
CREATE (brand)-[:MANUFACTURES]->(fam)

// 3. Item
CREATE (item:GearItem {
  gearId: "katabatic-palisade-30f",
  name: "Palisade 30°F",
  brand: "Katabatic Gear",
  category: "Sleep System",
  price_usd: 415.00,
  weight_grams: 558
})
CREATE (brand)-[:MANUFACTURES_ITEM]->(item)
CREATE (item)-[:PRODUCED_BY]->(brand)
CREATE (fam)-[:HAS_VARIANT]->(item)

// 4. Rich Nodes
MERGE (s:UsageScenario {scenarioName: "3-season thru-hiking"})
ON CREATE SET s.description = "...", s.difficultyLevel = "intermediate"
CREATE (item)-[:SUITABLE_FOR {priority: 1}]->(s)

CREATE (i:Insight {
  content: "Ordering quilt too warm",
  category: "common_mistake",
  consequence: "Extra weight",
  prevention: "Size down in temp rating"
})
CREATE (item)-[:HAS_TIP]->(i)

CREATE (p:PerformanceContext {
  id: "palisade-30f-perf",
  durabilityRating: 9,
  easeOfUseRating: 7,
  packEfficiency: "excellent"
})
CREATE (item)-[:HAS_PERFORMANCE_METRICS]->(p)
```

---

## SCHEMA COMPLIANCE CHECKLIST

Before ingestion, verify:
- [ ] Using ONLY existing node types
- [ ] Using ONLY existing relationships
- [ ] Properties match schema (check unique constraints!)
- [ ] MERGE for reusable nodes (UsageScenario, WeatherCondition)
- [ ] CREATE for product-specific nodes (Insight, FeedbackPattern)
- [ ] All critical relationships established
- [ ] 15-30 rich nodes per product

---

**From brand name → schema-compliant rich graph. No new types. No new relations. Perfect fit! 🎯**
