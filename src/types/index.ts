export interface ExtractedCookbook {
  title: string;
  author?: string;
  edition?: string;
  confidence?: number;
  spineSnippet?: string;
  isCocktailBook?: boolean;
  alreadyInLibrary?: boolean;
}

export interface ExtractedIngredient {
  name: string;
  amount?: string;
  unit?: string;
  optional?: boolean;
}

export interface ExtractedRecipe {
  title: string;
  pageNumber?: number;
  isFact: boolean; // true = confirmed from index/fact, false = inferred
  category?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  ingredients: ExtractedIngredient[];
  sourceUrl?: string;
}

export interface IndexedCookbookData {
  title: string;
  author?: string;
  edition?: string;
  coverColor?: string;
  recipes: ExtractedRecipe[];
  totalRecipes: number;
}

export interface PantryItemData {
  id?: string;
  name: string;
  normalizedName?: string;
  category: 'fridge' | 'freezer' | 'pantry' | 'spices';
  quantity?: string;
  unit?: string;
  isAlwaysAvailable: boolean;
}

export interface MatchedRecipeResult {
  recipeId: string;
  recipeTitle: string;
  pageNumber?: number | null;
  isFact: boolean;
  cookbookId: string;
  cookbookTitle: string;
  cookbookAuthor?: string | null;
  coverColor?: string | null;
  matchScore: number; // 0 to 100%
  totalIngredientsCount: number;
  matchedIngredientsCount: number;
  missingIngredients: string[];
  matchedIngredients: string[];
  matchedPantryMap?: Record<string, string>; // ingredientName -> pantryItemId
  isDessert?: boolean;
}
