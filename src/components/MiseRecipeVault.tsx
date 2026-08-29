'use client';

import React, { useState } from 'react';
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
  FileText,
  Eye,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';
import { MiseRecipeDetailModal } from '@/components/MiseRecipeDetailModal';
import { MiseGoogleNotesModal } from '@/components/MiseGoogleNotesModal';

interface MiseRecipeVaultProps {
  recipes: any[];
  onRefresh: () => void;
}

export function MiseRecipeVault({ recipes, onRefresh }: MiseRecipeVaultProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<any | null>(null);

  // Manual Add Form State
  const [addMode, setAddMode] = useState<'url' | 'manual'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [urlParsing, setUrlParsing] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualCookTime, setManualCookTime] = useState('30 mins');
  const [manualServings, setManualServings] = useState('2-4');
  const [manualFrequency, setManualFrequency] = useState('1_week');
  const [manualIngredientsText, setManualIngredientsText] = useState('');
  const [manualInstructionsText, setManualInstructionsText] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [savingRecipe, setSavingRecipe] = useState(false);

  const handleUpdateFrequency = async (recipeId: string, frequency: string) => {
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

  const handleDeleteRecipe = async (recipeId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" from your Mise vault?`)) {
      return;
    }

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

  const handleParseUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      setUrlParsing(true);
      const res = await fetch('/api/mise/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          frequency: manualFrequency,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to import recipe from URL');
      }

      setUrlInput('');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUrlParsing(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    try {
      setSavingRecipe(true);
      const ingredients = manualIngredientsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => ({ name: line }));

      const res = await fetch('/api/mise/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle.trim(),
          cookTime: manualCookTime.trim() || undefined,
          servings: manualServings.trim() || undefined,
          frequency: manualFrequency,
          ingredients,
          instructions: manualInstructionsText.trim() || undefined,
          notes: manualNotes.trim() || undefined,
          sourceType: 'manual',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save recipe');
      }

      setManualTitle('');
      setManualIngredientsText('');
      setManualInstructionsText('');
      setManualNotes('');
      setShowAddModal(false);
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingRecipe(false);
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.ingredients || []).some((i: any) =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesFreq =
      selectedFrequencyFilter === 'all' || r.frequency === selectedFrequencyFilter;

    return matchesSearch && matchesFreq;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#120d1f] via-[#1a122c] to-[#120d1f] rounded-3xl p-5 sm:p-7 border border-purple-900/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Recipe Vault
            </span>
            <span className="text-xs text-purple-300/70 font-mono">
              {recipes.length} total saved recipes
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
            Recipe Repository & Cadence
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Set how frequently you want each dish to appear in your dinner rotation.
          </p>
        </div>

        {/* Action Buttons: Google Notes & Add Recipe */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
          <button
            onClick={() => setShowNotesModal(true)}
            className="px-4 py-3 bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 hover:from-purple-600/50 hover:to-fuchsia-600/50 border border-purple-500/40 text-purple-200 hover:text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Paste notes or text to automatically extract and import recipes"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Paste & Scan Notes</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Recipe</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/50" />
          <input
            type="text"
            placeholder="Search vault recipes or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#140f20] border border-purple-900/30 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-purple-500 placeholder:text-purple-300/40"
          />
        </div>

        {/* Frequency Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedFrequencyFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
              selectedFrequencyFilter === 'all'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-[#140f20] text-purple-200/60 hover:text-white border border-white/5'
            }`}
          >
            All ({recipes.length})
          </button>
          {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => {
            const count = recipes.filter((r) => r.frequency === k).length;
            return (
              <button
                key={k}
                onClick={() => setSelectedFrequencyFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                  selectedFrequencyFilter === k
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-[#140f20] text-purple-200/60 hover:text-white border border-white/5'
                }`}
              >
                {meta.shortLabel} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipes Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <BookMarked className="w-12 h-12 mx-auto text-purple-500/40" />
          <h3 className="text-lg font-bold text-white">No Recipes Found</h3>
          <p className="text-xs text-purple-200/70 max-w-sm mx-auto">
            {searchQuery
              ? `No recipes matching "${searchQuery}". Try a different term or clear the search.`
              : 'Add your favorite dishes via URL, Google Notes, or from your Recipeeks cookbooks.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => setSelectedRecipeForDetail(recipe)}
              className="bg-[#140f20] rounded-3xl border border-purple-900/30 p-5 shadow-xl space-y-4 hover:border-purple-500/50 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {recipe.sourceType === 'cookbook' ? (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" /> {recipe.cookbookTitle || 'Cookbook'}
                    </span>
                  ) : recipe.sourceType === 'google_notes' ? (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                      📝 Google Notes
                    </span>
                  ) : recipe.sourceType === 'url' ? (
                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                      <span>Web</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      Manual
                    </span>
                  )}

                  <span className="text-[11px] text-purple-400 font-mono">
                    {(recipe.ingredients || []).length} ingr.
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-white group-hover:text-purple-200 transition-colors line-clamp-1">
                  {recipe.title}
                </h3>

                <p className="text-xs text-purple-200/60 line-clamp-2 leading-relaxed">
                  {(recipe.ingredients || []).map((i: any) => i.name).join(', ') || 'No ingredients listed'}
                </p>
              </div>

              {/* Bottom Frequency Selector & Delete */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="pt-3 border-t border-white/5 flex items-center justify-between gap-2"
              >
                <select
                  value={recipe.frequency}
                  onChange={(e) => handleUpdateFrequency(recipe.id, e.target.value)}
                  className="bg-[#0b0813] border border-purple-800/40 text-purple-200 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer min-w-[130px]"
                >
                  {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleDeleteRecipe(recipe.id, recipe.title)}
                  className="p-1.5 text-purple-400/40 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                  title="Delete from vault"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL RECIPE DETAIL MODAL */}
      {selectedRecipeForDetail && (
        <MiseRecipeDetailModal
          recipe={selectedRecipeForDetail}
          onClose={() => setSelectedRecipeForDetail(null)}
          onFrequencyChange={(id, freq) => {
            handleUpdateFrequency(id, freq);
            setSelectedRecipeForDetail((prev: any) => (prev ? { ...prev, frequency: freq } : null));
          }}
          onDelete={(id, title) => {
            handleDeleteRecipe(id, title);
            setSelectedRecipeForDetail(null);
          }}
        />
      )}

      {/* GOOGLE NOTES SCANNER MODAL */}
      {showNotesModal && (
        <MiseGoogleNotesModal
          onClose={() => setShowNotesModal(false)}
          onImportSuccess={onRefresh}
        />
      )}

      {/* ADD RECIPE MODAL (URL & MANUAL) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#140f20] border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-xl font-serif font-bold text-white">Add Recipe to Vault</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-purple-300/60 hover:text-white p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="bg-[#0b0813] p-1 rounded-xl flex items-center gap-1 text-xs">
              <button
                onClick={() => setAddMode('url')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  addMode === 'url' ? 'bg-purple-600 text-white' : 'text-purple-300/60 hover:text-white'
                }`}
              >
                Import from Web URL
              </button>
              <button
                onClick={() => setAddMode('manual')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  addMode === 'manual' ? 'bg-purple-600 text-white' : 'text-purple-300/60 hover:text-white'
                }`}
              >
                Manual Entry
              </button>
            </div>

            {addMode === 'url' ? (
              <form onSubmit={handleParseUrl} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Recipe Web URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://cooking.nytimes.com/recipes/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    required
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Rotation Cadence
                  </label>
                  <select
                    value={manualFrequency}
                    onChange={(e) => setManualFrequency(e.target.value)}
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={urlParsing || !urlInput.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{urlParsing ? 'Extracting Recipe...' : 'Import Recipe'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleManualSave} className="space-y-4 max-h-96 overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Recipe Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Crispy Skillet Chicken Thighs"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    required
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                      Cook Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 35 mins"
                      value={manualCookTime}
                      onChange={(e) => setManualCookTime(e.target.value)}
                      className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                      Servings
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4 servings"
                      value={manualServings}
                      onChange={(e) => setManualServings(e.target.value)}
                      className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Rotation Frequency
                  </label>
                  <select
                    value={manualFrequency}
                    onChange={(e) => setManualFrequency(e.target.value)}
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Ingredients (1 per line)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="2 lbs chicken thighs&#10;1 tbsp olive oil&#10;1 tsp smoked paprika&#10;2 cloves garlic"
                    value={manualIngredientsText}
                    onChange={(e) => setManualIngredientsText(e.target.value)}
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Instructions / Method (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Sear chicken on high heat for 6 mins per side..."
                    value={manualInstructionsText}
                    onChange={(e) => setManualInstructionsText(e.target.value)}
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRecipe || !manualTitle.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all"
                  >
                    <span>{savingRecipe ? 'Saving...' : 'Save Recipe'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
