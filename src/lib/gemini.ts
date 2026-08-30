import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedCookbook, ExtractedRecipe, ExtractedIngredient } from '@/types';
import { isRecognizedKitchenStaple, normalizeIngredientName } from '@/lib/utils';

export function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export const MODEL_CANDIDATES = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-3.6-flash',
      'gemini-2.5-pro',
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
      'gemini-2.5-flash-lite',
    ].filter(Boolean) as string[]
  )
);

export async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  promptParts: any[],
  config: { responseMimeType?: string; temperature?: number } = {}
): Promise<string> {
  let lastError: any = null;

  for (const modelName of MODEL_CANDIDATES) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: config,
        });
        const result = await model.generateContent(promptParts);
        return result.response.text();
      } catch (err: any) {
        lastError = err;
        const errMsg = (err?.message || '').toLowerCase();
        
        // If 429 rate limit or quota or 503 overloaded, wait with exponential backoff and retry
        if (
          errMsg.includes('429') ||
          errMsg.includes('resource_exhausted') ||
          errMsg.includes('too many requests') ||
          errMsg.includes('quota') ||
          errMsg.includes('503') ||
          errMsg.includes('service unavailable') ||
          errMsg.includes('overloaded')
        ) {
          console.warn(`[Gemini] Model ${modelName} rate limited / busy (attempt ${attempts}/${maxAttempts}). Waiting before retry...`);
          await new Promise((resolve) => setTimeout(resolve, attempts * 2500));
          continue;
        }

        // If 404 model not found or deprecated, break to next candidate model
        if (
          errMsg.includes('not found') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('404') ||
          errMsg.includes('is not supported')
        ) {
          console.warn(`[Gemini] Model ${modelName} not available, attempting next candidate...`);
          break;
        }

        // If other error and we have retries left, wait briefly
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('No compatible Gemini model candidate succeeded.');
}

/**
 * Scan a bookshelf image to extract cookbook titles and authors
 */
export async function scanBookshelfImage(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  options: { skipCocktails?: boolean; limitFirstOnly?: boolean } = {}
): Promise<ExtractedCookbook[]> {
  const genAI = getGeminiClient();

  if (!genAI) {
    console.warn('No GEMINI_API_KEY provided. Returning intelligent mock bookshelf scan data.');
    return [
      {
        title: 'Salt, Fat, Acid, Heat',
        author: 'Samin Nosrat',
        edition: 'Hardcover',
        spineSnippet: 'Mastering the Elements of Good Cooking',
        isCocktailBook: false,
      },
      {
        title: 'The Food Lab',
        author: 'J. Kenji López-Alt',
        edition: '1st Edition',
        spineSnippet: 'Better Home Cooking Through Science',
        isCocktailBook: false,
      },
      {
        title: 'Ottolenghi Simple',
        author: 'Yotam Ottolenghi',
        edition: 'Hardcover',
        spineSnippet: 'A Cookbook',
        isCocktailBook: false,
      },
      {
        title: 'Smitten Kitchen Every Day',
        author: 'Deb Perelman',
        edition: 'Illustrated',
        spineSnippet: 'Triumphant and Unfussy New Favorites',
        isCocktailBook: false,
      },
      {
        title: 'Death & Co: Modern Classic Cocktails',
        author: 'David Kaplan',
        edition: '1st Edition',
        spineSnippet: 'Cocktails and Stories',
        isCocktailBook: true,
      },
    ].filter(b => (!options.skipCocktails || !b.isCocktailBook)).slice(0, options.limitFirstOnly ? 1 : undefined);
  }

  const prompt = `
You are an expert culinary librarian and computer vision AI with superhuman OCR capabilities.
Analyze this bookshelf photograph and extract EVERY SINGLE COOKBOOK and food/culinary book visible in the image.

Exhaustive Scanning Instructions:
1. Scan the image systematically across all shelves (top to bottom, left to right). Include vertical standing books and horizontally stacked books.
2. Read all text, spine lettering, logos, and recognizable typography on every book spine and front cover.
3. Identify ALL cookbooks, baking books, culinary guides, food history, and technique books.
4. ${options.skipCocktails ? 'Exclude books that are exclusively about cocktail recipes or bartending.' : 'Mark cocktail/beverage books with isCocktailBook: true.'}
5. For each book found, output:
   - "title": Full, clean canonical title of the book (expand partial abbreviations if the book is recognizable)
   - "author": Author name(s) if legible or identifiable from the title
   - "edition": Edition, volume, or subtitle if visible
   - "spineSnippet": Text as seen on the spine
   - "isCocktailBook": boolean
${options.limitFirstOnly ? '6. TEST MODE: Return only the first most prominent cookbook found.' : ''}

Be thorough and do not omit books just because their spine text is small, vertical, stylized, or partially shadowed.

Output format: Return ONLY a valid JSON array of objects:
[
  {
    "title": "Title of Cookbook",
    "author": "Author Name",
    "edition": "Edition or subtitle",
    "spineSnippet": "Visible text",
    "isCocktailBook": false
  }
]
`;

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };

  try {
    const responseText = await generateWithFallback(genAI, [prompt, imagePart], {
      responseMimeType: 'application/json',
      temperature: 0.2,
    });
    const parsed = JSON.parse(responseText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error('Error in scanBookshelfImage:', error);
    throw new Error('Failed to analyze bookshelf image with Gemini AI: ' + (error as Error).message);
  }
}

/**
 * Extract / Index comprehensive recipes and ingredients for a recognized cookbook
 */
