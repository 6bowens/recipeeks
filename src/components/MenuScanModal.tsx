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
  Wine,
  Building2,
  MapPin,
  Flame,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { ExtractedMenuCocktail } from '@/lib/gemini';
import { BudgetLimitModal } from '@/components/BudgetLimitModal';

interface MenuScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMenuSaved?: () => void;
}

export function MenuScanModal({ isOpen, onClose, onMenuSaved }: MenuScanModalProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [images, setImages] = useState<{ base64: string; type: string; name: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [extractedCocktails, setExtractedCocktails] = useState<ExtractedMenuCocktail[]>([]);
  const [expandedDrinkIdx, setExpandedDrinkIdx] = useState<number | null>(null);

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
      const res = await fetch('/api/ai/scan-cocktail-menu', {
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
      setExtractedCocktails(data.cocktails || []);
      setStep('review');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveMenu = async () => {
    if (!restaurantName.trim()) {
      alert('Please enter a Restaurant or Bar Name.');
      return;
    }
    if (extractedCocktails.length === 0) {
      alert('Please include at least one cocktail in the menu.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/cocktails/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName: restaurantName.trim(),
          city: city.trim() || null,
          notes: notes.trim() || null,
          imageUrl: images[0]?.base64 || null,
          cocktails: extractedCocktails,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save menu');
      }

      if (onMenuSaved) {
        onMenuSaved();
      }
      onClose();
    } catch (err) {
      alert('Error saving menu: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveDrink = (idx: number) => {
    setExtractedCocktails((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateDrink = (idx: number, field: string, value: any) => {
    setExtractedCocktails((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-[#140e10] border border-amber-900/40 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-[#1c1214] to-[#140e10]">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                <Wine className="w-3 h-3 text-amber-400" /> Pour Decisions
              </span>
              <span className="bg-white/10 text-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                Global Restaurant Importer
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
              {step === 'upload' ? 'Scan Restaurant Cocktail Menu' : 'Review & Publish Menu'}
            </h3>
            <p className="text-xs text-amber-200/70">
              {step === 'upload'
                ? 'Take a photo of any restaurant or speakeasy drink list to automatically extract drinks and estimate craft ratios.'
                : 'Review the extracted cocktails and confirm the restaurant details before publishing globally.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-amber-300/60 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {step === 'upload' ? (
            /* UPLOAD STEP */
            <div className="space-y-5">
              {/* Photo Input Dropzone */}
              <div className="border-2 border-dashed border-amber-900/50 hover:border-amber-500/50 rounded-2xl p-6 text-center space-y-4 bg-white/[0.02] transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Snap or Upload Menu Photos</h4>
                  <p className="text-xs text-amber-200/60 max-w-sm mx-auto">
                    Take a clear photo of the printed cocktail menu. You can snap multiple pages if needed.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Picture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose File</span>
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
              </div>

              {/* Photo Previews */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-amber-300 font-bold uppercase tracking-wider font-mono">
                    <span>Selected Menu Photos ({images.length})</span>
                    <button
                      onClick={() => setImages([])}
                      className="text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl overflow-hidden aspect-[3/4] border border-amber-900/40 bg-black/40 group shadow-md"
                      >
                        <img
                          src={img.base64}
                          alt="Menu snapshot"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Mixology Guide Card */}
              <div className="bg-[#191114] border border-amber-900/30 rounded-2xl p-4 space-y-2 text-xs text-amber-200/70">
                <div className="flex items-center gap-2 text-amber-300 font-bold font-mono uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>How Ratio Estimation Works</span>
                </div>
                <p className="leading-relaxed">
                  Gemini OCR reads the listed ingredients (*e.g. Mezcal, Ancho Reyes, Lime, Agave*) and uses classic cocktail structures (sours, equal parts, stirred spirit-forward) to synthesize realistic craft ratios in fluid ounces, glassware, and step-by-step instructions.
                </p>
              </div>
            </div>
          ) : (
            /* REVIEW STEP */
            <div className="space-y-6">
              {/* Restaurant Meta Form */}
              <div className="bg-[#191114] border border-amber-900/40 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 font-mono mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Restaurant / Bar Name *</span>
                    </label>
                    <input
                      type="text"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="e.g. Death & Co, The Violet Hour"
                      className="w-full bg-[#0e0a0c] border border-amber-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-serif font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 font-mono mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>City / Location</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. New York, NY or Chicago, IL"
                      className="w-full bg-[#0e0a0c] border border-amber-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-300 font-mono mb-1">
                    Notes / Season (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Summer 2026 Cocktail Menu"
                    className="w-full bg-[#0e0a0c] border border-amber-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Extracted Cocktails List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1.5">
                    <Wine className="w-3.5 h-3.5 text-amber-400" />
                    <span>Extracted Cocktails ({extractedCocktails.length})</span>
                  </h4>
                  <span className="text-[11px] text-amber-200/60">
                    Tap a drink to view recipe & estimated ratios
                  </span>
                </div>

                <div className="space-y-3">
                  {extractedCocktails.map((c, idx) => {
                    const isExpanded = expandedDrinkIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-[#191114] border border-amber-900/30 rounded-2xl p-4 space-y-3 shadow-md transition-colors hover:border-amber-500/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => setExpandedDrinkIdx(isExpanded ? null : idx)}
                          >
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                                {c.spiritBase || 'Spirit'}
                              </span>
                              <span className="bg-white/5 text-amber-200/80 text-[10px] px-2 py-0.5 rounded font-mono capitalize">
                                {c.flavorProfile}
                              </span>
                              {c.glassware && (
                                <span className="text-[10px] text-amber-200/50">· {c.glassware}</span>
                              )}
                            </div>
                            <h5 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                              <span>{c.name}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-amber-400/50" />
                              )}
                            </h5>
                            {c.menuDescription && (
                              <p className="text-[11px] text-amber-200/70 italic mt-0.5 line-clamp-1">
                                {c.menuDescription}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleRemoveDrink(idx)}
                            className="p-1.5 text-red-400/60 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove Drink"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Expanded Specs & Estimated Ratios */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-white/5 space-y-3 animate-in fade-in">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono block mb-1.5">
                                Estimated Ingredients & Ratios
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {c.ingredients.map((ing, iIdx) => (
                                  <div
                                    key={iIdx}
                                    className="bg-black/30 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between"
                                  >
                                    <span className="text-white font-medium">{ing.name}</span>
                                    <span className="text-amber-300 font-mono text-[11px] font-bold">
                                      {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {c.instructions && c.instructions.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono block mb-1">
                                  Method & Technique ({c.technique || 'Shaken'})
                                </span>
                                <ol className="space-y-1 text-xs text-amber-100/80 list-decimal list-inside pl-1 leading-relaxed">
                                  {c.instructions.map((stepText, sIdx) => (
                                    <li key={sIdx}>{stepText}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {c.garnish && (
                              <div className="text-xs text-amber-200/80 flex items-center gap-1.5 pt-1">
                                <span className="font-bold text-amber-400 text-[11px]">Garnish:</span>
                                <span>{c.garnish}</span>
                              </div>
                            )}
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

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/5 bg-[#171012] flex items-center justify-between gap-3">
          {step === 'review' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2.5 text-xs font-bold text-amber-300/70 hover:text-white cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Photos</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-amber-300/60 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step === 'upload' ? (
            <button
              type="button"
              onClick={handleAnalyzeMenu}
              disabled={analyzing || images.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{analyzing ? 'Analyzing Menu & Ratios...' : `Analyze ${images.length > 0 ? `${images.length} Photos` : 'Menu'}`}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveMenu}
              disabled={isSaving || extractedCocktails.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSaving ? 'Publishing Menu...' : `Publish to Global Community (${extractedCocktails.length} Drinks)`}</span>
            </button>
          )}
        </div>
      </div>

      <BudgetLimitModal
        isOpen={budgetModal.isOpen}
        onClose={() => setBudgetModal({ isOpen: false })}
        currentSpend={budgetModal.currentSpend}
        spendLimit={budgetModal.spendLimit}
        message={budgetModal.message}
      />
    </div>
  );
}
