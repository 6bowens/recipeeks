'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Check,
  ChevronRight,
  ChefHat,
  ArrowRight,
  ShoppingBag,
  Plus,
  X,
  RotateCw,
  ExternalLink,
  EyeOff,
  Eye,
  Star,
  Search,
  ChevronDown,
  Flame,
  UtensilsCrossed,
  Building2,
} from 'lucide-react';
import { MatchedRecipeResult } from '@/types';
import { CUT_CATEGORIES, CutCategory } from '@/lib/cut-utils';

export function RecipeMatcher() {
  const [matches, setMatches] = useState<MatchedRecipeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterScore, setFilterScore] = useState<'all' | 'perfect' | 'missing1'>('all');
  const [selectedCookbook, setSelectedCookbook] = useState<string>('all');
  const [hideDesserts, setHideDesserts] = useState(false);
  const [showOnlyHidden, setShowOnlyHidden] = useState(false);
  const [hiddenRecipeIds, setHiddenRecipeIds] = useState<string[]>([]);
  const [cookbooksList, setCookbooksList] = useState<{ id: string; title: string }[]>([]);
  const [togglingIngredient, setTogglingIngredient] = useState<string | null>(null);
  const [expandedPills, setExpandedPills] = useState<Record<string, boolean>>({});

  // Must-Use constraint states
  const [mustUseConstraint, setMustUseConstraint] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [inventoryCuts, setInventoryCuts] = useState<{ id: string; label: string; icon: string; recipeCount: number; originalName: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Favorites state
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleToggleFavorite = async (item: MatchedRecipeResult) => {
    const key = item.recipeId;
    const isFav = favoriteKeys.has(key) || favoriteKeys.has(item.recipeTitle.toLowerCase().trim());

    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(key);
        next.delete(item.recipeTitle.toLowerCase().trim());
        setToastMessage(`Removed "${item.recipeTitle}" from favourites`);
      } else {
        next.add(key);
        next.add(item.recipeTitle.toLowerCase().trim());
        setToastMessage(`★ Added "${item.recipeTitle}" to favourites!`);
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
          title: item.recipeTitle,
          sourceType: 'cookbook',
          cookbookTitle: item.cookbookTitle,
          pageNumber: item.pageNumber,
          recipeId: item.recipeId,
        }),
      });
    } catch (e) {
      console.error('Error toggling favorite:', e);
      fetchFavorites();
    }
  };

  // Load hidden recipe IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recipeeks_hidden_recipes');
      if (saved) {
        setHiddenRecipeIds(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load hidden recipes:', e);
    }
  }, []);

  // Click outside to close autocomplete suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleHideRecipe = (recipeId: string) => {
    setHiddenRecipeIds((prev) => {
      let updated: string[];
      if (prev.includes(recipeId)) {
        updated = prev.filter((id) => id !== recipeId);
      } else {
        updated = [...prev, recipeId];
      }
      try {
        localStorage.setItem('recipeeks_hidden_recipes', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const [miseAddingId, setMiseAddingId] = useState<string | null>(null);
  const [miseToast, setMiseToast] = useState<string | null>(null);

  const handleAddToMise = async (recipeId: string, title: string) => {
    try {
      setMiseAddingId(recipeId);
      const res = await fetch('/api/mise/import-cookbook-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setMiseToast(data.message || `✨ Added "${title}" to Mise!`);
      setTimeout(() => setMiseToast(null), 3000);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setMiseAddingId(null);
    }
  };

  const handleUnhideAll = () => {
    setHiddenRecipeIds([]);
    try {
      localStorage.removeItem('recipeeks_hidden_recipes');
    } catch (e) {}
    setShowOnlyHidden(false);
  };

  const fetchMatches = async (silent = false, constraint = mustUseConstraint) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (constraint) {
        params.set('mustUse', constraint);
      }
      const res = await fetch(`/api/match?${params.toString()}`);
      const data = await res.json();
      if (data?.results) {
        setMatches(data.results);
        if (data.inventoryCuts) {
          setInventoryCuts(data.inventoryCuts);
        }

        // Extract unique cookbooks
        const map = new Map<string, string>();
        data.results.forEach((r: MatchedRecipeResult) => {
          map.set(r.cookbookId, r.cookbookTitle);
        });
        setCookbooksList(Array.from(map.entries()).map(([id, title]) => ({ id, title })));
      }
    } catch (e) {
      console.error('Error fetching matches:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(false, mustUseConstraint);
  }, [mustUseConstraint]);

  const handleApplyConstraint = (cutLabel: string) => {
    setMustUseConstraint(cutLabel);
    setSearchQuery(cutLabel);
    setShowSuggestions(false);
  };

  const handleClearConstraint = () => {
    setMustUseConstraint('');
    setSearchQuery('');
    setActiveCategory(null);
    setShowSuggestions(false);
  };

  // Remove ingredient from pantry
  const handleRemoveFromPantry = async (ingName: string, pantryItemId?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setTogglingIngredient(ingName);
      const params = new URLSearchParams();
      params.set('name', ingName);
      if (pantryItemId) {
        params.set('id', pantryItemId);
      }

      const res = await fetch(`/api/pantry?${params.toString()}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchMatches(true);
      }
    } catch (err) {
      console.error('Failed to remove ingredient:', err);
    } finally {
      setTogglingIngredient(null);
    }
  };

  // Add missing ingredient to pantry
  const handleAddToPantry = async (ingName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setTogglingIngredient(ingName);
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingName,
          category: 'pantry',
        }),
      });
      if (res.ok) {
        await fetchMatches(true);
      }
    } catch (err) {
      console.error('Failed to add ingredient:', err);
    } finally {
      setTogglingIngredient(null);
    }
  };

  const toggleExpandPills = (recipeId: string) => {
    setExpandedPills((prev) => ({ ...prev, [recipeId]: !prev[recipeId] }));
  };

  const filteredMatches = matches.filter((item) => {
    const isHidden = hiddenRecipeIds.includes(item.recipeId);

    if (showOnlyHidden) {
      return isHidden;
    }

    if (isHidden) {
      return false;
    }

    if (selectedCookbook !== 'all' && item.cookbookId !== selectedCookbook) {
      return false;
    }
    if (hideDesserts && item.isDessert) {
      return false;
    }
    if (filterScore === 'perfect') {
      return item.matchScore === 100;
    }
    if (filterScore === 'missing1') {
      return item.missingIngredients.length <= 1;
    }
    return true;
  });

  const activeMatches = matches.filter((m) => !hiddenRecipeIds.includes(m.recipeId));
  const perfectCount = activeMatches.filter((m) => (hideDesserts ? !m.isDessert : true) && m.matchScore === 100).length;
  const missingOneCount = activeMatches.filter((m) => (hideDesserts ? !m.isDessert : true) && m.missingIngredients.length === 1).length;

  // Flatten all available cuts for autocomplete search
  const allCutsList = CUT_CATEGORIES.flatMap((c) =>
    c.cuts.map((cut) => ({
      ...cut,
      categoryIcon: c.icon,
      categoryLabel: c.label,
    }))
  );

  const autocompleteSuggestions = searchQuery.trim()
    ? allCutsList.filter(
        (c) =>
          c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.keywords.some((k) => k.includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Toast Notifications */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-charcoal-900 border border-charcoal-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 font-semibold text-xs">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          <span>{toastMessage}</span>
        </div>
      )}
      {miseToast && !toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-950 border border-purple-500 text-purple-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 font-semibold text-xs">
          <UtensilsCrossed className="w-4 h-4 text-purple-400" />
          <span>{miseToast}</span>
        </div>
      )}

      {/* Hero match header */}
      <div className="bg-gradient-to-r from-crimson-950 via-crimson-900 to-rose-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white/20 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 text-rose-200">
              <Sparkles className="w-3 h-3 text-rose-300" /> What&rsquo;s Cookin Good Lookin?
            </span>
          </div>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-serif font-bold leading-tight">
            Ready to Cook
          </h2>
          <p className="text-rose-100 text-xs sm:text-sm mt-1 max-w-xl">
            Cross-referenced your pantry with indexed cookbooks. Constrain by a must-use protein or staple to decide what to cook tonight.
          </p>
        </div>

        {/* Highlight Stats Pill */}
        <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/20 text-center self-stretch sm:self-auto justify-around">
          <div>
            <div className="text-xl sm:text-2xl font-bold font-serif">{perfectCount}</div>
            <div className="text-[10px] sm:text-[11px] text-rose-200 uppercase font-semibold">100% Ready</div>
          </div>
          <div className="w-px h-7 bg-white/20" />
          <div>
            <div className="text-xl sm:text-2xl font-bold font-serif">{missingOneCount}</div>
            <div className="text-[10px] sm:text-[11px] text-rose-200 uppercase font-semibold">Need 1 Item</div>
          </div>
        </div>
      </div>

      {/* MUST-USE / STAR INGREDIENT CONSTRAINT SECTION */}
      <div className="bg-white rounded-2xl border border-red-900/10 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-base text-charcoal-900 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Must-Use / Star Ingredient</span>
            </h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Have chicken thighs or ground beef to use up? Anchor your search around specific cuts or staples.
            </p>
          </div>

          {mustUseConstraint && (
            <button
              onClick={handleClearConstraint}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-900 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200/80 transition-colors self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        {/* Dynamic "In Your Fridge & Freezer" Chips */}
        {inventoryCuts.length > 0 && (
          <div className="bg-amber-50/60 border border-amber-200/70 p-2.5 sm:p-3 rounded-xl space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80 flex items-center gap-1 font-mono">
              <span>🧊</span> In Your Fridge & Freezer:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {inventoryCuts.map((cut) => {
                const isSelected = mustUseConstraint.toLowerCase() === cut.label.toLowerCase();
                return (
                  <button
                    key={cut.id}
                    onClick={() => handleApplyConstraint(cut.label)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-charcoal-950 font-bold shadow-xs ring-2 ring-amber-500/30'
                        : 'bg-white hover:bg-amber-100 text-charcoal-800 border border-amber-200/80 shadow-2xs'
                    }`}
                  >
                    <span>{cut.icon}</span>
                    <span>{cut.label}</span>
                    <span className="text-[10px] opacity-70 bg-black/5 px-1 py-0.2 rounded font-mono">
                      {cut.recipeCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Freeform Search Bar with Cut Autocomplete */}
        <div className="relative" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  handleApplyConstraint(searchQuery.trim());
                }
              }}
              placeholder="Search or pick a cut to use up (e.g. chicken thighs, ground beef, salmon, black beans, pasta)..."
              className="w-full pl-9 pr-24 py-2.5 text-xs bg-charcoal-50 hover:bg-charcoal-100/50 focus:bg-white border border-charcoal-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (mustUseConstraint) handleClearConstraint();
                }}
                className="absolute right-14 p-1 text-charcoal-400 hover:text-charcoal-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => searchQuery.trim() && handleApplyConstraint(searchQuery.trim())}
              className="absolute right-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Filter
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && autocompleteSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-charcoal-200 p-2 z-50 max-h-60 overflow-y-auto animate-in fade-in">
              <div className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider px-2 py-1">
                Suggested Cuts & Preparations:
              </div>
              {autocompleteSuggestions.map((cut) => (
                <button
                  key={cut.id}
                  onClick={() => handleApplyConstraint(cut.label)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-red-50 hover:text-red-900 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>{cut.categoryIcon}</span>
                    <span className="font-semibold text-charcoal-800">{cut.label}</span>
                  </div>
                  <span className="text-[10px] text-charcoal-400 font-medium">
                    {cut.categoryLabel}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Selector Tabs with Sub-Cut Expanders */}
        <div className="space-y-2 pt-1 border-t border-charcoal-100">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] text-charcoal-400 font-semibold uppercase tracking-wider shrink-0 mr-1">
              Browse Cuts:
            </span>
            {CUT_CATEGORIES.map((category) => {
              const isActive = activeCategory === category.id;
              const hasMatchingConstraint = category.cuts.some(
                (c) => c.label.toLowerCase() === mustUseConstraint.toLowerCase()
              );

              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(isActive ? null : category.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    hasMatchingConstraint
                      ? 'bg-amber-500 text-charcoal-950 font-bold shadow-xs'
                      : isActive
                      ? 'bg-red-800 text-white shadow-xs'
                      : 'bg-charcoal-100/70 hover:bg-charcoal-200/80 text-charcoal-700'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Sub-Cut Chips for Active Category */}
          {activeCategory && (
            <div className="bg-charcoal-50 p-2.5 rounded-xl border border-charcoal-200/70 flex flex-wrap items-center gap-1.5 animate-in fade-in">
              <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider mr-1">
                Select Specific Cut:
              </span>
              {CUT_CATEGORIES.find((c) => c.id === activeCategory)?.cuts.map((cut) => {
                const isSelected = mustUseConstraint.toLowerCase() === cut.label.toLowerCase();
                return (
                  <button
                    key={cut.id}
                    onClick={() => handleApplyConstraint(cut.label)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-700 text-white font-bold shadow-2xs'
                        : 'bg-white hover:bg-red-50 hover:text-red-900 text-charcoal-700 border border-charcoal-200/60 shadow-2xs'
                    }`}
                  >
                    {cut.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Constraint Indicator */}
        {mustUseConstraint && (
          <div className="bg-amber-500/15 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs text-amber-950 font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>
                Must use: <strong className="text-amber-900 font-bold">&quot;{mustUseConstraint}&quot;</strong> ({filteredMatches.length} recipes found)
              </span>
            </div>
            <button
              onClick={handleClearConstraint}
              className="text-[11px] font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Filter Toolbar - Strictly No Zerts & Hidden Pills */}
      <div className="bg-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-red-900/10 shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          {/* No Zerts Toggle Pill */}
          <button
            onClick={() => {
              setShowOnlyHidden(false);
              setHideDesserts(!hideDesserts);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 shadow-2xs ${
              hideDesserts
                ? 'bg-charcoal-900 text-white shadow-xs'
                : 'bg-rose-50 text-rose-950 hover:bg-rose-100 border border-rose-200/80'
            }`}
            title="Toggle hiding or showing dessert recipes (No Zerts!)"
          >
            <span>🍰</span>
            <span>{hideDesserts ? 'No Zerts (On)' : 'No Zerts'}</span>
          </button>

          {/* Hidden Recipes Filter Tab (Only shown if recipes have been hidden) */}
          {hiddenRecipeIds.length > 0 && (
            <button
              onClick={() => setShowOnlyHidden(!showOnlyHidden)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 ${
                showOnlyHidden
                  ? 'bg-charcoal-800 text-white shadow-xs'
                  : 'bg-charcoal-100 text-charcoal-700 hover:bg-charcoal-200'
              }`}
              title="View hidden recipes"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden ({hiddenRecipeIds.length})</span>
            </button>
          )}
        </div>

        <div className="text-[11px] text-charcoal-500 font-medium shrink-0 pr-1">
          Showing <strong>{filteredMatches.length}</strong> recipes
        </div>
      </div>

      {/* Showing Hidden Mode Notice */}
      {showOnlyHidden && (
        <div className="p-3 bg-charcoal-100 rounded-xl border border-charcoal-300 flex items-center justify-between text-xs text-charcoal-800">
          <span>
            👁️ Viewing <strong>{hiddenRecipeIds.length}</strong> hidden recipe(s). Click the eye icon on any recipe to unhide it.
          </span>
          <button
            onClick={handleUnhideAll}
            className="text-red-700 hover:text-red-900 font-bold underline ml-2 whitespace-nowrap"
          >
            Unhide All
          </button>
        </div>
      )}

      {/* Interactive Helper Banner */}
      <div className="bg-red-50/70 border border-red-200/80 px-3.5 py-2 rounded-xl text-xs text-red-950 flex items-center justify-between gap-2 shadow-2xs">
        <span className="text-[11px] sm:text-xs font-medium leading-tight">
          💡 <strong>Interactive:</strong> Tap <span className="text-emerald-700 font-bold">green</span> to remove, or <span className="text-rose-700 font-bold">red</span> to add to pantry!
        </span>
        <button
          onClick={() => fetchMatches(false)}
          className="text-[10px] sm:text-[11px] text-red-800 hover:text-red-950 font-bold inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded bg-white/70 border border-red-200/60 transition-colors"
        >
          <RotateCw className="w-2.5 h-2.5" /> Refresh
        </button>
      </div>

      {/* Recipe Matches List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-charcoal-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-red-900/10 p-6">
          <ChefHat className="w-10 h-10 mx-auto text-red-600/30 mb-2" />
          <h3 className="text-sm font-bold text-charcoal-800">
            {mustUseConstraint
              ? `No recipes found containing "${mustUseConstraint}"`
              : showOnlyHidden
              ? 'No hidden recipes'
              : 'No matching recipes found'}
          </h3>
          <p className="text-xs text-charcoal-500 max-w-xs mx-auto mt-1">
            {mustUseConstraint
              ? 'Try selecting a broader cut (e.g. Chicken instead of specific parts) or clear the filter.'
              : showOnlyHidden
              ? 'You haven’t hidden any recipes yet.'
              : 'Try adding items to your pantry or scan cookbooks to match recipes.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {mustUseConstraint && (
              <button
                onClick={handleClearConstraint}
                className="px-3.5 py-1.5 bg-red-700 text-white rounded-lg text-xs font-semibold hover:bg-red-800 cursor-pointer"
              >
                Clear Must-Use Filter
              </button>
            )}
            <Link
              href="/pantry"
              className="px-3.5 py-1.5 bg-charcoal-800 text-white rounded-lg text-xs font-semibold hover:bg-charcoal-900"
            >
              Manage Pantry Items
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredMatches.map((item) => {
            const isPerfect = item.matchScore === 100;
            const isExpanded = !!expandedPills[item.recipeId];
            const displayMatched = isExpanded ? item.matchedIngredients : item.matchedIngredients.slice(0, 4);
            const hasMoreMatched = item.matchedIngredients.length > 4;
            const cleanBookTitle = item.cookbookTitle.replace(/[:\-–—].*$/, '').trim();
            const isHidden = hiddenRecipeIds.includes(item.recipeId);

            return (
              <div
                key={item.recipeId}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                  isPerfect
                    ? 'bg-gradient-to-r from-emerald-50/50 via-white to-red-50/20 border-emerald-300 shadow-xs'
                    : 'bg-white border-charcoal-200/80 hover:border-red-300 shadow-2xs'
                }`}
              >
                {/* Header Row: Page Box + Title + Badges + Online Link + Hide button */}
                <div className="flex items-start gap-2.5 sm:gap-3">
                  {/* Compact Page Number Box */}
                  <div
                    className="shrink-0 text-center rounded-lg px-2 py-1 text-white shadow-2xs min-w-[46px] sm:min-w-[54px]"
                    style={{ backgroundColor: item.coverColor || '#991b1b' }}
                  >
                    <span className="block text-[8px] uppercase font-bold tracking-wider opacity-80 leading-none">
                      Page
                    </span>
                    <span className="block text-sm sm:text-base font-serif font-bold leading-tight mt-0.5">
                      {item.pageNumber || '—'}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-serif font-bold text-sm sm:text-base text-charcoal-900 truncate">
                          {item.recipeTitle}
                        </h3>

                        {/* Star Ingredient Badge */}
                        {item.starIngredientMatch && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                            <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                            <span className="truncate max-w-[140px]">{item.starIngredientMatch}</span>
                          </span>
                        )}
                      </div>

                      {/* Ready Badge & Online Link & Hide Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPerfect ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> 100%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-red-100 text-red-900 px-1.5 py-0.5 rounded-full">
                            {item.matchScore}%
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(item);
                          }}
                          className={`inline-flex items-center gap-0.5 p-1 sm:px-1.5 sm:py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer ${
                            favoriteKeys.has(item.recipeId) || favoriteKeys.has(item.recipeTitle.toLowerCase().trim())
                              ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                              : 'bg-white border-charcoal-200 text-charcoal-400 hover:text-amber-500 hover:border-amber-300 hover:bg-amber-50/50'
                          }`}
                          title={
                            favoriteKeys.has(item.recipeId) || favoriteKeys.has(item.recipeTitle.toLowerCase().trim())
                              ? 'Remove from favourites'
                              : 'Star as favourite'
                          }
                        >
                          <Star
                            className={`w-3 h-3 ${
                              favoriteKeys.has(item.recipeId) || favoriteKeys.has(item.recipeTitle.toLowerCase().trim())
                                ? 'fill-amber-400 text-amber-500'
                                : ''
                            }`}
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToMise(item.recipeId, item.recipeTitle);
                          }}
                          disabled={miseAddingId === item.recipeId}
                          className="inline-flex items-center gap-1 p-1 sm:px-2 sm:py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-semibold border border-purple-200 transition-colors cursor-pointer"
                          title="Save recipe to Mise rotation vault"
                        >
                          <UtensilsCrossed className="w-2.5 h-2.5 text-purple-700" />
                          <span className="hidden sm:inline">
                            {miseAddingId === item.recipeId ? 'Adding...' : 'Mise'}
                          </span>
                        </button>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${item.cookbookTitle} ${item.recipeTitle} recipe`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 p-1 sm:px-2 sm:py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-800 text-[10px] font-semibold border border-red-200/70 transition-colors"
                          title="Search online recipe & videos"
                        >
                          <span className="hidden sm:inline">Online</span>
                          <ExternalLink className="w-2.5 h-2.5 text-red-700" />
                        </a>

                        {/* Hide / Unhide Recipe Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleHideRecipe(item.recipeId);
                          }}
                          className="p-1 text-charcoal-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title={isHidden ? 'Unhide this recipe' : 'Hide this recipe from match list'}
                        >
                          {isHidden ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Book Citation */}
                    <p className="text-[11px] sm:text-xs text-charcoal-500 mt-0.5 flex items-center gap-1 truncate">
                      <BookOpen className="w-3 h-3 text-red-700 shrink-0" />
                      <span className="font-semibold text-charcoal-800 truncate">{cleanBookTitle}</span>
                      {item.cookbookAuthor && (
                        <span className="italic truncate">· {item.cookbookAuthor.split(',')[0]}</span>
                      )}
                    </p>

                    {/* Interactive Ingredients Row */}
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] sm:text-[11px]">
                      {/* Missing items first for instant visibility */}
                      {item.missingIngredients.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mr-1">
                          <span className="text-[10px] font-bold text-rose-700 uppercase">Need:</span>
                          {item.missingIngredients.map((ing, i) => {
                            const isStarIng = item.starIngredientMatch?.toLowerCase() === ing.toLowerCase();
                            return (
                              <button
                                key={i}
                                onClick={(e) => handleAddToPantry(ing, e)}
                                disabled={togglingIngredient === ing}
                                title={`Missing. Tap to add "${ing}" to pantry`}
                                className={`group/pill inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium transition-all shadow-2xs ${
                                  isStarIng
                                    ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-1 ring-amber-400 font-bold'
                                    : 'bg-rose-50 hover:bg-emerald-100 text-rose-800 hover:text-emerald-900 border border-rose-200 hover:border-emerald-300'
                                }`}
                              >
                                {isStarIng && <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />}
                                <span className="text-rose-500 font-bold group-hover/pill:hidden">+</span>
                                <span className="hidden group-hover/pill:inline text-emerald-600 font-bold">✓</span>
                                <span className="truncate max-w-[120px]">{ing}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* In Pantry matched items */}
                      <span className="text-[10px] font-semibold text-charcoal-400 uppercase">In Pantry:</span>
                      {displayMatched.map((ing, i) => {
                        const isStarIng = item.starIngredientMatch?.toLowerCase() === ing.toLowerCase();
                        return (
                          <button
                            key={i}
                            onClick={(e) => handleRemoveFromPantry(ing, item.matchedPantryMap?.[ing], e)}
                            disabled={togglingIngredient === ing}
                            title={`In pantry. Tap to remove "${ing}"`}
                            className={`group/pill inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium transition-all shadow-2xs ${
                              isStarIng
                                ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-1 ring-amber-400 font-bold'
                                : 'bg-emerald-50 hover:bg-rose-100 text-emerald-800 hover:text-rose-900 border border-emerald-200/70 hover:border-rose-300'
                            }`}
                          >
                            {isStarIng && <Star className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />}
                            <span className="text-emerald-600 font-bold group-hover/pill:hidden">✓</span>
                            <span className="hidden group-hover/pill:inline text-rose-600 font-bold">✕</span>
                            <span className="truncate max-w-[120px]">{ing}</span>
                          </button>
                        );
                      })}

                      {hasMoreMatched && (
                        <button
                          onClick={() => toggleExpandPills(item.recipeId)}
                          className="text-[10px] font-bold text-red-700 hover:underline px-1 py-0.5"
                        >
                          {isExpanded ? 'Show less' : `+${item.matchedIngredients.length - 4} more`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
