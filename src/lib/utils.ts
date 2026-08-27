import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeIngredientName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(fresh|dried|chopped|minced|sliced|diced|ground|crushed|whole|organic)\s+/, '')
    .trim();
}

/**
 * Common household kitchen essentials & pantry staples.
 */
export const KITCHEN_STAPLES = [
  'milk', 'whole milk', 'skim milk', 'almond milk', 'oat milk', 'heavy cream', 'cream', 'half and half',
  'butter', 'unsalted butter', 'salted butter', 'ghee',
  'eggs', 'egg', 'large eggs',
  'olive oil', 'extra virgin olive oil', 'vegetable oil', 'canola oil', 'neutral oil', 'avocado oil', 'sesame oil', 'coconut oil',
  'kosher salt', 'sea salt', 'table salt', 'salt', 'fine salt', 'flaky sea salt',
  'black pepper', 'ground black pepper', 'black peppercorns', 'pepper', 'white pepper',
  'garlic', 'garlic cloves', 'fresh garlic', 'garlic powder',
  'onions', 'onion', 'yellow onion', 'red onion', 'white onion', 'shallots', 'shallot', 'onion powder',
  'flour', 'all-purpose flour', 'ap flour', 'bread flour',
  'sugar', 'granulated sugar', 'white sugar', 'brown sugar', 'powdered sugar', 'honey', 'maple syrup',
  'baking powder', 'baking soda', 'yeast', 'active dry yeast',
  'soy sauce', 'tamari', 'fish sauce', 'worcestershire sauce',
  'vinegar', 'apple cider vinegar', 'white vinegar', 'red wine vinegar', 'balsamic vinegar', 'rice vinegar',
  'lemons', 'lemon', 'lemon juice', 'limes', 'lime', 'lime juice',
  'mayonnaise', 'dijon mustard', 'mustard', 'ketchup', 'hot sauce', 'sriracha',
  'chicken broth', 'chicken stock', 'vegetable broth', 'vegetable stock', 'beef broth',
  'parmesan cheese', 'parmesan', 'parmigiano-reggiano', 'pecorino',
  'dried oregano', 'oregano', 'dried thyme', 'thyme', 'red pepper flakes', 'chili flakes', 'paprika', 'smoked paprika', 'ground cumin', 'cumin', 'chili powder', 'bay leaves', 'cinnamon',
  'vanilla extract', 'vanilla'
];

export function isRecognizedKitchenStaple(name: string): boolean {
  const norm = normalizeIngredientName(name);
  if (!norm) return false;
  return KITCHEN_STAPLES.some((staple) => {
    const sNorm = normalizeIngredientName(staple);
    return norm === sNorm || norm.includes(sNorm) || sNorm.includes(norm);
  });
}

/**
 * Robust classification for Sweet Desserts vs Savory Dishes
 */
export const DESSERT_KEYWORDS = [
  'cake', 'cupcake', 'pie', 'tart', 'tarte', 'cookie', 'cookies', 'blondie', 'blondies', 'brownie', 'brownies',
  'babka', 'kouign-amann', 'bar', 'bars', 'sponge', 'traybake', 'fudge', 'eclair', 'éclair',
  'flapjack', 'flapjacks', 'shortbread', 'doughnut', 'doughnuts', 'donut', 'donuts', 'nanaimo',
  'cinnamon roll', 'meringue', 'cream puff', 'pudding', 'mousse', 'cobbler', 'ice cream', 'sorbet',
  'parfait', 'cheesecake', 'crumble', 'macaron', 'macaroons', 'ganache', 'frosting', 'caramel',
  'marshmallow', 'truffle', 'truffles', 'sweet', 'custard', 'pastry', 'profiterole', 'clootie dumpling', 'tablet',
  'scone', 'scones', 'saskatoon berry', 'gumdrop', 'halvah', 'molasses', 'chocolate chip', 'pavlova',
  'galette', 'tiramisu', 'gelato', 'panna cotta', 'churro', 'waffle', 'crêpe', 'crepe', 'beignet', 'strudel'
];

