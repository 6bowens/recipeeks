'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Search,
  Camera,
  Building2,
  MapPin,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ChefHat,
  Flame,
  Calendar,
  Filter,
  Check,
  Star,
} from 'lucide-react';
import { FoodMenuScanModal } from '@/components/FoodMenuScanModal';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Dishes' },
  { id: 'pasta', label: 'Pasta', matches: ['pasta', 'noodle', 'risotto', 'gnocchi'] },
  { id: 'entree', label: 'Mains & Entrees', matches: ['entree', 'main', 'chicken', 'beef', 'steak', 'pork', 'fish', 'salmon', 'duck'] },
  { id: 'appetizer', label: 'Appetizers & Starters', matches: ['appetizer', 'starter', 'small plate', 'antipasto', 'tapas', 'crostini'] },
  { id: 'pizza', label: 'Pizza & Flatbreads', matches: ['pizza', 'flatbread', 'calzone'] },
  { id: 'salad', label: 'Salads & Soups', matches: ['salad', 'soup', 'stew', 'chowder', 'broth'] },
  { id: 'dessert', label: 'Desserts', matches: ['dessert', 'cake', 'tiramisu', 'tart', 'pastry', 'panna cotta'] },
];

export function RestaurantDishesDirectory() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all_dishes' | 'by_restaurant'>('all_dishes');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'missing1_2'>('all');
  const [showScanModal, setShowScanModal] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);
  const [addingIng, setAddingIng] = useState<string | null>(null);
  const [importingDishId, setImportingDishId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Favorites state
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites?type=recipe');
      if (res.ok) {
        const data = await res.json();
        setFavoriteKeys(new Set(data.favoriteKeys || []));
      }
    } catch {}
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleToggleFavorite = async (dish: any) => {
    const key = dish.id;
    const isFav = favoriteKeys.has(key) || favoriteKeys.has(dish.name.toLowerCase().trim());

    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(key);
        next.delete(dish.name.toLowerCase().trim());
        setToastMessage(`Removed "${dish.name}" from favourites`);
      } else {
        next.add(key);
        next.add(dish.name.toLowerCase().trim());
        setToastMessage(`★ Added "${dish.name}" to favourites!`);
      }
      return next;
    });
    setTimeout(() => setToastMessage(null), 3000);

    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'recipe',
          title: dish.name,
          sourceType: 'restaurant',
          restaurantDishId: dish.id,
        }),
      });
    } catch (e) {
      console.error('Error toggling dish favorite:', e);
      fetchFavorites();
    }
  };

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const url = searchQuery
        ? `/api/food/menus?q=${encodeURIComponent(searchQuery)}`
        : '/api/food/menus';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMenus(data.menus || []);
        if (data.menus?.length > 0 && !expandedMenuId) {
          setExpandedMenuId(data.menus[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [searchQuery]);

  const handleAddToGrocery = async (ingName: string, aisle: string = 'pantry') => {
    try {
      setAddingIng(ingName);
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingName,
          category: aisle || 'pantry',
          quantity: '1',
        }),
      });

      if (!res.ok) throw new Error('Failed to add to grocery list');

      setToastMessage(`✓ Added "${ingName}" to your Pantry & Grocery List!`);
      setTimeout(() => setToastMessage(null), 3000);
      await fetchMenus();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAddingIng(null);
    }
  };

  const handleImportToMise = async (dishId: string, dishName: string) => {
    try {
      setImportingDishId(dishId);
      const res = await fetch(`/api/food/dishes/${dishId}/import-to-mise`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import to Mise');

      setToastMessage(`✓ Added "${dishName}" to your Mise en Place Dinner Rotation!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setImportingDishId(null);
    }
  };

  const handleDeleteMenu = async (menuId: string, restaurantName: string) => {
    if (!confirm(`Delete restaurant menu for "${restaurantName}"?`)) return;
    try {
      const res = await fetch(`/api/food/menus/${menuId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete');
      }
      await fetchMenus();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // Flatten all dishes with restaurant parent details
  const allFlattenedDishes = useMemo(() => {
    const list: any[] = [];
    menus.forEach((menu) => {
      (menu.dishes || []).forEach((d: any) => {
        list.push({
          ...d,
          restaurantName: menu.restaurantName,
          restaurantCity: menu.city,
          menuNotes: menu.notes,
          menuId: menu.id,
          contributedBy: menu.contributedBy,
          isOwner: menu.isOwner,
        });
      });
    });
    return list;
  }, [menus]);

  // Filter flattened dishes based on category, readiness, and search
  const filteredDishes = useMemo(() => {
    return allFlattenedDishes.filter((d) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const filterDef = CATEGORY_FILTERS.find((f) => f.id === selectedCategory);
        if (filterDef && filterDef.matches) {
          const catNorm = (d.category || '').toLowerCase();
          const nameNorm = (d.name || '').toLowerCase();
          const matches = filterDef.matches.some(
            (m) => catNorm.includes(m) || nameNorm.includes(m)
          );
          if (!matches) return false;
        }
      }

      // Readiness filter
      if (readinessFilter === 'ready' && d.matchScore < 100) return false;
      if (readinessFilter === 'missing1_2') {
        const missingCount = (d.ingredients || []).filter((i: any) => !i.isStocked).length;
        if (missingCount === 0 || missingCount > 2) return false;
      }

      return true;
    });
  }, [allFlattenedDishes, selectedCategory, readinessFilter]);

  const readyCount = allFlattenedDishes.filter((d) => d.matchScore === 100).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#201015] via-[#160c10] to-[#251218] border border-red-900/40 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-500/20 border border-red-400/30 text-rose-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5 font-mono">
              <Building2 className="w-3.5 h-3.5 text-rose-400" /> Global Restaurant Menus
            </span>
            <span className="text-xs text-rose-300/60 font-mono">Shared Culinary Library</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
            Restaurant & Trattoria Recipes
          </h2>
          <p className="text-xs sm:text-sm text-rose-100/70 leading-relaxed">
            Snap photos of menus from your favorite restaurants around the world. Gemini AI reverse-engineers the culinary specs, home ratios, and chef techniques—shared globally across all chefs.
          </p>
        </div>

        <button
          onClick={() => setShowScanModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>📸 Scan Food Menu</span>
        </button>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="bg-[#151013] border border-red-900/30 rounded-2xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('all_dishes')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'all_dishes'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-rose-300/60 hover:text-rose-200'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>All Restaurant Dishes ({allFlattenedDishes.length})</span>
            </button>

            <button
              onClick={() => setViewMode('by_restaurant')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'by_restaurant'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md'
                  : 'text-rose-300/60 hover:text-rose-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>By Restaurant ({menus.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400/50" />
            <input
              type="text"
              placeholder="Search dishes, restaurants, cities, or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d090b] border border-red-900/40 text-white rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-rose-500 placeholder:text-rose-300/40 shadow-inner"
            />
          </div>
        </div>

        {/* Filters Bar */}
        {viewMode === 'all_dishes' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-rose-300/50 font-mono mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Category:
              </span>
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedCategory(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    selectedCategory === f.id
                      ? 'bg-red-500/20 text-rose-300 border border-red-500/40'
                      : 'bg-white/5 text-rose-200/60 hover:text-white border border-transparent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Readiness Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setReadinessFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                  readinessFilter === 'all'
                    ? 'bg-red-500/20 text-rose-300 border border-red-500/40'
                    : 'bg-white/5 text-rose-200/60 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setReadinessFilter('ready')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                  readinessFilter === 'ready'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                    : 'bg-white/5 text-emerald-400/60 hover:text-emerald-300'
                }`}
              >
                ✨ 100% Pantry Ready ({readyCount})
              </button>
              <button
                onClick={() => setReadinessFilter('missing1_2')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                  readinessFilter === 'missing1_2'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/60'
                    : 'bg-white/5 text-amber-400/60 hover:text-amber-300'
                }`}
              >
                Missing 1-2
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Stream */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
          <p className="text-xs text-rose-300/60 font-mono">Loading restaurant dishes & culinary specs...</p>
        </div>
      ) : allFlattenedDishes.length === 0 ? (
        <div className="bg-[#151013] border border-red-900/30 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-xl">
          <Utensils className="w-12 h-12 mx-auto text-rose-500/40" />
          <h3 className="text-lg font-bold text-white">No Restaurant Dishes Found</h3>
          <p className="text-xs text-rose-200/70 max-w-md mx-auto">
            {searchQuery
              ? `No dishes match "${searchQuery}". Try a different search term.`
              : 'Be the first to scan a food menu from your favorite bistro or trattoria!'}
          </p>
          <button
            onClick={() => setShowScanModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan First Food Menu</span>
          </button>
        </div>
      ) : viewMode === 'all_dishes' ? (
        /* FLAT ALL DISHES GRID VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-rose-300/70 font-mono">
            <span>Showing {filteredDishes.length} of {allFlattenedDishes.length} imported dishes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDishes.map((dish) => {
              const isDishExpanded = expandedDishId === dish.id;

              return (
                <div
                  key={dish.id}
                  className="bg-[#151013] border border-red-900/30 rounded-3xl p-5 space-y-4 shadow-xl hover:border-rose-500/40 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Origin & Match Score */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-red-500/20 text-rose-300 border border-red-500/30 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                          <Building2 className="w-3 h-3 text-rose-400" />
                          <span>{dish.restaurantName}</span>
                          {dish.restaurantCity && <span>· {dish.restaurantCity}</span>}
                        </span>

                        <span className="bg-rose-950/60 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono border border-rose-800/40">
                          {dish.category || 'Main'}
                        </span>

                        {dish.difficulty && (
                          <span className="bg-white/5 text-rose-200/70 text-[10px] px-2 py-0.5 rounded font-mono">
                            {dish.difficulty}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Pantry Match Readiness Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono shrink-0 ${
                            dish.matchScore === 100
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                              : dish.matchScore >= 50
                              ? 'bg-blue-950 text-blue-300 border border-blue-600/60'
                              : 'bg-white/5 text-rose-200/60 border border-white/10'
                          }`}
                        >
                          {dish.matchScore}% Pantry Ready
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(dish);
                          }}
                          title={
                            favoriteKeys.has(dish.id) || favoriteKeys.has(dish.name.toLowerCase().trim())
                              ? 'Remove from favourites'
                              : 'Star as favourite'
                          }
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            favoriteKeys.has(dish.id) || favoriteKeys.has(dish.name.toLowerCase().trim())
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'
                              : 'bg-white/5 border-white/10 text-charcoal-400 hover:text-amber-400 hover:border-amber-400/40 hover:bg-white/10'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              favoriteKeys.has(dish.id) || favoriteKeys.has(dish.name.toLowerCase().trim())
                                ? 'fill-amber-400'
                                : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Dish Title & Description */}
                    <div>
                      <h4 className="text-lg font-serif font-bold text-white leading-tight">
                        {dish.name}
                      </h4>
                      {dish.menuDescription && (
                        <p className="text-xs text-rose-100/70 italic mt-0.5 line-clamp-2 leading-relaxed">
                          {dish.menuDescription}
                        </p>
                      )}
                    </div>

                    {/* Meta Specs: Prep, Cook, Servings */}
                    <div className="flex items-center gap-3 text-[11px] text-rose-200/60 py-1.5 border-y border-white/5 font-mono">
                      <span>⏱️ <strong className="text-rose-300 font-sans">Prep:</strong> {dish.prepTime || '15m'}</span>
                      <span>🔥 <strong className="text-rose-300 font-sans">Cook:</strong> {dish.cookTime || '25m'}</span>
                      <span>🍽️ <strong className="text-rose-300 font-sans">Serves:</strong> {dish.servings || '2-4'}</span>
                    </div>

                    {/* Chef Tip */}
                    {dish.chefTips && (
                      <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-2.5 text-xs text-rose-200/90 flex items-start gap-2">
                        <span className="text-amber-400 font-bold shrink-0">💡</span>
                        <p className="italic leading-snug">{dish.chefTips}</p>
                      </div>
                    )}

                    {/* Ingredients List */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono block">
                        Recipe Ingredients:
                      </span>
                      <div className="grid grid-cols-1 gap-1">
                        {dish.ingredients.map((ing: any) => (
                          <div
                            key={ing.id}
                            className={`rounded-xl px-2.5 py-1.5 text-xs flex items-center justify-between border ${
                              ing.isStocked
                                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-100 font-medium'
                                : 'bg-black/40 border-white/5 text-white/90'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  ing.isStocked ? 'bg-emerald-400' : 'bg-rose-500/50'
                                }`}
                              />
                              <span className="truncate">{ing.name}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {(ing.amount || ing.unit) && (
                                <span className="text-rose-300 font-mono text-[11px] font-bold">
                                  {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                </span>
                              )}

                              {!ing.isStocked && (
                                <button
                                  onClick={() => handleAddToGrocery(ing.name, ing.aisleCategory)}
                                  disabled={addingIng === ing.name}
                                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 cursor-pointer transition-all active:scale-95"
                                  title="Add to your Grocery List / Pantry"
                                >
                                  {addingIng === ing.name ? '...' : '+ Grocery'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Method & Cooking Steps */}
                    {dish.instructions && dish.instructions.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={() => setExpandedDishId(isDishExpanded ? null : dish.id)}
                          className="text-[11px] text-rose-400/80 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isDishExpanded ? 'Hide Recipe Instructions' : 'View Cooking Steps'}</span>
                          {isDishExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {isDishExpanded && (
                          <div className="mt-2 p-3.5 bg-black/50 border border-white/5 rounded-2xl space-y-2 text-xs text-rose-100/90 leading-relaxed animate-in fade-in">
                            <ol className="list-decimal list-inside space-y-1.5">
                              {dish.instructions.map((stepText: string, sIdx: number) => (
                                <li key={sIdx}>{stepText}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1-Click Import to Mise en Place Button */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-end">
                    <button
                      onClick={() => handleImportToMise(dish.id, dish.name)}
                      disabled={importingDishId === dish.id}
                      className="w-full py-2 bg-gradient-to-r from-red-700/60 to-rose-700/60 hover:from-red-600 hover:to-rose-600 border border-rose-500/40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-rose-300" />
                      <span>{importingDishId === dish.id ? 'Adding to Mise...' : 'Add to Mise en Place Dinner Rotation'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* GROUPED BY RESTAURANT VIEW */
        <div className="space-y-4">
          {menus.map((menu) => {
            const isMenuExpanded = expandedMenuId === menu.id;

            return (
              <div
                key={menu.id}
                className="bg-[#151013] border border-red-900/30 rounded-3xl overflow-hidden shadow-xl transition-all"
              >
                {/* Menu Header */}
                <div
                  onClick={() => setExpandedMenuId(isMenuExpanded ? null : menu.id)}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/5"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-red-500/20 text-rose-300 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-rose-400" />
                        <span>{menu.restaurantName}</span>
                      </span>
                      {menu.city && (
                        <span className="text-rose-200/70 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-400/80" /> {menu.city}
                        </span>
                      )}
                      <span className="text-[10px] text-rose-200/40">
                        Added by {menu.contributedBy}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif font-bold text-white truncate">
                      {menu.restaurantName}
                    </h3>
                    {menu.notes && (
                      <p className="text-xs text-rose-200/70 italic line-clamp-1">{menu.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-red-950/60 border border-red-800/40 text-rose-300 text-xs font-mono font-bold px-3 py-1 rounded-xl">
                      {menu.totalDishes} Dishes
                    </span>

                    {menu.isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMenu(menu.id, menu.restaurantName);
                        }}
                        className="p-2 text-red-400/60 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Delete Menu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="p-2 rounded-xl bg-white/5 text-rose-300/80">
                      {isMenuExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Dishes inside Menu */}
                {isMenuExpanded && (
                  <div className="p-5 sm:p-6 bg-[#0e090b] space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {menu.dishes.map((dish: any) => {
                        const isDishExpanded = expandedDishId === dish.id;

                        return (
                          <div
                            key={dish.id}
                            className="bg-[#181215] border border-red-900/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md hover:border-rose-500/40 transition-colors flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="bg-rose-950/60 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono border border-rose-800/40">
                                    {dish.category}
                                  </span>
                                  <h4 className="text-base font-serif font-bold text-white mt-1">
                                    {dish.name}
                                  </h4>
                                </div>

                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                                    dish.matchScore === 100
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                      : dish.matchScore >= 50
                                      ? 'bg-blue-950/80 text-blue-300 border border-blue-700/60'
                                      : 'bg-white/5 text-rose-200/60 border border-white/10'
                                  }`}
                                >
                                  {dish.matchScore}% Pantry Stock
                                </span>
                              </div>

                              {dish.menuDescription && (
                                <p className="text-xs text-rose-100/70 italic leading-relaxed">
                                  {dish.menuDescription}
                                </p>
                              )}

                              {/* Ingredients */}
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono block">
                                  Ingredients:
                                </span>
                                <div className="grid grid-cols-1 gap-1">
                                  {dish.ingredients.map((ing: any) => (
                                    <div
                                      key={ing.id}
                                      className={`rounded-lg px-2.5 py-1 text-xs flex items-center justify-between border ${
                                        ing.isStocked
                                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-100'
                                          : 'bg-black/40 border-white/5 text-white/90'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${ing.isStocked ? 'bg-emerald-400' : 'bg-rose-500/50'}`} />
                                        <span className="truncate">{ing.name}</span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {(ing.amount || ing.unit) && (
                                          <span className="text-rose-300 font-mono text-[11px] font-bold">
                                            {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                          </span>
                                        )}

                                        {!ing.isStocked && (
                                          <button
                                            onClick={() => handleAddToGrocery(ing.name, ing.aisleCategory)}
                                            disabled={addingIng === ing.name}
                                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 cursor-pointer transition-all"
                                            title="Add to Grocery List"
                                          >
                                            {addingIng === ing.name ? '...' : '+ Grocery'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Toggle Method */}
                              {dish.instructions && dish.instructions.length > 0 && (
                                <div className="pt-1">
                                  <button
                                    onClick={() => setExpandedDishId(isDishExpanded ? null : dish.id)}
                                    className="text-[11px] text-rose-400/80 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{isDishExpanded ? 'Hide Steps' : 'View Cooking Steps'}</span>
                                    {isDishExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  {isDishExpanded && (
                                    <div className="mt-2 p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 text-xs text-rose-100/90 leading-relaxed animate-in fade-in">
                                      <ol className="list-decimal list-inside space-y-1">
                                        {dish.instructions.map((stepText: string, sIdx: number) => (
                                          <li key={sIdx}>{stepText}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="pt-2 border-t border-white/5">
                              <button
                                onClick={() => handleImportToMise(dish.id, dish.name)}
                                disabled={importingDishId === dish.id}
                                className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Calendar className="w-3.5 h-3.5 text-rose-300" />
                                <span>{importingDishId === dish.id ? 'Adding...' : 'Import to Mise en Place'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Food Menu Scan Modal */}
      <FoodMenuScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onMenuSaved={() => fetchMenus()}
      />
    </div>
  );
}
