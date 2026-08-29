'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';

interface MiseGoogleNotesModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export function MiseGoogleNotesModal({ onClose, onImportSuccess }: MiseGoogleNotesModalProps) {
  const [noteText, setNoteText] = useState('');
  const [defaultFrequency, setDefaultFrequency] = useState('1_week');
  const [scanning, setScanning] = useState(false);

  // Extracted Recipes Preview & Selection
  const [extractedRecipes, setExtractedRecipes] = useState<any[] | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleScanNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setScanning(true);
      const res = await fetch('/api/mise/parse-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: noteText.trim(),
          defaultFrequency,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to scan notes');
      }

      const data = await res.json();
      const recipes = data.recipes || [];
      if (recipes.length === 0) {
        alert('No recipes found in the pasted text. Please check your note and try again.');
        return;
      }
      setExtractedRecipes(recipes);
      setSelectedIndices(new Set(recipes.map((_: any, i: number) => i)));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setScanning(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSaveSelected = async () => {
    if (!extractedRecipes || selectedIndices.size === 0) return;

    try {
      setSavingBatch(true);
      const recipesToSave = extractedRecipes.filter((_, i) => selectedIndices.has(i));

      for (const rec of recipesToSave) {
        await fetch('/api/mise/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec),
        });
      }

      onImportSuccess();
      onClose();
    } catch (err) {
      alert('Error saving recipes: ' + (err as Error).message);
    } finally {
      setSavingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-[#140f20] border border-purple-900/50 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-[#171126] to-[#140f20]">
          <div className="space-y-1">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono">
              Notes & Text Scanner
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
              Paste & Import Notes
            </h3>
            <p className="text-xs text-purple-200/70">
              Paste raw text or notes. AI automatically cleans bullets, extracts ingredients, and imports recipes into your vault.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-purple-300/60 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {extractedRecipes ? (
            /* EXTRACTED PREVIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 font-mono">
                  Found {extractedRecipes.length} Recipe{extractedRecipes.length === 1 ? '' : 's'}:
                </span>
                <span className="text-xs text-purple-400 font-mono">
                  {selectedIndices.size} selected
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {extractedRecipes.map((rec, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-500'
                          : 'bg-white/[0.02] border-white/5 opacity-60'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-purple-500 border-purple-400 text-white'
                            : 'border-white/20 bg-black/40'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-serif font-bold text-sm text-white truncate">
                            {rec.title}
                          </h4>
                          {rec.cookTime && (
                            <span className="text-[10px] text-purple-300 font-mono shrink-0">
                              {rec.cookTime}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-purple-200/70 line-clamp-2 leading-relaxed">
                          {(rec.ingredients || []).map((i: any) => i.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExtractedRecipes(null)}
                  className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveSelected}
                  disabled={savingBatch || selectedIndices.size === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {savingBatch
                      ? 'Saving...'
                      : `Import ${selectedIndices.size} Recipe(s) to Vault`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* PASTE NOTES FORM */
            <form onSubmit={handleScanNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                  Paste Note Text (Supports Multiple Recipes)
                </label>
                <textarea
                  rows={8}
                  placeholder={`Paste one or multiple notes:\n\nPeanut Butter Noodles:\n• 2 bundles fresh wheat noodles\n• 1/2 cup noodle water\n• 4 cloves garlic\n• 1 cup peanut butter\n• 4 tbsp soy sauce\n\nOnion Chip Dip:\n• 4 sweet onions\n• 1 brick cream cheese\n• 2/3 cup sour cream`}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl p-4 text-xs focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                  Default Rotation Cadence
                </label>
                <select
                  value={defaultFrequency}
                  onChange={(e) => setDefaultFrequency(e.target.value)}
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scanning || !noteText.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                  <span>{scanning ? 'Scanning Recipes...' : 'Scan Notes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
