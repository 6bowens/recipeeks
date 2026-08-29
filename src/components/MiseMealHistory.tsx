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
} from 'lucide-react';

interface MiseMealHistoryProps {
  onCookAgain?: (recipeTitle: string) => void;
}

export function MiseMealHistory({ onCookAgain }: MiseMealHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [savingLog, setSavingLog] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mise/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
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
      fetchHistory();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      await fetch(`/api/mise/history?id=${id}`, { method: 'DELETE' });
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#120d1f] via-[#1a122c] to-[#120d1f] rounded-3xl p-5 sm:p-7 border border-purple-900/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Dinner Journal
            </span>
            <span className="text-xs text-purple-300/70 font-mono">
              {history.length} meal{history.length === 1 ? '' : 's'} logged
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
            Meal History
          </h2>
          <p className="text-xs text-purple-200/60 mt-0.5">
            Track what you&apos;ve cooked in the past to inspire future rotations.
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Log a Meal</span>
        </button>
      </div>

      {/* History Timeline */}
      {loading ? (
        <div className="py-12 text-center text-xs text-purple-300/60">Loading meal journal...</div>
      ) : history.length === 0 ? (
        <div className="bg-[#140f20] border border-purple-900/30 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Cooked Meals Logged Yet</h3>
          <p className="text-xs text-purple-200/70 max-w-sm mx-auto">
            When you cook a dinner from your playlist or make a meal at home, tap &quot;Mark Cooked&quot; to build your culinary history.
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
        <div className="space-y-3">
          {history.map((entry) => (
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
          ))}
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
