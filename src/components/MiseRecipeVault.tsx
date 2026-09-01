'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookMarked,
  Plus,
  Link as LinkIcon,
  BookOpen,
  Trash2,
  Clock,
  Users,
  ExternalLink,
  Sparkles,
  Check,
  Search,
  ChevronDown,
  X,
  Star,
  Play,
  Flame,
  Filter,
  ChefHat,
  Calendar,
  Layers,
  Globe,
  Camera,
  Edit3,
  Bookmark,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';
import { MiseRecipeDetailModal } from '@/components/MiseRecipeDetailModal';
import { MiseUniversalImportModal } from '@/components/MiseUniversalImportModal';

interface MiseRecipeVaultProps {
  recipes: any[];
  onRefresh: () => void;
  onAddToPlatelist?: (recipeId: string) => void;
}

export function MiseRecipeVault({
  recipes,
  onRefresh,
  onAddToPlatelist,
}: MiseRecipeVaultProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'cookbook' | 'custom'>('all');
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<any | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Extract all unique tags & cookbook titles
  const { allTags, cookbookCount, customCount, uniqueCookbooks } = useMemo(() => {
    const set = new Set<string>();
    const books = new Map<string, { title: string; coverUrl?: string; count: number }>();
    let cbCount = 0;
    let custCount = 0;

    recipes.forEach((r) => {
      if (r.sourceType === 'cookbook') {
        cbCount++;
        const title = r.cookbookTitle || 'Cookbook';
        const existing = books.get(title);
        if (existing) {
          existing.count++;
        } else {
          books.set(title, { title, coverUrl: r.cookbookCoverUrl, count: 1 });
        }
      } else {
        custCount++;
      }

      if (r.tagsList && Array.isArray(r.tagsList)) {
        r.tagsList.forEach((t: string) => set.add(t));
      } else if (r.tags) {
        r.tags.split(',').forEach((t: string) => set.add(t.trim()));
      }
    });

    return {
      allTags: Array.from(set).filter(Boolean),
      cookbookCount: cbCount,
      customCount: custCount,
      uniqueCookbooks: Array.from(books.values()),
    };
  }, [recipes]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      // Source filter
      if (selectedSource === 'cookbook' && r.sourceType !== 'cookbook') return false;
      if (selectedSource === 'custom' && r.sourceType === 'cookbook') return false;

      // Category filter
      if (selectedCategory !== 'all') {
        if ((r.mealCategory || 'dinner').toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Frequency filter
      if (selectedFrequencyFilter !== 'all') {
        if (r.frequency !== selectedFrequencyFilter) return false;
      }

      // Favorites filter
      if (showOnlyFavorites && !r.isFavorite) {
        return false;
      }

      // Tag filter
      if (selectedTag) {
        const tags = r.tagsList || (r.tags ? r.tags.split(',').map((t: string) => t.trim()) : []);
        if (!tags.some((t: string) => t.toLowerCase() === selectedTag.toLowerCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = r.title?.toLowerCase().includes(q);
        const notesMatch = r.notes?.toLowerCase().includes(q);
        const cuisineMatch = r.cuisine?.toLowerCase().includes(q);
        const bookMatch = r.cookbookTitle?.toLowerCase().includes(q);
        const tagsMatch = (r.tagsList || []).some((t: string) => t.toLowerCase().includes(q));
        const ingMatch = (r.ingredients || []).some((i: any) => i.name.toLowerCase().includes(q));
        if (!titleMatch && !notesMatch && !cuisineMatch && !bookMatch && !tagsMatch && !ingMatch) {
          return false;
        }
      }

      return true;
    });
  }, [recipes, selectedSource, selectedCategory, selectedFrequencyFilter, showOnlyFavorites, selectedTag, searchQuery]);

  const favoritesCount = recipes.filter((r) => r.isFavorite).length;

  const handleToggleFavorite = async (recipe: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const payload: any = {
        type: 'recipe',
        title: recipe.title,
      };

      if (recipe.sourceType === 'cookbook') {
        payload.recipeId = recipe.id;
        payload.sourceType = 'cookbook';
      } else {
        payload.customRecipeId = recipe.id;
        payload.sourceType = 'custom';
      }

      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setToastMessage(data.favorited ? `★ Added "${recipe.title}" to Favourites!` : `Removed "${recipe.title}" from Favourites`);
        setTimeout(() => setToastMessage(null), 3000);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateFrequency = async (recipeId: string, frequency: string, sourceType: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    try {
      if (sourceType === 'cookbook') {
        // Cookbook recipes default to frequency, or we can handle via custom recipe
        return;
      }
      const res = await fetch('/api/mise/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipeId, frequency }),
      });

      if (!res.ok) throw new Error('Failed to update frequency');
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteRecipe = async (recipeId: string, title: string, sourceType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sourceType === 'cookbook') {
      alert('Physical cookbook recipes are indexed to your bookshelves. To manage them, visit Cookbooks (Camera Roll / Library).');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${title}" from your custom recipes?`)) return;

    try {
      const res = await fetch(`/api/mise/recipes?id=${recipeId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete recipe');
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-charcoal-900 border border-purple-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#1b1028] via-[#140b20] to-[#24102d] border border-purple-900/40 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-mono">
              <ChefHat className="w-3.5 h-3.5 text-purple-400" /> Mise Recipe Collection
            </span>
            <span className="bg-white/10 text-purple-200 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
              {recipes.length} Total Recipes
            </span>
            {cookbookCount > 0 && (
              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> {cookbookCount} from Cookbooks
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white leading-tight">
            Recipe Collection & Hub
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/70 leading-relaxed">
            All your recipes in one place — from physical cookbooks (*Salt, Fat, Acid, Heat*, *The Food Lab*), web links, AI culinary prompts, and scanned recipe cards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link
            href="/library"
            className="px-4 py-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-rose-200 hover:text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
            title="Browse digital bookshelf & scan physical books"
          >
            <BookOpen className="w-4 h-4 text-rose-400" />
            <span>Manage Cookbooks ({uniqueCookbooks.length}) ↗</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl hover:shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Recipe</span>
          </button>
        </div>
      </div>

      {/* Search & Multi-Filter Toolbar */}
      <div className="bg-[#120a1f] border border-purple-900/40 rounded-2xl p-4 space-y-3.5 shadow-lg">
        {/* Row 1: Search & Sources */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/50" />
            <input
              type="text"
              placeholder="Search recipes, ingredients, cookbooks, cuisines, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d0718] border border-purple-900/50 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 placeholder:text-purple-300/40 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Source Filter: All / Cookbooks / Custom */}
          <div className="flex items-center gap-1.5 bg-[#0a0512] p-1 rounded-xl border border-purple-900/40 overflow-x-auto">
            <button
              onClick={() => setSelectedSource('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedSource === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              All Sources ({recipes.length})
            </button>

            <button
              onClick={() => setSelectedSource('cookbook')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                selectedSource === 'cookbook'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-300/80 hover:text-amber-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Cookbooks ({cookbookCount})</span>
            </button>

            <button
              onClick={() => setSelectedSource('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                selectedSource === 'custom'
                  ? 'bg-fuchsia-600 text-white shadow-md'
                  : 'text-fuchsia-300/80 hover:text-fuchsia-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Custom / Web ({customCount})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Category Tabs & Star Favourites */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-purple-900/30 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'dinner', label: 'Dinner / Main' },
              { id: 'lunch', label: 'Lunch' },
              { id: 'breakfast', label: 'Breakfast' },
              { id: 'side', label: 'Sides & Salads' },
              { id: 'dessert', label: 'Desserts' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-purple-300/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}

            {/* Star Favourites Pill */}
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                showOnlyFavorites
                  ? 'bg-amber-500 text-charcoal-950 shadow-md font-extrabold'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-charcoal-950' : 'fill-amber-400'}`} />
              <span>Favourites ({favoritesCount})</span>
            </button>
          </div>

          <div className="text-xs text-purple-300/60 font-mono">
            Showing <strong>{filteredRecipes.length}</strong> of {recipes.length} recipes
          </div>
        </div>
      </div>

      {/* Recipe Cards Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredRecipes.map((recipe) => {
            const ingredientsCount = (recipe.ingredients || []).length;
            const isFav = !!recipe.isFavorite;
            const isFromCookbook = recipe.sourceType === 'cookbook';

            return (
              <div
                key={recipe.id}
                onClick={() => setSelectedRecipeForDetail(recipe)}
                className="group bg-[#140c1f] hover:bg-[#180e26] border border-purple-900/40 hover:border-purple-500/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Accent top gradient */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1 transition-opacity ${
                    isFromCookbook
                      ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 opacity-80'
                      : 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-500 opacity-60'
                  } group-hover:opacity-100`}
                />

                {/* Top Row: Source & Category Badges & Star */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isFromCookbook ? (
                      <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                        <BookOpen className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{recipe.cookbookTitle}</span>
                        {recipe.pageNumber && <span>· p.{recipe.pageNumber}</span>}
                      </span>
                    ) : (
                      <span className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono">
                        {recipe.sourceType === 'url'
                          ? 'Web'
                          : recipe.sourceType === 'ai_prompt'
                          ? 'AI Chef'
                          : recipe.sourceType === 'photo_ocr'
                          ? 'Photo Scan'
                          : 'Custom'}
                      </span>
                    )}

                    {recipe.mealCategory && (
                      <span className="bg-white/5 border border-purple-500/20 text-purple-300/80 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md font-mono">
                        {recipe.mealCategory}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleToggleFavorite(recipe, e)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isFav
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/15 text-charcoal-400 hover:text-amber-300'
                    }`}
                    title={isFav ? 'Remove from Favourites' : 'Add to Favourites'}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Title & Notes */}
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-white group-hover:text-purple-200 transition-colors line-clamp-2 leading-snug">
                    {recipe.title}
                  </h3>
                  {recipe.notes && (
                    <p className="text-xs text-purple-200/60 line-clamp-2 leading-relaxed">
                      {recipe.notes}
                    </p>
                  )}
                </div>

                {/* Meta Row: Cook time, servings, ingredients */}
                <div className="flex items-center gap-3 text-xs text-purple-300/70 pt-2 border-t border-purple-900/30 flex-wrap">
                  {recipe.cookTime && (
                    <div className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{recipe.cookTime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 font-mono">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>{recipe.servings || '4'} servings</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-purple-400/80">
                    <span>{ingredientsCount} ingredients</span>
                  </div>
                </div>

                {/* Bottom Controls: Frequency Dropdown & Quick Actions */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between gap-2 pt-2 border-t border-purple-900/30"
                >
                  <div className="flex items-center gap-1">
                    {!isFromCookbook ? (
                      <select
                        value={recipe.frequency || '1_week'}
                        onChange={(e) => handleUpdateFrequency(recipe.id, e.target.value, recipe.sourceType, e)}
                        className="bg-[#0d0718] border border-purple-900/50 rounded-lg px-2 py-1 text-[11px] text-purple-200 focus:outline-none focus:border-purple-500 font-mono font-bold cursor-pointer"
                        title="Set dinner rotation frequency"
                      >
                        {Object.entries(FREQUENCY_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] text-purple-300/60 font-mono flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-amber-400" /> Cookbook
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {onAddToPlatelist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToPlatelist(recipe.id);
                        }}
                        className="px-2.5 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 hover:text-white rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                        title="Add this recipe to The Platelist"
                      >
                        <Calendar className="w-3 h-3 text-purple-400" />
                        <span>+ Platelist</span>
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecipeForDetail(recipe);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Cook</span>
                    </button>

                    {!isFromCookbook && (
                      <button
                        onClick={(e) => handleDeleteRecipe(recipe.id, recipe.title, recipe.sourceType, e)}
                        className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete custom recipe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#140c1f] border border-purple-900/40 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto">
            <BookMarked className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-white">No Recipes Found</h3>
            <p className="text-xs text-purple-300/60 leading-relaxed">
              {searchQuery || selectedCategory !== 'all' || selectedSource !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'Your recipe vault is empty. Add your favorite dinners via URL, AI Chef, Photo OCR, or scan a cookbook!'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Recipe</span>
          </button>
        </div>
      )}

      {/* Universal Import Modal */}
      <MiseUniversalImportModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={onRefresh}
      />

      {/* Recipe Detail Modal */}
      {selectedRecipeForDetail && (
        <MiseRecipeDetailModal
          recipe={selectedRecipeForDetail}
          onClose={() => setSelectedRecipeForDetail(null)}
          onRefresh={onRefresh}
          onAddToPlatelist={onAddToPlatelist}
        />
      )}
    </div>
  );
}
