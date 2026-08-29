'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Link as LinkIcon,
  BookOpen,
  Edit3,
  Trash2,
  Clock,
  Users,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Check,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { FREQUENCY_CONFIG, deduceAisleCategory } from '@/lib/playlist-utils';

interface MiseRecipeVaultProps {
  onRefresh: () => void;
}

export function MiseRecipeVault({ onRefresh }: MiseRecipeVaultProps) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeAddTab, setActiveAddTab] = useState<'url' | 'manual' | 'cookbook'>('url');
  const [filterFrequency, setFilterFrequency] = useState<string>('all');

  // URL Import State
  const [urlInput, setUrlInput] = useState('');
  const [urlFrequency, setUrlFrequency] = useState('1_week');
  const [parsingUrl, setParsingUrl] = useState(false);

  // Manual Input State
  const [manualTitle, setManualTitle] = useState('');
  const [manualFrequency, setManualFrequency] = useState('1_week');
  const [manualServings, setManualServings] = useState('2-4');
  const [manualCookTime, setManualCookTime] = useState('30 mins');
  const [manualIngredientsText, setManualIngredientsText] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  // Cookbook Import State
  const [cookbooks, setCookbooks] = useState<any[]>([]);
  const [selectedCookbookId, setSelectedCookbookId] = useState<string>('');
  const [cookbookRecipes, setCookbookRecipes] = useState<any[]>([]);
  const [importingCookbookRecipe, setImportingCookbookRecipe] = useState<string | null>(null);

  const fetchVault = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mise/recipes');
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.recipes || []);
      }
    } catch (err) {
      console.error('Fetch vault error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCookbooks = async () => {
    try {
      const res = await fetch('/api/cookbooks');
      if (res.ok) {
        const data = await res.json();
        setCookbooks(data.cookbooks || []);
        if (data.cookbooks?.length > 0) {
          setSelectedCookbookId(data.cookbooks[0].id);
          fetchCookbookRecipes(data.cookbooks[0].id);
        }
      }
    } catch (err) {
      console.error('Fetch cookbooks error:', err);
    }
  };

  const fetchCookbookRecipes = async (cbId: string) => {
    try {
      const res = await fetch(`/api/cookbooks/${cbId}`);
      if (res.ok) {
        const data = await res.json();
        setCookbookRecipes(data.cookbook?.recipes || []);
      }
    } catch (err) {
      console.error('Fetch cb recipes error:', err);
    }
  };

  useEffect(() => {
    fetchVault();
  }, []);

  const handleUpdateFrequency = async (recipeId: string, newFrequency: string) => {
    try {
      // Optimistic update
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, frequency: newFrequency } : r))
      );

      await fetch('/api/mise/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipeId, frequency: newFrequency }),
      });
      onRefresh();
    } catch (err) {
      alert('Failed to update frequency');
      fetchVault();
    }
  };

  const handleDeleteRecipe = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from your Mise vault?`)) return;
    try {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      await fetch(`/api/mise/recipes?id=${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      alert('Failed to delete recipe');
      fetchVault();
    }
  };

  const handleImportUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      setParsingUrl(true);
      const parseRes = await fetch('/api/mise/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      if (!parseRes.ok) throw new Error('Failed to parse URL');
      const parsed = await parseRes.json();
      const rec = parsed.recipe;

      // Save to database
      const saveRes = await fetch('/api/mise/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: rec.title,
          sourceType: 'url',
          sourceUrl: rec.sourceUrl,
          servings: rec.servings,
          prepTime: rec.prepTime,
          cookTime: rec.cookTime,
          frequency: urlFrequency,
          instructions: rec.instructions,
          ingredients: rec.ingredients,
        }),
      });

      if (!saveRes.ok) throw new Error('Failed to save recipe');
      setUrlInput('');
      setShowAddModal(false);
      fetchVault();
      onRefresh();
    } catch (err) {
      alert('Error importing URL: ' + (err as Error).message);
    } finally {
      setParsingUrl(false);
    }
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    try {
      setSavingManual(true);
      const lines = manualIngredientsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const ingredients = lines.map((line) => {
        return {
          name: line,
          amount: '',
          unit: '',
          aisleCategory: deduceAisleCategory(line),
        };
      });

      const res = await fetch('/api/mise/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle.trim(),
          sourceType: 'manual',
          servings: manualServings,
          cookTime: manualCookTime,
          frequency: manualFrequency,
          notes: manualNotes,
          ingredients,
        }),
      });

      if (!res.ok) throw new Error('Failed to save recipe');
      setManualTitle('');
      setManualIngredientsText('');
      setManualNotes('');
      setShowAddModal(false);
      fetchVault();
      onRefresh();
    } catch (err) {
      alert('Error saving recipe: ' + (err as Error).message);
    } finally {
      setSavingManual(false);
    }
  };

  const handleImportCookbookRecipe = async (recipeId: string) => {
    try {
      setImportingCookbookRecipe(recipeId);
      const res = await fetch('/api/mise/import-cookbook-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, frequency: '1_week' }),
      });

      if (!res.ok) throw new Error('Failed to import recipe');
      fetchVault();
      onRefresh();
    } catch (err) {
      alert('Error importing cookbook recipe: ' + (err as Error).message);
    } finally {
      setImportingCookbookRecipe(null);
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    if (filterFrequency === 'all') return true;
    return r.frequency === filterFrequency;
  });

  return (
    <div className="space-y-6">
      {/* Vault Header & Add Button */}
      <div className="bg-gradient-to-r from-[#120d1f] via-[#1a122c] to-[#120d1f] rounded-3xl p-5 sm:p-7 border border-purple-900/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Recipe Vault
            </span>
            <span className="text-xs text-purple-300/70 font-mono">
              {recipes.length} total saved recipe{recipes.length === 1 ? '' : 's'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
            Dinner Recipe Repository
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Set your target rotation frequency for each dish (or 0x to pause).
          </p>
        </div>

        <button
          onClick={() => {
            setShowAddModal(true);
            fetchCookbooks();
          }}
          className="px-5 py-3 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Recipe</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFilterFrequency('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filterFrequency === 'all'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-[#140f20] text-purple-300/60 hover:text-white border border-white/5'
          }`}
        >
          All ({recipes.length})
        </button>
        {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => {
          const count = recipes.filter((r) => r.frequency === k).length;
          return (
            <button
              key={k}
              onClick={() => setFilterFrequency(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                filterFrequency === k
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-[#140f20] text-purple-300/60 hover:text-white border border-white/5'
              }`}
            >
              {meta.shortLabel} ({count})
            </button>
          );
        })}
      </div>

      {/* RECIPES LIST */}
      {loading ? (
        <div className="py-12 text-center text-xs text-purple-300/60">Loading Mise vault...</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <p className="text-sm font-semibold text-white">No recipes found in this view.</p>
          <p className="text-xs text-purple-200/70 max-w-sm mx-auto">
            Add recipes manually, paste web links, or 1-click import from your physical cookbooks.
          </p>
          <button
            onClick={() => {
              setShowAddModal(true);
              fetchCookbooks();
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add First Recipe</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((r) => (
            <div
              key={r.id}
              className="bg-[#140f20] rounded-2xl border border-purple-900/30 p-5 shadow-xl flex flex-col justify-between hover:border-purple-500/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {r.sourceType === 'cookbook' ? (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {r.cookbookTitle || 'Cookbook'}
                      </span>
                    ) : r.sourceType === 'url' ? (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 hover:underline"
                      >
                        <LinkIcon className="w-3 h-3" /> Web Link
                      </a>
                    ) : (
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                        Manual Entry
                      </span>
                    )}

                    {r.cookTime && (
                      <span className="text-[10px] text-purple-300/60 font-mono">
                        {r.cookTime}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteRecipe(r.id, r.title)}
                    className="text-purple-400/40 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Remove from vault"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-lg font-serif font-bold text-white leading-tight">
                  {r.title}
                </h3>

                {r.ingredients && r.ingredients.length > 0 && (
                  <div className="text-xs text-purple-200/70 line-clamp-2">
                    <strong className="text-purple-300 font-medium">Ingredients:</strong>{' '}
                    {r.ingredients.map((i: any) => i.name).join(', ')}
                  </div>
                )}
              </div>

              {/* Frequency Cadence Dropdown */}
              <div className="pt-4 mt-3 border-t border-white/5 flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-purple-300/80 font-mono">Rotation:</span>
                <select
                  value={r.frequency}
                  onChange={(e) => handleUpdateFrequency(r.id, e.target.value)}
                  className="bg-[#0b0813] border border-purple-800/40 text-purple-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD RECIPE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#140f20] border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-xl font-serif font-bold text-white">Add Recipe to Mise</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-purple-300/60 hover:text-white p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source Tab Selector */}
            <div className="grid grid-cols-3 gap-2 bg-[#0b0813] p-1 rounded-2xl border border-purple-900/40 text-xs font-bold">
              <button
                onClick={() => setActiveAddTab('url')}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeAddTab === 'url'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Web URL</span>
              </button>
              <button
                onClick={() => setActiveAddTab('manual')}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeAddTab === 'manual'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Manual</span>
              </button>
              <button
                onClick={() => setActiveAddTab('cookbook')}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeAddTab === 'cookbook'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Cookbook</span>
              </button>
            </div>

            {/* TAB 1: WEB URL IMPORT */}
            {activeAddTab === 'url' && (
              <form onSubmit={handleImportUrl} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Recipe Web URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.seriouseats.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    required
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[11px] text-purple-300/50 mt-1">
                    Paste any recipe URL (NYT Cooking, Serious Eats, food blogs). AI extracts ingredients & steps automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Rotation Frequency
                  </label>
                  <select
                    value={urlFrequency}
                    onChange={(e) => setUrlFrequency(e.target.value)}
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
                    disabled={parsingUrl || !urlInput.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${parsingUrl ? 'animate-spin' : ''}`} />
                    <span>{parsingUrl ? 'Parsing Recipe...' : 'Import URL'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: MANUAL ENTRY */}
            {activeAddTab === 'manual' && (
              <form onSubmit={handleSaveManual} className="space-y-4">
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
                      className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500"
                    />
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
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                    Ingredients (one per line)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="4 bone-in chicken thighs&#10;1 lb Yukon Gold potatoes&#10;2 cloves garlic&#10;Fresh rosemary"
                    value={manualIngredientsText}
                    onChange={(e) => setManualIngredientsText(e.target.value)}
                    className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
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
                    disabled={savingManual || !manualTitle.trim()}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all"
                  >
                    <span>{savingManual ? 'Saving...' : 'Save Recipe'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: 1-CLICK COOKBOOK IMPORT */}
            {activeAddTab === 'cookbook' && (
              <div className="space-y-4">
                {cookbooks.length === 0 ? (
                  <p className="text-xs text-purple-200/70 text-center py-6">
                    No cookbooks found in your Recipeeks library.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                        Select Physical Cookbook
                      </label>
                      <select
                        value={selectedCookbookId}
                        onChange={(e) => {
                          setSelectedCookbookId(e.target.value);
                          fetchCookbookRecipes(e.target.value);
                        }}
                        className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        {cookbooks.map((cb) => (
                          <option key={cb.id} value={cb.id}>
                            {cb.title} ({cb.totalRecipes} recipes)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {cookbookRecipes.map((r) => {
                        const isAlreadyImported = recipes.some((vr) => vr.title === r.title);
                        return (
                          <div
                            key={r.id}
                            className="p-3 rounded-xl bg-[#0b0813] border border-white/5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-white block truncate">
                                {r.title}
                              </span>
                              {r.pageNumber && (
                                <span className="text-[10px] text-purple-400 font-mono">
                                  Page {r.pageNumber}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleImportCookbookRecipe(r.id)}
                              disabled={isAlreadyImported || importingCookbookRecipe === r.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                                isAlreadyImported
                                  ? 'bg-purple-950/60 text-purple-400/60 cursor-default'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                              }`}
                            >
                              {isAlreadyImported ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>In Vault</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                  <span>{importingCookbookRecipe === r.id ? 'Adding...' : 'Import'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
