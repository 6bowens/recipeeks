'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Search,
  BookOpen,
  Building2,
  UtensilsCrossed,
  Wine,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { deduceBarCategory, isRecognizedBarStaple } from '@/lib/cocktail-utils';

export interface FavoriteItem {
  id: string;
  type: 'recipe' | 'cocktail';
  title: string;
  sourceType: string;
  cookbookTitle?: string;
  restaurantName?: string;
  pageNumber?: number | null;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  glassware?: string;
  ice?: string;
  technique?: string;
  spiritBase?: string;
  flavorProfile?: string;
  instructions?: string[] | string;
  coverImageUrl?: string;
  coverColor?: string;
  recipeId?: string | null;
  restaurantDishId?: string | null;
  restaurantCocktailId?: string | null;
  customRecipeId?: string | null;
  matchScore: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  ingredients: {
    name: string;
    amount?: string | null;
    unit?: string | null;
    optional: boolean;
    isStocked: boolean;
  }[];
  createdAt: string;
}

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'recipe' | 'cocktail';
  onFavoritesChange?: () => void;
}

export function FavoritesModal({
  isOpen,
  onClose,
  initialType = 'recipe',
  onFavoritesChange,
}: FavoritesModalProps) {
  const [activeType, setActiveType] = useState<'recipe' | 'cocktail'>(initialType);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReadiness, setFilterReadiness] = useState<'all' | 'ready' | 'missing1' | 'missing2'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [importingToMise, setImportingToMise] = useState<string | null>(null);

  useEffect(() => {
    setActiveType(initialType);
  }, [initialType]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/favorites?type=${activeType}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (e) {
      console.error('Error fetching favorites:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFavorites();
    }
  }, [isOpen, activeType]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveFavorite = async (fav: FavoriteItem) => {
    try {
      // Optimistically remove from state
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
      showToast(`Removed "${fav.title}" from favourites`);

      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: fav.type,
          title: fav.title,
          action: 'remove',
        }),
      });

      if (onFavoritesChange) onFavoritesChange();
    } catch (e) {
      console.error('Error removing favorite:', e);
      fetchFavorites();
    }
  };

  const handleAddMissingToCart = async (ingredientName: string) => {
    try {
      setAddingToCart(ingredientName);
      if (activeType === 'cocktail') {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ingredientName,
            category: deduceBarCategory(ingredientName),
            isAlwaysAvailable: isRecognizedBarStaple(ingredientName),
          }),
        });
        showToast(`✨ Added "${ingredientName}" to Bar Cart!`);
      } else {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ingredientName,
            category: 'pantry',
          }),
        });
        showToast(`🛒 Added "${ingredientName}" to Grocery / Pantry!`);
      }

      // Re-fetch to update scores
      fetchFavorites();
    } catch (e) {
      alert('Failed to add ingredient: ' + (e as Error).message);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleImportToMise = async (fav: FavoriteItem) => {
    try {
      setImportingToMise(fav.id);
      if (fav.recipeId) {
        const res = await fetch('/api/mise/import-cookbook-recipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: fav.recipeId }),
        });
        if (res.ok) {
          showToast(`🍽️ Imported "${fav.title}" to Mise Playlist!`);
        } else {
          throw new Error('Failed to import');
        }
      } else if (fav.restaurantDishId) {
        const res = await fetch(`/api/food/dishes/${fav.restaurantDishId}/import-to-mise`, {
          method: 'POST',
        });
        if (res.ok) {
          showToast(`🍽️ Imported "${fav.title}" to Mise Playlist!`);
        } else {
          throw new Error('Failed to import');
        }
      }
    } catch (e) {
      alert('Error importing to Mise: ' + (e as Error).message);
    } finally {
      setImportingToMise(null);
    }
  };

  if (!isOpen) return null;

  const filtered = favorites.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.title.toLowerCase().includes(q) ||
      (f.cookbookTitle && f.cookbookTitle.toLowerCase().includes(q)) ||
      (f.restaurantName && f.restaurantName.toLowerCase().includes(q)) ||
      (f.spiritBase && f.spiritBase.toLowerCase().includes(q)) ||
      f.ingredients.some((i) => i.name.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterReadiness === 'ready') return f.matchScore === 100;
    if (filterReadiness === 'missing1') return f.missingIngredients.length === 1;
    if (filterReadiness === 'missing2') return f.missingIngredients.length >= 2;

    return true;
  });

  const isCocktails = activeType === 'cocktail';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-60 bg-charcoal-900 border border-charcoal-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-colors ${
          isCocktails
            ? 'bg-[#0f1117] border-amber-900/40 text-white'
            : 'bg-white border-charcoal-200 text-charcoal-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 sm:p-6 border-b flex items-center justify-between gap-4 ${
            isCocktails
              ? 'bg-[#151922] border-amber-900/30'
              : 'bg-amber-50/70 border-amber-200/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
                isCocktails
                  ? 'bg-gradient-to-tr from-amber-600 to-amber-400 text-charcoal-950'
                  : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white'
              }`}
            >
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif flex items-center gap-2">
                <span>Starred Favourites</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-sans font-semibold ${
                    isCocktails
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {favorites.length} saved
                </span>
              </h2>
              <p className={`text-xs ${isCocktails ? 'text-charcoal-400' : 'text-charcoal-500'} mt-0.5`}>
                Quick access to your all-time favorite recipes and specs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Space Switcher Pill inside Favorites */}
            <div
              className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
                isCocktails
                  ? 'bg-[#0d0f14] border-white/10'
                  : 'bg-white border-charcoal-200'
              }`}
            >
              <button
                onClick={() => setActiveType('recipe')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  !isCocktails
                    ? 'bg-red-800 text-white shadow-xs font-bold'
                    : 'text-charcoal-400 hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Recipes</span>
              </button>
              <button
                onClick={() => setActiveType('cocktail')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  isCocktails
                    ? 'bg-amber-500 text-charcoal-950 shadow-xs font-bold'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                }`}
              >
                <Wine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cocktails</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors ${
                isCocktails
                  ? 'hover:bg-white/10 border-white/10 text-charcoal-400 hover:text-white'
                  : 'hover:bg-charcoal-100 border-charcoal-200 text-charcoal-500 hover:text-charcoal-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div
          className={`p-4 border-b space-y-3 ${
            isCocktails
              ? 'bg-[#0d0f14] border-amber-900/20'
              : 'bg-charcoal-50/50 border-charcoal-200'
          }`}
        >
          <div className="relative">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search favourites by title, cookbook, restaurant or ingredient...`}
              className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-hidden transition-all ${
                isCocktails
                  ? 'bg-[#151922] border-white/10 text-white placeholder:text-charcoal-500 focus:border-amber-400'
                  : 'bg-white border-charcoal-300 text-charcoal-900 placeholder:text-charcoal-400 focus:border-red-600'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${isCocktails ? 'text-charcoal-400' : 'text-charcoal-500'}`}>
              Readiness:
            </span>
            {[
              { id: 'all', label: 'All Favourites' },
              { id: 'ready', label: '✅ 100% Ready to Make' },
              { id: 'missing1', label: '🟡 1 Missing' },
              { id: 'missing2', label: '🔴 2+ Missing' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterReadiness(f.id as any)}
                className={`px-3 py-1 rounded-full border text-xs font-semibold shrink-0 transition-colors ${
                  filterReadiness === f.id
                    ? isCocktails
                      ? 'bg-amber-500 text-charcoal-950 border-amber-400 font-bold'
                      : 'bg-charcoal-900 text-white border-charcoal-900 font-bold'
                    : isCocktails
                    ? 'bg-white/5 border-white/10 text-charcoal-400 hover:text-white'
                    : 'bg-white border-charcoal-200 text-charcoal-600 hover:bg-charcoal-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isCocktails ? 'text-amber-400' : 'text-red-700'}`} />
              <p className="text-xs text-charcoal-400 font-medium">Loading your starred collection...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  isCocktails ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-600'
                }`}
              >
                <Star className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-serif font-bold text-base">No favourites found</h3>
              <p className={`text-xs max-w-sm mx-auto ${isCocktails ? 'text-charcoal-400' : 'text-charcoal-500'}`}>
                {searchQuery || filterReadiness !== 'all'
                  ? 'No favourites match your search or filter criteria.'
                  : `You haven't starred any ${isCocktails ? 'cocktails' : 'food recipes'} yet. Click the star icon (★) on any recipe card to pin it here.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((fav) => {
                const isExpanded = expandedId === fav.id;
                const isReady = fav.matchScore === 100;

                return (
                  <div
                    key={fav.id}
                    className={`rounded-2xl border transition-all ${
                      isCocktails
                        ? 'bg-[#151922] border-white/10 hover:border-amber-500/40'
                        : 'bg-white border-charcoal-200 hover:border-charcoal-300 shadow-xs'
                    }`}
                  >
                    {/* Main Row Header */}
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Origin Badge */}
                          {fav.cookbookTitle ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono ${
                                isCocktails
                                  ? 'bg-amber-900/30 text-amber-300 border border-amber-700/40'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              <BookOpen className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{fav.cookbookTitle}</span>
                              {fav.pageNumber && <span>p.{fav.pageNumber}</span>}
                            </span>
                          ) : fav.restaurantName ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono bg-rose-900/20 text-rose-300 border border-rose-700/40">
                              <Building2 className="w-3 h-3 text-rose-400" />
                              <span className="truncate max-w-[140px]">{fav.restaurantName}</span>
                            </span>
                          ) : fav.spiritBase ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono bg-blue-900/20 text-blue-300 border border-blue-700/40">
                              <Wine className="w-3 h-3" />
                              <span>{fav.spiritBase}</span>
                            </span>
                          ) : null}

                          {/* Match Score Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono ${
                              isReady
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : fav.matchScore >= 50
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span>{fav.matchScore}% Stocked</span>
                          </span>

                          {fav.cookTime && (
                            <span className={`text-[10px] flex items-center gap-1 font-mono ${isCocktails ? 'text-charcoal-400' : 'text-charcoal-500'}`}>
                              <Clock className="w-3 h-3" /> {fav.cookTime}
                            </span>
                          )}

                          {fav.glassware && (
                            <span className="text-[10px] text-amber-300/80 font-mono">
                              🍸 {fav.glassware}
                            </span>
                          )}
                        </div>

                        <h4 className="font-serif font-bold text-base sm:text-lg leading-tight truncate">
                          {fav.title}
                        </h4>

                        {/* Quick Ingredients summary */}
                        <div className="flex items-center gap-1 text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                          <span className={`font-medium ${isCocktails ? 'text-charcoal-400' : 'text-charcoal-500'}`}>
                            Ingredients:
                          </span>
                          <span className={`text-[11px] truncate ${isCocktails ? 'text-charcoal-300' : 'text-charcoal-700'}`}>
                            {fav.ingredients.map((i) => i.name).join(', ')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1-Click Import to Mise (if recipe) */}
                        {fav.type === 'recipe' && (fav.recipeId || fav.restaurantDishId) && (
                          <button
                            onClick={() => handleImportToMise(fav)}
                            disabled={importingToMise === fav.id}
                            title="Add to Mise en Place Dinner Rotation"
                            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                              isCocktails
                                ? 'bg-purple-900/30 border-purple-700 text-purple-300 hover:bg-purple-900/50'
                                : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                            }`}
                          >
                            {importingToMise === fav.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            ) : (
                              <UtensilsCrossed className="w-4 h-4 text-purple-600" />
                            )}
                            <span className="hidden sm:inline">Mise</span>
                          </button>
                        )}

                        {/* Expand / Collapse Details Button */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : fav.id)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isCocktails
                              ? 'bg-white/5 border-white/10 hover:bg-white/10 text-charcoal-300'
                              : 'bg-charcoal-100 border-charcoal-200 hover:bg-charcoal-200 text-charcoal-700'
                          }`}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Unstar / Remove Button */}
                        <button
                          onClick={() => handleRemoveFavorite(fav)}
                          title="Remove from favourites"
                          className="p-2 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-amber-400 hover:text-red-400 transition-colors"
                        >
                          <Star className="w-4 h-4 fill-amber-400 hover:fill-transparent" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <div
                        className={`px-4 pb-4 pt-2 border-t space-y-4 text-xs ${
                          isCocktails
                            ? 'bg-[#0d0f14] border-white/5'
                            : 'bg-charcoal-50/50 border-charcoal-100'
                        }`}
                      >
                        {/* Ingredients Table with + Cart Buttons */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold uppercase tracking-wider font-mono text-[10px] text-charcoal-400">
                              Recipe Spec & Inventory Status
                            </span>
                            {fav.missingIngredients.length > 0 && (
                              <span className="text-[10px] text-amber-400 font-semibold font-mono">
                                {fav.missingIngredients.length} ingredient{fav.missingIngredients.length > 1 ? 's' : ''} needed
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {fav.ingredients.map((ing, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                                  ing.isStocked
                                    ? isCocktails
                                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : isCocktails
                                    ? 'bg-red-950/20 border-red-900/30 text-charcoal-300'
                                    : 'bg-red-50/50 border-red-200 text-charcoal-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {ing.isStocked ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                  )}
                                  <span className="font-medium truncate">
                                    {ing.amount && `${ing.amount} `}
                                    {ing.unit && `${ing.unit} `}
                                    {ing.name}
                                  </span>
                                </div>

                                {!ing.isStocked && (
                                  <button
                                    onClick={() => handleAddMissingToCart(ing.name)}
                                    disabled={addingToCart === ing.name}
                                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 ${
                                      isCocktails
                                        ? 'bg-amber-600/30 hover:bg-amber-600/50 border-amber-500/50 text-amber-200'
                                        : 'bg-charcoal-900 hover:bg-black border-black text-white'
                                    }`}
                                  >
                                    {addingToCart === ing.name ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Plus className="w-3 h-3" />
                                    )}
                                    <span>{isCocktails ? '+ Bar' : '+ Grocery'}</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Instructions (if available) */}
                        {fav.instructions && (
                          <div className="space-y-1.5 pt-2 border-t border-white/5">
                            <span className="font-bold uppercase tracking-wider font-mono text-[10px] text-charcoal-400">
                              Preparation Steps
                            </span>
                            {Array.isArray(fav.instructions) ? (
                              <ol className="list-decimal pl-4 space-y-1 text-charcoal-300">
                                {fav.instructions.map((step, idx) => (
                                  <li key={idx} className="leading-relaxed">
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="leading-relaxed whitespace-pre-line text-charcoal-300">
                                {fav.instructions}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