export const SAVORY_KEYWORDS = [
  'focaccia', 'soda bread', 'white bread', 'wheat bread', 'levain', 'pain de campagne', 'field blend',
  'baguette', 'sourdough', 'pizza', 'black pudding', 'miso biscuit', 'seaweed scone', 'roast', 'stew', 'soup', 'salad'
];

export function isDessertRecipe(recipe: { title: string; category?: string | null }, cookbookTitle?: string | null): boolean {
  const cat = (recipe.category || '').toLowerCase().trim();
  const title = (recipe.title || '').toLowerCase().trim();
  const book = (cookbookTitle || '').toLowerCase().trim();

  if (['dessert', 'desserts', 'cakes', 'pie', 'pies', 'confectionery', 'sweets', 'sweet treats'].includes(cat)) {
    return true;
  }

  if (SAVORY_KEYWORDS.some((k) => title.includes(k))) {
    return false;
  }

  if (DESSERT_KEYWORDS.some((k) => title.includes(k))) {
    return true;
  }

  if (book.includes('dessert person') || book.includes('bake off') || book.includes('baking')) {
    if (!title.includes('bread') && !title.includes('focaccia') && !title.includes('pizza') && !title.includes('biscuit')) {
      return true;
    }
  }

  return false;
}

/**
 * Robust Multi-Tier High-Res Cover Artwork Lookup
 * Queries Google Books API with progressive search heuristics & Open Library
 */
export async function fetchRealBookCover(title: string, author?: string): Promise<string | null> {
  if (!title) return null;

  // Clean primary title: remove subtitle after colon/dash, remove punctuation
  const cleanTitle = title.replace(/[:\-–—].*$/, '').replace(/[^\w\s]/g, '').trim();
  const primaryAuthor = author ? author.split(/[,&]/)[0].replace(/by\s+/i, '').trim() : '';

  const queries = [
    // 1. Title + Author combined
    primaryAuthor ? `intitle:${encodeURIComponent(cleanTitle)}+inauthor:${encodeURIComponent(primaryAuthor)}` : null,
    // 2. Clean short title + author plain search
    primaryAuthor ? encodeURIComponent(`${cleanTitle} ${primaryAuthor}`) : null,
    // 3. Just the clean main title
    `intitle:${encodeURIComponent(cleanTitle)}`,
    // 4. Raw title & author
    encodeURIComponent(`${title} ${author || ''}`.trim()),
  ].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      const gbooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`;
      const res = await fetch(gbooksUrl, { next: { revalidate: 86400 } });
      if (res.ok) {
        const data = await res.json();
        for (const item of data.items || []) {
          const imageLinks = item?.volumeInfo?.imageLinks;
          if (imageLinks) {
            let coverUrl =
              imageLinks.extraLarge ||
              imageLinks.large ||
              imageLinks.medium ||
              imageLinks.small ||
              imageLinks.thumbnail;

            if (coverUrl) {
              return coverUrl
                .replace(/^http:\/\//i, 'https://')
                .replace('&edge=curl', '')
                .replace(/zoom=\d/, 'zoom=1');
            }
          }
        }
      }
    } catch (e) {
      // try next query
    }
  }

  // Fallback: Open Library Covers API
  try {
    const olQuery = encodeURIComponent(cleanTitle || title);
    const olUrl = `https://openlibrary.org/search.json?title=${olQuery}&limit=3`;
    const olRes = await fetch(olUrl);
    if (olRes.ok) {
      const olData = await olRes.json();
      for (const doc of olData.docs || []) {
        if (doc.cover_i) {
          return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        }
      }
    }
  } catch (error) {
    console.warn(`Open Library cover search failed for "${title}":`, error);
  }

  return null;
}

// Generate consistent book cover colors based on title hash
export function generateCoverColor(title: string): string {
  const colors = [
    '#991b1b', // crimson red
    '#881337', // deep rose / wine
    '#7f1d1d', // dark burgundy
    '#b91c1c', // rich red
    '#581c87', // royal plum
    '#312e81', // indigo navy
    '#1e293b', // slate charcoal
    '#4c0519', // midnight maroon
    '#78350f', // deep amber umber
    '#831843', // ruby wine
  ];

  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