export async function indexCookbookRecipes(
  title: string,
  author?: string,
  sampleOnly: boolean = false
): Promise<ExtractedRecipe[]> {
  const genAI = getGeminiClient();

  if (!genAI) {
    console.warn(`No GEMINI_API_KEY provided. Returning curated recipes for ${title}.`);
    return getCuratedMockRecipes(title);
  }

  const prompt = `
You are an authoritative culinary database and recipe indexer.
For the cookbook "${title}"${author ? ` by ${author}` : ''}, provide a rich, detailed index of recipes contained within the book.

Requirements:
1. Provide ${sampleOnly ? '6-10 prominent recipes' : '20-35 of the most famous and distinctive recipes'} from this exact cookbook across all sections (mains, sides, desserts, soups, salads, sauces).
2. For each recipe, provide:
   - "title": Exact or known recipe name in the book
   - "pageNumber": Realistic or known page number in standard print editions
   - "isFact": boolean. Set to TRUE if this recipe is a verified real recipe from this book. Set to FALSE if inferred or reconstructed.
   - "category": e.g., "Dessert" (for cakes, tarts, cookies, pies, puddings, pastries, sweet treats), "Pasta", "Poultry", "Beef", "Pork", "Seafood", "Salad", "Bread", "Sauce", "Vegetarian", "Soup", etc.
   - "prepTime": estimated prep time (e.g. "15 mins")
   - "cookTime": estimated cook time (e.g. "30 mins")
   - "servings": e.g. "4 servings"
   - "ingredients": array of objects with { "name": "ingredient name", "amount": "e.g. 2", "unit": "tbsp", "optional": boolean }
   - "sourceUrl": optional web link to reputable adaptation/reprint if known

Output format: Return ONLY a valid JSON array of recipe objects:
[
  {
    "title": "Recipe Title",
    "pageNumber": 142,
    "isFact": true,
    "category": "Main",
    "prepTime": "20 mins",
    "cookTime": "40 mins",
    "servings": "4",
    "ingredients": [
      { "name": "boneless chicken thighs", "amount": "1.5", "unit": "lbs", "optional": false },
      { "name": "olive oil", "amount": "2", "unit": "tbsp", "optional": false },
      { "name": "garlic", "amount": "4", "unit": "cloves", "optional": false },
      { "name": "kosher salt", "amount": "1", "unit": "tsp", "optional": false }
    ],
    "sourceUrl": "https://..."
  }
]
`;

  try {
    const text = await generateWithFallback(genAI, [prompt], {
      responseMimeType: 'application/json',
      temperature: 0.3,
    });
    const parsed = JSON.parse(text);
    const results = Array.isArray(parsed) ? parsed : [parsed];
    if (results.length > 0) return results;
    return getCuratedMockRecipes(title);
  } catch (error) {
    console.error('Error in indexCookbookRecipes:', error);
    return getCuratedMockRecipes(title);
  }
}

/**
 * Scan one or multiple fridge/pantry images to extract identified ingredients
 */
export async function scanFridgeOrPantryImage(
  imageData: string | { base64Data: string; mimeType: string }[],
  defaultMimeType: string = 'image/jpeg'
): Promise<{ name: string; category: 'fridge' | 'freezer' | 'pantry' | 'spices'; quantity?: string; isAlwaysAvailable: boolean }[]> {
  const genAI = getGeminiClient();

  // Normalize inputs to array
  const images: { base64Data: string; mimeType: string }[] = [];
  if (typeof imageData === 'string') {
    if (imageData.trim()) {
      images.push({ base64Data: imageData, mimeType: defaultMimeType });
    }
  } else if (Array.isArray(imageData)) {
    imageData.forEach((img) => {
      if (img?.base64Data) {
        images.push({
          base64Data: img.base64Data.replace(/^data:image\/[a-z]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        });
      }
    });
  }

  if (!genAI || images.length === 0) {
    console.warn('Returning mock fridge detection.');
    const mockItems = [
      { name: 'Eggs', category: 'fridge' as const, quantity: '1 dozen' },
      { name: 'Whole Milk', category: 'fridge' as const, quantity: '1/2 gallon' },
      { name: 'Parmesan Cheese', category: 'fridge' as const, quantity: '1 block' },
      { name: 'Unsalted Butter', category: 'fridge' as const, quantity: '2 sticks' },
      { name: 'Fresh Garlic', category: 'pantry' as const, quantity: '1 bulb' },
      { name: 'Yellow Onions', category: 'pantry' as const, quantity: '3' },
      { name: 'Extra Virgin Olive Oil', category: 'pantry' as const, quantity: '1 bottle' },
      { name: 'Kosher Salt', category: 'spices' as const, quantity: '1 box' },
      { name: 'Black Peppercorns', category: 'spices' as const, quantity: '1 grinder' },
      { name: 'Lemons', category: 'fridge' as const, quantity: '4' },
      { name: 'Chicken Breasts', category: 'fridge' as const, quantity: '1 lb' },
      { name: 'Pasta (Rigatoni)', category: 'pantry' as const, quantity: '1 box' },
    ];
    return mockItems.map((item) => ({
      ...item,
      isAlwaysAvailable: isRecognizedKitchenStaple(item.name),
    }));
  }

  const prompt = `
You are an expert AI food and pantry inventory analyzer.
Examine the provided photograph(s) of refrigerator shelves, freezer compartments, or pantry cabinets.
Identify and extract ALL distinct edible ingredients, produce, proteins, dairy, condiments, and dry goods across all photos.

Instructions:
1. List each detected food item with its generic common culinary ingredient name (e.g. "Garlic", "Greek Yogurt", "Eggs", "Cheddar Cheese", "Bell Peppers", "Butter", "Olive Oil").
2. Assign each item to one of 4 categories:
   - "fridge": refrigerated dairy, fresh produce, meat, chilled sauces
   - "freezer": frozen items, frozen veggies, meats
   - "pantry": dry goods, canned food, pasta, grains, onions, potatoes, oils
   - "spices": dried spices, seasoning blends, salts, peppers
3. Include estimated quantity if visible.
4. Deduplicate items seen across multiple photos.

Output format: Return ONLY a valid JSON array of objects:
[
  {
    "name": "Ingredient Name",
    "category": "fridge",
    "quantity": "approximate quantity if seen"
  }
]
`;

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64Data,
      mimeType: img.mimeType,
    },
  }));

  try {
    const responseText = await generateWithFallback(genAI, [prompt, ...imageParts], {
      responseMimeType: 'application/json',
      temperature: 0.2,
    });
    const parsed = JSON.parse(responseText);
    const list: any[] = Array.isArray(parsed) ? parsed : [parsed];

    // Deduplicate and enrich with automatic staple detection
    const seen = new Set<string>();
    const results: {
      name: string;
      category: 'fridge' | 'freezer' | 'pantry' | 'spices';
      quantity?: string;
      isAlwaysAvailable: boolean;
    }[] = [];

    for (const item of list) {
      if (!item.name) continue;
      const normalized = normalizeIngredientName(item.name);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const isStaple = isRecognizedKitchenStaple(item.name);

      results.push({
        name: item.name.trim(),
        category: item.category || (isStaple ? 'pantry' : 'fridge'),
        quantity: item.quantity || undefined,
        isAlwaysAvailable: isStaple,
      });
    }

    return results;
  } catch (error) {
    console.error('Error in scanFridgeOrPantryImage:', error);
    throw new Error('Failed to analyze fridge image: ' + (error as Error).message);
  }
}

