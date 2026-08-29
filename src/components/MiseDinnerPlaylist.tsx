'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Shuffle,
  Lock,
  Unlock,
  RotateCcw,
  Clock,
  Users,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Plus,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Check,
  Eye,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';
import { MiseRecipeDetailModal } from '@/components/MiseRecipeDetailModal';

interface MiseDinnerPlaylistProps {
  playlist: {
    id: string;
    daysCount: number;
    slots: {
      day: number;
      locked: boolean;
      recipe: any;
    }[];
  } | null;
  availableRecipesCount: number;
  onRefresh: () => void;
  onGoToDelta: () => void;
  onGoToVault: () => void;
}

export function MiseDinnerPlaylist({
  playlist,
  availableRecipesCount,
  onRefresh,
  onGoToDelta,
  onGoToVault,
}: MiseDinnerPlaylistProps) {
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [swappingDay, setSwappingDay] = useState<number | null>(null);
  const [daysCount, setDaysCount] = useState<number>(playlist?.daysCount || 3);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<any | null>(null);
  const [loggingCookedDay, setLoggingCookedDay] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGenerate = async (newDays?: number) => {
    try {
      setGenerating(true);
      const targetDays = newDays || daysCount;
      const pinned = (playlist?.slots || [])
        .filter((s) => s.locked && s.recipe?.frequency !== 'paused')
        .map((s) => ({ day: s.day, recipeId: s.recipe.id }));

      const res = await fetch('/api/mise/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daysCount: targetDays,
          pinnedSlots: pinned,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate playlist');
      }

      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSwapSlot = async (day: number) => {
    try {
      setSwappingDay(day);
      const res = await fetch('/api/mise/playlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'swap', day }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to swap meal');
      }

      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSwappingDay(null);
    }
  };

  const handleToggleLock = async (day: number) => {
    try {
      const res = await fetch('/api/mise/playlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock', day }),
      });

      if (!res.ok) throw new Error('Failed to toggle lock');
      onRefresh();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleMarkCooked = async (day: number, recipe: any) => {
    try {
      setLoggingCookedDay(day);
      const res = await fetch('/api/mise/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeTitle: recipe.title,
          recipeId: recipe.id,
          sourceType: recipe.sourceType,
          cookedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to log meal');
      setToastMessage(`✨ Logged "${recipe.title}" as cooked tonight!`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoggingCookedDay(null);
    }
  };

  if (!playlist || playlist.slots.length === 0) {
    return (
      <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md">
          <Calendar className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-2xl font-serif font-bold text-white">Your Dinner Playlist</h3>
          <p className="text-xs sm:text-sm text-purple-200/70 mt-1.5 leading-relaxed">
            {availableRecipesCount === 0
              ? 'Add a few favorite recipes to your vault (or import from your Recipeeks cookbooks) to generate a customized 3 to 4 day rotation.'
              : `You have ${availableRecipesCount} active recipe(s) ready in your vault. Generate your customized dinner rotation.`}
          </p>
        </div>

        {availableRecipesCount === 0 ? (
          <button
            onClick={onGoToVault}
            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 mx-auto cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Recipes to Vault</span>
          </button>
        ) : (
          <button
            onClick={() => handleGenerate(3)}
            disabled={generating}
            className="px-6 py-3.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 mx-auto cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Rolling Playlist...' : 'Generate 3-Day Rotation'}</span>
          </button>
        )}
      </div>
    );
  }

  // Filter out any slots where recipe is paused
  const currentSlots = playlist.slots.filter((s) => s.recipe && s.recipe.frequency !== 'paused');
  const activeSlot = currentSlots.find((s) => s.day === selectedDayTab) || currentSlots[0];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-950 border border-purple-500 text-purple-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Duration Controls */}
      <div className="bg-gradient-to-r from-[#120d1f] via-[#1a122c] to-[#120d1f] rounded-3xl p-5 sm:p-7 border border-purple-900/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Active Rotation
            </span>
            <span className="text-xs text-purple-300/70 font-mono">
              {availableRecipesCount} active recipes in rotation
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
            Dinner Playlist
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Rotated based on how often you love each meal.
          </p>
        </div>

        {/* Days Count & Regenerate Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
          <div className="bg-[#0b0813] border border-purple-900/40 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => {
                setDaysCount(3);
                handleGenerate(3);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                playlist.daysCount === 3
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              3 Days
            </button>
            <button
              onClick={() => {
                setDaysCount(4);
                handleGenerate(4);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                playlist.daysCount === 4
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              4 Days
            </button>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Shuffle className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Rolling...' : 'Re-roll Playlist'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Swipeable Day Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {currentSlots.map((slot) => {
          const isSelected = selectedDayTab === slot.day;
          return (
            <button
              key={slot.day}
              onClick={() => setSelectedDayTab(slot.day)}
              className={`px-4 py-2.5 rounded-2xl border text-left shrink-0 transition-all cursor-pointer flex items-center gap-2.5 ${
                isSelected
                  ? 'bg-purple-950/80 border-purple-500 text-white shadow-lg ring-1 ring-purple-500/30'
                  : 'bg-[#140f20]/80 border-white/5 text-purple-200/60 hover:border-purple-800/40 hover:text-white'
              }`}
            >
              <div className="leading-tight">
                <span className="text-[10px] font-bold uppercase tracking-wider block font-mono text-purple-400">
                  Day {slot.day}
                </span>
                <span className="text-xs font-bold truncate max-w-[120px] block text-white">
                  {slot.recipe.title}
                </span>
              </div>
              {slot.locked && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Active Day Detail Card */}
      {activeSlot && (
        <div className="bg-[#140f20] rounded-3xl border border-purple-900/30 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
            <div
              onClick={() => setSelectedRecipeDetail(activeSlot.recipe)}
              className="space-y-1 cursor-pointer group"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded font-mono">
                  Day {activeSlot.day} Dinner
                </span>
                <span className="bg-white/10 text-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                  {FREQUENCY_CONFIG[activeSlot.recipe.frequency]?.shortLabel || 'Custom'}
                </span>
                {activeSlot.recipe.sourceType === 'cookbook' && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {activeSlot.recipe.cookbookTitle}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-serif font-bold text-white leading-tight group-hover:text-purple-200 transition-colors flex items-center gap-2">
                <span>{activeSlot.recipe.title}</span>
                <Eye className="w-4 h-4 opacity-0 group-hover:opacity-100 text-purple-400 transition-opacity" />
              </h3>
            </div>

            {/* Quick Slot Actions (Cooked / Swap / Lock) */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => handleMarkCooked(activeSlot.day, activeSlot.recipe)}
                disabled={loggingCookedDay === activeSlot.day}
                className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{loggingCookedDay === activeSlot.day ? 'Logging...' : 'Cooked Tonight'}</span>
              </button>

              <button
                onClick={() => handleToggleLock(activeSlot.day)}
                title={activeSlot.locked ? 'Unlock meal for shuffle' : 'Lock meal to preserve during shuffle'}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeSlot.locked
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                    : 'bg-white/5 border-white/10 text-purple-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {activeSlot.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{activeSlot.locked ? 'Pinned' : 'Pin'}</span>
              </button>

              <button
                onClick={() => handleSwapSlot(activeSlot.day)}
                disabled={swappingDay === activeSlot.day}
                className="px-3 py-2.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${swappingDay === activeSlot.day ? 'animate-spin' : ''}`} />
                <span>Swap</span>
              </button>
            </div>
          </div>

          {/* Quick Specs */}
          <div className="flex items-center gap-4 text-xs text-purple-200/70">
            {activeSlot.recipe.cookTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" /> {activeSlot.recipe.cookTime}
              </span>
            )}
            {activeSlot.recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-purple-400" /> {activeSlot.recipe.servings} Servings
              </span>
            )}
            {activeSlot.recipe.sourceUrl && (
              <a
                href={activeSlot.recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1 underline"
              >
                <span>View Web Recipe</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Ingredients Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-purple-400 font-mono">
                Key Ingredients ({activeSlot.recipe.ingredients?.length || 0})
              </span>
              <button
                onClick={() => setSelectedRecipeDetail(activeSlot.recipe)}
                className="text-xs font-semibold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>View Recipe & Method</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeSlot.recipe.ingredients?.map((ing: any, i: number) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-purple-100 flex items-center justify-between"
                >
                  <span>{ing.name}</span>
                  {ing.amount && (
                    <span className="text-purple-300/60 font-mono text-[11px]">
                      {ing.amount} {ing.unit || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Banner to Grocery Delta */}
      <div className="pt-2">
        <button
          onClick={onGoToDelta}
          className="w-full p-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs sm:text-sm cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-200" />
            <span>Generate Grocery Delta Shopping List</span>
          </div>
          <div className="flex items-center gap-1 text-purple-200">
            <span>View Delta</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Full Recipe Detail Modal */}
      {selectedRecipeDetail && (
        <MiseRecipeDetailModal
          recipe={selectedRecipeDetail}
          onClose={() => setSelectedRecipeDetail(null)}
          onMarkCooked={(r) => handleMarkCooked(activeSlot.day, r)}
        />
      )}
    </div>
  );
}
