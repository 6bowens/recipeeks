'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wine,
  Search,
  Camera,
  Building2,
  MapPin,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  GlassWater,
  Flame,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Share2,
  AlertCircle,
  Filter,
  Star,
} from 'lucide-react';
import { MenuScanModal } from '@/components/MenuScanModal';

const SPIRIT_FILTERS = [
  { id: 'all', label: 'All Spirits' },
  { id: 'whiskey', label: 'Bourbon / Rye', matches: ['whiskey', 'bourbon', 'rye', 'scotch'] },
  { id: 'gin', label: 'Gin', matches: ['gin'] },
  { id: 'agave', label: 'Tequila / Mezcal', matches: ['tequila', 'mezcal', 'agave'] },
  { id: 'rum', label: 'Rum', matches: ['rum', 'cachaça', 'cachaca'] },
  { id: 'vodka', label: 'Vodka', matches: ['vodka'] },
  { id: 'amaro', label: 'Amaro / Liqueur', matches: ['amaro', 'campari', 'aperol', 'liqueur', 'vermouth'] },
];

export function RestaurantMenusDirectory() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all_cocktails' | 'by_restaurant'>('all_cocktails');
  const [selectedSpiritFilter, setSelectedSpiritFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'missing1_2'>('all');
  const [showScanModal, setShowScanModal] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [expandedDrinkId, setExpandedDrinkId] = useState<string | null>(null);
  const [addingIng, setAddingIng] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Favorites state
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites?type=cocktail');
      if (res.ok) {
        const data = await res.json();
        setFavoriteKeys(new Set(data.favoriteKeys || []));
      }
    } catch {}
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleToggleFavorite = async (cocktail: any) => {
    const key = cocktail.id;
    const isFav = favoriteKeys.has(key) || favoriteKeys.has(cocktail.name.toLowerCase().trim());

    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(key);
        next.delete(cocktail.name.toLowerCase().trim());
        setToastMessage(`Removed "${cocktail.name}" from favourites`);
      } else {
        next.add(key);
        next.add(cocktail.name.toLowerCase().trim());
        setToastMessage(`★ Added "${cocktail.name}" to favourites!`);
      }
      return next;
    });
    setTimeout(() => setToastMessage(null), 3000);

    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cocktail',
          title: cocktail.name,
          sourceType: 'restaurant',
          restaurantCocktailId: cocktail.id,
          metadata: {
            spiritBase: cocktail.spiritBase,
            flavorProfile: cocktail.flavorProfile,
            glassware: cocktail.glassware,
            ice: cocktail.ice,
            technique: cocktail.technique,
            garnish: cocktail.garnish,
            instructions: cocktail.instructions,
            ingredients: cocktail.ingredients,
            restaurantName: cocktail.menu?.restaurantName,
          },
        }),
      });
    } catch (e) {
      console.error('Error toggling cocktail favorite:', e);
      fetchFavorites();
    }
  };

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const url = searchQuery
        ? `/api/cocktails/menus?q=${encodeURIComponent(searchQuery)}`
        : '/api/cocktails/menus';
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

  const handleAddToBar = async (ingName: string) => {
    try {
      setAddingIng(ingName);
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingName,
          category: 'spirits',
          quantity: '1 bottle',
        }),
      });

      if (!res.ok) throw new Error('Failed to add to bar');

      setToastMessage(`✓ Added "${ingName}" to your Bar Cart!`);
      setTimeout(() => setToastMessage(null), 3000);
      await fetchMenus();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAddingIng(null);
    }
  };

  const handleDeleteMenu = async (menuId: string, restaurantName: string) => {
    if (!confirm(`Delete restaurant menu for "${restaurantName}"?`)) return;
    try {
      const res = await fetch(`/api/cocktails/menus/${menuId}`, {
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

  // Flatten all imported cocktails with their parent restaurant info attached
  const allFlattenedCocktails = useMemo(() => {
    const list: any[] = [];
    menus.forEach((menu) => {
      (menu.cocktails || []).forEach((c: any) => {
        list.push({
          ...c,
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

  // Filter flattened cocktails based on spirit, readiness, and search query
  const filteredCocktails = useMemo(() => {
    return allFlattenedCocktails.filter((c) => {
      // Spirit filter
      if (selectedSpiritFilter !== 'all') {
        const filterDef = SPIRIT_FILTERS.find((f) => f.id === selectedSpiritFilter);
        if (filterDef && filterDef.matches) {
          const spiritNorm = (c.spiritBase || '').toLowerCase();
          const nameNorm = (c.name || '').toLowerCase();
          const ingsNorm = (c.ingredients || []).map((i: any) => i.name.toLowerCase()).join(' ');
          const matches = filterDef.matches.some(
            (m) => spiritNorm.includes(m) || nameNorm.includes(m) || ingsNorm.includes(m)
          );
          if (!matches) return false;
        }
      }

      // Readiness filter
      if (readinessFilter === 'ready' && c.matchScore < 100) return false;
      if (readinessFilter === 'missing1_2') {
        const missingCount = (c.ingredients || []).filter((i: any) => !i.isStocked).length;
        if (missingCount === 0 || missingCount > 2) return false;
      }

      return true;
    });
  }, [allFlattenedCocktails, selectedSpiritFilter, readinessFilter]);

  const readyCount = allFlattenedCocktails.filter((c) => c.matchScore === 100).length;

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
      <div className="bg-gradient-to-r from-[#1c1214] via-[#140e10] to-[#241318] border border-amber-900/40 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5 font-mono">
              <Building2 className="w-3.5 h-3.5 text-amber-400" /> Global Restaurant Cocktails
            </span>
            <span className="text-xs text-amber-400/60 font-mono">Community Speakeasy Directory</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
            Imported Restaurant Cocktails
          </h2>
          <p className="text-xs sm:text-sm text-amber-200/70 leading-relaxed">
            Browse all cocktails imported from restaurant menus around the world with synthesized craft ratios, glassware, and step-by-step methods matched against your home bar cart.
          </p>
        </div>

        <button
          onClick={() => setShowScanModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>📸 Scan New Menu</span>
        </button>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="bg-[#140e10] border border-amber-900/30 rounded-2xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('all_cocktails')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'all_cocktails'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
                  : 'text-amber-300/60 hover:text-amber-200'
              }`}
            >
              <Wine className="w-3.5 h-3.5" />
              <span>All Imported Cocktails ({allFlattenedCocktails.length})</span>
            </button>

            <button
              onClick={() => setViewMode('by_restaurant')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'by_restaurant'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md'
                  : 'text-amber-300/60 hover:text-amber-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>By Restaurant ({menus.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400/50" />
            <input
              type="text"
              placeholder="Search cocktails, restaurants, cities, or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0e0a0c] border border-amber-900/40 text-white rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-amber-500 placeholder:text-amber-300/40 shadow-inner"
            />
          </div>
        </div>

        {/* Filters Bar (when in All Cocktails view) */}
        {viewMode === 'all_cocktails' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
            {/* Spirit Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-amber-300/50 font-mono mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Spirit:
              </span>
              {SPIRIT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedSpiritFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    selectedSpiritFilter === f.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-amber-200/60 hover:text-white border border-transparent'
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
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-white/5 text-amber-200/60 hover:text-white'
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
                ✨ 100% Ready ({readyCount})
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

      {/* Directory Content */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs text-amber-300/60 font-mono">Loading imported restaurant cocktails...</p>
        </div>
      ) : allFlattenedCocktails.length === 0 ? (
        <div className="bg-[#140e10] border border-amber-900/30 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-xl">
          <Wine className="w-12 h-12 mx-auto text-amber-500/40" />
          <h3 className="text-lg font-bold text-white">No Restaurant Cocktails Found</h3>
          <p className="text-xs text-amber-200/70 max-w-md mx-auto">
            {searchQuery
              ? `No drinks match "${searchQuery}". Try a different search keyword.`
              : 'Be the first to scan a cocktail menu from your favorite restaurant or speakeasy!'}
          </p>
          <button
            onClick={() => setShowScanModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan First Menu</span>
          </button>
        </div>
      ) : viewMode === 'all_cocktails' ? (
        /* FLAT ALL COCKTAILS GRID VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-amber-300/70 font-mono">
            <span>Showing {filteredCocktails.length} of {allFlattenedCocktails.length} imported cocktails</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCocktails.map((cocktail) => {
              const isDrinkExpanded = expandedDrinkId === cocktail.id;

              return (
                <div
                  key={cocktail.id}
                  className="bg-[#140e10] border border-amber-900/30 rounded-3xl p-5 space-y-4 shadow-xl hover:border-amber-500/40 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Restaurant Origin Pill + Match Score */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                          <Building2 className="w-3 h-3 text-rose-400" />
                          <span>{cocktail.restaurantName}</span>
                          {cocktail.restaurantCity && <span>· {cocktail.restaurantCity}</span>}
                        </span>

                        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                          {cocktail.spiritBase}
                        </span>

                        <span className="bg-white/5 text-amber-200/70 text-[10px] px-2 py-0.5 rounded capitalize font-mono">
                          {cocktail.flavorProfile}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Bar Match Readiness Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono shrink-0 ${
                            cocktail.matchScore === 100
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60'
                              : cocktail.matchScore >= 50
                              ? 'bg-blue-950 text-blue-300 border border-blue-600/60'
                              : 'bg-white/5 text-amber-200/60 border border-white/10'
                          }`}
                        >
                          {cocktail.matchScore}% Bar Ready
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(cocktail);
                          }}
                          title={
                            favoriteKeys.has(cocktail.id) || favoriteKeys.has(cocktail.name.toLowerCase().trim())
                              ? 'Remove from favourites'
                              : 'Star as favourite'
                          }
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            favoriteKeys.has(cocktail.id) || favoriteKeys.has(cocktail.name.toLowerCase().trim())
                              ? 'bg-amber-500/20 border-amber-400/60 text-amber-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400'
                              : 'bg-white/5 border-white/10 text-charcoal-400 hover:text-amber-400 hover:border-amber-400/40 hover:bg-white/10'
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              favoriteKeys.has(cocktail.id) || favoriteKeys.has(cocktail.name.toLowerCase().trim())
                                ? 'fill-amber-400'
                                : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Drink Name & Menu Notes */}
                    <div>
                      <h4 className="text-lg font-serif font-bold text-white leading-tight">
                        {cocktail.name}
                      </h4>
                      {cocktail.menuDescription && (
                        <p className="text-xs text-amber-200/70 italic mt-0.5 line-clamp-2 leading-relaxed">
                          {cocktail.menuDescription}
                        </p>
                      )}
                    </div>

                    {/* Glassware & Technique */}
                    <div className="flex items-center gap-3 text-[11px] text-amber-200/60 py-1.5 border-y border-white/5 font-mono">
                      <span>🍸 <strong className="text-amber-400 font-sans">Glass:</strong> {cocktail.glassware || 'Coupe'}</span>
                      {cocktail.ice && (
                        <span>🧊 <strong className="text-amber-400 font-sans">Ice:</strong> {cocktail.ice}</span>
                      )}
                      <span>⚡ <strong className="text-amber-400 font-sans">Tech:</strong> {cocktail.technique || 'Shaken'}</span>
                    </div>

                    {/* Ingredients List */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono block">
                        Craft Spec & Ratios:
                      </span>
                      <div className="grid grid-cols-1 gap-1">
                        {cocktail.ingredients.map((ing: any) => (
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
                                  ing.isStocked ? 'bg-emerald-400' : 'bg-amber-500/50'
                                }`}
                              />
                              <span className="truncate">{ing.name}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {(ing.amount || ing.unit) && (
                                <span className="text-amber-300 font-mono text-[11px] font-bold">
                                  {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                </span>
                              )}

                              {!ing.isStocked && (
                                <button
                                  onClick={() => handleAddToBar(ing.name)}
                                  disabled={addingIng === ing.name}
                                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 cursor-pointer transition-all active:scale-95"
                                  title="Add to your Bar Cart"
                                >
                                  {addingIng === ing.name ? '...' : '+ Bar'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Method & Garnish Toggle */}
                    {cocktail.instructions && cocktail.instructions.length > 0 && (
                      <div className="pt-1">
                        <button
                          onClick={() => setExpandedDrinkId(isDrinkExpanded ? null : cocktail.id)}
                          className="text-[11px] text-amber-400/80 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isDrinkExpanded ? 'Hide Method' : 'View Method & Steps'}</span>
                          {isDrinkExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {isDrinkExpanded && (
                          <div className="mt-2 p-3.5 bg-black/50 border border-white/5 rounded-2xl space-y-2 text-xs text-amber-100/90 leading-relaxed animate-in fade-in">
                            <ol className="list-decimal list-inside space-y-1">
                              {cocktail.instructions.map((stepText: string, sIdx: number) => (
                                <li key={sIdx}>{stepText}</li>
                              ))}
                            </ol>
                            {cocktail.garnish && (
                              <div className="text-[11px] text-amber-300/80 pt-1 font-mono">
                                ✨ <strong>Garnish:</strong> {cocktail.garnish}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
                className="bg-[#140e10] border border-amber-900/30 rounded-3xl overflow-hidden shadow-xl transition-all"
              >
                {/* Menu Header Card */}
                <div
                  onClick={() => setExpandedMenuId(isMenuExpanded ? null : menu.id)}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/5"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-rose-400" />
                        <span>{menu.restaurantName}</span>
                      </span>
                      {menu.city && (
                        <span className="text-amber-200/70 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400/80" /> {menu.city}
                        </span>
                      )}
                      <span className="text-[10px] text-amber-200/40">
                        Added by {menu.contributedBy}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif font-bold text-white truncate">
                      {menu.restaurantName}
                    </h3>
                    {menu.notes && (
                      <p className="text-xs text-amber-200/70 italic line-clamp-1">{menu.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-xl">
                      {menu.totalDrinks} Drinks
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

                    <div className="p-2 rounded-xl bg-white/5 text-amber-300/80">
                      {isMenuExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Cocktails in this Menu */}
                {isMenuExpanded && (
                  <div className="p-5 sm:p-6 bg-[#0f0a0c] space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {menu.cocktails.map((cocktail: any) => {
                        const isDrinkExpanded = expandedDrinkId === cocktail.id;

                        return (
                          <div
                            key={cocktail.id}
                            className="bg-[#171013] border border-amber-900/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md hover:border-amber-500/40 transition-colors flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              {/* Header Pill & Title */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                                      {cocktail.spiritBase}
                                    </span>
                                    <span className="bg-white/5 text-amber-200/70 text-[10px] px-2 py-0.5 rounded capitalize font-mono">
                                      {cocktail.flavorProfile}
                                    </span>
                                    {cocktail.glassware && (
                                      <span className="text-[10px] text-amber-200/50">· {cocktail.glassware}</span>
                                    )}
                                  </div>

                                  <h4 className="text-base font-serif font-bold text-white">
                                    {cocktail.name}
                                  </h4>
                                </div>

                                {/* Bar Inventory Match Badge */}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                                    cocktail.matchScore === 100
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                      : cocktail.matchScore >= 50
                                      ? 'bg-blue-950/80 text-blue-300 border border-blue-700/60'
                                      : 'bg-white/5 text-amber-200/60 border border-white/10'
                                  }`}
                                >
                                  {cocktail.matchScore}% Bar Stock
                                </span>
                              </div>

                              {/* Menu description */}
                              {cocktail.menuDescription && (
                                <p className="text-xs text-amber-200/70 italic leading-relaxed">
                                  {cocktail.menuDescription}
                                </p>
                              )}

                              {/* Ingredients List */}
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono block">
                                  Craft Spec & Ratios:
                                </span>
                                <div className="grid grid-cols-1 gap-1">
                                  {cocktail.ingredients.map((ing: any) => (
                                    <div
                                      key={ing.id}
                                      className={`rounded-lg px-2.5 py-1 text-xs flex items-center justify-between border ${
                                        ing.isStocked
                                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-100'
                                          : 'bg-black/40 border-white/5 text-white/90'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${ing.isStocked ? 'bg-emerald-400' : 'bg-amber-500/50'}`} />
                                        <span className="truncate">{ing.name}</span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {(ing.amount || ing.unit) && (
                                          <span className="text-amber-300 font-mono text-[11px] font-bold">
                                            {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                          </span>
                                        )}

                                        {!ing.isStocked && (
                                          <button
                                            onClick={() => handleAddToBar(ing.name)}
                                            disabled={addingIng === ing.name}
                                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 cursor-pointer transition-all"
                                            title="Add to your Bar Cart"
                                          >
                                            {addingIng === ing.name ? '...' : '+ Bar'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Toggle Method & Instructions */}
                              {cocktail.instructions && cocktail.instructions.length > 0 && (
                                <div className="pt-1">
                                  <button
                                    onClick={() => setExpandedDrinkId(isDrinkExpanded ? null : cocktail.id)}
                                    className="text-[11px] text-amber-400/80 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{isDrinkExpanded ? 'Hide Method' : 'View Method & Garnish'}</span>
                                    {isDrinkExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  {isDrinkExpanded && (
                                    <div className="mt-2 p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 text-xs text-amber-100/90 leading-relaxed animate-in fade-in">
                                      <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                                        Technique: {cocktail.technique || 'Shaken'} · Ice: {cocktail.ice || 'Served Up'}
                                      </div>
                                      <ol className="list-decimal list-inside space-y-1">
                                        {cocktail.instructions.map((stepText: string, sIdx: number) => (
                                          <li key={sIdx}>{stepText}</li>
                                        ))}
                                      </ol>
                                      {cocktail.garnish && (
                                        <div className="text-[11px] text-amber-300/80 pt-1 font-mono">
                                          Garnish: {cocktail.garnish}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
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

      {/* Menu Scan Modal */}
      <MenuScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onMenuSaved={() => fetchMenus()}
      />
    </div>
  );
}