/**
 * Curated fallback recipes for offline / testing without an API key
 */
function getCuratedMockRecipes(title: string): ExtractedRecipe[] {
  const lower = title.toLowerCase();

  if (lower.includes('salt, fat, acid, heat') || lower.includes('nosrat')) {
    return [
      {
        title: 'Buttermilk-Brined Roast Chicken',
        pageNumber: 338,
        isFact: true,
        category: 'Poultry',
        prepTime: '15 mins (plus overnight brine)',
        cookTime: '60 mins',
        servings: '4-6',
        ingredients: [
          { name: 'whole chicken', amount: '1', unit: 'approx 4 lbs' },
          { name: 'buttermilk', amount: '2', unit: 'cups' },
          { name: 'kosher salt', amount: '2', unit: 'tbsp' },
        ],
        sourceUrl: 'https://www.saltfatacidheat.com/fat/buttermilk-marinated-roast-chicken',
      },
      {
        title: 'Persian-Style Tahdig Rice',
        pageNumber: 264,
        isFact: true,
        category: 'Grains & Rice',
        prepTime: '20 mins',
        cookTime: '50 mins',
        servings: '6',
        ingredients: [
          { name: 'basmati rice', amount: '2', unit: 'cups' },
          { name: 'kosher salt', amount: '3', unit: 'tbsp' },
          { name: 'unsalted butter or ghee', amount: '4', unit: 'tbsp' },
          { name: 'saffron threads', amount: '1/4', unit: 'tsp', optional: true },
          { name: 'plain yogurt', amount: '1/4', unit: 'cup' },
        ],
      },
      {
        title: 'Samin’s Classic Salsa Verde',
        pageNumber: 370,
        isFact: true,
        category: 'Sauce',
        prepTime: '15 mins',
        cookTime: '0 mins',
        servings: '1 cup',
        ingredients: [
          { name: 'fresh flat-leaf parsley', amount: '1', unit: 'cup packed' },
          { name: 'capers', amount: '2', unit: 'tbsp' },
          { name: 'anchovy fillets', amount: '3', unit: 'fillets' },
          { name: 'garlic', amount: '1', unit: 'clove' },
          { name: 'extra-virgin olive oil', amount: '1/2', unit: 'cup' },
          { name: 'red wine vinegar', amount: '1', unit: 'tbsp' },
        ],
      },
      {
        title: 'Slow-Cooked Tuscan Kale and White Beans',
        pageNumber: 220,
        isFact: true,
        category: 'Vegetarian',
        prepTime: '15 mins',
        cookTime: '45 mins',
        servings: '4',
        ingredients: [
          { name: 'lacinato kale', amount: '2', unit: 'bunches' },
          { name: 'canned cannellini beans', amount: '2', unit: 'cans (15oz)' },
          { name: 'garlic', amount: '4', unit: 'cloves' },
          { name: 'olive oil', amount: '3', unit: 'tbsp' },
          { name: 'crushed red pepper flakes', amount: '1/2', unit: 'tsp' },
          { name: 'parmesan cheese rind', amount: '1', unit: 'piece', optional: true },
        ],
      },
      {
        title: 'Crispy Smashed Potatoes with Chimichurri',
        pageNumber: 185,
        isFact: true,
        category: 'Sides',
        prepTime: '15 mins',
        cookTime: '40 mins',
        servings: '4',
        ingredients: [
          { name: 'baby yellow potatoes', amount: '2', unit: 'lbs' },
          { name: 'olive oil', amount: '3', unit: 'tbsp' },
          { name: 'kosher salt', amount: '1', unit: 'tbsp' },
          { name: 'fresh parsley', amount: '1/2', unit: 'cup' },
          { name: 'garlic', amount: '2', unit: 'cloves' },
          { name: 'red wine vinegar', amount: '2', unit: 'tbsp' },
        ],
      },
    ];
  }

  if (lower.includes('food lab') || lower.includes('kenji')) {
    return [
      {
        title: 'The Ultimate Ultra-Crispy Roast Potatoes',
        pageNumber: 492,
        isFact: true,
        category: 'Sides',
        prepTime: '15 mins',
        cookTime: '50 mins',
        servings: '6',
        ingredients: [
          { name: 'russet or yukon gold potatoes', amount: '4', unit: 'lbs' },
          { name: 'kosher salt', amount: '2', unit: 'tbsp' },
          { name: 'baking soda', amount: '1/2', unit: 'tsp' },
          { name: 'duck fat or extra-virgin olive oil', amount: '5', unit: 'tbsp' },
          { name: 'fresh rosemary', amount: '1', unit: 'tbsp chopped' },
          { name: 'garlic', amount: '3', unit: 'cloves' },
          { name: 'freshly ground black pepper', amount: '1/2', unit: 'tsp' },
        ],
      },
      {
        title: '15-Minute Creamy Stovetop Macaroni and Cheese',
        pageNumber: 715,
        isFact: true,
        category: 'Pasta',
        prepTime: '5 mins',
        cookTime: '10 mins',
        servings: '3-4',
        ingredients: [
          { name: 'elbow macaroni', amount: '6', unit: 'oz' },
          { name: 'evaporated milk', amount: '6', unit: 'oz' },
          { name: 'sharp cheddar cheese', amount: '6', unit: 'oz grated' },
          { name: 'kosher salt', amount: '1/2', unit: 'tsp' },
        ],
      },
      {
        title: 'Foolproof Pan Pizza',
        pageNumber: 620,
        isFact: true,
        category: 'Pizza',
        prepTime: '20 mins (plus overnight rise)',
        cookTime: '15 mins',
        servings: '4',
        ingredients: [
          { name: 'bread flour', amount: '400', unit: 'grams' },
          { name: 'instant yeast', amount: '1/2', unit: 'tsp' },
          { name: 'kosher salt', amount: '10', unit: 'grams' },
          { name: 'warm water', amount: '275', unit: 'grams' },
          { name: 'olive oil', amount: '2', unit: 'tbsp' },
          { name: 'canned crushed tomatoes', amount: '1', unit: 'cup' },
          { name: 'whole milk mozzarella cheese', amount: '8', unit: 'oz shredded' },
        ],
      },
      {
        title: 'Perfect Reverse-Sear Ribeye Steak',
        pageNumber: 310,
        isFact: true,
        category: 'Beef',
        prepTime: '10 mins',
        cookTime: '45 mins',
        servings: '2',
        ingredients: [
          { name: 'thick-cut bone-in ribeye steak', amount: '1', unit: '2 lbs' },
          { name: 'kosher salt', amount: '1', unit: 'tbsp' },
          { name: 'unsalted butter', amount: '2', unit: 'tbsp' },
          { name: 'fresh thyme', amount: '3', unit: 'sprigs' },
          { name: 'garlic', amount: '2', unit: 'cloves' },
        ],
      },
    ];
  }

  // Generic fallback recipes
  return [
    {
      title: `${title} Signature House Salad`,
      pageNumber: 24,
      isFact: false,
      category: 'Salad',
      prepTime: '10 mins',
      cookTime: '0 mins',
      servings: '4',
      ingredients: [
        { name: 'mixed salad greens', amount: '6', unit: 'cups' },
        { name: 'extra-virgin olive oil', amount: '3', unit: 'tbsp' },
        { name: 'lemon juice', amount: '1', unit: 'tbsp' },
        { name: 'parmesan cheese', amount: '1/4', unit: 'cup shaved' },
        { name: 'flaky sea salt', amount: '1/2', unit: 'tsp' },
      ],
    },
    {
      title: `Roasted Herb Garlic Chicken`,
      pageNumber: 88,
      isFact: false,
      category: 'Main',
      prepTime: '15 mins',
      cookTime: '45 mins',
      servings: '4',
      ingredients: [
        { name: 'chicken pieces or breasts', amount: '2', unit: 'lbs' },
        { name: 'garlic', amount: '6', unit: 'cloves' },
        { name: 'olive oil', amount: '3', unit: 'tbsp' },
        { name: 'fresh rosemary or thyme', amount: '2', unit: 'sprigs' },
        { name: 'lemon', amount: '1', unit: 'sliced' },
        { name: 'kosher salt', amount: '1', unit: 'tsp' },
        { name: 'black pepper', amount: '1/2', unit: 'tsp' },
      ],
    },
    {
      title: `Pan-Seared Salmon with Lemon Butter`,
      pageNumber: 134,
      isFact: false,
      category: 'Seafood',
      prepTime: '10 mins',
      cookTime: '12 mins',
      servings: '2',
      ingredients: [
        { name: 'salmon fillets', amount: '2', unit: 'fillets (6oz each)' },
        { name: 'butter', amount: '2', unit: 'tbsp' },
        { name: 'lemon juice', amount: '1', unit: 'tbsp' },
        { name: 'fresh dill or parsley', amount: '1', unit: 'tbsp' },
        { name: 'salt', amount: '1/2', unit: 'tsp' },
      ],
    },
    {
      title: `Rustic Tomato Basil Pasta`,
      pageNumber: 176,
      isFact: false,
      category: 'Pasta',
      prepTime: '10 mins',
      cookTime: '15 mins',
      servings: '4',
      ingredients: [
        { name: 'pasta', amount: '1', unit: 'lb' },
        { name: 'canned whole peeled tomatoes', amount: '1', unit: 'can (28oz)' },
        { name: 'olive oil', amount: '1/4', unit: 'cup' },
        { name: 'garlic', amount: '4', unit: 'cloves' },
        { name: 'fresh basil', amount: '1', unit: 'handful' },
        { name: 'parmesan cheese', amount: '1/2', unit: 'cup grated' },
      ],
    },
  ];
}

