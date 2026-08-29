'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Star,
  Clock,
  BookOpen,
  X,
  Flame,
  TrendingUp,
  BarChart3,
  List,
  Check,
} from 'lucide-react';
import { DishFrequencyStat } from '@/app/api/mise/history/route';

interface MiseMealHistoryProps {
  onCookAgain?: (recipeTitle: string) => void;
}

export function MiseMealHistory({ onCookAgain }: MiseMealHistoryProps) {
  const [viewMode, setViewMode] = useState<'frequency' | 'timeline'>('frequency');
  const [history, setHistory] = useState<any[]>([]);
  const [dishStats, setDishStats] = useState<DishFrequencyStat[]>([]);
  const [totalMeals, setTotalMeals] = useState<number>(0);
  const [uniqueDishes, setUniqueDishes] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Manual Log Modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingLog, setSavingLog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mise/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setDishStats(data.dishStats || []);
        setTotalMeals(data.totalMealsLogged || 0);
        setUniqueDishes(data.uniqueDishesCount || 0);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    try {
      setSavingLog(true);
      const res = await fetch('/api/mise/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeTitle: manualTitle.trim(),
          notes: manualNotes.trim() || undefined,
          cookedAt: manualDate,
          sourceType: 'manual',
        }),
      });

      if (!res.ok) throw new Error('Failed to log meal');
      setManualTitle('');
      setManualNotes('');
      setShowLogModal(false);
      setToastMessage(`✨ Logged "${manualTitle.trim()}" to history!`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchHistory();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingLog(false);
    }
  };

  const handleQuickLogAgain = async (dish: DishFrequencyStat) => {
    try {
      const res = await fetch('/api/mise/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeTitle: dish.recipeTitle,
          recipeId: dish.recipeId,
          sourceType: dish.sourceType || 'custom',
          cookedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to log meal');
      setToastMessage(`✨ Logged "${dish.recipeTitle}" as cooked tonight!`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchHistory();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      await fetch(`/api/mise/history?id=${id}`, { method: 'DELETE' });
      fetchHistory();
    } catch (err) {
      fetchHistory();
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const topDish = dishStats.length > 0 ? dishStats[0] : null;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-950 border border-purple-500 text-purple-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 font-semibold text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#120d1f] via-[#1a122c] to-[#120d1f] rounded-3xl p-5 sm:p-7 border border-purple-900/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Eating Frequency & Journal
            </span>
            <span className="text-xs text-purple-300/70 font-mono">
              {totalMeals} total meals logged
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
            Meal History & Cadence
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Track total counts and actual frequencies to see how often you eat each dish.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Switcher Tabs */}
          <div className="bg-[#0b0813] border border-purple-900/40 p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('frequency')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'frequency'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dish Frequency</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300/60 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Log Meal</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {dishStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-[#140f20] border border-purple-900/30 rounded-2xl p-4 shadow-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono block">
              Total Meals Logged
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-serif font-bold text-white">{totalMeals}</span>
              <span className="text-xs text-purple-300/60">dinners</span>
            </div>
          </div>

          <div className="bg-[#140f20] border border-purple-900/30 rounded-2xl p-4 shadow-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono block">
              Unique Recipes Cooked
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-serif font-bold text-white">{uniqueDishes}</span>
              <span className="text-xs text-purple-300/60">distinct dishes</span>
            </div>
          </div>

          <div className="bg-[#140f20] border border-purple-900/30 rounded-2xl p-4 shadow-xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono block">
              Most Frequent Dish
            </span>
            <div className="mt-1 truncate">
              {topDish ? (
                <div className="flex items-center gap-1.5 truncate">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-sm font-bold text-white truncate">{topDish.recipeTitle}</span>
                  <span className="text-xs font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-800/40">
                    {topDish.totalCount}x
                  </span>
                </div>
              ) : (
                <span className="text-xs text-purple-300/60">—</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: DISH FREQUENCY & CADENCE */}
      {viewMode === 'frequency' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-purple-300/60">Loading frequency stats...</div>
          ) : dishStats.length === 0 ? (
            <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No Meal History Logged Yet</h3>
              <p className="text-xs text-purple-200/70 max-w-sm mx-auto">
                When you cook dinners from your playlist, click &quot;Cooked Tonight&quot; to track your real eating cadence and counts.
              </p>
              <button
                onClick={() => setShowLogModal(true)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Log Your First Meal</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {dishStats.map((dish, idx) => (
                <div
                  key={idx}
                  className="bg-[#140f20] rounded-3xl border border-purple-900/30 p-5 shadow-xl space-y-3 flex flex-col justify-between hover:border-purple-500/40 transition-colors"
                >
                  <div className="space-y-2">
                    {/* Header: Title + Total Count Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {dish.sourceType === 'cookbook' ? (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <BookOpen className="w-2.5 h-2.5" /> Cookbook
                            </span>
                          ) : (
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded">
                              Recipe
                            </span>
                          )}

                          {dish.targetFrequencyLabel && (
                            <span className="bg-white/5 text-purple-300 text-[10px] px-1.5 py-0.2 rounded font-mono">
                              Target: {dish.targetFrequencyLabel}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-serif font-bold text-white truncate">
                          {dish.recipeTitle}
                        </h4>
                      </div>

                      {/* Total Count Badge */}
                      <div className="bg-purple-950/90 border border-purple-600/50 px-3 py-1.5 rounded-2xl text-center shrink-0 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-purple-300 block leading-none font-mono">
                          Eaten
                        </span>
                        <span className="text-base font-bold text-white leading-tight mt-0.5 block">
                          {dish.totalCount}x
                        </span>
                      </div>
                    </div>

                    {/* Cadence Metrics Box */}
                    <div className="bg-[#0e0a17] border border-white/5 rounded-2xl p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-300/70 font-medium">Actual Frequency:</span>
                        <span className="font-bold text-purple-200 font-mono">
                          {dish.actualFrequencyLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-purple-300/70 font-medium">Last Eaten:</span>
                        <span className="text-purple-200 font-mono">
                          {formatDate(dish.lastCookedAt)}{' '}
                          <span className="opacity-60">({dish.daysSinceLastCooked}d ago)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action: Quick Log Again */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                        dish.status === 'overdue'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : dish.status === 'due_soon'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {dish.status === 'overdue'
                        ? '⚠️ Overdue'
                        : dish.status === 'due_soon'
                        ? '🔔 Due for Rotation'
                        : '✨ On Track'}
                    </span>

                    <button
                      onClick={() => handleQuickLogAgain(dish)}
                      className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cooked Today</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TIMELINE LOG */}
      {viewMode === 'timeline' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-purple-300/60">Loading journal...</div>
          ) : history.length === 0 ? (
            <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center text-xs text-purple-200/70">
              No entries logged yet.
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="bg-[#140f20] rounded-2xl border border-purple-900/30 p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4 hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-800/40 flex flex-col items-center justify-center text-purple-300 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-purple-400 font-mono">
                        {formatDate(entry.cookedAt)}
                      </span>
                      {entry.sourceType === 'cookbook' && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <BookOpen className="w-2.5 h-2.5" /> Cookbook
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-serif font-bold text-white truncate">
                      {entry.recipeTitle}
                    </h4>
                    {entry.notes && (
                      <p className="text-xs text-purple-200/60 italic truncate">{entry.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-purple-400/40 hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Delete log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MANUAL LOG MODAL */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#140f20] border border-purple-900/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-xl font-serif font-bold text-white">Log Cooked Dinner</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-purple-300/60 hover:text-white p-1 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                  What did you cook? *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Seared Ribeye & Roasted Asparagus"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                  Date Cooked
                </label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                  Notes / Impressions (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Turned out super crispy, next time add more garlic."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLog || !manualTitle.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all"
                >
                  <span>{savingLog ? 'Logging...' : 'Save to History'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
