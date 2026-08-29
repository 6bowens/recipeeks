'use client';

import React, { useState } from 'react';
import {
  X,
  Clock,
  Users,
  ExternalLink,
  BookOpen,
  UtensilsCrossed,
  CheckCircle2,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';

interface MiseRecipeDetailModalProps {
  recipe: any | null;
  onClose: () => void;
  onFrequencyChange?: (recipeId: string, frequency: string) => void;
  onDelete?: (recipeId: string, title: string) => void;
  onMarkCooked?: (recipe: any) => void;
}

export function MiseRecipeDetailModal({
  recipe,
  onClose,
  onFrequencyChange,
  onDelete,
  onMarkCooked,
}: MiseRecipeDetailModalProps) {
  if (!recipe) return null;

  const instructionsList: string[] = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : typeof recipe.instructions === 'string' && recipe.instructions.startsWith('[')
    ? JSON.parse(recipe.instructions)
    : typeof recipe.instructions === 'string' && recipe.instructions.trim()
    ? [recipe.instructions]
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-[#140f20] border border-purple-900/50 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-[#171126] to-[#140f20]">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {recipe.sourceType === 'cookbook' ? (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {recipe.cookbookTitle || 'Cookbook'} {recipe.pageNumber ? `· p. ${recipe.pageNumber}` : ''}
                </span>
              ) : recipe.sourceType === 'google_notes' ? (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                  📝 Google Notes
                </span>
              ) : recipe.sourceType === 'url' ? (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 hover:underline"
                >
                  <span>Web Recipe</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                  Manual Entry
                </span>
              )}

              <span className="bg-white/10 text-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                {FREQUENCY_CONFIG[recipe.frequency]?.shortLabel || 'Custom'}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
              {recipe.title}
            </h3>

            {/* Quick Specs */}
            <div className="flex items-center gap-4 text-xs text-purple-200/70 pt-1">
              {recipe.cookTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" /> {recipe.cookTime}
                </span>
              )}
              {recipe.servings && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-purple-400" /> {recipe.servings} Servings
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-purple-300/60 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Ingredients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-purple-300 font-mono">
                Ingredients ({(recipe.ingredients || []).length})
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(recipe.ingredients || []).map((ing: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-purple-100 flex items-center justify-between"
                >
                  <span className="font-medium">{ing.name}</span>
                  {ing.amount && (
                    <span className="text-purple-300/60 font-mono text-[11px] ml-2 shrink-0">
                      {ing.amount} {ing.unit || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions / Method Section */}
          {instructionsList.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-purple-300 font-mono">
                Method / Preparation
              </h4>
              <ol className="space-y-2.5 list-decimal list-inside text-xs leading-relaxed text-purple-200/90">
                {instructionsList.map((step, idx) => (
                  <li key={idx} className="p-2.5 rounded-xl bg-[#0b0813] border border-white/5">
                    <span className="text-purple-100">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Notes Section */}
          {recipe.notes && (
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs text-purple-200 space-y-1">
              <strong className="text-purple-300 block font-mono uppercase text-[10px] tracking-wider">Chef Notes:</strong>
              <p className="leading-relaxed">{recipe.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/5 bg-[#100c1a] flex items-center justify-between gap-3 flex-wrap">
          {/* Frequency Tuning */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-purple-300/80 font-mono">Rotation:</span>
            <select
              value={recipe.frequency}
              onChange={(e) => onFrequencyChange && onFrequencyChange(recipe.id, e.target.value)}
              className="bg-[#0b0813] border border-purple-800/40 text-purple-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                <option key={k} value={k}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {onMarkCooked && (
              <button
                onClick={() => {
                  onMarkCooked(recipe);
                  onClose();
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Mark Cooked</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => {
                  onDelete(recipe.id, recipe.title);
                  onClose();
                }}
                className="p-2 text-purple-400/50 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                title="Remove recipe from vault"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
