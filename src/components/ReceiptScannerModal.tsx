'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Receipt,
  Sparkles,
  Check,
  CheckCircle2,
  Trash2,
  Plus,
  ShoppingBag,
  Loader2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AISLE_LABELS, AisleCategory } from '@/lib/playlist-utils';
import { BudgetLimitModal } from '@/components/BudgetLimitModal';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface DetectedReceiptItem {
  name: string;
  category: 'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other';
  quantity?: string | null;
  price?: string | null;
  isAlwaysAvailable?: boolean;
  selected: boolean;
}

export function ReceiptScannerModal({
  isOpen,
  onClose,
  onSuccess,
}: ReceiptScannerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedReceiptItem[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ name: string; base64: string; type: string }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState<'produce' | 'meat' | 'dairy' | 'pantry' | 'spices' | 'other'>('produce');

  const [budgetModal, setBudgetModal] = useState<{
    isOpen: boolean;
    message?: string;
    currentSpend?: number;
    spendLimit?: number;
  }>({ isOpen: false });

  if (!isOpen) return null;

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newPhotos: { name: string; base64: string; type: string }[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          newPhotos.push({
            name: file.name,
            base64: ev.target.result as string,
            type: file.type || 'image/jpeg',
          });
        }
        loadedCount++;
        if (loadedCount === fileList.length) {
          setUploadedPhotos((prev) => [...prev, ...newPhotos]);
          // Automatically run scan on newly selected photo(s)
          runScan([...uploadedPhotos, ...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const runScan = async (photosToScan: { name: string; base64: string; type: string }[]) => {
    if (photosToScan.length === 0) return;
    try {
      setIsScanning(true);
      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: photosToScan }),
      });

      const data = await res.json();

      if (data.error === 'AI_SPEND_LIMIT_EXCEEDED' || res.status === 429) {
        setBudgetModal({
          isOpen: true,
          message: data.message,
          currentSpend: data.currentSpend,
          spendLimit: data.spendLimit,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan receipt');
      }

      const items: DetectedReceiptItem[] = (data.items || []).map((it: any) => ({
        ...it,
        selected: true,
      }));

      setDetectedItems(items);
      setStep('review');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectItem = (index: number) => {
    setDetectedItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setDetectedItems((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setDetectedItems((prev) => [
      ...prev,
      {
        name: newItemName.trim(),
        category: newItemCat,
        selected: true,
      },
    ]);
    setNewItemName('');
  };

  const handleRemoveItem = (index: number) => {
    setDetectedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveToPantry = async () => {
    const selected = detectedItems.filter((i) => i.selected);
    if (selected.length === 0) {
      alert('Please select at least one item to save.');
      return;
    }

    try {
      setIsSaving(true);
      const pantryItemsPayload = selected.map((it) => ({
        name: it.name,
        category: it.category === 'produce' || it.category === 'meat' || it.category === 'dairy' ? 'fridge' : 'pantry',
        quantity: it.quantity || null,
        isAlwaysAvailable: !!it.isAlwaysAvailable,
      }));

      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: pantryItemsPayload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save items to pantry');
      }

      onSuccess();
      onClose();
    } catch (err) {
      alert('Error saving receipt items: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = detectedItems.filter((i) => i.selected).length;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
        <div className="bg-[#140f20] border border-purple-900/50 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between gap-4 bg-gradient-to-r from-[#171126] to-[#140f20]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-white leading-tight flex items-center gap-2">
                  <span>Grocery Receipt Scanner</span>
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                    AI OCR
                  </span>
                </h3>
                <p className="text-xs text-purple-200/70 mt-0.5">
                  Snap your supermarket receipt to automatically restock your pantry and check off dinner items
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-purple-300/60 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {step === 'upload' ? (
              <div className="space-y-6">
                {/* Hidden Inputs */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={handlePhotosSelected}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotosSelected}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {/* Scanning Loading State */}
                {isScanning ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 mx-auto flex items-center justify-center animate-pulse">
                      <Sparkles className="w-7 h-7 text-purple-400 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base font-serif font-bold text-white">
                        Analyzing Grocery Receipt...
                      </h4>
                      <p className="text-xs text-purple-300/70 max-w-sm mx-auto">
                        Expanding store shorthand, removing non-food items, and categorizing your ingredients...
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Upload Buttons */
                  <div className="border-2 border-dashed border-purple-700/40 hover:border-purple-500/70 bg-purple-950/20 hover:bg-purple-950/30 rounded-3xl p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-purple-900/40 border border-purple-600/30 flex items-center justify-center text-purple-300">
                      <Receipt className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">
                        Snap or Upload Receipt Photo
                      </h4>
                      <p className="text-xs text-purple-300/70 max-w-md mx-auto">
                        Works with Trader Joe's, Costco, Safeway, Whole Foods, Kroger, or any grocery market receipt
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo (Camera)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/15 text-purple-200 hover:text-white font-bold text-xs rounded-xl border border-purple-800/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-purple-400" />
                        <span>Photo Library</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Review Screen */
              <div className="space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-serif font-bold text-white">
                      Review Detected Groceries ({detectedItems.length})
                    </h4>
                    <p className="text-xs text-purple-300/70">
                      Uncheck any items you don't want to add to your pantry
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-[11px] font-bold text-purple-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-[11px] font-bold text-purple-300/60 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Detected Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[42vh] overflow-y-auto pr-1">
                  {detectedItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleSelectItem(idx)}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all cursor-pointer select-none ${
                        item.selected
                          ? 'bg-purple-950/40 border-purple-600/60 text-white shadow-sm'
                          : 'bg-white/[0.02] border-white/5 text-purple-300/50 hover:border-purple-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                            item.selected
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'border-white/20 bg-black/40 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-medium capitalize truncate block">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-purple-300/60 font-mono mt-0.5">
                            {item.quantity && <span>{item.quantity}</span>}
                            {item.price && <span>· {item.price}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700/40 text-purple-300 font-mono">
                          {item.category}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(idx);
                          }}
                          className="text-purple-400/50 hover:text-red-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Missing Item Form */}
                <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    placeholder="Add an item missed on receipt..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="flex-1 bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value as any)}
                    className="bg-[#0b0813] border border-purple-900/40 text-purple-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="produce">Produce</option>
                    <option value="meat">Meat</option>
                    <option value="dairy">Dairy</option>
                    <option value="pantry">Pantry</option>
                    <option value="spices">Spices</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          {step === 'review' && (
            <div className="p-4 sm:p-5 border-t border-white/5 bg-[#120d1c] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
              >
                ← Rescan
              </button>

              <button
                type="button"
                onClick={handleSaveToPantry}
                disabled={isSaving || selectedCount === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSaving ? 'Updating Pantry & Lists...' : `Add ${selectedCount} Item(s) to Kitchen & Pantry`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Budget Limit Modal */}
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