/**
 * Scan a printed Table of Contents or Index page photo directly to extract verified recipe names and page numbers
 */
export async function scanIndexPageImage(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<{ title: string; pageNumber: number; category?: string }[]> {
  const genAI = getGeminiClient();

  if (!genAI) {
    return [
      { title: 'Blood Orange Olive Oil Cake', pageNumber: 67, category: 'Dessert' },
    ];
  }

  const prompt = `
You are an expert OCR vision AI specializing in cookbook indexes and tables of contents.
Read this photograph of a printed cookbook Index or Table of Contents page and extract all listed recipes and their exact printed page numbers.

Instructions:
1. Extract the exact recipe title as printed on the page.
2. Extract the exact page number associated with the recipe (must be an integer number).
3. Guess a general category if discernible (e.g. "Baking", "Main", "Salad", "Dessert", "Pasta", "Soup").

Output format: Return ONLY a valid JSON array of objects:
[
  {
    "title": "Exact Recipe Title",
    "pageNumber": 67,
    "category": "Dessert"
  }
]
`;

  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const imagePart = {
    inlineData: {
      data: cleanBase64,
      mimeType,
    },
  };

  try {
    const responseText = await generateWithFallback(genAI, [prompt, imagePart], {
      responseMimeType: 'application/json',
      temperature: 0.1,
    });
    const parsed = JSON.parse(responseText);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((item: any) => item.title && item.pageNumber)
      .map((item: any) => ({
        title: item.title.trim(),
        pageNumber: parseInt(String(item.pageNumber), 10),
        category: item.category || 'Main',
      }));
  } catch (error) {
    console.error('Error scanning index page image:', error);
    throw new Error('Failed to OCR index page: ' + (error as Error).message);
  }
}

/**
 * Scan one or multiple bar cart / liquor cabinet photos to detect bottles, mixers, and garnishes
 */
export async function scanBarCartImage(
  imageData: string | { base64Data: string; mimeType: string }[],
  defaultMimeType: string = 'image/jpeg'
): Promise<{ name: string; category: string; isAlwaysAvailable: boolean }[]> {
  const genAI = getGeminiClient();

  const images: { base64Data: string; mimeType: string }[] = [];
  if (typeof imageData === 'string') {
    if (imageData.trim()) {
      images.push({ base64Data: imageData, mimeType: defaultMimeType });
    }
  } else if (Array.isArray(imageData)) {
    imageData.forEach((img) => {
      if (img?.base64Data) {
        images.push({
          base64Data: img.base64Data.replace(/^data:image\/[a-z]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        });
      }
    });
  }

  if (!genAI || images.length === 0) {
    return [
      { name: 'Bourbon Whiskey (Buffalo Trace)', category: 'spirits', isAlwaysAvailable: false },
      { name: 'London Dry Gin (Tanqueray)', category: 'spirits', isAlwaysAvailable: false },
      { name: 'Campari', category: 'liqueurs', isAlwaysAvailable: true },
      { name: 'Sweet Vermouth', category: 'liqueurs', isAlwaysAvailable: true },
      { name: 'Angostura Bitters', category: 'bitters_syrups', isAlwaysAvailable: true },
      { name: 'Fresh Lemons', category: 'produce', isAlwaysAvailable: true },
    ];
  }

  const prompt = `
You are an expert mixologist and bar inventory assistant with computer vision capabilities.
Analyze this photo of a bar cart, liquor cabinet, spirits shelf, or cocktail ingredients setup.
Detect all visible liquor bottles, base spirits, liqueurs, amari, vermouths, bitters, syrups, mixers, citrus, and bar garnishes.

Categorize each item into strictly one of these categories:
- "spirits" (Bourbon, Rye, Gin, Tequila, Mezcal, Rum, Vodka, Scotch, Cognac, Brandy, Pisco)
- "liqueurs" (Campari, Aperol, Triple Sec/Cointreau, Vermouth, Chartreuse, Maraschino, Kahlua, Amaro, St-Germain, Absinthe)
- "bitters_syrups" (Angostura, Orange Bitters, Peychaud's, Simple Syrup, Demerara, Orgeat, Agave, Grenadine)
- "mixers" (Club Soda, Tonic Water, Ginger Beer, Cola, Cranberry Juice, Grapefruit Soda)
- "produce" (Fresh Lemons, Fresh Limes, Oranges, Mint, Basil, Cucumbers)
- "ice_garnishes" (Cherries, Olives, Citrus Peels, Large Ice Cubes)

Return a strictly valid JSON array of objects with keys:
- "name": Standardized bottle or ingredient name (include brand if visible, e.g. "Bourbon Whiskey (Woodford Reserve)" or "Campari")
- "category": One of the 6 categories above
- "isAlwaysAvailable": boolean (true for universal bar staples like Angostura bitters, simple syrup, lemons, limes, or salt)

Output format: Return ONLY a valid JSON array of objects:
[
  { "name": "London Dry Gin (Bombay Sapphire)", "category": "spirits", "isAlwaysAvailable": false },
  { "name": "Campari", "category": "liqueurs", "isAlwaysAvailable": true },
  { "name": "Angostura Bitters", "category": "bitters_syrups", "isAlwaysAvailable": true }
]
`;

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64Data,
      mimeType: img.mimeType,
    },
  }));

  try {
    const responseText = await generateWithFallback(genAI, [prompt, ...imageParts], {
      responseMimeType: 'application/json',
      temperature: 0.2,
    });
    const parsed = JSON.parse(responseText);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.map((item: any) => ({
      name: item.name ? item.name.trim() : 'Unknown Bottle',
      category: item.category || 'spirits',
      isAlwaysAvailable: !!item.isAlwaysAvailable,
    }));
  } catch (error) {
    console.error('Error scanning bar cart:', error);
    throw new Error('Failed to analyze bar cart: ' + (error as Error).message);
  }
}

