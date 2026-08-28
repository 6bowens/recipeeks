'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Wine,
  GlassWater,
  Flame,
  Check,
  RotateCcw,
  BookOpen,
  Globe,
  Layers,
  ChevronRight,
  Info,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkle,
  Plus,
} from 'lucide-react';
import { CocktailRecommendationResult } from '@/app/api/cocktails/recommend/route';
import { deduceBarCategory, isRecognizedBarStaple } from '@/lib/cocktail-utils';

const SPIRIT_OPTIONS = [
  { id: 'Bourbon', label: 'Bourbon / Rye', icon: '🥃', desc: 'Warm oak, caramel & rye spice' },
  { id: 'Gin', label: 'Gin', icon: '🍸', desc: 'Crisp botanicals & piney juniper' },
  { id: 'Tequila', label: 'Tequila / Mezcal', icon: '🌵', desc: 'Agave, smoke & earth' },
  { id: 'Rum', label: 'Rum', icon: '🍹', desc: 'Sugarcane, molasses & tropical fruit' },
  { id: 'Vodka', label: 'Vodka', icon: '🧊', desc: 'Clean, versatile & neutral' },
  { id: 'Brandy', label: 'Brandy / Cognac', icon: '🍇', desc: 'Rich fruit & aged oak' },
  { id: 'Any', label: 'Surprise Me', icon: '✨', desc: 'Anything in my bar cart' },
];

const FLAVOR_PROFILES = [
  {
    id: 'boozy',
    label: 'Spirit-Forward & Boozy',
    icon: '🥃',
    desc: 'Deep, warming stirred drinks like Old Fashioned, Manhattan & Oaxacan',
  },
  {
    id: 'sour',
    label: 'Crisp, Citrusy & Sour',
    icon: '🍋',
    desc: 'Bright balance of citrus & sweetness like Tommy\'s Margarita, Daiquiri & Gimlet',
  },
  {
    id: 'bitter',
    label: 'Bitter & Aperitivo',
    icon: '🍊',
    desc: 'Complex bittersweet depth like Negroni, Paper Plane & Siesta',
  },
  {
    id: 'highball',
    label: 'Fizzy & Refreshing',
    icon: '🫧',
    desc: 'Effervescent highballs like Paloma, Tom Collins & French 75',
  },
  {
    id: 'tiki',
    label: 'Tropical & Tiki',
    icon: '🍍',
    desc: 'Exotic fruit, orgeat & layered rums like 1944 Mai Tai & Jungle Bird',
  },
  {
    id: 'herbal',
    label: 'Herbal & Botanical',
    icon: '🌿',
    desc: 'Green herbs & aromatic botanicals like The Last Word, Naked & Famous & Sazerac',
  },
  {
    id: 'dessert',
    label: 'Rich & Decadent',
    icon: '☕',
    desc: 'Coffee, cocoa & luscious dessert notes like Espresso Martini',
  },
];

const COMPLEXITY_LEVELS = [
  { id: 'quick', label: 'Quick & Simple', desc: '3 ingredients or less, zero fuss' },
  { id: 'classic', label: 'Classic Shaken / Stirred', desc: 'Standard craft cocktail specs' },
  { id: 'craft', label: 'Craft Cocktail', desc: 'Multi-layer craft cocktail experience' },
];

function getFlavorBadge(flavorProfile?: string) {
  switch (flavorProfile?.toLowerCase()) {
    case 'boozy':
      return { icon: '🥃', label: 'Spirit-Forward' };
    case 'sour':
      return { icon: '🍋', label: 'Crisp & Sour' };
    case 'bitter':
      return { icon: '🍊', label: 'Bitter & Aperitivo' };
    case 'highball':
      return { icon: '🫧', label: 'Fizzy Highball' };
    case 'tiki':
      return { icon: '🍍', label: 'Tropical & Tiki' };
    case 'herbal':
      return { icon: '🌿', label: 'Herbal & Botanical' };
    case 'dessert':
      return { icon: '☕', label: 'Rich & Decadent' };
    default:
      return { icon: '🍸', label: 'Cocktail' };
  }
}

