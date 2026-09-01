'use client';

import React, { useState } from 'react';
import {
  X,
  Clock,
  Users,
  Utensils,
  ExternalLink,
  BookOpen,
  Calendar,
  Check,
  Star,
  Sparkles,
  Flame,
  ChefHat,
  Tag,
  Share2,
  Trash2,
  Edit2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';
import { scaleIngredientAmount, parseQuantity } from '@/lib/recipe-scaling';
import { MiseCookingModeModal } from '@/components/MiseCookingModeModal';

interface MiseRecipeDetailModalProps {
  recipe: any | null;
  onClose: () => void;
  onRefresh?: () => void;
  onAddToPlatelist?: (recipeId: string) => void;
  onMarkCooked?: (recipe: any) => void;
  onPantryChange?: () => void;
  onSaveRecipe?: (updated: any) => void;
}

export function MiseRecipeDetailModal({
  recipe,
  onClose,
  onRefresh,
  onAddToPlatelist,
  onMarkCooked,
  onPantryChange,
  onSaveRecipe,
}: MiseRecipeDetailModalProps) {
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [showCookingMode, setShowCookingMode] = useState(false);
  const [isFavorite, setIsFavorite] = useState(!!recipe?.isFavorite);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!recipe) return null;

  const rawInstructions = recipe.instructions;
  const steps: string[] = Array.isArray(rawInstructions)
    ? rawInstructions
    : typeof rawInstructions === 'string' && rawInstructions.startsWith('[')
    ? (() => {
        try {
          return JSON.parse(rawInstructions);
        } catch {
          return [rawInstructions];
        }
      })()
    : typeof rawInstructions === 'string'
    ? rawInstructions.split('\n').filter((s: string) => s.trim().length > 0)
    : [];

  const ingredients = recipe.ingredients || [];
  const baseServingsNum = recipe.servingsNum || parseQuantity(recipe.servings) || 4;
  const currentServings = Math.round(baseServingsNum * scaleFactor * 10) / 10;

  const handleToggleFavorite = async () => {
    try {
      setTogglingFavorite(true);
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
        setIsFavorite(data.favorited);
        setToastMessage(data.favorited ? '★ Added to Favourites!' : 'Removed from Favourites');
        setTimeout(() => setToastMessage(null), 3000);
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error('Toggle favorite error:', e);
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleToggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const tagsList = recipe.tagsList || (recipe.tags ? recipe.tags.split(',').map((t: string) => t.trim()) : []);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-charcoal-900 border border-purple-500 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="bg-[#140c1f] border border-purple-900/50 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden my-auto">
          {/* Header */}
          <div className="p-6 border-b border-purple-900/40 bg-gradient-to-r from-[#1a102a] via-[#150d22] to-[#20102e] relative">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  {recipe.mealCategory && (
                    <span className="bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono">
                      {recipe.mealCategory}
                    </span>
                  )}
                  {recipe.cuisine && (
                    <span className="bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.frequency && FREQUENCY_CONFIG[recipe.frequency as keyof typeof FREQUENCY_CONFIG] && (
                    <span className="bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                      {FREQUENCY_CONFIG[recipe.frequency as keyof typeof FREQUENCY_CONFIG].shortLabel || FREQUENCY_CONFIG[recipe.frequency as keyof typeof FREQUENCY_CONFIG].label}
                    </span>
                  )}
                </div>

                <h1 className="font-serif font-bold text-xl sm:text-3xl text-white leading-tight">
                  {recipe.title}
                </h1>

                {/* Meta details */}
                <div className="flex items-center gap-4 text-xs text-purple-200/80 flex-wrap pt-1">
                  {recipe.prepTime && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Prep: {recipe.prepTime}</span>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cook: {recipe.cookTime}</span>
                    </div>
                  )}
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-200 underline font-mono text-[11px]"
                    >
                      <ExternalLink className="w-3 h-3" /> Source
                    </a>
                  )}
                  {recipe.cookbookTitle && (
                    <div className="flex items-center gap-1 text-amber-300 font-mono text-[11px]">
                      <BookOpen className="w-3 h-3" /> {recipe.cookbookTitle} {recipe.pageNumber ? `· p. ${recipe.pageNumber}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  disabled={togglingFavorite}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    isFavorite
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-400 shadow-md'
                      : 'bg-white/10 border-white/10 hover:bg-white/15 text-charcoal-400 hover:text-amber-300'
                  }`}
                  title={isFavorite ? 'Remove from Favourites' : 'Add to Favourites'}
                >
                  <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-charcoal-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tags list */}
            {tagsList.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-3 mt-3 border-t border-purple-900/30">
                {tagsList.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] font-semibold bg-white/5 border border-purple-500/20 text-purple-300/80 px-2 py-0.5 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Bar (Start Cooking & Platelist) */}
          <div className="px-6 py-3 bg-[#10081a] border-b border-purple-900/40 flex items-center justify-between gap-3 flex-wrap">
            {/* Mealie-Grade Servings Multiplier Scaler */}
            <div className="flex items-center gap-2 bg-black/40 border border-purple-900/50 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1 font-mono">
                <Users className="w-3.5 h-3.5" /> Servings:
              </span>
              <div className="flex items-center gap-1">
                {[0.5, 1, 2, 4].map((multiplier) => (
                  <button
                    key={multiplier}
                    onClick={() => setScaleFactor(multiplier)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      scaleFactor === multiplier
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-purple-300/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {multiplier}x
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-amber-300 font-bold font-mono ml-1">
                ({currentServings})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onAddToPlatelist && (
                <button
                  onClick={() => onAddToPlatelist(recipe.id)}
                  className="px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>+ Platelist</span>
                </button>
              )}

              <button
                onClick={() => setShowCookingMode(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-lg hover:shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Cooking Mode</span>
              </button>
            </div>
          </div>

          {/* Modal Body: Two-column Ingredients & Instructions */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Column 1: Ingredients (5 cols) */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                <h3 className="font-serif font-bold text-base text-purple-100 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-purple-400" />
                  <span>Ingredients ({ingredients.length})</span>
                </h3>
                {scaleFactor !== 1 && (
                  <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    Scaled {scaleFactor}x
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {ingredients.map((ing: any, idx: number) => {
                  const isChecked = !!checkedIngredients[idx];
                  const scaledAmount = scaleIngredientAmount(ing.amount, scaleFactor);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleIngredient(idx)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                        isChecked
                          ? 'bg-purple-950/30 border-purple-900/30 text-purple-400/60 line-through'
                          : 'bg-[#180f24] border-purple-900/40 text-purple-100 hover:border-purple-500/40'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-purple-400/40 bg-black/20'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="leading-snug">
                        {scaledAmount && (
                          <span className="font-bold text-amber-300 font-mono mr-1.5">
                            {scaledAmount} {ing.unit}
                          </span>
                        )}
                        <span>{ing.name}</span>
                        {ing.optional && (
                          <span className="text-[10px] text-purple-400 ml-1.5 opacity-70">(optional)</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chef Notes */}
              {recipe.notes && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1 mt-4">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
                    <Sparkles className="w-3.5 h-3.5" /> Chef Pro-Tip:
                  </div>
                  <p className="leading-relaxed">{recipe.notes}</p>
                </div>
              )}
            </div>

            {/* Column 2: Instructions (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
                <h3 className="font-serif font-bold text-base text-purple-100 flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-purple-400" />
                  <span>Step-by-Step Instructions ({steps.length})</span>
                </h3>
              </div>

              <div className="space-y-3">
                {steps.map((step: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#180f24] border border-purple-900/40 text-xs leading-relaxed"
                  >
                    <div className="w-6 h-6 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                      {idx + 1}
                    </div>
                    <p className="text-purple-100/90 pt-0.5">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Cooking Mode Modal */}
      <MiseCookingModeModal
        isOpen={showCookingMode}
        onClose={() => setShowCookingMode(false)}
        recipe={recipe}
        scaleFactor={scaleFactor}
      />
    </>
  );
}
