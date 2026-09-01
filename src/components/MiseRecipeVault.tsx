'use client';

import React, { useState, useMemo } from 'react';
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
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<any | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => {
      if (r.tagsList && Array.isArray(r.tagsList)) {
        r.tagsList.forEach((t: string) => set.add(t));
      } else if (r.tags) {
        r.tags.split(',').forEach((t: string) => set.add(t.trim()));
      }
    });
    return Array.from(set).filter(Boolean);
  }, [recipes]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
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
        const tagsMatch = (r.tagsList || []).some((t: string) => t.toLowerCase().includes(q));
        const ingMatch = (r.ingredients || []).some((i: any) => i.name.toLowerCase().includes(q));
        if (!titleMatch && !notesMatch && !cuisineMatch && !tagsMatch && !ingMatch) {
          return false;
        }
      }

      return true;
    });
  }, [recipes, selectedCategory, selectedFrequencyFilter, showOnlyFavorites, selectedTag, searchQuery]);

  const favoritesCount = recipes.filter((r) => r.isFavorite).length;

  const handleToggleFavorite = async (recipe: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'recipe',
          title: recipe.title,
          customRecipeId: recipe.id,
          sourceType: 'custom',
        }),
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

  const handleUpdateFrequency = async (recipeId: string, frequency: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    try {
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

  const handleDeleteRecipe = async (recipeId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${title}" from your recipe vault?`)) return;

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
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-mono">
              <ChefHat className="w-3.5 h-3.5 text-purple-400" /> Mise Culinary Hub
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white leading-tight">
            Recipe Collection
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/70 leading-relaxed">
            Your personal digital cookbook. Host, scale, and cook home recipes with hands-free step timers and seamless meal rotation.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl hover:shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add Recipe</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-[#120a1f] border border-purple-900/40 rounded-2xl p-4 space-y-3.5 shadow-lg">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/50" />
            <input
              type="text"
              placeholder="Search recipes, ingredients, cuisines, or tags..."
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

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All Recipes' },
              { id: 'dinner', label: 'Dinner' },
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
        </div>

        {/* Sub-Filters: Frequency & Tags */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-purple-900/30 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-purple-400 font-mono flex items-center gap-1">
              <Filter className="w-3 h-3" /> Platelist Frequency:
            </span>
            <select
              value={selectedFrequencyFilter}
              onChange={(e) => setSelectedFrequencyFilter(e.target.value)}
              className="bg-[#0d0718] border border-purple-900/50 rounded-lg px-2.5 py-1 text-xs text-purple-200 focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
            >
              <option value="all">All Frequencies</option>
              {Object.entries(FREQUENCY_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>

            {/* Tag chips */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap ml-2">
                {allTags.slice(0, 6).map((tag) => {
                  const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-fuchsia-600 text-white font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-purple-300/70 border border-purple-500/20'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-[10px] text-red-400 hover:text-red-300 underline font-mono ml-1 cursor-pointer"
                  >
                    Clear Tag
                  </button>
                )}
              </div>
            )}
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

            return (
              <div
                key={recipe.id}
                onClick={() => setSelectedRecipeForDetail(recipe)}
                className="group bg-[#140c1f] hover:bg-[#180e26] border border-purple-900/40 hover:border-purple-500/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl transition-all hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Accent top gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                {/* Top Row: Category & Star */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {recipe.mealCategory && (
                      <span className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono">
                        {recipe.mealCategory}
                      </span>
                    )}
                    {recipe.cuisine && (
                      <span className="bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono">
                        {recipe.cuisine}
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
                    <select
                      value={recipe.frequency || '1_week'}
                      onChange={(e) => handleUpdateFrequency(recipe.id, e.target.value, e)}
                      className="bg-[#0d0718] border border-purple-900/50 rounded-lg px-2 py-1 text-[11px] text-purple-200 focus:outline-none focus:border-purple-500 font-mono font-bold cursor-pointer"
                      title="Set dinner rotation frequency"
                    >
                      {Object.entries(FREQUENCY_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
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

                    <button
                      onClick={(e) => handleDeleteRecipe(recipe.id, recipe.title, e)}
                      className="p-1.5 rounded-lg text-charcoal-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete recipe"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
              {searchQuery || selectedCategory !== 'all' || selectedTag
                ? 'Try adjusting your search query or filters.'
                : 'Your recipe vault is empty. Add your favorite dinners via URL, AI Chef, or Photo OCR!'}
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
