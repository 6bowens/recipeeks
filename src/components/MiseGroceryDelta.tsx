'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  Copy,
  Plus,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Check,
  Layers,
  ArrowRight,
  Archive,
} from 'lucide-react';
import { AISLE_LABELS, AisleCategory, GroceryDeltaItem } from '@/lib/playlist-utils';

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
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showStocked, setShowStocked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [addingToPantry, setAddingToPantry] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleCopyList = () => {
    if (!groceryDelta) return;
    const lines: string[] = ['🛒 Mise Grocery Delta:'];

    const aisles = Object.keys(groceryDelta.missingByAisle) as AisleCategory[];
    for (const aisle of aisles) {
      const items = groceryDelta.missingByAisle[aisle];
      if (items.length > 0) {
        lines.push(`\n${AISLE_LABELS[aisle]?.icon} ${AISLE_LABELS[aisle]?.label}:`);
        for (const it of items) {
          const checkMark = checkedItems.has(it.id) ? ' [x]' : ' [ ]';
          const amt = it.amount ? ` (${it.amount})` : '';
          lines.push(`- ${it.name}${amt}${checkMark}`);
        }
      }
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddCheckedToPantry = async () => {
    if (!groceryDelta || checkedItems.size === 0) return;
    try {
      setAddingToPantry(true);
      const allMissing = Object.values(groceryDelta.missingByAisle).flat();
      const itemsToAdd = allMissing.filter((i) => checkedItems.has(i.id));

      for (const item of itemsToAdd) {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            category: item.aisleCategory === 'meat' ? 'fridge' : item.aisleCategory === 'dairy' ? 'fridge' : item.aisleCategory === 'produce' ? 'fridge' : 'pantry',
            isAlwaysAvailable: false,
          }),
        });
      }

      setToastMessage(`✨ Added ${itemsToAdd.length} purchased item(s) to your Recipeeks Pantry!`);
      setTimeout(() => setToastMessage(null), 3500);
      onRefresh();
    } catch (err) {
      alert('Failed to update pantry: ' + (err as Error).message);
    } finally {
      setAddingToPantry(false);
    }
  };

  if (!groceryDelta || (groceryDelta.totalMissingCount === 0 && groceryDelta.totalStockedCount === 0)) {
    return (
      <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-2xl font-serif font-bold text-white">Grocery Delta</h3>
          <p className="text-xs sm:text-sm text-purple-200/70 mt-1.5 leading-relaxed">
            Generate a dinner playlist first to calculate the exact missing ingredients against your fridge & pantry.
          </p>
        </div>

        <button
          onClick={onGoToPlaylist}
          className="px-6 py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 mx-auto cursor-pointer transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>View Dinner Playlist</span>
        </button>
      </div>
    );
  }

  const aisles = (Object.keys(groceryDelta.missingByAisle) as AisleCategory[]).filter(
    (a) => groceryDelta.missingByAisle[a]?.length > 0
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-950 border border-purple-500 text-purple-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#120d1f] via-[#1a122c] to-[#120d1f] rounded-3xl p-5 sm:p-7 border border-purple-900/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Delta Engine
            </span>
            <span className="text-xs text-purple-300/70 font-mono">
              {groceryDelta.totalMissingCount} items to buy · {groceryDelta.totalStockedCount} stocked
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
            Grocery Delta Shopping List
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Ingredients needed for your active dinner playlist missing from your fridge & pantry.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
          <button
            onClick={handleCopyList}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied List!' : 'Copy to Notes'}</span>
          </button>

          {checkedItems.size > 0 && (
            <button
              onClick={handleAddCheckedToPantry}
              disabled={addingToPantry}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{addingToPantry ? 'Adding...' : `Stock ${checkedItems.size} in Pantry`}</span>
            </button>
          )}
        </div>
      </div>

      {/* MISSING ITEMS (BY AISLE) */}
      {groceryDelta.totalMissingCount === 0 ? (
        <div className="bg-[#140f20] border border-emerald-500/30 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Your Kitchen is 100% Stocked!</h3>
          <p className="text-xs text-purple-200/70 max-w-md mx-auto">
            You already have every ingredient needed across your active dinner playlist in your Recipeeks fridge and pantry.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {aisles.map((aisle) => {
            const items = groceryDelta.missingByAisle[aisle];
            const meta = AISLE_LABELS[aisle] || { label: aisle, icon: '🛒' };

            return (
              <div
                key={aisle}
                className="bg-[#140f20] rounded-2xl border border-purple-900/30 p-5 shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <h4 className="font-serif font-bold text-sm text-white">{meta.label}</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                    {items.length} item{items.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((item) => {
                    const isChecked = checkedItems.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'bg-purple-950/40 border-purple-500/60 opacity-70'
                            : 'bg-white/[0.03] border-white/5 hover:border-purple-800/40 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                              isChecked
                                ? 'bg-purple-500 border-purple-400 text-white'
                                : 'border-white/20 bg-black/40'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`text-xs font-semibold block truncate ${
                                isChecked ? 'line-through text-purple-300/50' : 'text-purple-100'
                              }`}
                            >
                              {item.name}
                            </span>
                            <span className="text-[10px] text-purple-400/60 block truncate">
                              For: {item.recipes.join(', ')}
                            </span>
                          </div>
                        </div>

                        {item.amount && (
                          <span className="text-[11px] font-mono text-purple-300/70 shrink-0">
                            {item.amount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STOCKED ITEMS (COLLAPSIBLE) */}
      {groceryDelta.stockedItems.length > 0 && (
        <div className="bg-[#100c1a] rounded-2xl border border-white/5 overflow-hidden">
          <button
            onClick={() => setShowStocked(!showStocked)}
            className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-purple-300/70 hover:text-white cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Already in Your Fridge & Pantry ({groceryDelta.stockedItems.length} items)</span>
            </div>
            {showStocked ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showStocked && (
            <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border-t border-white/5 animate-in fade-in">
              {groceryDelta.stockedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs text-emerald-200/80 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.amount && (
                    <span className="text-[10px] font-mono text-emerald-400/60 shrink-0">
                      {item.amount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
