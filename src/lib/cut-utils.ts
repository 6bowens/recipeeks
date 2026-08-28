export interface CutCategory {
  id: string;
  label: string;
  icon: string;
  cuts: {
    id: string;
    label: string;
    keywords: string[];
  }[];
}

export const CUT_CATEGORIES: CutCategory[] = [
  {
    id: 'chicken',
    label: 'Chicken',
    icon: '🍗',
    cuts: [
      {
        id: 'chicken-thighs',
        label: 'Chicken Thighs',
        keywords: ['chicken thigh', 'chicken thighs', 'thighs', 'thigh'],
      },
      {
        id: 'chicken-breasts',
        label: 'Chicken Breasts',
        keywords: ['chicken breast', 'chicken breasts', 'breasts', 'breast', 'cutlet', 'cutlets'],
      },
      {
        id: 'ground-chicken',
        label: 'Ground Chicken',
        keywords: ['ground chicken', 'minced chicken'],
      },
      {
        id: 'whole-chicken',
        label: 'Whole Chicken',
        keywords: ['whole chicken', 'roast chicken', 'rotisserie chicken', 'chicken parts'],
      },
      {
        id: 'chicken-wings',
        label: 'Chicken Wings',
        keywords: ['chicken wing', 'chicken wings', 'wings', 'drumettes'],
      },
      {
        id: 'chicken-drumsticks',
        label: 'Drumsticks / Legs',
        keywords: ['drumstick', 'drumsticks', 'chicken leg', 'chicken legs'],
      },
    ],
  },
  {
    id: 'beef',
    label: 'Beef',
    icon: '🥩',
    cuts: [
      {
        id: 'ground-beef',
        label: 'Ground Beef',
        keywords: ['ground beef', 'minced beef', 'hamburger', 'beef mince'],
      },
      {
        id: 'steak',
        label: 'Steak / Ribeye / Strip',
        keywords: ['steak', 'ribeye', 'strip steak', 'sirloin', 'flank steak', 'skirt steak', 'filet mignon', 'tenderloin'],
      },
      {
        id: 'beef-roast-chuck',
        label: 'Chuck Roast / Stew Meat',
        keywords: ['chuck roast', 'stew meat', 'beef chuck', 'pot roast', 'brisket', 'stewing beef', 'beef stew'],
      },
      {
        id: 'short-ribs',
        label: 'Short Ribs',
        keywords: ['short rib', 'short ribs', 'beef ribs'],
      },
    ],
  },
  {
    id: 'pork',
    label: 'Pork',
    icon: '🥓',
    cuts: [
      {
        id: 'pork-chops',
        label: 'Pork Chops / Loin',
        keywords: ['pork chop', 'pork chops', 'pork loin', 'pork tenderloin', 'loin chop'],
      },
      {
        id: 'pork-shoulder',
        label: 'Pork Shoulder / Carnitas',
        keywords: ['pork shoulder', 'pork butt', 'boston butt', 'carnitas', 'pulled pork'],
      },
      {
        id: 'ground-pork',
        label: 'Ground Pork',
        keywords: ['ground pork', 'minced pork', 'pork mince'],
      },
      {
        id: 'bacon-pancetta',
        label: 'Bacon / Pancetta',
        keywords: ['bacon', 'pancetta', 'prosciutto', 'guanciale', 'slab bacon', 'thick-cut bacon'],
      },
      {
        id: 'sausage',
        label: 'Sausage',
        keywords: ['sausage', 'italian sausage', 'chorizo', 'bratwurst', 'andouille', 'kielbasa', 'breakfast sausage'],
      },
    ],
  },
  {
    id: 'seafood',
    label: 'Seafood',
    icon: '🐟',
    cuts: [
      {
        id: 'salmon',
        label: 'Salmon',
        keywords: ['salmon', 'salmon fillet', 'salmon fillets', 'wild salmon', 'smoked salmon'],
      },
      {
        id: 'white-fish',
        label: 'White Fish (Cod/Halibut/Tilapia)',
        keywords: ['cod', 'halibut', 'tilapia', 'sea bass', 'snapper', 'mahi mahi', 'haddock', 'white fish', 'flounder'],
      },
      {
        id: 'shrimp',
        label: 'Shrimp / Prawns',
        keywords: ['shrimp', 'prawn', 'prawns', 'jumbo shrimp'],
      },
      {
        id: 'canned-fish',
        label: 'Canned Tuna / Sardines / Anchovies',
        keywords: ['canned tuna', 'tuna', 'sardine', 'sardines', 'anchovy', 'anchovies', 'tuna in oil'],
      },
      {
        id: 'scallops',
        label: 'Scallops / Mussels / Clams',
        keywords: ['scallop', 'scallops', 'mussel', 'mussels', 'clam', 'clams', 'squid', 'calamari'],
      },
    ],
  },
  {
    id: 'beans-tofu',
    label: 'Beans & Tofu',
    icon: '🫘',
    cuts: [
      {
        id: 'black-beans',
        label: 'Black Beans',
        keywords: ['black bean', 'black beans', 'canned black beans'],
      },
      {
        id: 'chickpeas',
        label: 'Chickpeas / Garbanzo',
        keywords: ['chickpea', 'chickpeas', 'garbanzo', 'garbanzo beans'],
      },
      {
        id: 'lentils',
        label: 'Lentils',
        keywords: ['lentil', 'lentils', 'red lentils', 'brown lentils', 'french green lentils', 'black lentils'],
      },
      {
        id: 'white-beans',
        label: 'White / Cannellini Beans',
        keywords: ['cannellini', 'white bean', 'white beans', 'great northern beans', 'navy beans'],
      },
      {
        id: 'tofu-tempeh',
        label: 'Tofu / Tempeh',
        keywords: ['tofu', 'firm tofu', 'extra-firm tofu', 'silken tofu', 'tempeh'],
      },
    ],
  },
  {
    id: 'pasta-grains',
    label: 'Pasta & Grains',
    icon: '🍝',
    cuts: [
      {
        id: 'pasta',
        label: 'Pasta (Spaghetti/Penne/Rigatoni)',
        keywords: ['pasta', 'spaghetti', 'penne', 'rigatoni', 'fettuccine', 'linguine', 'fusilli', 'macaroni', 'orzo', 'lasagna'],
      },
      {
        id: 'rice',
        label: 'Rice (Jasmine/Basmati/Arborio)',
        keywords: ['rice', 'jasmine rice', 'basmati rice', 'brown rice', 'white rice', 'arborio rice', 'sushi rice'],
      },
      {
        id: 'noodles',
        label: 'Noodles (Ramen/Soba/Rice Noodles)',
        keywords: ['noodle', 'noodles', 'ramen', 'soba', 'rice noodles', 'udon', 'egg noodles'],
      },
      {
        id: 'quinoa-grains',
        label: 'Grains (Quinoa/Farro/Couscous)',
        keywords: ['quinoa', 'farro', 'couscous', 'barley', 'bulgur', 'polenta', 'grits'],
      },
    ],
  },
  {
    id: 'vegetables',
    label: 'Key Veggies',
    icon: '🥦',
    cuts: [
      {
        id: 'mushrooms',
        label: 'Mushrooms (Cremini/Shiitake)',
        keywords: ['mushroom', 'mushrooms', 'cremini', 'shiitake', 'portobello', 'button mushrooms'],
      },
      {
        id: 'spinach-greens',
        label: 'Spinach & Hearty Greens',
        keywords: ['spinach', 'kale', 'swiss chard', 'baby spinach', 'arugula', 'greens', 'collard greens'],
      },
      {
        id: 'broccoli-cauliflower',
        label: 'Broccoli & Cauliflower',
        keywords: ['broccoli', 'cauliflower', 'broccolini', 'broccoli rabe'],
      },
      {
        id: 'potatoes',
        label: 'Potatoes / Sweet Potatoes',
        keywords: ['potato', 'potatoes', 'russet', 'yukon gold', 'sweet potato', 'sweet potatoes', 'fingerling'],
      },
      {
        id: 'tomatoes',
        label: 'Tomatoes (Fresh / Canned)',
        keywords: ['tomato', 'tomatoes', 'cherry tomatoes', 'canned tomatoes', 'crushed tomatoes', 'san marzano', 'roma tomatoes'],
      },
      {
        id: 'zucchini-squash',
        label: 'Zucchini & Squash',
        keywords: ['zucchini', 'butternut squash', 'acorn squash', 'yellow squash', 'summer squash'],
      },
      {
        id: 'cabbage',
        label: 'Cabbage & Brussels Sprouts',
        keywords: ['cabbage', 'red cabbage', 'green cabbage', 'napa cabbage', 'brussels sprouts'],
      },
    ],
  },
  {
    id: 'dairy-eggs',
    label: 'Eggs & Dairy',
    icon: '🧀',
    cuts: [
      {
        id: 'eggs',
        label: 'Eggs',
        keywords: ['egg', 'eggs', 'large eggs'],
      },
      {
        id: 'greek-yogurt',
        label: 'Greek Yogurt / Sour Cream',
        keywords: ['greek yogurt', 'yogurt', 'plain yogurt', 'sour cream', 'creme fraiche'],
      },
      {
        id: 'heavy-cream',
        label: 'Heavy Cream / Coconut Milk',
        keywords: ['heavy cream', 'heavy whipping cream', 'whipping cream', 'coconut milk', 'canned coconut milk'],
      },
    ],
  },
];

