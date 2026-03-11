import { describe, expect, it } from 'vitest';
import {
  buildInventoryCandidates,
  chooseFinalWeight,
  hasStrongInventoryMatch,
  parseLighterpackHtml,
} from '@/lib/lighterpack/import';

describe('parseLighterpackHtml', () => {
  it('parses list name, item fields, quantity, and flags', () => {
    const html = `
      <h1 class="lpListName">Weekend Alpine Setup</h1>
      <ul class="lpCategories">
        <li class="lpCategory" id="100">
          <ul class="lpItems lpDataTable">
            <li class="lpHeader lpItemsHeader">
              <h2 class="lpCategoryName">Shelter</h2>
            </li>
            <li class="lpItem lpItemHasPrice" id="530">
              <img class="lpItemImage" src="https:&#x2F;&#x2F;example.com&#x2F;tent.jpg" />
              <span class="lpName"><a href="#">Tent</a></span>
              <span class="lpDescription">Durston X-Mid 1P</span>
              <span class="lpActionsCell">
                <i class="lpSprite lpWorn lpActive "></i>
                <i class="lpSprite lpConsumable  "></i>
              </span>
              <span class="lpWeightCell lpNumber">
                <span class="lpWeight">0.88</span>
                <div class="lpUnitSelect">
                  <input type="hidden" class="lpMG" value="880000" />
                  <span class="lpDisplay">g</span>
                  <ul class="lpUnitDropdown">
                    <li class="oz">oz</li>
                    <li class="lb">lb</li>
                  </ul>
                </div>
              </span>
              <span class="lpQtyCell lpNumber" qty1>1</span>
            </li>
            <li class="lpItem lpItemHasPrice" id="531">
              <span class="lpName">Fuel Canister</span>
              <span class="lpDescription">230g blend</span>
              <span class="lpActionsCell">
                <i class="lpSprite lpWorn  "></i>
                <i class="lpSprite lpConsumable lpActive "></i>
              </span>
              <span class="lpWeightCell lpNumber">
                <span class="lpWeight">230</span>
                <div class="lpUnitSelect">
                  <span class="lpDisplay">g</span>
                </div>
              </span>
              <span class="lpQtyCell lpNumber" qty2>2</span>
            </li>
          </ul>
        </li>
      </ul>
    `;

    const parsed = parseLighterpackHtml(html);
    expect(parsed.listName).toBe('Weekend Alpine Setup');
    expect(parsed.items).toHaveLength(2);

    expect(parsed.items[0]).toMatchObject({
      name: 'Tent',
      quantity: 1,
      category: 'Shelter',
      imageUrl: 'https://example.com/tent.jpg',
      worn: true,
      consumable: false,
      notes: 'Durston X-Mid 1P',
      sourceItemId: '530',
    });
    expect(parsed.items[0]?.weightGrams).toBeCloseTo(880, 3);

    expect(parsed.items[1]).toMatchObject({
      name: 'Fuel Canister',
      quantity: 2,
      worn: false,
      consumable: true,
      notes: '230g blend',
      sourceItemId: '531',
    });
    expect(parsed.items[1]?.weightGrams).toBe(230);
  });
});

describe('buildInventoryCandidates', () => {
  it('scores exact matches higher and marks strong matches', () => {
    const candidates = buildInventoryCandidates(
      {
        name: 'Durston X-Mid 1P Tent',
        quantity: 1,
        weightGrams: 880,
      },
      [
        {
          id: 'inv-1',
          name: 'X-Mid 1P Tent',
          brand: 'Durston',
          weightGrams: 890,
        },
        {
          id: 'inv-2',
          name: 'Titanium Mug',
          brand: 'Toaks',
          weightGrams: 90,
        },
      ]
    );

    expect(candidates[0]?.inventoryItemId).toBe('inv-1');
    expect(candidates[0]?.score).toBeGreaterThan(0.74);
    expect(hasStrongInventoryMatch(candidates)).toBe(true);
  });
});

describe('chooseFinalWeight', () => {
  it('accepts researched weight when within 10 percent', () => {
    const decision = chooseFinalWeight(1000, 940);
    expect(decision.finalWeight).toBe(940);
    expect(decision.researchedWeightAccepted).toBe(true);
  });

  it('keeps lighterpack weight when difference is too high', () => {
    const decision = chooseFinalWeight(1000, 1200);
    expect(decision.finalWeight).toBe(1000);
    expect(decision.researchedWeightAccepted).toBe(false);
    expect(decision.weightDeltaPercent).toBe(20);
  });
});
