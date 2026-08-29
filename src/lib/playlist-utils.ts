import { normalizeIngredientName } from './utils';

export type AisleCategory = 'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other';

export const AISLE_LABELS: Record<AisleCategory, { label: string; icon: string }> = {
  produce: { label: 'Produce & Fresh Herbs', icon: '🥬' },
  meat: { label: 'Meat & Seafood', icon: '🥩' },
  dairy: { label: 'Dairy & Eggs', icon: '🧀' },
  pantry: { label: 'Pantry, Grains & Oils', icon: '🥫' },
  spices: { label: 'Spices & Seasonings', icon: '🧂' },
  other: { label: 'Other Groceries', icon: '🛒' },
};

/**
 * Strips weird bullet characters, Google Notes/Keep checklist glyphs,
 * non-breaking spaces, and OCR artifacts from recipe titles, instructions, and ingredients.
 */
export function cleanRecipeText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\t]/g, ' ')
    // Strip square checkbox markers like [ ], [x], [X], [✓]
    .replace(/^\[[\sxX_✓✔]?\]\s*/g, '')
    // Strip leading checkbox symbols and bullets:
    // ▢ (U+25A2), ☐ (U+2610), ☑ (U+2611), ☒ (U+2612), • (U+2022), ▪ (U+25AA), ▫ (U+25AB), etc.
    .replace(/^[▢☐☑☒✓✔•▪▫–—\*\-\+•◦●■□◆◇\u25A0-\u25AF\u25FB-\u25FE\u2B1A\u2B1B\u25C6\u25C7\u2022\u2023\u25E6\u2043\u2219\u2713\u2714\u2610\u2611\u2612\s]+/g, '')
    // Strip numbered list markers like "1. ", "1) ", "1- "
    .replace(/^\d+[\.\)\-]\s+/g, '')
    // Strip trailing asterisks / footnotes e.g. "baking soda*" -> "baking soda"
    .replace(/[\*\s]+$/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses raw ingredient string like "▢1 3/4 cups milk" into
 * amount ("1 3/4"), unit ("cups"), and name ("milk").
 */
export function parseIngredientLine(rawStr: string): {
  amount: string;
  unit: string;
  name: string;
  aisleCategory: AisleCategory;
} {
  const cleaned = cleanRecipeText(rawStr);
  if (!cleaned) {
    return { amount: '', unit: '', name: '', aisleCategory: 'pantry' };
  }

  // Match fraction, decimal, or integer quantity at the start
  const qtyRegex = /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*/i;
  let amount = '';
  let unit = '';
  let name = cleaned;

  const qtyMatch = cleaned.match(qtyRegex);
  if (qtyMatch) {
    amount = qtyMatch[1].trim();
    name = cleaned.slice(qtyMatch[0].length).trim();
  }

  // Match common culinary units
  const unitRegex =
    /^(tablespoons?|tbsp|tbs|teaspoons?|tsp|cups?|c|pounds?|lbs?|lb|ounces?|oz|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|pinches|pinch|dashes|dash|cloves?|heads?|cans?|bottles?|jars?|packages?|packets?|bunches?|stalks?|slices?|pieces?|sprigs?|large|medium|small)\b\s*(?:of\s+)?/i;

  const unitMatch = name.match(unitRegex);
  if (unitMatch) {
    unit = unitMatch[1].trim();
    name = name.slice(unitMatch[0].length).trim();
  }

  name = cleanRecipeText(name);

  return {
    amount,
    unit,
    name: name || cleaned,
    aisleCategory: deduceAisleCategory(name || cleaned),
  };
}

export const FREQUENCY_CONFIG: Record<
  string,
  { label: string; shortLabel: string; weight: number; description: string }
> = {
  '1_week': {
    label: '1x a Week (Weekly Staple)',
    shortLabel: '1x / week',
    weight: 10,
    description: 'Frequent rotation staple you love cooking every week',
  },
  '2_month': {
    label: '2x a Month (Bi-Weekly)',
    shortLabel: '2x / month',
    weight: 5,
    description: 'Every other week rotation',
  },
  '1_month': {
    label: '1x a Month (Monthly)',
    shortLabel: '1x / month',
    weight: 2,
    description: 'Once a month variety dish',
  },
  occasional: {
    label: 'Occasional Craving',
    shortLabel: 'Occasional',
    weight: 1,
    description: 'Rare treat or project meal',
  },
  paused: {
    label: '0x (Paused from Playlist)',
    shortLabel: 'Paused (0x)',
    weight: 0,
    description: 'Kept in repository but excluded from automatic playlist generator',
  },
};

export function deduceAisleCategory(ingredientName: string): AisleCategory {
  const norm = ingredientName.toLowerCase();

  // Spices & Seasonings
  if (
    norm.includes('salt') ||
    norm.includes('pepper') ||
    norm.includes('paprika') ||
    norm.includes('cumin') ||
    norm.includes('oregano') ||
    norm.includes('thyme') ||
    norm.includes('chili powder') ||
    norm.includes('cayenne') ||
    norm.includes('cinnamon') ||
    norm.includes('curry powder') ||
    norm.includes('bay leaf') ||
    norm.includes('bay leaves') ||
    norm.includes('coriander') ||
    norm.includes('nutmeg') ||
    norm.includes('clove') ||
    norm.includes('allspice') ||
    norm.includes('cardamom') ||
    norm.includes('turmeric') ||
    norm.includes('garlic powder') ||
    norm.includes('onion powder') ||
    norm.includes('red pepper flake') ||
    norm.includes('smoked paprika') ||
    norm.includes('vanilla extract')
  ) {
    return 'spices';
  }

  // Meat & Seafood
  if (
    norm.includes('chicken') ||
    norm.includes('beef') ||
    norm.includes('steak') ||
    norm.includes('pork') ||
    norm.includes('bacon') ||
    norm.includes('pancetta') ||
    norm.includes('sausage') ||
    norm.includes('salmon') ||
    norm.includes('shrimp') ||
    norm.includes('fish') ||
    norm.includes('tuna') ||
    norm.includes('cod') ||
    norm.includes('tilapia') ||
    norm.includes('halibut') ||
    norm.includes('turkey') ||
    norm.includes('lamb') ||
    norm.includes('duck') ||
    norm.includes('prosciutto') ||
    norm.includes('ground beef') ||
    norm.includes('ground turkey') ||
    norm.includes('ground pork') ||
    norm.includes('prawn') ||
    norm.includes('crab') ||
    norm.includes('lobster') ||
    norm.includes('ribeye') ||
    norm.includes('sirloin') ||
    norm.includes('short rib')
  ) {
    return 'meat';
  }

  // Dairy & Eggs
  if (
    norm.includes('butter') ||
    norm.includes('cream') ||
    norm.includes('milk') ||
    norm.includes('cheese') ||
    norm.includes('parmesan') ||
    norm.includes('cheddar') ||
    norm.includes('mozzarella') ||
    norm.includes('feta') ||
    norm.includes('ricotta') ||
    norm.includes('gruyere') ||
    norm.includes('pecorino') ||
    norm.includes('egg') ||
    norm.includes('eggs') ||
    norm.includes('yogurt') ||
    norm.includes('sour cream') ||
    norm.includes('creme fraiche') ||
    norm.includes('ghee')
  ) {
    return 'dairy';
  }

  // Produce
  if (
    norm.includes('onion') ||
    norm.includes('garlic') ||
    norm.includes('shallot') ||
    norm.includes('scallion') ||
    norm.includes('green onion') ||
    norm.includes('chive') ||
    norm.includes('lemon') ||
    norm.includes('lime') ||
    norm.includes('cilantro') ||
    norm.includes('parsley') ||
    norm.includes('basil') ||
    norm.includes('ginger') ||
    norm.includes('potato') ||
    norm.includes('potatoes') ||
    norm.includes('tomato') ||
    norm.includes('tomatoes') ||
    norm.includes('lettuce') ||
    norm.includes('spinach') ||
    norm.includes('kale') ||
    norm.includes('arugula') ||
    norm.includes('pepper') ||
    norm.includes('bell pepper') ||
    norm.includes('jalapeno') ||
    norm.includes('serrano') ||
    norm.includes('habanero') ||
    norm.includes('carrot') ||
    norm.includes('carrots') ||
    norm.includes('celery') ||
    norm.includes('broccoli') ||
    norm.includes('cauliflower') ||
    norm.includes('avocado') ||
    norm.includes('cucumber') ||
    norm.includes('mushroom') ||
    norm.includes('mushrooms') ||
    norm.includes('zucchini') ||
    norm.includes('asparagus') ||
    norm.includes('eggplant') ||
    norm.includes('cabbage') ||
    norm.includes('squash') ||
    norm.includes('scallions') ||
    norm.includes('mint') ||
    norm.includes('rosemary') ||
    norm.includes('dill') ||
    norm.includes('apple') ||
    norm.includes('orange') ||
    norm.includes('berry') ||
    norm.includes('berries')
  ) {
    return 'produce';
  }

  // Pantry & Grains
  if (
    norm.includes('oil') ||
    norm.includes('olive oil') ||
    norm.includes('sesame oil') ||
    norm.includes('canola oil') ||
    norm.includes('vinegar') ||
    norm.includes('soy sauce') ||
    norm.includes('tamari') ||
    norm.includes('fish sauce') ||
    norm.includes('pasta') ||
    norm.includes('spaghetti') ||
    norm.includes('penne') ||
    norm.includes('rigatoni') ||
    norm.includes('fettuccine') ||
    norm.includes('rice') ||
    norm.includes('jasmine rice') ||
    norm.includes('basmati') ||
    norm.includes('flour') ||
    norm.includes('sugar') ||
    norm.includes('brown sugar') ||
    norm.includes('honey') ||
    norm.includes('maple syrup') ||
    norm.includes('broth') ||
    norm.includes('stock') ||
    norm.includes('chicken broth') ||
    norm.includes('beef broth') ||
    norm.includes('beans') ||
    norm.includes('black beans') ||
    norm.includes('chickpeas') ||
    norm.includes('garbanzo') ||
    norm.includes('lentils') ||
    norm.includes('coconut milk') ||
    norm.includes('cornstarch') ||
    norm.includes('breadcrumbs') ||
    norm.includes('panko') ||
    norm.includes('mustard') ||
    norm.includes('dijon') ||
    norm.includes('mayo') ||
    norm.includes('mayonnaise') ||
    norm.includes('ketchup') ||
    norm.includes('hot sauce') ||
    norm.includes('sriracha') ||
    norm.includes('peanut butter') ||
    norm.includes('tahini') ||
    norm.includes('sesame seeds') ||
    norm.includes('wine') ||
    norm.includes('canned')
  ) {
    return 'pantry';
  }

  return 'other';
}

export interface WeightedRecipe {
  id: string;
  title: string;
  frequency: string;
  ingredients: { name: string; amount?: string | null; unit?: string | null; aisleCategory?: string }[];
  servings?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  sourceType?: string;
  sourceUrl?: string | null;
  cookbookTitle?: string | null;
  pageNumber?: number | null;
}

export function generatePlaylistRotation(
  recipes: WeightedRecipe[],
  daysCount: number = 3,
  pinnedRecipeIds: { day: number; recipeId: string }[] = []
): { day: number; recipe: WeightedRecipe; locked: boolean }[] {
  if (recipes.length === 0) return [];

  // Filter out recipes that are explicitly paused (frequency === 'paused')
  const activePool = recipes.filter((r) => r.frequency !== 'paused');
  if (activePool.length === 0) return [];

  const result: { day: number; recipe: WeightedRecipe; locked: boolean }[] = [];
  const chosenIds = new Set<string>();

  // 1. Fill pinned slots first
  for (const pin of pinnedRecipeIds) {
    if (pin.day >= 1 && pin.day <= daysCount) {
      const matched = recipes.find((r) => r.id === pin.recipeId);
      if (matched) {
        result.push({ day: pin.day, recipe: matched, locked: true });
        chosenIds.add(matched.id);
      }
    }
  }

  // 2. Fill remaining days using weighted lottery
  for (let day = 1; day <= daysCount; day++) {
    const existing = result.find((r) => r.day === day);
    if (existing) continue;

    // Remaining candidates
    let candidates = activePool.filter((r) => !chosenIds.has(r.id));
    if (candidates.length === 0) {
      // If we ran out of unique recipes, allow repeats from active pool
      candidates = activePool;
    }

    // Weighted random selection
    const totalWeight = candidates.reduce(
      (sum, r) => sum + (FREQUENCY_CONFIG[r.frequency]?.weight || 1),
      0
    );

    let random = Math.random() * totalWeight;
    let selected = candidates[0];

    for (const cand of candidates) {
      const w = FREQUENCY_CONFIG[cand.frequency]?.weight || 1;
      if (random <= w) {
        selected = cand;
        break;
      }
      random -= w;
    }

    result.push({ day, recipe: selected, locked: false });
    chosenIds.add(selected.id);
  }

  // Sort by day sequence (1, 2, 3, 4)
  return result.sort((a, b) => a.day - b.day);
}

export interface GroceryDeltaItem {
  id: string;
  name: string;
  amount: string;
  unit: string;
  aisleCategory: AisleCategory;
  recipes: string[]; // which dinner recipes use this item
  isStocked: boolean;
}

export function computeGroceryDelta(
  playlistRecipes: { id: string; title: string; ingredients: { name: string; amount?: string | null; unit?: string | null; aisleCategory?: string }[] }[],
  pantryItems: { name: string; normalizedName?: string; isAlwaysAvailable?: boolean }[]
): {
  missingByAisle: Record<AisleCategory, GroceryDeltaItem[]>;
  stockedItems: GroceryDeltaItem[];
  totalMissingCount: number;
  totalStockedCount: number;
} {
  const pantryNormalized = pantryItems.map((p) => ({
    name: p.name,
    norm: p.normalizedName || normalizeIngredientName(p.name),
    isAlwaysAvailable: p.isAlwaysAvailable,
  }));

  const isStockedInPantry = (ingredientName: string) => {
    const targetNorm = normalizeIngredientName(ingredientName);
    return pantryNormalized.some((item) => {
      if (item.norm === targetNorm) return true;
      if (item.name.toLowerCase() === ingredientName.toLowerCase()) return true;
      if (targetNorm.includes(item.norm) || item.norm.includes(targetNorm)) return true;
      const tokens = targetNorm.split(' ').filter((w) => w.length > 2);
      return tokens.some((tok) => item.norm.includes(tok));
    });
  };

  // Aggregate ingredients across all playlist recipes
  const itemMap = new Map<
    string,
    {
      name: string;
      amounts: string[];
      aisleCategory: AisleCategory;
      recipes: string[];
      isStocked: boolean;
    }
  >();

  for (const r of playlistRecipes) {
    for (const ing of r.ingredients) {
      if (!ing.name || ing.name.trim() === '') continue;
      const normKey = normalizeIngredientName(ing.name);

      const stocked = isStockedInPantry(ing.name);
      const aisle = (ing.aisleCategory as AisleCategory) || deduceAisleCategory(ing.name);

      if (!itemMap.has(normKey)) {
        itemMap.set(normKey, {
          name: ing.name,
          amounts: ing.amount ? [`${ing.amount} ${ing.unit || ''}`.trim()] : [],
          aisleCategory: aisle,
          recipes: [r.title],
          isStocked: stocked,
        });
      } else {
        const existing = itemMap.get(normKey)!;
        if (!existing.recipes.includes(r.title)) {
          existing.recipes.push(r.title);
        }
        if (ing.amount) {
          existing.amounts.push(`${ing.amount} ${ing.unit || ''}`.trim());
        }
      }
    }
  }

  const missingByAisle: Record<AisleCategory, GroceryDeltaItem[]> = {
    produce: [],
    meat: [],
    dairy: [],
    pantry: [],
    spices: [],
    other: [],
  };

  const stockedItems: GroceryDeltaItem[] = [];

  itemMap.forEach((val, key) => {
    const itemObj: GroceryDeltaItem = {
      id: key,
      name: val.name,
      amount: val.amounts.join(' + ') || '',
      unit: '',
      aisleCategory: val.aisleCategory,
      recipes: val.recipes,
      isStocked: val.isStocked,
    };

    if (val.isStocked) {
      stockedItems.push(itemObj);
    } else {
      missingByAisle[val.aisleCategory].push(itemObj);
    }
  });

  const totalMissingCount = Object.values(missingByAisle).reduce((sum, arr) => sum + arr.length, 0);

  return {
    missingByAisle,
    stockedItems,
    totalMissingCount,
    totalStockedCount: stockedItems.length,
  };
}
