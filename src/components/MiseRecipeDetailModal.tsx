'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  Users,
  ExternalLink,
  BookOpen,
  UtensilsCrossed,
  CheckCircle2,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Save,
  Plus,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { FREQUENCY_CONFIG, isIngredientStockedInPantry, AISLE_LABELS, AisleCategory } from '@/lib/playlist-utils';

interface MiseRecipeDetailModalProps {
  recipe: any | null;
  onClose: () => void;
  pantryItems?: any[];
  onFrequencyChange?: (recipeId: string, frequency: string) => void;
  onDelete?: (recipeId: string, title: string) => void;
  onMarkCooked?: (recipe: any) => void;
  onSaveRecipe?: (updatedRecipe: any) => void;
  onPantryChange?: () => void;
}

export function MiseRecipeDetailModal({
  recipe,
  onClose,
  pantryItems: initialPantryItems,
  onFrequencyChange,
  onDelete,
  onMarkCooked,
  onSaveRecipe,
  onPantryChange,
}: MiseRecipeDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(recipe?.title || '');
  const [editCookTime, setEditCookTime] = useState(recipe?.cookTime || '');
  const [editServings, setEditServings] = useState(recipe?.servings || '2-4');
  const [editFrequency, setEditFrequency] = useState(recipe?.frequency || '1_week');
  const [editNotes, setEditNotes] = useState(recipe?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Live Pantry Inventory State
  const [pantryList, setPantryList] = useState<any[]>(initialPantryItems || []);
  const [stockedMap, setStockedMap] = useState<Record<string, boolean>>({});
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'need' | 'have'>('all');

  // Load pantry if not provided
  useEffect(() => {
    if (!initialPantryItems || initialPantryItems.length === 0) {
      fetch('/api/pantry')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.items)) {
            setPantryList(data.items);
          }
        })
        .catch(() => {});
    } else {
      setPantryList(initialPantryItems);
    }
  }, [initialPantryItems]);

  // Compute initial stocked status for all ingredients
  useEffect(() => {
    if (!recipe?.ingredients) return;
    const initialMap: Record<string, boolean> = {};
    for (const ing of recipe.ingredients) {
      if (ing.name) {
        initialMap[ing.name] = isIngredientStockedInPantry(ing.name, pantryList);
      }
    }
    setStockedMap(initialMap);
  }, [recipe?.ingredients, pantryList]);

  // Toggle Pantry Stocked Status
  const handleToggleStock = async (ing: any) => {
    const ingName = ing.name;
    if (!ingName) return;

    const isCurrentlyStocked = !!stockedMap[ingName];
    const newStocked = !isCurrentlyStocked;

    // Optimistic UI update
    setStockedMap((prev) => ({ ...prev, [ingName]: newStocked }));
    setTogglingMap((prev) => ({ ...prev, [ingName]: true }));

    try {
      if (newStocked) {
        // Add to pantry
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ingName,
            category: ing.aisleCategory || 'pantry',
            quantity: ing.amount ? `${ing.amount} ${ing.unit || ''}`.trim() : null,
          }),
        });
      } else {
        // Remove from pantry
        await fetch(`/api/pantry?name=${encodeURIComponent(ingName)}`, {
          method: 'DELETE',
        });
      }

      if (onPantryChange) {
        onPantryChange();
      }
    } catch (err) {
      console.error('Failed to toggle ingredient stock:', err);
      // Revert on error
      setStockedMap((prev) => ({ ...prev, [ingName]: isCurrentlyStocked }));
    } finally {
      setTogglingMap((prev) => ({ ...prev, [ingName]: false }));
    }
  };

  // Parse initial instructions
  const initialInstructions: string[] = useMemo(() => {
    return Array.isArray(recipe?.instructions)
      ? recipe.instructions
      : typeof recipe?.instructions === 'string' && recipe.instructions.startsWith('[')
      ? JSON.parse(recipe.instructions)
      : typeof recipe?.instructions === 'string' && recipe.instructions.trim()
      ? [recipe.instructions]
      : [];
  }, [recipe?.instructions]);

  const [editInstructionsText, setEditInstructionsText] = useState(
    initialInstructions.join('\n')
  );

  // Format initial ingredients for text edit
  const initialIngredientsText = (recipe?.ingredients || [])
    .map((ing: any) => {
      const parts = [ing.amount, ing.unit, ing.name].filter(Boolean);
      return parts.join(' ');
    })
    .join('\n');

  const [editIngredientsText, setEditIngredientsText] = useState(initialIngredientsText);

  if (!recipe) return null;

  const totalIngCount = (recipe.ingredients || []).length;
  const stockedCount = (recipe.ingredients || []).filter((i: any) => !!stockedMap[i.name]).length;
  const missingCount = totalIngCount - stockedCount;
  const percentStocked = totalIngCount > 0 ? Math.round((stockedCount / totalIngCount) * 100) : 0;

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const ingredientLines = editIngredientsText
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);

      const instructionSteps = editInstructionsText
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/mise/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recipe.id,
          title: editTitle.trim(),
          cookTime: editCookTime.trim() || null,
          servings: editServings.trim() || '2-4',
          frequency: editFrequency,
          notes: editNotes.trim() || null,
          instructions: instructionSteps,
          ingredients: ingredientLines,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update recipe');
      }

      if (onFrequencyChange) {
        onFrequencyChange(recipe.id, editFrequency);
      }
      if (onSaveRecipe) {
        onSaveRecipe({
          ...recipe,
          title: editTitle.trim(),
          cookTime: editCookTime.trim() || null,
          servings: editServings.trim() || '2-4',
          frequency: editFrequency,
          notes: editNotes.trim() || null,
          instructions: instructionSteps,
        });
      }

      setIsEditing(false);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-[#140f20] border border-purple-900/50 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-[#171126] to-[#140f20]">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {recipe.sourceType === 'cookbook' ? (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {recipe.cookbookTitle || 'Cookbook'}{' '}
                  {recipe.pageNumber ? `· p. ${recipe.pageNumber}` : ''}
                </span>
              ) : recipe.sourceType === 'url' ? (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 hover:underline"
                >
                  <span>Web Recipe</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Recipe
                </span>
              )}

              <span className="bg-white/10 text-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                {FREQUENCY_CONFIG[recipe.frequency]?.shortLabel || 'Custom'}
              </span>
            </div>

            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Recipe Title"
                className="w-full bg-[#0b0813] border border-purple-500 rounded-xl px-3 py-1.5 text-lg font-serif font-bold text-white focus:outline-none"
              />
            ) : (
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
                {recipe.title}
              </h3>
            )}

            {/* Quick Specs */}
            {!isEditing && (
              <div className="flex items-center gap-4 text-xs text-purple-200/70 pt-1">
                {recipe.cookTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" /> {recipe.cookTime}
                  </span>
                )}
                {recipe.servings && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> {recipe.servings} Servings
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-purple-300/80 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                title="Edit Recipe"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="text-purple-300/60 hover:text-white px-3 py-1.5 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              onClick={onClose}
              className="text-purple-300/60 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {isEditing ? (
            /* EDIT FORM */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-300 font-mono mb-1">
                    Cook Time
                  </label>
                  <input
                    type="text"
                    value={editCookTime}
                    onChange={(e) => setEditCookTime(e.target.value)}
                    placeholder="e.g. 30 mins"
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-300 font-mono mb-1">
                    Servings
                  </label>
                  <input
                    type="text"
                    value={editServings}
                    onChange={(e) => setEditServings(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-300 font-mono mb-1">
                    Rotation Cadence
                  </label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-300 font-mono mb-1">
                  Ingredients (One per line)
                </label>
                <textarea
                  rows={6}
                  value={editIngredientsText}
                  onChange={(e) => setEditIngredientsText(e.target.value)}
                  placeholder={`2 cups flour\n1 tsp baking soda\n1/2 cup butter`}
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-300 font-mono mb-1">
                  Instructions (One step per line)
                </label>
                <textarea
                  rows={5}
                  value={editInstructionsText}
                  onChange={(e) => setEditInstructionsText(e.target.value)}
                  placeholder={`Mix dry ingredients in a bowl.\nCook in skillet over medium heat.`}
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-300 font-mono mb-1">
                  Chef Notes / Secret Tips
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes or variations"
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* VIEW MODE */
            <>
              {/* Rotation Cadence Control */}
              <div className="bg-[#0e0a17] border border-purple-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono block mb-0.5">
                    Rotation Frequency
                  </span>
                  <span className="text-xs font-serif font-bold text-white">
                    {FREQUENCY_CONFIG[recipe.frequency]?.label || 'Standard Rotation'}
                  </span>
                </div>

                {onFrequencyChange && (
                  <select
                    value={recipe.frequency}
                    onChange={(e) => onFrequencyChange(recipe.id, e.target.value)}
                    className="bg-[#1a1228] border border-purple-800/60 text-purple-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {Object.entries(FREQUENCY_CONFIG).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.shortLabel}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* PANTRY INVENTORY STATUS & INTERACTIVE TOGGLE CARD */}
              <div className="bg-gradient-to-r from-[#171126] to-[#120d1e] border border-purple-800/30 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-purple-400" />
                      <span>Kitchen Inventory Status</span>
                    </span>
                    <h5 className="text-xs font-serif font-bold text-white">
                      {stockedCount} of {totalIngCount} ingredients in stock ({percentStocked}%)
                    </h5>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{stockedCount} Have</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                      <span>{missingCount} Need</span>
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${percentStocked}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-purple-300/60 pt-0.5">
                  <span>💡 Tap any ingredient below to toggle whether you have it</span>
                  {missingCount === 0 && totalIngCount > 0 && (
                    <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
                      ✨ Ready to cook tonight!
                    </span>
                  )}
                </div>
              </div>

              {/* INGREDIENTS LIST WITH CLICKABLE STOCK TOGGLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono flex items-center gap-1.5">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ingredients ({totalIngCount})</span>
                  </h4>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-[#0e0a17] p-0.5 rounded-lg border border-white/5 text-[10px]">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        activeTab === 'all' ? 'bg-purple-600 text-white' : 'text-purple-300/50 hover:text-white'
                      }`}
                    >
                      All ({totalIngCount})
                    </button>
                    <button
                      onClick={() => setActiveTab('need')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        activeTab === 'need' ? 'bg-amber-600 text-white' : 'text-amber-300/50 hover:text-white'
                      }`}
                    >
                      Need ({missingCount})
                    </button>
                    <button
                      onClick={() => setActiveTab('have')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        activeTab === 'have' ? 'bg-emerald-600 text-white' : 'text-emerald-300/50 hover:text-white'
                      }`}
                    >
                      Have ({stockedCount})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(recipe.ingredients || [])
                    .filter((ing: any) => {
                      const isStocked = !!stockedMap[ing.name];
                      if (activeTab === 'need') return !isStocked;
                      if (activeTab === 'have') return isStocked;
                      return true;
                    })
                    .map((ing: any, idx: number) => {
                      const isStocked = !!stockedMap[ing.name];
                      const isToggling = !!togglingMap[ing.name];

                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleStock(ing)}
                          className={`rounded-xl p-3 flex items-center justify-between text-xs transition-all cursor-pointer select-none group border ${
                            isStocked
                              ? 'bg-emerald-950/25 border-emerald-700/40 hover:border-emerald-500/70'
                              : 'bg-white/[0.03] border-white/5 hover:border-purple-500/50'
                          }`}
                          title={
                            isStocked
                              ? 'In your pantry. Click to mark as needed.'
                              : 'Missing. Click to mark as stocked in pantry.'
                          }
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                                isStocked
                                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm'
                                  : 'border-white/20 bg-black/40 group-hover:border-purple-400 text-transparent'
                              }`}
                            >
                              {isStocked ? (
                                <Check className="w-3 h-3 stroke-[3]" />
                              ) : (
                                <Plus className="w-3 h-3 text-purple-400/60 group-hover:text-purple-200" />
                              )}
                            </div>

                            <span
                              className={`font-medium capitalize truncate ${
                                isStocked ? 'text-emerald-100 font-semibold' : 'text-white'
                              }`}
                            >
                              {ing.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {(ing.amount || ing.unit) && (
                              <span className="text-purple-300 font-mono text-[11px] bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-lg">
                                {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                              </span>
                            )}

                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono shrink-0 ${
                                isStocked
                                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                                  : 'bg-amber-950/40 text-amber-300/80 border border-amber-800/30 group-hover:border-amber-500/60'
                              }`}
                            >
                              {isToggling ? '...' : isStocked ? 'Have' : 'Need'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              {initialInstructions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono">
                    Instructions
                  </h4>

                  <div className="space-y-2.5">
                    {initialInstructions.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 flex items-start gap-3"
                      >
                        <span className="w-5 h-5 rounded-full bg-purple-900/40 text-purple-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 border border-purple-700/40">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-purple-100/90 leading-relaxed font-sans">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chef Notes */}
              {recipe.notes && (
                <div className="bg-purple-950/30 border border-purple-800/30 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono block">
                    Chef Notes & Variations
                  </span>
                  <p className="text-xs text-purple-200/80 leading-relaxed italic">
                    {recipe.notes}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isEditing && (
          <div className="p-4 sm:p-5 border-t border-white/5 bg-[#120d1c] flex items-center justify-between gap-3">
            {onDelete ? (
              <button
                onClick={() => onDelete(recipe.id, recipe.title)}
                className="px-3.5 py-2 text-red-400 hover:text-red-300 text-xs font-bold rounded-xl hover:bg-red-500/10 cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Recipe</span>
              </button>

              {onMarkCooked && (
                <button
                  onClick={() => onMarkCooked(recipe)}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Cooked Tonight</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
