'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Globe,
  Sparkles,
  Camera,
  Edit3,
  Plus,
  Trash2,
  Check,
  Clock,
  Users,
  Utensils,
  Tag,
  ChefHat,
  Upload,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';

interface MiseUniversalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MiseUniversalImportModal({
  isOpen,
  onClose,
  onSuccess,
}: MiseUniversalImportModalProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'ai' | 'photo' | 'manual'>('url');

  // Input states
  const [urlInput, setUrlInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiServings, setAiServings] = useState('4');
  const [aiCookTime, setAiCookTime] = useState('');
  const [aiStyle, setAiStyle] = useState('');

  // Photo state
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState('image/jpeg');

  // Processing states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review & Save Form State
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeCookTime, setRecipeCookTime] = useState('30 mins');
  const [recipePrepTime, setRecipePrepTime] = useState('15 mins');
  const [recipeServings, setRecipeServings] = useState('4');
  const [recipeCuisine, setRecipeCuisine] = useState('');
  const [recipeMealCategory, setRecipeMealCategory] = useState('dinner');
  const [recipeTags, setRecipeTags] = useState('');
  const [recipeFrequency, setRecipeFrequency] = useState('1_week');
  const [recipeSourceUrl, setRecipeSourceUrl] = useState('');
  const [recipeSourceType, setRecipeSourceType] = useState('manual');
  const [recipeNotes, setRecipeNotes] = useState('');
  const [recipeIngredientsText, setRecipeIngredientsText] = useState('');
  const [recipeInstructionsText, setRecipeInstructionsText] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setShowReviewForm(false);
    setUrlInput('');
    setAiPrompt('');
    setPhotoBase64(null);
    setErrorMessage(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // 1. URL Importer
  const handleParseUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/mise/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse recipe from URL');

      if (data.recipe) {
        populateReviewForm({
          ...data.recipe,
          sourceType: 'url',
          sourceUrl: urlInput.trim(),
        });
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 2. AI Generator
  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/mise/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          servings: aiServings,
          cookTime: aiCookTime || undefined,
          style: aiStyle || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI recipe');

      if (data.recipe) {
        populateReviewForm({
          ...data.recipe,
          sourceType: 'ai',
        });
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Photo / Card OCR
  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleScanPhoto = async () => {
    if (!photoBase64) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/mise/scan-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photoBase64,
          imageType: photoType,
          frequency: recipeFrequency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan recipe image');

      if (data.recipe) {
        handleClose();
        onSuccess();
      }
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Populate Review Form Helper
  const populateReviewForm = (recipe: any) => {
    setRecipeTitle(recipe.title || '');
    setRecipeCookTime(recipe.cookTime || '30 mins');
    setRecipePrepTime(recipe.prepTime || '15 mins');
    setRecipeServings(recipe.servings || '4');
    setRecipeCuisine(recipe.cuisine || '');
    setRecipeMealCategory(recipe.mealCategory || 'dinner');
    setRecipeTags(recipe.tags || '');
    setRecipeNotes(recipe.notes || '');
    setRecipeSourceUrl(recipe.sourceUrl || '');
    setRecipeSourceType(recipe.sourceType || 'manual');

    // Format ingredients lines
    const ingLines = (recipe.ingredients || [])
      .map((i: any) => [i.amount, i.unit, i.name].filter(Boolean).join(' '))
      .join('\n');
    setRecipeIngredientsText(ingLines);

    // Format instructions lines
    const instLines = Array.isArray(recipe.instructions)
      ? recipe.instructions.join('\n')
      : recipe.instructions || '';
    setRecipeInstructionsText(instLines);

    setShowReviewForm(true);
  };

  // Save to DB
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeTitle.trim()) {
      alert('Please enter a recipe title.');
      return;
    }

    try {
      setSaving(true);
      const ingredientLines = recipeIngredientsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const instructionLines = recipeInstructionsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await fetch('/api/mise/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: recipeTitle.trim(),
          cookTime: recipeCookTime.trim() || undefined,
          prepTime: recipePrepTime.trim() || undefined,
          servings: recipeServings.trim() || '4',
          cuisine: recipeCuisine.trim() || undefined,
          mealCategory: recipeMealCategory,
          tags: recipeTags.trim() || undefined,
          frequency: recipeFrequency,
          sourceType: recipeSourceType,
          sourceUrl: recipeSourceUrl || undefined,
          notes: recipeNotes.trim() || undefined,
          ingredients: ingredientLines,
          instructions: instructionLines,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save recipe');
      }

      handleClose();
      onSuccess();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#140c1f] border border-purple-900/50 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/40 bg-[#191026]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-white">
                {showReviewForm ? 'Review & Save Recipe' : 'Add Recipe to Mise'}
              </h2>
              <p className="text-[11px] text-purple-300/70 font-mono">
                {showReviewForm ? 'Review extracted details and save to your vault' : 'Import from Web, AI, Photo, or Manual'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white font-bold ml-2">
                ✕
              </button>
            </div>
          )}

          {!showReviewForm ? (
            <div className="space-y-5">
              {/* Method Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 border border-purple-900/40 rounded-2xl">
                <button
                  onClick={() => setActiveTab('url')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'url'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web URL</span>
                </button>

                <button
                  onClick={() => setActiveTab('ai')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'ai'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Chef</span>
                </button>

                <button
                  onClick={() => setActiveTab('photo')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'photo'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Photo OCR</span>
                </button>

                <button
                  onClick={() => {
                    populateReviewForm({
                      title: '',
                      cookTime: '30 mins',
                      prepTime: '15 mins',
                      servings: '4',
                      mealCategory: 'dinner',
                      sourceType: 'manual',
                    });
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'manual'
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                      : 'text-purple-300/60 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Manual</span>
                </button>
              </div>

              {/* TAB 1: WEB URL */}
              {activeTab === 'url' && (
                <form onSubmit={handleParseUrl} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-purple-200">Recipe URL</label>
                    <input
                      type="url"
                      placeholder="https://www.seriouseats.com/... or any recipe blog"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      required
                      className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-purple-300/30 focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[11px] text-purple-400/60">
                      Mealie-grade schema extraction: extracts ingredients, instructions, yield, times, and tags.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !urlInput.trim()}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>Extracting Recipe...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        <span>Fetch & Preview Recipe</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: AI CHEF */}
              {activeTab === 'ai' && (
                <form onSubmit={handleGenerateAi} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-purple-200">What do you want to cook?</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Crispy chicken thighs with lemon garlic orzo and spinach, Mediterranean style..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      required
                      className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl p-3 text-xs text-white placeholder:text-purple-300/30 focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-purple-300">Servings</label>
                      <input
                        type="text"
                        value={aiServings}
                        onChange={(e) => setAiServings(e.target.value)}
                        placeholder="4"
                        className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-purple-300">Cook Time</label>
                      <input
                        type="text"
                        value={aiCookTime}
                        onChange={(e) => setAiCookTime(e.target.value)}
                        placeholder="30 mins"
                        className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-purple-300">Diet / Style</label>
                      <input
                        type="text"
                        value={aiStyle}
                        onChange={(e) => setAiStyle(e.target.value)}
                        placeholder="Low Carb, etc."
                        className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 mt-1"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !aiPrompt.trim()}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin" />
                        <span>AI Executive Chef Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Recipe & Preview</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 3: PHOTO OCR */}
              {activeTab === 'photo' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handlePhotoSelected}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelected}
                    accept="image/*"
                    className="hidden"
                  />

                  {photoBase64 ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 max-h-56 flex items-center justify-center bg-black/40">
                        <img src={photoBase64} alt="Recipe Preview" className="max-h-56 object-contain" />
                        <button
                          onClick={() => setPhotoBase64(null)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={handleScanPhoto}
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Sparkles className="w-4 h-4 animate-spin" />
                            <span>Transcribing Recipe with Gemini Vision...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Transcribe & Add to Vault</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-500/30 hover:border-purple-400 text-center space-y-2 transition-all cursor-pointer"
                      >
                        <Camera className="w-8 h-8 text-purple-400 mx-auto" />
                        <div className="text-xs font-bold text-white">Take Photo</div>
                        <p className="text-[10px] text-purple-300/60">Snap recipe card or book</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-500/30 hover:border-purple-400 text-center space-y-2 transition-all cursor-pointer"
                      >
                        <Upload className="w-8 h-8 text-purple-400 mx-auto" />
                        <div className="text-xs font-bold text-white">Camera Roll</div>
                        <p className="text-[10px] text-purple-300/60">Upload photo from device</p>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* REVIEW & EDIT FORM */
            <form onSubmit={handleSaveRecipe} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Recipe Title *</label>
                <input
                  type="text"
                  value={recipeTitle}
                  onChange={(e) => setRecipeTitle(e.target.value)}
                  placeholder="e.g. Garlic Butter Roast Salmon"
                  required
                  className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-purple-300">Servings</label>
                  <input
                    type="text"
                    value={recipeServings}
                    onChange={(e) => setRecipeServings(e.target.value)}
                    placeholder="4"
                    className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-300">Cook Time</label>
                  <input
                    type="text"
                    value={recipeCookTime}
                    onChange={(e) => setRecipeCookTime(e.target.value)}
                    placeholder="30 mins"
                    className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-300">Category</label>
                  <select
                    value={recipeMealCategory}
                    onChange={(e) => setRecipeMealCategory(e.target.value)}
                    className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 mt-0.5"
                  >
                    <option value="dinner">Dinner</option>
                    <option value="lunch">Lunch</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="side">Side / Salad</option>
                    <option value="dessert">Dessert</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-300">Frequency</label>
                  <select
                    value={recipeFrequency}
                    onChange={(e) => setRecipeFrequency(e.target.value)}
                    className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 mt-0.5"
                  >
                    {Object.entries(FREQUENCY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-purple-300">Cuisine</label>
                  <input
                    type="text"
                    value={recipeCuisine}
                    onChange={(e) => setRecipeCuisine(e.target.value)}
                    placeholder="e.g. Italian, Asian"
                    className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-300">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={recipeTags}
                    onChange={(e) => setRecipeTags(e.target.value)}
                    placeholder="e.g. Weeknight, High-Protein"
                    className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 mt-0.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">
                  Ingredients (One per line with amount)
                </label>
                <textarea
                  rows={5}
                  value={recipeIngredientsText}
                  onChange={(e) => setRecipeIngredientsText(e.target.value)}
                  placeholder="2 lbs chicken thighs&#10;3 tbsp olive oil&#10;4 cloves garlic, minced&#10;1 tsp kosher salt"
                  className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl p-3 text-xs text-white font-mono placeholder:text-purple-300/30 focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">
                  Instructions (One step per line)
                </label>
                <textarea
                  rows={5}
                  value={recipeInstructionsText}
                  onChange={(e) => setRecipeInstructionsText(e.target.value)}
                  placeholder="Preheat oven to 400°F.&#10;Season salmon fillets with salt and pepper.&#10;Bake for 15 minutes until tender."
                  className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl p-3 text-xs text-white placeholder:text-purple-300/30 focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-purple-200">Chef Notes / Tips</label>
                <input
                  type="text"
                  value={recipeNotes}
                  onChange={(e) => setRecipeNotes(e.target.value)}
                  placeholder="e.g. Serve hot with steamed jasmine rice or crusty bread"
                  className="w-full bg-[#0d0817] border border-purple-900/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-purple-900/40">
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-purple-300 font-bold text-xs cursor-pointer"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={saving || !recipeTitle.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <span>Saving to Vault...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Save to Recipe Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
