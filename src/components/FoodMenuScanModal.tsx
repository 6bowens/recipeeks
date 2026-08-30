'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Building2,
  MapPin,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Utensils,
  BookOpen,
  ChefHat,
} from 'lucide-react';
import { ExtractedRestaurantFoodDish } from '@/lib/gemini';
import { BudgetLimitModal } from '@/components/BudgetLimitModal';

interface FoodMenuScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuSaved?: () => void;
}

export function FoodMenuScanModal({ isOpen, onClose, onMenuSaved }: FoodMenuScanModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [images, setImages] = useState<{ base64: string; type: string; name: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [extractedDishes, setExtractedDishes] = useState<ExtractedRestaurantFoodDish[]>([]);
  const [expandedDishIdx, setExpandedDishIdx] = useState<number | null>(null);

  const [budgetModal, setBudgetModal] = useState<{
    isOpen: boolean;
    message?: string;
    currentSpend?: number;
    spendLimit?: number;
  }>({ isOpen: false });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: { base64: string; type: string; name: string }[] = [];
    const fileList = Array.from(files);
    let loaded = 0;

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        newImages.push({
          base64,
          type: file.type || 'image/jpeg',
          name: file.name,
        });
        loaded++;
        if (loaded === fileList.length) {
          setImages((prev) => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleAnalyzeMenu = async () => {
    if (images.length === 0) return;

    try {
      setAnalyzing(true);
      const res = await fetch('/api/ai/scan-food-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((img) => ({
            imageBase64: img.base64,
            mimeType: img.type,
          })),
        }),
      });

      if (res.status === 429) {
        const spendData = await res.json();
        setBudgetModal({
          isOpen: true,
          message: spendData.message,
          currentSpend: spendData.currentSpend,
          spendLimit: spendData.spendLimit,
        });
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to scan menu');
      }

      const data = await res.json();
      setRestaurantName(data.suggestedRestaurantName || '');
      setCity(data.city || '');
      setExtractedDishes(data.dishes || []);
      setStep('review');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveMenu = async () => {
    if (!restaurantName.trim()) {
      alert('Please enter a Restaurant Name.');
      return;
    }
    if (extractedDishes.length === 0) {
      alert('Please include at least one dish in the menu.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/food/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurantName.trim(),
          city: city.trim() || undefined,
          notes: notes.trim() || undefined,
          dishes: extractedDishes,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to save menu');
      }

      onMenuSaved?.();
      onClose();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeDish = (idx: number) => {
    setExtractedDishes((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateDishField = (idx: number, field: keyof ExtractedRestaurantFoodDish, value: any) => {
    setExtractedDishes((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const updateIngredient = (dishIdx: number, ingIdx: number, field: string, value: string) => {
    setExtractedDishes((prev) => {
      const updated = [...prev];
      const ings = [...updated[dishIdx].ingredients];
      ings[ingIdx] = { ...ings[ingIdx], [field]: value };
      updated[dishIdx] = { ...updated[dishIdx], ingredients: ings };
      return updated;
    });
  };

  const removeIngredient = (dishIdx: number, ingIdx: number) => {
    setExtractedDishes((prev) => {
      const updated = [...prev];
      const ings = updated[dishIdx].ingredients.filter((_, i) => i !== ingIdx);
      updated[dishIdx] = { ...updated[dishIdx], ingredients: ings };
      return updated;
    });
  };

  const addIngredient = (dishIdx: number) => {
    setExtractedDishes((prev) => {
      const updated = [...prev];
      const ings = [
        ...updated[dishIdx].ingredients,
        { name: 'New Ingredient', amount: '1', unit: 'tbsp', aisleCategory: 'pantry', optional: false },
      ];
      updated[dishIdx] = { ...updated[dishIdx], ingredients: ings };
      return updated;
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-[#141215] border border-red-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-8 max-h-[90vh] flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-700 to-rose-600 flex items-center justify-center text-white shadow-lg">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <span>Restaurant Food Menu Scanner</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-rose-300 border border-red-500/30">
                    Shared Global
                  </span>
                </h3>
                <p className="text-xs text-rose-200/70">
                  Import dishes from your favorite bistro or trattoria. Gemini AI reverse-engineers recipes & culinary ratios.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto flex-1 py-5 pr-1 space-y-6">
            {step === 'upload' ? (
              <div className="space-y-6">
                {/* Upload & Camera Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Take Photo on Mobile */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-6 rounded-2xl bg-gradient-to-b from-red-950/40 to-black/60 border border-red-800/40 hover:border-red-500 text-center space-y-3 transition-all cursor-pointer group hover:scale-[1.01]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-red-600/20 group-hover:bg-red-600/30 text-rose-300 flex items-center justify-center mx-auto transition-colors">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Take Menu Photo</h4>
                      <p className="text-xs text-rose-200/60 mt-0.5">
                        Open mobile camera to snap front & back of the menu
                      </p>
                    </div>
                  </button>

                  {/* Photo Library */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl bg-gradient-to-b from-charcoal-900/60 to-black/60 border border-white/10 hover:border-rose-500/50 text-center space-y-3 transition-all cursor-pointer group hover:scale-[1.01]"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/10 group-hover:bg-white/15 text-white flex items-center justify-center mx-auto transition-colors">
                      <Upload className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Upload Menu Photos</h4>
                      <p className="text-xs text-rose-200/60 mt-0.5">
                        Select one or more saved pictures of the menu
                      </p>
                    </div>
                  </button>

                  {/* Hidden inputs */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFilesSelected}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFilesSelected}
                  />
                </div>

                {/* Selected Images Gallery */}
                {images.length > 0 && (
                  <div className="space-y-3 bg-black/40 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between text-xs text-rose-200/70 font-mono">
                      <span>Menu Pages Captured ({images.length})</span>
                      <span>Ready for AI Culinary Analysis</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden aspect-[3/4] border border-white/10">
                          <img
                            src={img.base64}
                            alt={`Page ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-md"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs py-1 text-center text-[10px] text-white/80 font-mono">
                            Page {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Review Step */
              <div className="space-y-6 animate-in fade-in">
                {/* Restaurant Details Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 border border-red-900/30 rounded-2xl p-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Restaurant Name *
                    </label>
                    <input
                      type="text"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="e.g. Carbone, L'Ami Jean, Via Carota"
                      className="w-full bg-[#1e191d] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-serif"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> City / Location
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. New York, Paris, Rome"
                      className="w-full bg-[#1e191d] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono">
                      Notes / Story (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Authentic Roman trattoria menu, famous for cacio e pepe and wild boar ragu"
                      className="w-full bg-[#1e191d] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Extracted Dishes List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-rose-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                        Dishes & Synthesized Recipes ({extractedDishes.length})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExtractedDishes((prev) => [
                          ...prev,
                          {
                            name: 'New Dish',
                            category: 'Main',
                            servings: '2-4 servings',
                            prepTime: '15 mins',
                            cookTime: '25 mins',
                            difficulty: 'Medium',
                            dietaryTags: [],
                            ingredients: [{ name: 'Ingredient', amount: '1', unit: 'tbsp', aisleCategory: 'pantry' }],
                            instructions: ['Cook and plate.'],
                          },
                        ])
                      }
                      className="text-xs text-rose-300 hover:text-white flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Dish</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {extractedDishes.map((dish, dIdx) => {
                      const isExpanded = expandedDishIdx === dIdx;

                      return (
                        <div
                          key={dIdx}
                          className="bg-black/50 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4"
                        >
                          {/* Dish Summary Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <input
                                type="text"
                                value={dish.name}
                                onChange={(e) => updateDishField(dIdx, 'name', e.target.value)}
                                className="bg-transparent font-serif font-bold text-base sm:text-lg text-white border-b border-dashed border-white/20 focus:border-rose-400 focus:outline-none flex-1 min-w-0"
                              />

                              <select
                                value={dish.category || 'Main'}
                                onChange={(e) => updateDishField(dIdx, 'category', e.target.value)}
                                className="bg-[#1e191d] border border-white/10 text-rose-300 text-xs rounded-lg px-2.5 py-1 focus:outline-none shrink-0"
                              >
                                <option value="Pasta">Pasta</option>
                                <option value="Entree">Entree / Main</option>
                                <option value="Appetizer">Appetizer / Starter</option>
                                <option value="Pizza">Pizza</option>
                                <option value="Salad">Salad</option>
                                <option value="Soup">Soup</option>
                                <option value="Side">Side</option>
                                <option value="Dessert">Dessert</option>
                                <option value="Brunch">Brunch</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setExpandedDishIdx(isExpanded ? null : dIdx)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-rose-200 flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Hide Specs' : 'Edit Recipe Spec'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeDish(dIdx)}
                                className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Remove Dish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Menu description */}
                          {dish.menuDescription && (
                            <p className="text-xs text-rose-200/70 italic border-l-2 border-rose-500/40 pl-3 py-0.5">
                              {dish.menuDescription}
                            </p>
                          )}

                          {/* Detailed Specs Editor */}
                          {isExpanded && (
                            <div className="space-y-4 pt-3 border-t border-white/10 text-xs animate-in fade-in">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-[10px] text-rose-300 font-mono uppercase">Prep Time</label>
                                  <input
                                    type="text"
                                    value={dish.prepTime || '15 mins'}
                                    onChange={(e) => updateDishField(dIdx, 'prepTime', e.target.value)}
                                    className="w-full bg-[#1e191d] border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-rose-300 font-mono uppercase">Cook Time</label>
                                  <input
                                    type="text"
                                    value={dish.cookTime || '25 mins'}
                                    onChange={(e) => updateDishField(dIdx, 'cookTime', e.target.value)}
                                    className="w-full bg-[#1e191d] border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs mt-1"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-rose-300 font-mono uppercase">Difficulty</label>
                                  <select
                                    value={dish.difficulty || 'Medium'}
                                    onChange={(e) => updateDishField(dIdx, 'difficulty', e.target.value)}
                                    className="w-full bg-[#1e191d] border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs mt-1"
                                  >
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Chef-level">Chef-level</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-rose-300 font-mono uppercase">Servings</label>
                                  <input
                                    type="text"
                                    value={dish.servings || '2-4 servings'}
                                    onChange={(e) => updateDishField(dIdx, 'servings', e.target.value)}
                                    className="w-full bg-[#1e191d] border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs mt-1"
                                  />
                                </div>
                              </div>

                              {/* Chef Tips */}
                              {dish.chefTips && (
                                <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-xl space-y-1">
                                  <span className="text-[10px] text-rose-300 font-mono uppercase font-bold flex items-center gap-1">
                                    💡 Chef Secret:
                                  </span>
                                  <input
                                    type="text"
                                    value={dish.chefTips}
                                    onChange={(e) => updateDishField(dIdx, 'chefTips', e.target.value)}
                                    className="w-full bg-transparent border-none text-rose-100 text-xs focus:outline-none"
                                  />
                                </div>
                              )}

                              {/* Ingredients Table */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] font-mono uppercase text-rose-300">
                                  <span>Ingredients ({dish.ingredients.length})</span>
                                  <button
                                    type="button"
                                    onClick={() => addIngredient(dIdx)}
                                    className="text-rose-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add Ingredient
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  {dish.ingredients.map((ing, iIdx) => (
                                    <div key={iIdx} className="flex items-center gap-2 bg-[#191518] p-2 rounded-xl border border-white/5">
                                      <input
                                        type="text"
                                        value={ing.amount || ''}
                                        onChange={(e) => updateIngredient(dIdx, iIdx, 'amount', e.target.value)}
                                        placeholder="Amt"
                                        className="w-16 bg-[#120f11] border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-center text-xs"
                                      />
                                      <input
                                        type="text"
                                        value={ing.unit || ''}
                                        onChange={(e) => updateIngredient(dIdx, iIdx, 'unit', e.target.value)}
                                        placeholder="Unit"
                                        className="w-20 bg-[#120f11] border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs"
                                      />
                                      <input
                                        type="text"
                                        value={ing.name}
                                        onChange={(e) => updateIngredient(dIdx, iIdx, 'name', e.target.value)}
                                        placeholder="Ingredient name"
                                        className="flex-1 bg-[#120f11] border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeIngredient(dIdx, iIdx)}
                                        className="p-1 text-white/40 hover:text-red-400 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Instructions */}
                              <div className="space-y-2">
                                <span className="text-[11px] font-mono uppercase text-rose-300 block">
                                  Step-by-Step Cooking Instructions:
                                </span>
                                <div className="space-y-1.5">
                                  {dish.instructions.map((stepText, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-2 bg-[#191518] p-2.5 rounded-xl border border-white/5">
                                      <span className="w-5 text-center font-mono font-bold text-rose-400 shrink-0 text-xs mt-0.5">
                                        {sIdx + 1}.
                                      </span>
                                      <textarea
                                        rows={2}
                                        value={stepText}
                                        onChange={(e) => {
                                          const updatedSteps = [...dish.instructions];
                                          updatedSteps[sIdx] = e.target.value;
                                          updateDishField(dIdx, 'instructions', updatedSteps);
                                        }}
                                        className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none resize-none"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
            {step === 'upload' ? (
              <>
                <div className="text-xs text-rose-300/60 font-mono">
                  {images.length === 0 ? 'Select or snap menu photos to start' : `${images.length} photo(s) selected`}
                </div>

                <button
                  type="button"
                  onClick={handleAnalyzeMenu}
                  disabled={images.length === 0 || analyzing}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-all hover:scale-105"
                >
                  {analyzing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Gemini AI Reading Menu & Synthesizing Recipes...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Menu & Synthesize Recipes ({images.length})</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rescan / Change Photos</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveMenu}
                  disabled={isSaving || extractedDishes.length === 0}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-xl cursor-pointer transition-all hover:scale-105"
                >
                  {isSaving ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Publishing Global Menu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Publish Menu to ReciPeeks Directory ({extractedDishes.length} Dishes)</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Spend Cap Modal */}
      <BudgetLimitModal
        isOpen={budgetModal.isOpen}
        onClose={() => setBudgetModal({ isOpen: false })}
        currentSpend={budgetModal.currentSpend}
        spendLimit={budgetModal.spendLimit}
        message={budgetModal.message}
      />
    </>
  );
}
