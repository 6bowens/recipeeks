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
} from 'lucide-react';
import { CocktailRecommendationResult } from '@/app/api/cocktails/recommend/route';

const SPIRIT_OPTIONS = [
  { id: 'Bourbon', label: 'Bourbon / Rye', icon: '🥃', desc: 'Warm oak, caramel & spice' },
  { id: 'Gin', label: 'Gin', icon: '🍸', desc: 'Crisp botanicals & juniper' },
  { id: 'Tequila', label: 'Tequila / Mezcal', icon: '🌵', desc: 'Agave, smoke & citrus' },
  { id: 'Rum', label: 'Rum', icon: '🍹', desc: 'Sugarcane, molasses & tiki' },
  { id: 'Vodka', label: 'Vodka', icon: '🧊', desc: 'Clean, versatile & neutral' },
  { id: 'Brandy', label: 'Brandy / Cognac', icon: '🍇', desc: 'Rich fruit & aged oak' },
  { id: 'Any', label: 'Surprise Me', icon: '✨', desc: 'Anything from my bar cart' },
];

const FLAVOR_PROFILES = [
  {
    id: 'boozy',
    label: 'Spirit-Forward & Boozy',
    icon: '🥃',
    desc: 'Deep, warming, stirred classics like Old Fashioned & Manhattan',
  },
  {
    id: 'sour',
    label: 'Crisp, Citrusy & Sour',
    icon: '🍋',
    desc: 'Bright balance of citrus & sweetness like Daiquiri, Gimlet & Margarita',
  },
  {
    id: 'bitter',
    label: 'Bitter & Aperitivo',
    icon: '🍊',
    desc: 'Complex bittersweet depth like Negroni, Paper Plane & Boulevardier',
  },
  {
    id: 'highball',
    label: 'Fizzy & Refreshing',
    icon: '🫧',
    desc: 'Long, effervescent drinks like Paloma, Tom Collins & French 75',
  },
  {
    id: 'tiki',
    label: 'Tropical & Tiki',
    icon: '🍍',
    desc: 'Exotic rums, orgeat & fruit like Mai Tai, Jungle Bird & Painkiller',
  },
  {
    id: 'herbal',
    label: 'Herbal & Botanical',
    icon: '🌿',
    desc: 'Intricate liqueurs & herbs like The Last Word & Southside',
  },
  {
    id: 'dessert',
    label: 'Rich & Creamy / Dessert',
    icon: '☕',
    desc: 'Indulgent coffee & cream drinks like Espresso Martini',
  },
];

const COMPLEXITY_LEVELS = [
  { id: 'quick', label: 'Quick & Simple', desc: '3 ingredients or less, zero fuss' },
  { id: 'classic', label: 'Classic Shaken or Stirred', desc: 'Balanced standard bar specs' },
  { id: 'craft', label: 'Craft Speakeasy', desc: 'Multi-layer craft cocktail experience' },
];

