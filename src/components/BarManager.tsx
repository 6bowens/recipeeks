'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Wine,
  Camera,
  Plus,
  Trash2,
  Sparkles,
  Check,
  X,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { PantryItemData } from '@/types';
import { isRecognizedBarStaple } from '@/lib/cocktail-utils';
import { BudgetLimitModal } from '@/components/BudgetLimitModal';

const POPULAR_BAR_ITEMS = [
  { name: 'Bourbon Whiskey', category: 'spirits' },
  { name: 'Rye Whiskey', category: 'spirits' },
  { name: 'London Dry Gin', category: 'spirits' },
  { name: 'Blanco Tequila', category: 'spirits' },
  { name: 'Mezcal', category: 'spirits' },
  { name: 'White Rum', category: 'spirits' },
  { name: 'Dark Rum', category: 'spirits' },
  { name: 'Vodka', category: 'spirits' },
  { name: 'Campari', category: 'liqueurs' },
  { name: 'Sweet Vermouth', category: 'liqueurs' },
  { name: 'Dry Vermouth', category: 'liqueurs' },
  { name: 'Cointreau / Triple Sec', category: 'liqueurs' },
  { name: 'Angostura Bitters', category: 'bitters_syrups' },
  { name: 'Orange Bitters', category: 'bitters_syrups' },
  { name: 'Simple Syrup', category: 'bitters_syrups' },
  { name: 'Fresh Lemons', category: 'produce' },
  { name: 'Fresh Limes', category: 'produce' },
  { name: 'Club Soda', category: 'mixers' },
  { name: 'Tonic Water', category: 'mixers' },
  { name: 'Luxardo Maraschino Cherries', category: 'ice_garnishes' },
];