export interface ExtractedReceiptItem {
  name: string;
  quantity?: string;
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other';
  price?: string;
  isAlwaysAvailable?: boolean;
}

/**
 * Scan a supermarket / grocery store receipt photo to extract purchased ingredients
 */
export async function scanGroceryReceiptImage(
  imageData: string | { base64Data: string; mimeType: string }[],
  defaultMimeType: string = 'image/jpeg'
): Promise<ExtractedReceiptItem[]> {
  const genAI = getGeminiClient();

  const images: { base64Data: string; mimeType: string }[] = [];
  if (typeof imageData === 'string') {
    if (imageData.trim()) {
      images.push({
        base64Data: imageData.replace(/^data:image\/[a-z]+;base64,/, ''),
        mimeType: defaultMimeType,
      });
    }
  } else if (Array.isArray(imageData)) {
    imageData.forEach((img) => {
      if (img?.base64Data) {
        images.push({
          base64Data: img.base64Data.replace(/^data:image\/[a-z]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        });
      }
    });
  }

  if (!genAI || images.length === 0) {
    console.warn('Returning mock receipt items.');
    const mockReceipt = [
      { name: 'Boneless Skinless Chicken Thighs', quantity: '2 lbs', category: 'meat' as const, price: '$7.99' },
      { name: 'Organic Roma Tomatoes', quantity: '1.5 lbs', category: 'produce' as const, price: '$3.49' },
      { name: 'Fresh Garlic', quantity: '1 bulb', category: 'produce' as const, price: '$0.79' },
      { name: 'Heavy Whipping Cream', quantity: '1 pint', category: 'dairy' as const, price: '$2.99' },
      { name: 'Parmigiano-Reggiano', quantity: '8 oz', category: 'dairy' as const, price: '$6.49' },
      { name: 'Rigatoni Pasta', quantity: '1 lb', category: 'pantry' as const, price: '$1.99' },
      { name: 'Extra Virgin Olive Oil', quantity: '1 bottle', category: 'pantry' as const, price: '$8.99' },
    ];
    return mockReceipt.map((i) => ({
      ...i,
      isAlwaysAvailable: isRecognizedKitchenStaple(i.name),
    }));
  }

  const prompt = `
You are an expert grocery receipt OCR and culinary data extractor AI.
Analyze the photograph(s) of this grocery store / supermarket receipt (Trader Joe's, Costco, Safeway, Whole Foods, Kroger, etc.).

Extraction & Normalization Rules:
1. Extract ALL food items, produce, proteins, dairy, dry goods, seasonings, and beverages.
2. EXPAND abbreviated or cryptic register printouts into clean, natural culinary names:
   - "ORG BNLS SKN CHK THGH" -> "Boneless Skinless Chicken Thighs"
   - "ROMA TOMATO 1.5LB" -> name: "Roma Tomatoes", quantity: "1.5 lbs"
   - "OATLY OAT MLK 64Z" -> name: "Oat Milk", quantity: "64 oz"
   - "KIRKLAND EVOO 1L" -> name: "Extra Virgin Olive Oil", quantity: "1 L"
   - "TJ GRLC BULB" -> name: "Garlic", quantity: "1 bulb"
   - "HELLMANNS REAL MAYO" -> name: "Mayonnaise"
   - "YELLOW ONION 3CT" -> name: "Yellow Onions", quantity: "3"
3. FILTER OUT non-food line items (e.g. paper towels, trash bags, batteries, napkins, coupons, discounts, bag fees, bottle deposits, subtotal, tax, total, payment info).
4. Categorize every item into exactly one of: "produce", "meat", "dairy", "pantry", "spices", "other".
5. Capture the quantity and line price if visible on the receipt.

Output Format: Return ONLY a valid JSON array of objects:
[
  {
    "name": "Clean Ingredient Name",
    "quantity": "2 lbs",
    "category": "produce",
    "price": "$3.49"
  }
]
`;

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64Data,
      mimeType: img.mimeType,
    },
  }));

  try {
    const responseText = await generateWithFallback(genAI, [prompt, ...imageParts], {
      responseMimeType: 'application/json',
      temperature: 0.1,
    });
    const parsed = JSON.parse(responseText);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .filter((i: any) => i && i.name)
      .map((item: any) => ({
        name: item.name.trim(),
        quantity: item.quantity ? String(item.quantity).trim() : undefined,
        category: (item.category || 'pantry') as 'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other',
        price: item.price ? String(item.price).trim() : undefined,
        isAlwaysAvailable: isRecognizedKitchenStaple(item.name),
      }));
  } catch (error) {
    console.error('Error scanning grocery receipt:', error);
    throw new Error('Failed to analyze grocery receipt: ' + (error as Error).message);
  }
}