export function DigitalBartender() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSpirit, setSelectedSpirit] = useState<string>('Bourbon');
  const [selectedFlavor, setSelectedFlavor] = useState<string>('boozy');
  const [selectedComplexity, setSelectedComplexity] = useState<string>('classic');
  const [loading, setLoading] = useState(false);
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
        }),
      });

      if (!res.ok) throw new Error('Failed to find recommendations');
      const data = await res.json();
      setResults(data.recommendations);
    } catch (err) {
      alert('Error finding cocktails: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Wizard Progress & Intro */}
      <div className="bg-gradient-to-r from-charcoal-950 via-crimson-950 to-charcoal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-red-900/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> The Digital Bartender
            </span>
            <span className="text-xs text-rose-200 font-serif italic">Pour Decisions Sommelier</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold leading-tight">
            What are you in the mood to sip?
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-300 mt-1 max-w-xl">
            Answer 3 quick questions. We&apos;ll check your physical cocktail books first for an exact page match, then fall back to curated craft classics using your bottles.
          </p>
        </div>

        {step < 4 ? (
          <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/10 text-xs font-semibold">
            <span className={step >= 1 ? 'text-amber-400' : 'text-charcoal-500'}>1. Spirit</span>
            <ChevronRight className="w-3 h-3 text-charcoal-500" />
            <span className={step >= 2 ? 'text-amber-400' : 'text-charcoal-500'}>2. Flavor</span>
            <ChevronRight className="w-3 h-3 text-charcoal-500" />
            <span className={step >= 3 ? 'text-amber-400' : 'text-charcoal-500'}>3. Style</span>
          </div>
        ) : (
          <button
            onClick={resetWizard}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-xs flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Over</span>
          </button>
        )}
      </div>

      {/* STEP 1: SPIRIT SELECTION */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-charcoal-200 p-6 shadow-xs space-y-5 animate-in fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Step 1 of 3</span>
            <h3 className="text-xl font-serif font-bold text-charcoal-900 mt-0.5">
              Select Your Base Spirit
            </h3>
            <p className="text-xs text-charcoal-500">Pick the core liquor you want to build around tonight.</p>
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
                      ? 'border-red-700 bg-red-50/60 ring-2 ring-red-600/20 shadow-xs'
                      : 'border-charcoal-200 hover:border-charcoal-300 bg-charcoal-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{spirit.icon}</span>
                    {isSelected && (
                      <span className="bg-red-700 text-white p-1 rounded-full">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-charcoal-900">{spirit.label}</h4>
                    <p className="text-[11px] text-charcoal-500 mt-0.5">{spirit.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Next: Flavor Profile</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FLAVOR PROFILE SELECTION */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-charcoal-200 p-6 shadow-xs space-y-5 animate-in fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Step 2 of 3</span>
            <h3 className="text-xl font-serif font-bold text-charcoal-900 mt-0.5">
              What flavor profile are you craving?
            </h3>
            <p className="text-xs text-charcoal-500">Choose the sensory character and mood of your cocktail.</p>
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
                      ? 'border-red-700 bg-red-50/60 ring-2 ring-red-600/20 shadow-xs'
                      : 'border-charcoal-200 hover:border-charcoal-300 bg-charcoal-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{flavor.icon}</span>
                    {isSelected && (
                      <span className="bg-red-700 text-white p-1 rounded-full">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-charcoal-900">{flavor.label}</h4>
                    <p className="text-[11px] text-charcoal-500 mt-0.5">{flavor.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 text-charcoal-600 hover:text-charcoal-900 text-xs font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
            >
              <span>Next: Style & Complexity</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COMPLEXITY & FINISH */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-charcoal-200 p-6 shadow-xs space-y-5 animate-in fade-in">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Step 3 of 3</span>
            <h3 className="text-xl font-serif font-bold text-charcoal-900 mt-0.5">
              Select Effort & Complexity
            </h3>
            <p className="text-xs text-charcoal-500">How elaborate do you want to get behind the bar tonight?</p>
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
                      ? 'border-red-700 bg-red-50/60 ring-2 ring-red-600/20 shadow-xs'
                      : 'border-charcoal-200 hover:border-charcoal-300 bg-charcoal-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Sliders className="w-5 h-5 text-red-700" />
                    {isSelected && (
                      <span className="bg-red-700 text-white p-1 rounded-full">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-charcoal-900">{lvl.label}</h4>
                    <p className="text-[11px] text-charcoal-500 mt-0.5">{lvl.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 text-charcoal-600 hover:text-charcoal-900 text-xs font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleGenerateRecommendations}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-900 hover:to-rose-800 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'Consulting Your Bar...' : 'Craft My Recommendations'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: RECOMMENDATIONS RESULTS (2-TIER RESOLUTION) */}
      {step === 4 && (
        <div className="space-y-6 animate-in fade-in">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-charcoal-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-800 flex items-center justify-center mx-auto animate-spin">
                <Wine className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-serif font-bold text-charcoal-900">
                Searching Your Cocktail Books & Bar Cart...
              </h3>
              <p className="text-xs text-charcoal-500 max-w-md mx-auto">
                Comparing your active spirits inventory against your indexed physical books first, then pulling verified craft specs.
              </p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* TIER 1: Personal Books Matches */}
              {results.libraryMatches && results.libraryMatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" /> Tier 1: From Your Library Books
                    </span>
                    <span className="text-xs text-charcoal-500">Found in your physical cocktail collection</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.libraryMatches.map((drink) => (
                      <CocktailCard key={drink.id} cocktail={drink} />
                    ))}
                  </div>
                </div>
              )}

              {/* TIER 2: Web & Classic Specs Fallback */}
              {results.webClassicMatches && results.webClassicMatches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pt-2">
                    <span className="bg-blue-100 border border-blue-200 text-blue-900 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-700" /> Tier 2: Classic & Speakeasy Specs
                    </span>
                    <span className="text-xs text-charcoal-500">
                      IBA & craft recipes matched to your available bottles
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.webClassicMatches.map((drink) => (
                      <CocktailCard key={drink.id} cocktail={drink} />
                    ))}
                  </div>
                </div>
              )}

              {(!results.libraryMatches || results.libraryMatches.length === 0) &&
                (!results.webClassicMatches || results.webClassicMatches.length === 0) && (
                  <div className="bg-white rounded-2xl p-8 text-center border border-charcoal-200 shadow-xs">
                    <p className="text-sm font-semibold text-charcoal-700">
                      No cocktails matched this exact combination.
                    </p>
                    <p className="text-xs text-charcoal-500 mt-1">
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

function CocktailCard({ cocktail }: { cocktail: CocktailRecommendationResult }) {
  return (
    <div className="bg-white rounded-2xl border border-charcoal-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {cocktail.source === 'library' ? (
              <span className="bg-amber-100 text-amber-900 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-amber-700" /> {cocktail.bookTitle || 'Library'} {cocktail.pageNumber ? `· p. ${cocktail.pageNumber}` : ''}
              </span>
            ) : (
              <span className="bg-blue-100 text-blue-900 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-700" /> Classic Spec
              </span>
            )}

            <span className="bg-charcoal-100 text-charcoal-800 text-[10px] font-semibold px-2 py-0.5 rounded capitalize">
              {cocktail.technique || 'Craft'}
            </span>
          </div>

          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              cocktail.matchScore === 100
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {cocktail.matchScore}% Ready
          </span>
        </div>

        {/* Title & Description */}
        <h4 className="text-lg font-serif font-bold text-charcoal-900 leading-tight">
          {cocktail.name}
        </h4>
        {cocktail.description && (
          <p className="text-xs text-charcoal-500 mt-1 italic">{cocktail.description}</p>
        )}

        {/* Glassware & Ice Specs */}
        <div className="flex items-center gap-3 text-[11px] text-charcoal-600 my-3 py-2 border-y border-charcoal-100">
          <span>🍸 <strong>Glass:</strong> {cocktail.glassware}</span>
          {cocktail.ice && <span>🧊 <strong>Ice:</strong> {cocktail.ice}</span>}
        </div>

        {/* Ingredients Spec */}
        <div className="space-y-1.5 mt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Specs / Build:</span>
          <div className="space-y-1">
            {cocktail.ingredients.map((ing, idx) => (
              <div
                key={idx}
                className={`text-xs flex items-center justify-between py-0.5 px-1.5 rounded ${
                  ing.isStocked ? 'bg-emerald-50 text-emerald-950 font-medium' : 'text-charcoal-600 opacity-70'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {ing.isStocked ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span>{ing.name}</span>
                </div>
                {ing.amount && (
                  <span className="font-mono text-[11px] text-charcoal-500 shrink-0">
                    {ing.amount} {ing.unit || ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        {cocktail.instructions && cocktail.instructions.length > 0 && (
          <div className="mt-3 text-xs text-charcoal-600 space-y-1 bg-charcoal-50/70 p-3 rounded-xl">
            <span className="font-bold text-charcoal-800 text-[11px] uppercase tracking-wider">Method:</span>
            <ol className="list-decimal list-inside space-y-0.5 mt-0.5 text-[11px] leading-relaxed">
              {cocktail.instructions.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {cocktail.garnish && (
          <div className="mt-2 text-[11px] text-rose-900 font-semibold flex items-center gap-1">
            <span>✨ <strong>Garnish:</strong> {cocktail.garnish}</span>
          </div>
        )}
      </div>
    </div>
  );
}