export function BarManager() {
  const [items, setItems] = useState<PantryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [scanning, setScanning] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ name: string; base64: string; type: string }[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [detectedItems, setDetectedItems] = useState<{ name: string; category: string; isAlwaysAvailable: boolean; selected: boolean }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('spirits');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [budgetModal, setBudgetModal] = useState<{
    isOpen: boolean;
    message?: string;
    currentSpend?: number;
    spendLimit?: number;
  }>({ isOpen: false });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBarItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pantry');
      const data = await res.json();
      if (data?.items) {
        // Filter pantry items that belong to bar categories or have spirit/cocktail keywords
        const barCats = ['spirits', 'liqueurs', 'mixers', 'bitters_syrups', 'produce', 'ice_garnishes', 'bar'];
        const filtered = data.items.filter((it: PantryItemData) =>
          barCats.includes(it.category || '') || isRecognizedBarStaple(it.name)
        );
        setItems(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarItems();
  }, []);

  const handlePhotosSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: { name: string; base64: string; type: string }[] = [];
    const fileList = Array.from(files);
    let loaded = 0;

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newPhotos.push({
          name: file.name,
          base64: reader.result as string,
          type: file.type || 'image/jpeg',
        });
        loaded++;
        if (loaded === fileList.length) {
          setUploadedPhotos((prev) => [...prev, ...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunBarScan = async () => {
    if (uploadedPhotos.length === 0) return;
    try {
      setScanning(true);
      const res = await fetch('/api/ai/scan-bar', {
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
        throw new Error(data.error || 'Failed to scan bar cart');
      }

      if (data?.items && Array.isArray(data.items)) {
        setDetectedItems(
          data.items.map((i: any) => ({
            ...i,
            selected: true,
          }))
        );
        setShowReviewModal(true);
      }
    } catch (e) {
      alert('Error scanning bar cart: ' + (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const handleSampleBar = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/ai/scan-bar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useDemoSample: true }),
      });
      const data = await res.json();
      if (data?.items) {
        setDetectedItems(
          data.items.map((i: any) => ({
            ...i,
            selected: true,
          }))
        );
        setShowReviewModal(true);
      }
    } catch (e) {
      alert('Error loading sample: ' + (e as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveReviewed = async () => {
    const selected = detectedItems.filter((i) => i.selected);
    if (selected.length === 0) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selected }),
      });
      if (!res.ok) throw new Error('Failed to save bottles');
      await fetchBarItems();
      setShowReviewModal(false);
      setUploadedPhotos([]);
      setDetectedItems([]);
      setStatusMessage(`✨ Successfully added ${selected.length} bottles to your Bar Cart!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (e) {
      alert('Error saving bar items: ' + (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickAdd = async (name: string, category: string) => {
    try {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          isAlwaysAvailable: isRecognizedBarStaple(name),
        }),
      });
      if (!res.ok) throw new Error('Failed to add item');
      await fetchBarItems();
    } catch (e) {
      alert('Error: ' + (e as Error).message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetch(`/api/pantry?id=${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredItems = items.filter((it) => {
    if (activeTab === 'all') return true;
    return it.category === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Bar Cart Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-charcoal-900 to-crimson-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-amber-900/30">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5">
              <Wine className="w-3.5 h-3.5 text-amber-300" /> Bar Cart & Liquor Cabinet
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold">
            Your Spirits & Bar Inventory
          </h2>
          <p className="text-amber-100/90 text-xs sm:text-sm mt-1 max-w-xl">
            Photograph your bottles, liqueurs, bitters, and fresh citrus. Pour Decisions will cross-reference them with cocktail books to tell you what you can shake up tonight.
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
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-charcoal-950 font-bold text-sm hover:bg-amber-50 shadow-md transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-700" />
            <span>Scan Bar Cart</span>
          </button>

          <button
            onClick={handleSampleBar}
            disabled={scanning}
            className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-black/40 hover:bg-black/60 text-amber-200 font-medium text-xs backdrop-blur-md transition-all border border-amber-400/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Sample Speakeasy</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold shadow-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-950 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploaded Photos Staging Bar */}
      {uploadedPhotos.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-3 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-700" /> {uploadedPhotos.length} Photo(s) Queued:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {uploadedPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative group bg-white border border-amber-200 rounded-lg p-1.5 flex items-center gap-2 shadow-xs"
                  >
                    <img src={photo.base64} alt={photo.name} className="w-8 h-8 rounded object-cover" />
                    <span className="text-[11px] font-medium text-charcoal-700 max-w-[90px] truncate">
                      {photo.name}
                    </span>
                    <button
                      onClick={() => setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-charcoal-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
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
                className="text-xs px-3 py-2 text-amber-800 hover:bg-amber-100 rounded-lg font-medium transition-colors cursor-pointer"
              >
                + Add More
              </button>
              <button
                onClick={handleRunBarScan}
                disabled={scanning}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {scanning ? 'Analyzing Bottles...' : `Scan ${uploadedPhotos.length} Photo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Common Bar Essentials */}
      <div className="bg-white rounded-2xl border border-charcoal-200 p-4 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-600 mb-2.5 flex items-center gap-1.5">
          <span>⚡ Quick-Add Essential Bar Bottles & Mixers:</span>
        </h4>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {POPULAR_BAR_ITEMS.map((item, idx) => {
            const isStocked = items.some((i) => i.name.toLowerCase().includes(item.name.toLowerCase()));
            return (
              <button
                key={idx}
                onClick={() => !isStocked && handleQuickAdd(item.name, item.category)}
                disabled={isStocked}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                  isStocked
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 opacity-80 cursor-default'
                    : 'bg-charcoal-50 hover:bg-amber-50 text-charcoal-700 hover:text-amber-900 border border-charcoal-200 hover:border-amber-300 cursor-pointer'
                }`}
              >
                {isStocked ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-charcoal-500" />}
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'all', label: `All Bar Items (${items.length})` },
          { id: 'spirits', label: '🥃 Base Spirits' },
          { id: 'liqueurs', label: '🍷 Liqueurs & Amari' },
          { id: 'bitters_syrups', label: '🧪 Bitters & Syrups' },
          { id: 'mixers', label: '🫧 Mixers & Sodas' },
          { id: 'produce', label: '🍋 Fresh Citrus & Herbs' },
          { id: 'ice_garnishes', label: '🍒 Ice & Garnishes' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-900 text-white shadow-xs'
                : 'bg-white text-charcoal-600 hover:text-charcoal-900 border border-charcoal-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stocked Bottles Grid */}
      {loading ? (
        <div className="py-12 text-center text-charcoal-400 text-xs">Loading bar cart...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-charcoal-200 shadow-xs space-y-2">
          <Wine className="w-8 h-8 text-amber-700 mx-auto" />
          <h3 className="text-base font-serif font-bold text-charcoal-900">Your Bar Cart is Empty</h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            Take a photo of your liquor shelf or use Quick-Add to stock your bar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white p-3.5 rounded-2xl border border-charcoal-200/90 shadow-xs flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
            >
              <div className="min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-charcoal-900 truncate">
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-charcoal-500 mt-0.5 capitalize">
                  <span className="bg-charcoal-100 text-charcoal-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                    {item.category?.replace('_', ' ') || 'Bar'}
                  </span>
                  {item.quantity && <span>{item.quantity}</span>}
                </div>
              </div>

              <button
                onClick={() => item.id && handleDeleteItem(item.id)}
                className="p-1.5 text-charcoal-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                title="Remove bottle"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scan Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-charcoal-950/70 backdrop-blur-sm flex justify-center items-start sm:py-8 px-2 sm:px-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-amber-900/10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="p-6 bg-gradient-to-r from-amber-950 via-charcoal-900 to-crimson-950 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-amber-300 bg-white/20 px-2 py-0.5 rounded">
                  Bar Cart Scan
                </span>
                <h3 className="text-xl sm:text-2xl font-serif font-bold mt-1">
                  Confirm Detected Bottles & Mixers
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Detected {detectedItems.length} items from your photo.
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1 divide-y divide-charcoal-100">
              {detectedItems.map((item, idx) => (
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
                        setDetectedItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it))
                        );
                      }}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-sm text-charcoal-900">{item.name}</span>
                      <p className="text-xs text-charcoal-500 capitalize">{item.category.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-charcoal-50 border-t border-charcoal-200 flex items-center justify-between">
              <span className="text-xs text-charcoal-600 font-medium">
                {detectedItems.filter((i) => i.selected).length} of {detectedItems.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveReviewed}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Add to Bar Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Limit Modal */}
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