/**
 * Checks if a recipe ingredient matches a target cut constraint.
 */
export function matchesCutConstraint(ingredientName: string, targetCut: string): boolean {
  const normIng = ingredientName.toLowerCase().trim();
  const normCut = targetCut.toLowerCase().trim();

  // 1. Direct exact or substring match on cut string
  if (normIng === normCut || normIng.includes(normCut)) {
    return true;
  }

  // 2. Lookup in taxonomy for keyword match
  for (const category of CUT_CATEGORIES) {
    for (const cut of category.cuts) {
      const matchesTarget =
        cut.id === targetCut ||
        cut.label.toLowerCase() === normCut ||
        cut.keywords.some((k) => normCut.includes(k) || k.includes(normCut));

      if (matchesTarget) {
        // Now check if ingredient matches any keyword of this cut
        for (const kw of cut.keywords) {
          if (normIng === kw) return true;
          // Word boundary or token check
          if (normIng.includes(kw)) {
            // Avoid false positives (e.g. "chicken breast" shouldn't match "chicken thigh")
            if (cut.id === 'chicken-thighs' && (normIng.includes('breast') || normIng.includes('ground'))) {
              continue;
            }
            if (cut.id === 'chicken-breasts' && (normIng.includes('thigh') || normIng.includes('ground'))) {
              continue;
            }
            if (cut.id === 'ground-beef' && (normIng.includes('steak') || normIng.includes('roast'))) {
              continue;
            }
            if (cut.id === 'steak' && normIng.includes('ground')) {
              continue;
            }
            return true;
          }
        }
      }
    }
  }

  // 3. Fallback token match
  const cutTokens = normCut.split(' ').filter((t) => t.length > 2);
  if (cutTokens.length > 0) {
    return cutTokens.every((tok) => normIng.includes(tok));
  }

  return false;
}

/**
 * Finds matching cut info for a given ingredient name.
 */
export function identifyCut(ingredientName: string): { categoryId: string; cutId: string; label: string; icon: string } | null {
  const norm = ingredientName.toLowerCase().trim();
  for (const cat of CUT_CATEGORIES) {
    for (const cut of cat.cuts) {
      if (cut.keywords.some((k) => norm.includes(k))) {
        return {
          categoryId: cat.id,
          cutId: cut.id,
          label: cut.label,
          icon: cat.icon,
        };
      }
    }
  }
  return null;
}