export function DigitalBartender() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSpirit, setSelectedSpirit] = useState<string>('Tequila');
  const [selectedFlavor, setSelectedFlavor] = useState<string>('sour');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('classic');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [addingIng, setAddingIng] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [results, setResults] = useState<{
    libraryMatches: CocktailRecommendationResult[];
    webClassicMatches: CocktailRecommendationResult[];
  } | null>(null);

  const handleGenerateRecommendations = async () => {
    try {
      setLoading(true);
      setStep(4);
      const res = await fetch('/api/cocktails/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spiritBase: selectedSpirit,
          flavorProfile: selectedFlavor,
          complexity: selectedComplexity,
          limit: 6,
          offset: 0,
        }),
      });

      if (!res.ok) throw new Error('Failed to find recommendations');
      const data = await res.json();
      setResults(data.recommendations);
      setHasMore(true);
    } catch (err) {
      alert('Error finding cocktails: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!results || loadingMore) return;
    try {
      setLoadingMore(true);
      const currentOffset = results.webClassicMatches?.length || 0;
      const res = await fetch('/api/cocktails/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spiritBase: selectedSpirit,
          flavorProfile: selectedFlavor,
          complexity: selectedComplexity,
          limit: 6,
          offset: currentOffset,
        }),
      });

      if (!res.ok) throw new Error('Failed to load more cocktails');
      const data = await res.json();
      const newItems = data.recommendations?.webClassicMatches || [];

      setResults((prev) => {
        if (!prev) return prev;
        const existingIds = new Set(prev.webClassicMatches.map((i) => i.id));
        const filteredNew = newItems.filter((i: CocktailRecommendationResult) => !existingIds.has(i.id));
        const itemsToAdd =
          filteredNew.length > 0
            ? filteredNew
            : newItems.map((it: CocktailRecommendationResult, idx: number) => ({
                ...it,
                id: `${it.id}-more-${Date.now()}-${idx}`,
              }));
        return {
          ...prev,
          webClassicMatches: [...prev.webClassicMatches, ...itemsToAdd],
        };
      });

      setHasMore(true);
    } catch (err) {
      alert('Error loading more cocktails: ' + (err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleQuickAddIngredient = async (ingredientName: string) => {
    try {
      setAddingIng(ingredientName);
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingredientName,
          category: deduceBarCategory(ingredientName),
          isAlwaysAvailable: isRecognizedBarStaple(ingredientName),
        }),
      });

      if (!res.ok) throw new Error('Failed to add ingredient to bar cart');

      // Optimistically update all cocktail results with this stocked ingredient
      setResults((prev) => {
        if (!prev) return prev;

        const updateList = (list: CocktailRecommendationResult[]) =>
          list.map((c) => {
            const hasThisIng = c.ingredients.some(
              (i) =>
                i.name.toLowerCase() === ingredientName.toLowerCase() ||
                i.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
                ingredientName.toLowerCase().includes(i.name.toLowerCase())
            );
            if (!hasThisIng) return c;

            const updatedIngredients = c.ingredients.map((i) => {
              if (
                i.name.toLowerCase() === ingredientName.toLowerCase() ||
                i.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
                ingredientName.toLowerCase().includes(i.name.toLowerCase())
              ) {
                return { ...i, isStocked: true };
              }
              return i;
            });

            const stockedCount = updatedIngredients.filter((i) => i.isStocked).length;
            const newScore = Math.round((stockedCount / updatedIngredients.length) * 100);

            return {
              ...c,
              matchScore: newScore,
              ingredients: updatedIngredients,
              matchedIngredients: [...c.matchedIngredients, ingredientName],
              missingIngredients: c.missingIngredients.filter(
                (m) =>
                  !m.toLowerCase().includes(ingredientName.toLowerCase()) &&
                  !ingredientName.toLowerCase().includes(m.toLowerCase())
              ),
            };
          });

        return {
          libraryMatches: updateList(prev.libraryMatches),
          webClassicMatches: updateList(prev.webClassicMatches),
        };
      });

      setToastMessage(`✨ Added "${ingredientName}" to your Bar Cart!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      alert('Error adding ingredient: ' + (err as Error).message);
    } finally {
      setAddingIng(null);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setResults(null);
    setHasMore(true);
  };

  const [resultFilter, setResultFilter] = useState<'all' | 'books' | 'digital'>('all');

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#12151c] via-[#1a171d] to-[#12151c] rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-amber-900/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
            What are you in the mood to sip?
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-400 max-w-2xl mt-1">
            Answer 3 quick sensory questions to pair your craving with cocktails from your library and bar cart.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="relative z-10 shrink-0">
          {step < 4 ? (
            <div className="flex items-center gap-2 bg-[#0d0f14] border border-amber-900/40 px-3.5 py-2 rounded-2xl text-xs">
              <span className={step >= 1 ? 'text-amber-400 font-bold' : 'text-charcoal-500'}>1. Spirit</span>
              <ChevronRight className="w-3 h-3 text-charcoal-600" />
              <span className={step >= 2 ? 'text-amber-400 font-bold' : 'text-charcoal-500'}>2. Flavor</span>
              <ChevronRight className="w-3 h-3 text-charcoal-600" />
              <span className={step >= 3 ? 'text-amber-400 font-bold' : 'text-charcoal-500'}>3. Style</span>
            </div>
          ) : (
            <button
              onClick={resetWizard}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-xs flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start Over</span>
            </button>
          )}
        </div>
      </div>

      {/* STEP 1: SPIRIT SELECTION */}
      {step === 1 && (
        <div className="bg-[#12151b] rounded-2xl border border-amber-900/20 p-6 shadow-xl space-y-5 animate-in fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">Step 1 of 3</span>
            <h3 className="text-xl font-serif font-bold text-white mt-0.5">
              Select Your Base Spirit
            </h3>
            <p className="text-xs text-charcoal-400">Pick the core liquor you want to build around tonight.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SPIRIT_OPTIONS.map((spirit) => {
              const isSelected = selectedSpirit === spirit.id;
              return (
                <button
                  key={spirit.id}
                  onClick={() => setSelectedSpirit(spirit.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/60 to-red-950/60 ring-2 ring-amber-500/20 shadow-lg'
                      : 'border-white/5 hover:border-amber-700/40 bg-[#161a22]/70 hover:bg-[#1c212b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{spirit.icon}</span>
                    {isSelected && (
                      <span className="bg-amber-500 text-black p-1 rounded-full shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{spirit.label}</h4>
                    <p className="text-[11px] text-charcoal-400 mt-0.5">{spirit.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-charcoal-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Next: Flavor Profile</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FLAVOR PROFILE SELECTION */}
      {step === 2 && (
        <div className="bg-[#12151b] rounded-2xl border border-amber-900/20 p-6 shadow-xl space-y-5 animate-in fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">Step 2 of 3</span>
            <h3 className="text-xl font-serif font-bold text-white mt-0.5">
              What flavor profile are you craving?
            </h3>
            <p className="text-xs text-charcoal-400">Choose the sensory character and taste profile of your cocktail.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FLAVOR_PROFILES.map((flavor) => {
              const isSelected = selectedFlavor === flavor.id;
              return (
                <button
                  key={flavor.id}
                  onClick={() => setSelectedFlavor(flavor.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/60 to-red-950/60 ring-2 ring-amber-500/20 shadow-lg'
                      : 'border-white/5 hover:border-amber-700/40 bg-[#161a22]/70 hover:bg-[#1c212b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{flavor.icon}</span>
                    {isSelected && (
                      <span className="bg-amber-500 text-black p-1 rounded-full shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{flavor.label}</h4>
                    <p className="text-[11px] text-charcoal-400 mt-0.5">{flavor.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-charcoal-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-charcoal-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Next: Style & Complexity</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COMPLEXITY & FINISH */}
      {step === 3 && (
        <div className="bg-[#12151b] rounded-2xl border border-amber-900/20 p-6 shadow-xl space-y-5 animate-in fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">Step 3 of 3</span>
            <h3 className="text-xl font-serif font-bold text-white mt-0.5">
              Select Effort & Complexity
            </h3>
            <p className="text-xs text-charcoal-400">How elaborate do you want to get behind the bar tonight?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {COMPLEXITY_LEVELS.map((lvl) => {
              const isSelected = selectedComplexity === lvl.id;
              return (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedComplexity(lvl.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/60 to-red-950/60 ring-2 ring-amber-500/20 shadow-lg'
                      : 'border-white/5 hover:border-amber-700/40 bg-[#161a22]/70 hover:bg-[#1c212b]'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-white">{lvl.label}</h4>
                    <p className="text-[11px] text-charcoal-400 mt-1">{lvl.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="mt-3 flex justify-end">
                      <span className="bg-amber-500 text-black p-1 rounded-full shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-charcoal-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleGenerateRecommendations}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-charcoal-950 font-extrabold text-sm rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4 fill-charcoal-950" />
              <span>Get Cocktail Recommendations</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: RECOMMENDATIONS FEED */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in">
          {loading ? (
            <div className="bg-[#12151b] rounded-3xl p-12 text-center border border-amber-900/30 shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-300 animate-bounce">
                <GlassWater className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white">
                Finding Matching Cocktails...
              </h3>
              <p className="text-xs text-charcoal-400 max-w-md mx-auto">
                Consulting your indexed cocktail books and cross-referencing your active bar cart bottles.
              </p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-4 flex-wrap bg-[#12151b] p-3 rounded-2xl border border-amber-900/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-charcoal-400 font-medium">Filter View:</span>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => setResultFilter('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        resultFilter === 'all'
                          ? 'bg-amber-500 text-charcoal-950 shadow-sm'
                          : 'text-charcoal-400 hover:text-white'
                      }`}
                    >
                      All ({(results.libraryMatches?.length || 0) + (results.webClassicMatches?.length || 0)})
                    </button>
                    <button
                      onClick={() => setResultFilter('books')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        resultFilter === 'books'
                          ? 'bg-amber-500 text-charcoal-950 shadow-sm'
                          : 'text-charcoal-400 hover:text-white'
                      }`}
                    >
                      📖 Books ({results.libraryMatches?.length || 0})
                    </button>
                    <button
                      onClick={() => setResultFilter('digital')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        resultFilter === 'digital'
                          ? 'bg-amber-500 text-charcoal-950 shadow-sm'
                          : 'text-charcoal-400 hover:text-white'
                      }`}
                    >
                      🌐 Curated ({results.webClassicMatches?.length || 0})
                    </button>
                  </div>
                </div>

                <button
                  onClick={resetWizard}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Change Options</span>
                </button>
              </div>

              {/* STREAM 1: Physical Book Matches First */}
              {(resultFilter === 'all' || resultFilter === 'books') &&
                results.libraryMatches &&
                results.libraryMatches.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded flex items-center gap-1.5 font-mono">
                        <BookOpen className="w-3.5 h-3.5 text-amber-300" /> Books in Your Library
                      </span>
                      <span className="text-xs text-charcoal-400">
                        {results.libraryMatches.length} recipe(s) found in your physical collection
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.libraryMatches.map((drink) => (
                        <CocktailCard
                          key={drink.id}
                          cocktail={drink}
                          onQuickAdd={handleQuickAddIngredient}
                          addingIng={addingIng}
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* STREAM 2: Curated Web Specs (Strictly aligned to taste profile) */}
              {(resultFilter === 'all' || resultFilter === 'digital') &&
                results.webClassicMatches &&
                results.webClassicMatches.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded flex items-center gap-1.5 font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Curated Recipes ({results.webClassicMatches[0]?.flavorProfile || selectedFlavor})
                      </span>
                      <span className="text-xs text-charcoal-400">
                        Showing recipes tailored to your taste profile & bar cart
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.webClassicMatches.map((drink) => (
                        <CocktailCard
                          key={drink.id}
                          cocktail={drink}
                          onQuickAdd={handleQuickAddIngredient}
                          addingIng={addingIng}
                        />
                      ))}
                    </div>

                    {/* Endless Load 6 More Cocktails Button */}
                    {hasMore && (
                      <div className="flex justify-center pt-5 pb-2">
                        <button
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="px-6 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-charcoal-950 font-extrabold text-xs rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                        >
                          {loadingMore ? (
                            <>
                              <RotateCcw className="w-4 h-4 animate-spin" />
                              <span>Pouring 6 More Specs...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 stroke-[3]" />
                              <span>Load 6 More Cocktails</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              {(!results.libraryMatches || results.libraryMatches.length === 0) &&
                (!results.webClassicMatches || results.webClassicMatches.length === 0) && (
                  <div className="bg-[#12151b] rounded-2xl p-8 text-center border border-amber-900/30 shadow-xl">
                    <p className="text-sm font-semibold text-charcoal-200">
                      No cocktails matched this exact combination.
                    </p>
                    <p className="text-xs text-charcoal-400 mt-1">
                      Try selecting &quot;Surprise Me&quot; or scan more bottles into your Bar Cart.
                    </p>
                  </div>
                )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CocktailCard({
  cocktail,
  onQuickAdd,
  addingIng,
}: {
  cocktail: CocktailRecommendationResult;
  onQuickAdd: (ingredientName: string) => void;
  addingIng: string | null;
}) {
  const flavorBadge = getFlavorBadge(cocktail.flavorProfile);

  return (
    <div className="bg-[#13161c] rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col justify-between hover:border-amber-500/40 transition-colors">
      <div>
        {/* Header Badges: Dynamic Taste Profile & Spirit */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {cocktail.source === 'library' ? (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-amber-300" /> {cocktail.bookTitle || 'Library'} {cocktail.pageNumber ? `· p. ${cocktail.pageNumber}` : ''}
              </span>
            ) : (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                <span>{flavorBadge.icon}</span>
                <span>{flavorBadge.label}</span>
              </span>
            )}

            <span className="bg-white/10 text-charcoal-300 text-[10px] font-semibold px-2 py-0.5 rounded capitalize">
              {cocktail.technique || 'Craft'}
            </span>
          </div>

          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              cocktail.matchScore === 100
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                : 'bg-amber-950 text-amber-300 border border-amber-500/50'
            }`}
          >
            {cocktail.matchScore}% Ready
          </span>
        </div>

        {/* Title & Description */}
        <h4 className="text-lg font-serif font-bold text-white leading-tight">
          {cocktail.name}
        </h4>
        {cocktail.description && (
          <p className="text-xs text-charcoal-400 mt-1 italic">{cocktail.description}</p>
        )}

        {/* Glassware & Ice Specs */}
        <div className="flex items-center gap-3 text-[11px] text-charcoal-300 my-3 py-2 border-y border-white/5">
          <span>🍸 <strong className="text-amber-400">Glass:</strong> {cocktail.glassware}</span>
          {cocktail.ice && <span>🧊 <strong className="text-amber-400">Ice:</strong> {cocktail.ice}</span>}
        </div>

        {/* Ingredients Spec */}
        <div className="space-y-1.5 mt-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80 font-mono">Specs / Build:</span>
          <div className="space-y-1.5">
            {cocktail.ingredients.map((ing, idx) => (
              <div
                key={idx}
                className={`text-xs flex items-center justify-between py-1.5 px-2.5 rounded-xl transition-all ${
                  ing.isStocked
                    ? 'bg-emerald-950/40 text-emerald-200 font-medium border border-emerald-800/30'
                    : 'text-charcoal-300 bg-white/[0.03] border border-white/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {ing.isStocked ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="truncate">{ing.name}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {ing.amount && (
                    <span className="font-mono text-[11px] text-charcoal-400">
                      {ing.amount} {ing.unit || ''}
                    </span>
                  )}

                  {!ing.isStocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdd(ing.name);
                      }}
                      disabled={addingIng === ing.name}
                      title={`Add ${ing.name} to your Bar Cart`}
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      <span>{addingIng === ing.name ? 'Adding...' : 'I have this'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        {cocktail.instructions && cocktail.instructions.length > 0 && (
          <div className="mt-3 text-xs text-charcoal-300 space-y-1 bg-black/40 border border-white/5 p-3 rounded-xl">
            <span className="font-bold text-amber-400 text-[10px] uppercase tracking-widest font-mono">Method:</span>
            <ol className="list-decimal list-inside space-y-0.5 mt-0.5 text-[11px] leading-relaxed text-charcoal-300">
              {cocktail.instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {cocktail.garnish && (
          <div className="mt-2 text-[11px] text-amber-300 font-semibold flex items-center gap-1">
            <span>✨ <strong>Garnish:</strong> {cocktail.garnish}</span>
          </div>
        )}
      </div>
    </div>
  );
}