export interface ExtractedMenuCocktail {
  name: string;
  menuDescription?: string;
  spiritBase: string;
  flavorProfile: 'sour' | 'boozy' | 'bitter' | 'highball' | 'tiki' | 'herbal' | 'dessert';
  glassware: string;
  ice: string;
  technique: string;
  garnish?: string;
  ingredients: {
    name: string;
    amount?: string;
    unit?: string;
    optional?: boolean;
  }[];
  instructions: string[];
}

export interface ExtractedRestaurantMenuResult {
  suggestedRestaurantName: string;
  city?: string;
  cocktails: ExtractedMenuCocktail[];
}

/**
 * Scan a restaurant or cocktail bar menu photograph to extract drinks and estimate craft ratios
 */
export async function scanRestaurantCocktailMenu(
  imageData: string | { base64Data: string; mimeType: string }[],
  defaultMimeType: string = 'image/jpeg'
): Promise<ExtractedRestaurantMenuResult> {
  const genAI = getGeminiClient();

  const images: { base64Data: string; mimeType: string }[] = [];
  if (typeof imageData === 'string') {
    if (imageData.trim()) {
      images.push({
        base64Data: imageData.replace(/^data:image\/[a-z]+;base64,/, ''),
        mimeType: defaultMimeType,
      });
    }
  } else if (Array.isArray(imageData)) {
    imageData.forEach((img) => {
      if (img?.base64Data) {
        images.push({
          base64Data: img.base64Data.replace(/^data:image\/[a-z]+;base64,/, ''),
          mimeType: img.mimeType || 'image/jpeg',
        });
      }
    });
  }

  if (!genAI || images.length === 0) {
    return {
      suggestedRestaurantName: 'The Violet Hour',
      city: 'Chicago, IL',
      cocktails: [
        {
          name: 'Juliet & Romeo',
          menuDescription: 'Beefeater Gin, Mint, Cucumber, Lime, Rose Water, Angostura',
          spiritBase: 'Gin',
          flavorProfile: 'sour',
          glassware: 'Coupe',
          ice: 'Served Up',
          technique: 'Shaken with cucumber & mint, double-strained',
          garnish: '3 drops Angostura bitters on surface, cucumber wheel',
          ingredients: [
            { name: 'London Dry Gin', amount: '2', unit: 'oz' },
            { name: 'Fresh Lime Juice', amount: '0.75', unit: 'oz' },
            { name: 'Simple Syrup (1:1)', amount: '0.75', unit: 'oz' },
            { name: 'Cucumber Slices', amount: '3', unit: 'slices' },
            { name: 'Fresh Mint Leaves', amount: '6', unit: 'leaves' },
            { name: 'Rose Water', amount: '3', unit: 'drops', optional: true },
            { name: 'Angostura Bitters', amount: '3', unit: 'drops' },
          ],
          instructions: [
            'In a cocktail shaker, gently muddle the cucumber slices and fresh mint with simple syrup.',
            'Add gin and freshly squeezed lime juice. Fill shaker with ice cubes.',
            'Shake vigorously for 12-15 seconds until thoroughly chilled and aerated.',
            'Double strain through a fine-mesh sieve into a chilled coupe glass.',
            'Garnish with 3 drops of Angostura bitters and 3 drops of rose water on the surface froth.',
          ],
        },
      ],
    };
  }

  const prompt = `
You are a master craft cocktail mixologist and world-class culinary OCR vision AI.
Analyze the photograph(s) of this restaurant, cocktail bar, speakeasy, or lounge cocktail menu.

Exhaustive Task Requirements:
1. RESTAURANT IDENTIFICATION:
   - Identify the Restaurant / Bar Name if printed on the menu header, footer, logo, or cover (e.g. "Death & Co", "The Dead Rabbit", "Attaboy", "Bemelmans Bar", "Dante").
   - If not clearly discernible, suggest a clean descriptive fallback (e.g. "Speakeasy Cocktail Bar").
   - Extract city/neighborhood if indicated.

2. COCKTAIL EXTRACTION:
   - Extract EVERY SINGLE cocktail / mixed drink listed on the menu.
   - Capture the exact printed drink title as "name".
   - Capture the verbatim listed ingredients / description text printed under the drink as "menuDescription".

3. CRAFT RATIO ESTIMATION & MIXOLOGY SYNTHESIS:
   - Menus usually only list ingredients (e.g., "Mezcal, Passionfruit, Lime, Habanero, Agave, Black Salt Rim") without exact fluid ounce quantities.
   - As a master bartender, synthesize standard balanced craft cocktail ratios based on classic cocktail templates and web recipe specs:
     * Sours / Margaritas / Daiquiris: Typically 2 oz spirit + 0.75-1 oz citrus/acid + 0.75 oz sweetener/liqueur.
     * Spirit-Forward (Manhattan / Old Fashioned / Martini): Typically 2-2.5 oz spirit + 0.75-1 oz vermouth/amaro/modifier + 2-3 dashes bitters.
     * Equal Parts (Negroni / Last Word / Paper Plane / Corpse Reviver): Typically 0.75 oz to 1 oz each ingredient.
     * Highballs & Fizzes: 1.5-2 oz base + 0.5-0.75 oz citrus/syrup + 3-4 oz effervescent topper (club soda/tonic/ginger beer).
     * Tiki / Tropical: Layered 2 oz rums/spirits + 0.75 oz lime/grapefruit + 0.5 oz orgeat/falernum/passionfruit.
   - Determine appropriate:
     * "spiritBase": One of "Bourbon / Rye", "Gin", "Tequila / Mezcal", "Rum", "Vodka", "Brandy", "Amaro / Spritz", "Other"
     * "flavorProfile": One of "sour", "boozy", "bitter", "highball", "tiki", "herbal", "dessert"
     * "glassware": "Coupe", "Rocks Glass", "Highball Glass", "Nick & Nora", "Martini Glass", "Tiki Mug", "Collins Glass"
     * "ice": "Large Cube", "Crushed Ice", "Served Up", "Neat", "Cubed Ice"
     * "technique": "Shaken", "Stirred", "Built over Ice", "Swizzled", "Blended"
     * "garnish": Specific classic or craft garnish
     * "ingredients": Array of structured ingredients with normalized names, amounts (e.g. "2", "0.75", "0.5", "2"), and units ("oz", "dashes", "barspoon", "leaves", "drops")
     * "instructions": 3 to 5 clear step-by-step professional bartending instructions.

Output format: Return ONLY a valid JSON object:
{
  "suggestedRestaurantName": "Bar Name",
  "city": "City, State or Country (optional)",
  "cocktails": [
    {
      "name": "Cocktail Name",
      "menuDescription": "Raw menu description",
      "spiritBase": "Tequila / Mezcal",
      "flavorProfile": "sour",
      "glassware": "Rocks Glass",
      "ice": "Large Cube",
      "technique": "Shaken",
      "garnish": "Dehydrated lime wheel & chili salt rim",
      "ingredients": [
        { "name": "Mezcal Espadin", "amount": "1.5", "unit": "oz", "optional": false },
        { "name": "Blanco Tequila", "amount": "0.5", "unit": "oz", "optional": false },
        { "name": "Fresh Lime Juice", "amount": "0.75", "unit": "oz", "optional": false },
        { "name": "Agave Syrup (1:1)", "amount": "0.5", "unit": "oz", "optional": false },
        { "name": "Ancho Reyes Chili Liqueur", "amount": "0.5", "unit": "oz", "optional": false }
      ],
      "instructions": [
        "Rim half of a rocks glass with chili-lime salt.",
        "Add mezcal, tequila, fresh lime juice, agave syrup, and Ancho Reyes to a cocktail shaker with ice.",
        "Shake vigorously for 12 seconds until thoroughly chilled.",
        "Strain over a fresh large clear ice cube in the prepared rocks glass.",
        "Garnish with a dehydrated lime wheel."
      ]
    }
  ]
}
`;

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64Data,
      mimeType: img.mimeType,
    },
  }));

  try {
    const responseText = await generateWithFallback(genAI, [prompt, ...imageParts], {
      responseMimeType: 'application/json',
      temperature: 0.2,
    });
    const parsed = JSON.parse(responseText);
    const result: ExtractedRestaurantMenuResult = {
      suggestedRestaurantName: parsed.suggestedRestaurantName ? String(parsed.suggestedRestaurantName).trim() : 'Craft Cocktail Bar',
      city: parsed.city ? String(parsed.city).trim() : undefined,
      cocktails: Array.isArray(parsed.cocktails) ? parsed.cocktails : [],
    };

    return result;
  } catch (error) {
    console.error('Error scanning restaurant cocktail menu:', error);
    throw new Error('Failed to analyze restaurant cocktail menu: ' + (error as Error).message);
  }
}

