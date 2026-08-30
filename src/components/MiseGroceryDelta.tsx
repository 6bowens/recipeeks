'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Check,
  Circle,
  CheckCircle2,
  Copy,
  Plus,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Share2,
  ExternalLink,
  Layers,
  Receipt,
  PackageCheck,
} from 'lucide-react';
import { AISLE_LABELS, AisleCategory, GroceryDeltaItem } from '@/lib/playlist-utils';
import { ReceiptScannerModal } from '@/components/ReceiptScannerModal';

interface MiseGroceryDeltaProps {
  groceryDelta: {
    missingByAisle: Record<AisleCategory, GroceryDeltaItem[]>;
    stockedItems: GroceryDeltaItem[];
    totalMissingCount: number;
    totalStockedCount: number;
  } | null;
  onRefresh: () => void;
  onGoToPlaylist: () => void;
}

export function MiseGroceryDelta({
  groceryDelta,
  onRefresh,
  onGoToPlaylist,
}: MiseGroceryDeltaProps) {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [stocking, setStocking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keepCopied, setKeepCopied] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleStockAllMissingInPantry = async () => {
    if (!groceryDelta || groceryDelta.totalMissingCount === 0) return;
    const allMissing = Object.values(groceryDelta.missingByAisle).flat();
    if (allMissing.length === 0) return;

    if (!confirm(`Add all ${allMissing.length} missing ingredient(s) into your Recipeeks Pantry as in-stock?`)) {
      return;
    }

    try {
      setStocking(true);
      const itemsPayload = allMissing.map((item) => ({
        name: item.name,
        category: item.aisleCategory === 'produce' || item.aisleCategory === 'meat' || item.aisleCategory === 'dairy' ? 'fridge' : 'pantry',
        quantity: item.amount || null,
      }));

      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload }),
      });

      if (!res.ok) {
        throw new Error('Failed to update pantry');
      }

      setCheckedIds({});
      onRefresh();
      alert(`✨ All ${allMissing.length} ingredient(s) added to your Pantry and marked stocked!`);
    } catch (err) {
      alert('Error stocking items: ' + (err as Error).message);
    } finally {
      setStocking(false);
    }
  };

  const handleStockCheckedInPantry = async () => {
    if (!groceryDelta) return;
    try {
      setStocking(true);
      const allMissing = Object.values(groceryDelta.missingByAisle).flat();
      const itemsToStock = allMissing.filter((i) => checkedIds[i.id]);

      if (itemsToStock.length === 0) {
        alert('Please check off items as you buy them to stock them in your pantry.');
        return;
      }

      const itemsPayload = itemsToStock.map((item) => ({
        name: item.name,
        category: item.aisleCategory === 'produce' || item.aisleCategory === 'meat' || item.aisleCategory === 'dairy' ? 'fridge' : 'pantry',
        quantity: item.amount || null,
      }));

      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload }),
      });

      if (!res.ok) {
        throw new Error('Failed to update pantry');
      }

      setCheckedIds({});
      onRefresh();
      alert(`✨ Added ${itemsToStock.length} purchased item(s) to your Recipeeks Fridge & Pantry!`);
    } catch (err) {
      alert('Error stocking items: ' + (err as Error).message);
    } finally {
      setStocking(false);
    }
  };

  // Generate plain formatted text for Notes / Messages
  const generatePlainTextList = () => {
    if (!groceryDelta) return '';
    let text = `🛒 Mise Dinner Grocery List\n`;
    text += `Generated for active dinner rotation\n\n`;

    Object.entries(groceryDelta.missingByAisle).forEach(([aisle, items]) => {
      if (items.length > 0) {
        const meta = AISLE_LABELS[aisle as AisleCategory];
        text += `\n${meta.icon} ${meta.label.toUpperCase()}:\n`;
        items.forEach((i) => {
          text += `[ ] ${i.name}${i.amount ? ` (${i.amount})` : ''}\n`;
        });
      }
    });

    return text;
  };

  const handleCopyToClipboard = () => {
    const text = generatePlainTextList();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportToGoogleKeep = () => {
    const text = generatePlainTextList();
    navigator.clipboard.writeText(text);
    setKeepCopied(true);
    setTimeout(() => setKeepCopied(false), 3000);

    // If Web Share API is available (iOS/Android mobile), open native share to Google Keep
    if (navigator.share) {
      navigator.share({
        title: 'Shopping List',
        text: text,
      }).catch(() => {
        // Fallback open keep
        window.open('https://keep.google.com/', '_blank');
      });
    } else {
      // Desktop: Open Google Keep in new tab
      window.open('https://keep.google.com/', '_blank');
    }
  };

  if (!groceryDelta || groceryDelta.totalMissingCount === 0) {
    return (
      <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-white">Fully Stocked!</h3>
        <p className="text-xs sm:text-sm text-purple-200/70 leading-relaxed">
          Your pantry already contains all the ingredients needed for your active dinner playlist. You&apos;re ready to cook!
        </p>
        <button
          onClick={onGoToPlaylist}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all"
        >
          <span>View Dinner Playlist</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const aislesWithItems = Object.entries(groceryDelta.missingByAisle).filter(
    ([_, items]) => items.length > 0
  ) as [AisleCategory, GroceryDeltaItem[]][];

  const checkedCount = Object.values(checkedIds).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#120d1f] via-[#1a122c] to-[#120d1f] rounded-3xl p-5 sm:p-7 border border-purple-900/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono">
              Smart Shopping List
            </span>
            <span className="text-xs text-purple-300/70 font-mono">
              {groceryDelta.totalMissingCount} items needed
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
            Grocery List
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Ingredients missing from your home kitchen for this rotation, organized by aisle.
          </p>
        </div>

        {/* Action Buttons (Scan Receipt, Stock All, Google Keep, Copy) */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
          <button
            type="button"
            onClick={() => setShowReceiptModal(true)}
            className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            title="Take a photo of your supermarket receipt to automatically add items"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Scan Receipt</span>
          </button>

          {checkedCount > 0 ? (
            <button
              type="button"
              onClick={handleStockCheckedInPantry}
              disabled={stocking}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Stock {checkedCount} Checked</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStockAllMissingInPantry}
              disabled={stocking}
              className="px-3.5 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 border border-emerald-500/40"
              title="Add all missing ingredients into your Recipeeks pantry as in-stock"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Stock All ({groceryDelta.totalMissingCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportToGoogleKeep}
            className="px-3.5 py-2.5 bg-gradient-to-r from-amber-600/40 via-amber-500/40 to-amber-600/40 hover:from-amber-600/60 hover:to-amber-500/60 border border-amber-500/40 text-amber-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            title="Export checklist to Notes or Reminders"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{keepCopied ? 'Copied & Opening Keep...' : 'Add to Notes'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-purple-500/30 text-purple-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Aisle Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aislesWithItems.map(([aisle, items]) => {
          const meta = AISLE_LABELS[aisle];
          return (
            <div
              key={aisle}
              className="bg-[#140f20] rounded-3xl border border-purple-900/30 p-5 shadow-xl space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <h3 className="font-serif font-bold text-sm text-white">{meta.label}</h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-800/40">
                    {items.length} item{items.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 pt-2">
                  {items.map((item) => {
                    const isChecked = !!checkedIds[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-purple-950/40 border-purple-800/30 text-purple-400/60 line-through'
                            : 'bg-[#0e0a17] border-white/5 text-purple-100 hover:border-purple-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isChecked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-purple-400/40 shrink-0" />
                          )}
                          <span className="font-medium truncate">{item.name}</span>
                        </div>

                        {item.amount && (
                          <span className="text-[11px] font-mono text-purple-300/60 shrink-0">
                            {item.amount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stocked Items Footer Summary */}
      {groceryDelta.stockedItems.length > 0 && (
        <div className="bg-[#140f20]/50 rounded-2xl border border-white/5 p-4 flex items-center justify-between text-xs text-purple-300/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
            <span>
              <strong>{groceryDelta.totalStockedCount} ingredients</strong> are already stocked in your pantry and excluded from this list.
            </span>
          </div>
        </div>
      )}

      {/* Grocery Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        onSuccess={onRefresh}
      />
    </div>
  );
}
