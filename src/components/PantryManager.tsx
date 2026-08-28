'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Camera,
  Plus,
  Trash2,
  CheckCircle,
  Sparkles,
  Layers,
  Flame,
  Refrigerator,
  Package,
  Check,
  AlertCircle,
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  BookmarkCheck,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { PantryItemData } from '@/types';
import { KITCHEN_STAPLES, isRecognizedKitchenStaple } from '@/lib/utils';
import { BudgetLimitModal } from '@/components/BudgetLimitModal';

interface DetectedPantryItem extends PantryItemData {
  selected?: boolean;
  alreadyInPantry?: boolean;
  existingId?: string;
  existingQuantity?: string;
}

export function PantryManager() {
  const [items, setItems] = useState<PantryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'fridge' | 'pantry' | 'spices' | 'staples'>('all');
  const [budgetModal, setBudgetModal] = useState<{ isOpen: boolean; message?: string; currentSpend?: number; spendLimit?: number }>({
    isOpen: false,
  });

  // Multi-photo queue state
  const [uploadedPhotos, setUploadedPhotos] = useState<{ name: string; base64: string; type: string }[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [detectedReviewItems, setDetectedReviewItems] = useState<DetectedPantryItem[]>([]);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [scanMode, setScanMode] = useState<'add' | 'replace'>('add');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'fridge' | 'freezer' | 'pantry' | 'spices'>('fridge');
  const [newItemAlways, setNewItemAlways] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPantry = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pantry');
      const data = await res.json();
      if (data?.items) {
        setItems(data.items);
      }
    } catch (e) {
      console.error('Error fetching pantry:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPantry();
  }, []);

  // When user types in new item name, auto-detect staple status
  const handleNameChange = (val: string) => {
    setNewItemName(val);
    if (val.trim().length >= 2) {
      const isStaple = isRecognizedKitchenStaple(val);
      if (isStaple) {
        setNewItemAlways(true);
      }
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setIsSubmitting(true);
      const isStaple = newItemAlways || isRecognizedKitchenStaple(newItemName);

      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          category: newItemCategory,
          isAlwaysAvailable: isStaple,
        }),
      });

      if (!res.ok) throw new Error('Failed to add item');
      const data = await res.json();
      if (data?.item) {
        // Update local state without duplicates
        setItems((prev) => {
          const filtered = prev.filter((i) => i.id !== data.item.id);
          return [data.item, ...filtered];
        });
      }
      setNewItemName('');
      setNewItemAlways(false);
    } catch (e) {
      alert('Error adding item: ' + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStaple = async (item: PantryItemData) => {
    if (!item.id) return;
    try {
      const updatedStatus = !item.isAlwaysAvailable;
      const res = await fetch('/api/pantry', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isAlwaysAvailable: updatedStatus,
        }),
      });

      if (!res.ok) throw new Error('Failed to update staple status');
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAlwaysAvailable: updatedStatus } : i))
      );
    } catch (e) {
      alert('Error updating staple: ' + (e as Error).message);
    }
  };

  const handleDeleteItem = async (id?: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/pantry?id=${id}`, { method: 'DELETE' });
      if (!okStatus(res.status)) throw new Error('Failed to delete item');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      alert('Error deleting item: ' + (e as Error).message);
    }
  };

  function okStatus(status: number) {
    return status >= 200 && status < 300;
  }

  // Handle Multi-Photo selection
  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newPhotos: { name: string; base64: string; type: string }[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPhotos.push({
          name: file.name,
          base64: reader.result as string,
          type: file.type || 'image/jpeg',
        });
        loadedCount++;
        if (loadedCount === fileList.length) {
          setUploadedPhotos((prev) => [...prev, ...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeQueuedPhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Run Multi-Photo Scan
  const handleRunMultiPhotoScan = async () => {
    if (uploadedPhotos.length === 0) return;

    try {
      setScanning(true);
      const res = await fetch('/api/ai/scan-pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedPhotos.map((p) => ({
            imageBase64: p.base64,
            mimeType: p.type,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'AI_SPEND_LIMIT_EXCEEDED' || res.status === 429) {
          setBudgetModal({
            isOpen: true,
            message: data.message,
            currentSpend: data.currentSpend,
            spendLimit: data.spendLimit,
          });
          return;
        }
        throw new Error(data.error || 'Failed to scan photos');
      }

      if (data?.items && Array.isArray(data.items)) {
        setDetectedReviewItems(
          data.items.map((item: any) => ({
            ...item,
            selected: true,
          }))
        );
        setShowReviewModal(true);
      }
    } catch (err) {
      alert('Error analyzing photos: ' + (err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const handleSampleFridge = async () => {
    try {
      setScanning(true);
      const scanRes = await fetch('/api/ai/scan-pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useDemoSample: true }),
      });
      const scanData = await scanRes.json();
      if (!scanRes.ok) {
        if (scanData.error === 'AI_SPEND_LIMIT_EXCEEDED' || scanRes.status === 429) {
          setBudgetModal({
            isOpen: true,
            message: scanData.message,
            currentSpend: scanData.currentSpend,
            spendLimit: scanData.spendLimit,
          });
          return;
        }
        throw new Error(scanData.error || 'Failed to load sample');
      }

      if (scanData?.items) {
        setDetectedReviewItems(
          scanData.items.map((item: any) => ({
            ...item,
            selected: true,
          }))
        );
        setShowReviewModal(true);
      }
    } catch (e) {
      alert('Error loading sample fridge: ' + (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  // Save selected items from Review Modal
  const handleSaveReviewedItems = async () => {
    const selected = detectedReviewItems.filter((i) => i.selected);
    if (selected.length === 0) {
      alert('Please select at least one item to save.');
      return;
    }

    try {
      setIsSavingReview(true);
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selected,
          replaceFridge: scanMode === 'replace',
        }),
      });

      if (!res.ok) throw new Error('Failed to save items');
      const data = await res.json();
      if (data?.items) {
        await fetchPantry();
        setShowReviewModal(false);
        setUploadedPhotos([]);
        setDetectedReviewItems([]);

        if (data.staleRemovedCount && data.staleRemovedCount > 0) {
          setStatusMessage(`✨ Fresh Fridge Reset: Saved ${data.count} items and archived ${data.staleRemovedCount} old fridge perishables.`);
        } else {
          setStatusMessage(`✨ Saved ${data.count} items to your pantry.`);
        }
        setTimeout(() => setStatusMessage(null), 6000);
      }
    } catch (e) {
      alert('Error saving pantry items: ' + (e as Error).message);
    } finally {
      setIsSavingReview(false);
    }
  };

  // Quick Add Suggested Staple
  const handleQuickAddStaple = async (stapleName: string) => {
    try {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stapleName,
          category: 'pantry',
          isAlwaysAvailable: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.item) {
          setItems((prev) => {
            const filtered = prev.filter((i) => i.id !== data.item.id);
            return [data.item, ...filtered];
          });
        }
      }
    } catch (e) {
      console.error('Error adding staple:', e);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'staples') return item.isAlwaysAvailable;
    if (activeTab === 'fridge') return item.category === 'fridge' || item.category === 'freezer';
    if (activeTab === 'pantry') return item.category === 'pantry';
    if (activeTab === 'spices') return item.category === 'spices';
    return true;
  });

  const popularStaples = [
    'Milk',
    'Unsalted Butter',
    'Eggs',
    'Extra Virgin Olive Oil',
    'Kosher Salt',
    'Black Pepper',
    'Fresh Garlic',
    'Yellow Onions',
    'All-Purpose Flour',
    'Granulated Sugar',
    'Soy Sauce',
    'Parmesan Cheese',
  ];

  const unstockedStaples = popularStaples.filter(
    (st) => !items.some((it) => it.name.toLowerCase().includes(st.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-crimson-950 via-crimson-900 to-rose-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold">
            Pantry & Fridge Contents
          </h2>
          <p className="text-rose-100/90 text-xs sm:text-sm mt-1 max-w-xl">
            Photograph your fridge shelves, freezer, crisper drawers, or dry cabinets. Upload multiple photos at once—Gemini will detect ingredients, deduplicate them, and auto-flag essential staples.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotosSelected}
            accept="image/*"
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-red-950 font-bold text-sm hover:bg-red-50 shadow-md transition-all disabled:opacity-50"
          >
            <Camera className="w-4 h-4 text-red-700" />
            Add Photo(s)
          </button>

          <button
            onClick={handleSampleFridge}
            disabled={scanning}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-black/30 hover:bg-black/40 text-rose-100 font-medium text-xs backdrop-blur-md transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-300" /> Sample Fridge
          </button>
        </div>
      </div>

      {/* Guided Next-Step Banner */}
      {items.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50/50 border border-red-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              3
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-charcoal-900 leading-tight">
                Step 3: See What You Can Cook
              </h3>
              <p className="text-xs text-charcoal-600 mt-0.5">
                You have {items.length} ingredients stocked. Match them against your indexed cookbooks and filter by must-use cuts.
              </p>
            </div>
          </div>

          <Link
            href="/match"
            className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-105 shrink-0"
          >
            <span>Go to Step 3: Ready to Cook</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Toast Alert */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold shadow-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-950 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploaded Photos Queue Bar */}
      {uploadedPhotos.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl space-y-3 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-red-700" /> {uploadedPhotos.length} Photo(s) Queued:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {uploadedPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative group bg-white border border-rose-200 rounded-lg p-1.5 flex items-center gap-2 shadow-xs"
                  >
                    <img
                      src={photo.base64}
                      alt={photo.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                    <span className="text-[11px] font-medium text-charcoal-700 max-w-[90px] truncate">
                      {photo.name}
                    </span>
                    <button
                      onClick={() => removeQueuedPhoto(idx)}
                      className="text-charcoal-400 hover:text-red-600 p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-2 text-red-800 hover:bg-red-100/60 rounded-lg font-medium transition-colors"
              >
                + Add More
              </button>
              <button
                onClick={handleRunMultiPhotoScan}
                disabled={scanning}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {scanning ? 'Analyzing All Photos...' : `Scan ${uploadedPhotos.length} Photo(s)`}
              </button>
            </div>
          </div>

          {/* Mode Selector Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-rose-200/80 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-red-950">Scan Mode:</span>
              <div className="bg-white p-1 rounded-xl border border-rose-200 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setScanMode('add')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    scanMode === 'add'
                      ? 'bg-red-800 text-white shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-rose-50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Inventory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('replace')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    scanMode === 'replace'
                      ? 'bg-rose-900 text-white shadow-xs'
                      : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-rose-50'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Fresh Fridge Reset</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-red-900 font-medium">
              {scanMode === 'replace'
                ? '🔄 Fresh Reset replaces unseen fridge perishables while preserving your staples.'
                : '➕ Merges new items into your existing pantry and fridge.'}
            </p>
          </div>
        </div>
      )}

      {/* Suggested Essential Staples Strip */}
      {unstockedStaples.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-red-900/10 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-950 flex items-center gap-1">
              🧂 Essential Staples:
            </span>
            <span className="text-xs text-charcoal-500 hidden sm:inline">
              Click to quickly stock common items:
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {unstockedStaples.slice(0, 6).map((staple) => (
              <button
                key={staple}
                onClick={() => handleQuickAddStaple(staple)}
                className="text-[11px] font-medium bg-red-50 hover:bg-red-100 text-red-900 border border-red-200/80 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3 h-3 text-red-700" /> {staple}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Form */}
      <form
        onSubmit={handleAddItem}
        className="bg-white p-4 sm:p-5 rounded-2xl border border-red-900/10 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            placeholder="Add ingredient (e.g. Greek yogurt, Whole Milk, Butter, Rigatoni, Salmon...)"
            value={newItemName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-red-50/30 rounded-xl border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/40 text-charcoal-900 placeholder-charcoal-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value as any)}
            className="px-3 py-2.5 text-xs bg-red-50/30 rounded-xl border border-red-200 text-charcoal-800 focus:outline-none"
          >
            <option value="fridge">❄️ Fridge / Fresh</option>
            <option value="freezer">🧊 Freezer</option>
            <option value="pantry">🥫 Dry Pantry</option>
            <option value="spices">🧂 Spices & Salts</option>
          </select>

          <label className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-charcoal-700 bg-red-50/40 rounded-xl border border-red-200/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newItemAlways}
              onChange={(e) => setNewItemAlways(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className="font-semibold text-red-950">Always Stocked Staple</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting || !newItemName.trim()}
            className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </form>

      {/* Tabs & Search Filter */}
      <div className="flex items-center justify-between border-b border-red-900/10 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {[
            { key: 'all', label: `All Items (${items.length})` },
            { key: 'staples', label: `🧂 Staples (${items.filter((i) => i.isAlwaysAvailable).length})` },
            { key: 'fridge', label: `❄️ Fridge & Fresh (${items.filter((i) => i.category === 'fridge' || i.category === 'freezer').length})` },
            { key: 'pantry', label: `🥫 Dry Pantry (${items.filter((i) => i.category === 'pantry').length})` },
            { key: 'spices', label: `🌿 Spices (${items.filter((i) => i.category === 'spices').length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-red-100 text-red-950'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-20 bg-charcoal-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-red-900/10 p-8 space-y-3">
          <Refrigerator className="w-12 h-12 mx-auto text-red-600/30" />
          <h3 className="text-base font-serif font-bold text-charcoal-800">
            No items in this category
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Take a photo of your fridge or add ingredients above to start matching with your cookbooks.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
                item.isAlwaysAvailable
                  ? 'bg-red-50/40 border-red-200'
                  : 'bg-white border-red-950/10 hover:border-red-200'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-semibold text-xs sm:text-sm text-charcoal-900 truncate">
                    {item.name}
                  </h4>
                  {item.isAlwaysAvailable && (
                    <span className="text-[10px] bg-red-100 text-red-900 border border-red-200 font-bold px-1.5 py-0.5 rounded-full">
                      Staple
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-charcoal-500 mt-0.5 capitalize">
                  <span>{item.category}</span>
                  {item.quantity && <span>• {item.quantity}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleStaple(item)}
                  title={item.isAlwaysAvailable ? 'Always stocked (Staple)' : 'Mark as always stocked staple'}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    item.isAlwaysAvailable
                      ? 'text-red-700 hover:bg-red-100'
                      : 'text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-100'
                  }`}
                >
                  🧂
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-charcoal-400 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review & Deduplication Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal-950/70 backdrop-blur-sm flex justify-center items-start sm:py-8 px-2 sm:px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-red-900/10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-crimson-950 via-crimson-900 to-rose-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-rose-200 bg-white/20 px-2 py-0.5 rounded">
                  Scan Review & Deduplication
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold mt-1">
                  Confirm Detected Ingredients
                </h3>
                <p className="text-xs text-rose-100 mt-0.5">
                  Found {detectedReviewItems.length} items. We detected kitchen staples and checked against your existing pantry.
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher in Review Modal */}
            <div className="bg-charcoal-50 p-3.5 sm:px-6 border-b border-charcoal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-charcoal-900">Import Mode:</span>
                <div className="bg-white p-1 rounded-xl border border-charcoal-200 flex items-center gap-1 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setScanMode('add')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      scanMode === 'add'
                        ? 'bg-rose-900 text-white shadow-xs'
                        : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-50'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Inventory</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('replace')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      scanMode === 'replace'
                        ? 'bg-red-800 text-white shadow-xs'
                        : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-50'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Fresh Fridge Reset</span>
                  </button>
                </div>
              </div>

              {scanMode === 'replace' ? (
                <div className="text-[11px] text-amber-900 bg-amber-100/90 px-3 py-1 rounded-lg border border-amber-300 flex items-center gap-1.5 font-semibold animate-in fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Fresh Reset: Unseen fridge items replaced. Staples ({items.filter(i => i.isAlwaysAvailable).length}) preserved.</span>
                </div>
              ) : (
                <div className="text-[11px] text-charcoal-500 font-medium">
                  ➕ Will merge seamlessly with your existing inventory.
                </div>
              )}
            </div>

            {/* List of Detected Items */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1 divide-y divide-red-900/5">
              {detectedReviewItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`pt-2.5 first:pt-0 flex items-center justify-between gap-3 ${
                    item.selected ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => {
                        setDetectedReviewItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it))
                        );
                      }}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-charcoal-900">
                          {item.name}
                        </span>
                        {item.alreadyInPantry && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-charcoal-100 text-charcoal-800 border border-charcoal-200 px-2 py-0.5 rounded-full">
                            <BookmarkCheck className="w-3 h-3 text-charcoal-600" /> In Pantry (will merge)
                          </span>
                        )}
                        {item.isAlwaysAvailable && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-100 text-red-900 border border-red-200 px-2 py-0.5 rounded-full">
                            🧂 Kitchen Staple
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-500 capitalize">
                        {item.category} {item.quantity && ` · ${item.quantity}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-charcoal-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isAlwaysAvailable}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDetectedReviewItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, isAlwaysAvailable: checked } : it))
                          );
                        }}
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      <span className="text-[11px] font-medium hidden sm:inline">Staple</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-charcoal-50 border-t border-charcoal-200 flex items-center justify-between">
              <span className="text-xs text-charcoal-600 font-medium">
                {detectedReviewItems.filter((i) => i.selected).length} of {detectedReviewItems.length} selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReviewedItems}
                  disabled={isSavingReview}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {isSavingReview ? 'Saving...' : 'Import to Pantry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Bottom Step Bar (Prominent on Mobile) */}
      {items.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-md bg-charcoal-950/95 border border-charcoal-700/70 backdrop-blur-xl text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
              2
            </span>
            <div className="leading-tight truncate">
              <div className="text-[10px] text-charcoal-400 font-semibold uppercase tracking-wider">Step 2 Complete</div>
              <div className="text-xs font-bold text-white truncate">{items.length} Items Stocked</div>
            </div>
          </div>

          <Link
            href="/match"
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105 shrink-0"
          >
            <span>See What to Cook</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </Link>
        </div>
      )}

      {/* AI Budget Limit Modal */}
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