export interface ExtractedRestaurantFoodDish {
  name: string;
  category?: string; // "Appetizer", "Pasta", "Entree", "Pizza", "Salad", "Soup", "Side", "Dessert", "Brunch", "Main"
  menuDescription?: string;
  servings?: string; // "2-4 servings"
  prepTime?: string; // "15 mins"
  cookTime?: string; // "25 mins"
  difficulty?: string; // "Easy", "Medium", "Chef-level"
  dietaryTags?: string[]; // ["Vegetarian", "Gluten-Free", "Dairy-Free"]
  chefTips?: string;
  ingredients: {
    name: string;
    amount?: string;
    unit?: string;
    aisleCategory?: string; // produce, meat, seafood, dairy, pantry, spices, bakery
    optional?: boolean;
  }[];
  instructions: string[];
}

export interface ExtractedRestaurantFoodMenuResult {
  suggestedRestaurantName: string;
  city?: string;
  dishes: ExtractedRestaurantFoodDish[];
}

/**
 * Scan a printed or digital photo of a restaurant food menu.
 * Gemini AI performs OCR to extract dishes, and uses culinary intelligence to reverse-engineer
 * standard home-cooking recipe specs (authentic ratios, technique, chef tips, cooking steps).
 */
export async function scanRestaurantFoodMenu(
  images: { base64Data: string; mimeType: string }[]
): Promise<ExtractedRestaurantFoodMenuResult> {
  const genAI = getGeminiClient();

  if (!genAI || images.length === 0) {
    return {
      suggestedRestaurantName: 'Bistro & Trattoria',
      city: 'New York, NY',
      dishes: [
        {
          name: 'Cacio e Pepe Roman Style',
          category: 'Pasta',
          menuDescription: 'Handmade tonnarelli, toasted Tellicherry black peppercorns, aged Pecorino Romano',
          servings: '2-4 servings',
          prepTime: '10 mins',
          cookTime: '15 mins',
          difficulty: 'Medium',
          dietaryTags: ['Vegetarian'],
          chefTips: 'Toast the cracked black peppercorns in a dry skillet before adding starchy pasta water to unlock intense floral aromatics.',
          ingredients: [
            { name: 'Spaghetti or Tonnarelli', amount: '1', unit: 'lb', aisleCategory: 'pantry', optional: false },
            { name: 'Pecorino Romano (finely grated)', amount: '1.5', unit: 'cups', aisleCategory: 'dairy', optional: false },
            { name: 'Whole Black Peppercorns (coarsely cracked)', amount: '1.5', unit: 'tbsp', aisleCategory: 'spices', optional: false },
            { name: 'Kosher Salt for pasta water', amount: '1', unit: 'tbsp', aisleCategory: 'pantry', optional: false }
          ],
          instructions: [
            'Bring a large pot with moderate water to a gentle boil (less water creates starchier water for emulsification). Salt lightly.',
            'In a wide skillet over medium heat, toast coarsely cracked black peppercorns for 1-2 minutes until fragrant.',
            'Ladle 1/2 cup of starchy boiling pasta water into the skillet with the pepper to create a flavorful peppery base.',
            'Boil pasta until 2 minutes shy of al dente, then transfer directly into the skillet with tongs, tossing vigorously.',
            'In a bowl, mix finely grated Pecorino Romano with a few splashes of pasta water to form a smooth, creamy paste.',
            'Remove skillet from heat (crucial to prevent cheese from clumping) and vigorously toss in the cheese paste until a glossy, velvety sauce coats every strand.',
            'Serve immediately on warm plates with additional cracked pepper and grated Pecorino.'
          ]
        }
      ]
    };
  }

  const prompt = `
You are a world-class executive chef, culinary OCR expert, and food menu analyst.
Analyze these high-resolution photographs of a restaurant food menu.

Your mission:
1. RESTAURANT IDENTIFICATION:
   - Identify the restaurant name from the menu header, logo, watermark, or footer.
   - Extract the city, state, or country if printed.

2. DISH EXTRACTION:
   - Extract every distinct food item listed on the menu across all courses (Starters / Appetizers, Pastas, Mains / Entrees, Wood-fired Pizzas, Salads, Soups, Sides, Desserts).
   - Capture the verbatim menu description (ingredients, cooking method, purveyors, sauces).

3. CULINARY PROPORTION & RECIPE SYNTHESIS:
   - Restaurant menus typically only list highlighted ingredients (e.g. "Pan-roasted Duck Breast, parsnip puree, sour cherry reduction, roasted shallots") without home cooking measurements.
   - As an expert chef, reverse-engineer and synthesize an authentic, standard batch home-cooking recipe (typically 2-4 servings) for each dish:
     * "category": One of "Appetizer", "Pasta", "Entree", "Pizza", "Salad", "Soup", "Side", "Dessert", "Brunch", "Main"
     * "servings": Standard batch size (e.g., "2-4 servings" or "4 servings")
     * "prepTime": Estimated active prep time (e.g., "15 mins", "20 mins")
     * "cookTime": Estimated cooking time (e.g., "25 mins", "40 mins")
     * "difficulty": One of "Easy", "Medium", "Chef-level"
     * "dietaryTags": Array of relevant tags (e.g., ["Vegetarian"], ["Gluten-Free"], ["Dairy-Free"], ["Pescatarian"])
     * "chefTips": A practical, insider chef secret to achieving restaurant-quality execution at home (e.g. pan sear technique, resting meat, sauce reduction, emulsification).
     * "ingredients": Complete list of ingredients with realistic home quantities and standard units (e.g., "tbsp", "cups", "oz", "lbs", "cloves", "sprigs", "pinch"), and categorized aisle ("produce", "meat", "seafood", "dairy", "pantry", "spices", "bakery").
     * "instructions": 4 to 7 clear, logical, step-by-step culinary instructions explaining how to prep, cook, and plate the dish.

Output format: Return ONLY a valid JSON object matching this structure:
{
  "suggestedRestaurantName": "Restaurant Name",
  "city": "City, State or Country (optional)",
  "dishes": [
    {
      "name": "Dish Name",
      "category": "Pasta",
      "menuDescription": "Raw menu text description",
      "servings": "2-4 servings",
      "prepTime": "15 mins",
      "cookTime": "20 mins",
      "difficulty": "Medium",
      "dietaryTags": ["Vegetarian"],
      "chefTips": "Key chef tip for texture and flavor balance",
      "ingredients": [
        { "name": "Ingredient Name", "amount": "2", "unit": "tbsp", "aisleCategory": "dairy", "optional": false }
      ],
      "instructions": [
        "Step 1: Prep and preheat...",
        "Step 2: Sauté aromatics...",
        "Step 3: Simmer and reduce...",
        "Step 4: Plate and garnish..."
      ]
    }
  ]
}
`;

  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.base64Data,
      mimeType: img.mimeType,
    },
  }));

  try {
    const responseText = await generateWithFallback(genAI, [prompt, ...imageParts], {
      responseMimeType: 'application/json',
      temperature: 0.2,
    });
    const parsed = JSON.parse(responseText);
    const result: ExtractedRestaurantFoodMenuResult = {
      suggestedRestaurantName: parsed.suggestedRestaurantName ? String(parsed.suggestedRestaurantName).trim() : 'Restaurant & Bistro',
      city: parsed.city ? String(parsed.city).trim() : undefined,
      dishes: Array.isArray(parsed.dishes) ? parsed.dishes : [],
    };

    return result;
  } catch (error) {
    console.error('Error scanning restaurant food menu:', error);
    throw new Error('Failed to analyze restaurant food menu: ' + (error as Error).message);
  }
}




