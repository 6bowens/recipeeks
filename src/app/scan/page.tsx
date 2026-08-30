'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Plus,
  Trash2,
  ArrowRight,
  RefreshCw,
  UtensilsCrossed,
  ChefHat,
  Filter,
  Check,
  BookmarkCheck,
} from 'lucide-react';
import { ExtractedCookbook } from '@/types';
import { BudgetLimitModal } from '@/components/BudgetLimitModal';

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'review' | 'indexing' | 'success'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [detectedBooks, setDetectedBooks] = useState<(ExtractedCookbook & { selected: boolean })[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [budgetModal, setBudgetModal] = useState<{ isOpen: boolean; message?: string; currentSpend?: number; spendLimit?: number }>({
    isOpen: false,
  });

  // Options
  const [skipCocktails, setSkipCocktails] = useState(true);
  const [limitFirstOnly, setLimitFirstOnly] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  // Import summary result
  const [importSummary, setImportSummary] = useState<{
    totalBooks: number;
    totalSkipped?: number;
    totalRecipes: number;
    totalUniqueIngredients: number;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      runBookshelfScan(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const runBookshelfScan = async (imageBase64: string, mimeType: string) => {
    try {
      setIsScanning(true);
      const res = await fetch('/api/ai/scan-bookshelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          skipCocktails,
          limitFirstOnly,
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
        throw new Error(data.error || 'Failed to scan bookshelf');
      }

      if (data?.books) {
        setDetectedBooks(
          data.books.map((b: ExtractedCookbook) => ({
            ...b,
            // Select by default ONLY if it is not already in the library!
            selected: !b.alreadyInLibrary,
          }))
        );
        setStep('review');
      }
    } catch (err) {
      alert('Error analyzing bookshelf: ' + (err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleBookSelection = (index: number) => {
    setDetectedBooks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, selected: !b.selected } : b))
    );
  };

  const handleSelectOnlyNew = () => {
    setDetectedBooks((prev) =>
      prev.map((b) => ({ ...b, selected: !b.alreadyInLibrary }))
    );
  };

  const handleSelectAll = () => {
    setDetectedBooks((prev) => prev.map((b) => ({ ...b, selected: true })));
  };

  const handleAddManualBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setDetectedBooks((prev) => [
      ...prev,
      {
        title: newTitle.trim(),
        author: newAuthor.trim() || undefined,
        alreadyInLibrary: false,
        selected: true,
      },
    ]);
    setNewTitle('');
    setNewAuthor('');
  };

  const handleRemoveBook = (index: number) => {
    setDetectedBooks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartIndexing = async () => {
    const selected = detectedBooks.filter((b) => b.selected);
    if (selected.length === 0) {
      alert('Please select at least one cookbook to index.');
      return;
    }

    try {
      setStep('indexing');
      setIsIndexing(true);

      const res = await fetch('/api/ai/index-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          books: selected,
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
          setStep('review');
          return;
        }
        throw new Error(data.error || 'Failed to index recipes');
      }

      if (data?.summary) {
        setImportSummary(data.summary);
        setStep('success');
      }
    } catch (e) {
      alert('Error indexing recipes: ' + (e as Error).message);
      setStep('review');
    } finally {
      setIsIndexing(false);
    }
  };

  const newBooksCount = detectedBooks.filter((b) => !b.alreadyInLibrary).length;
  const existingBooksCount = detectedBooks.filter((b) => b.alreadyInLibrary).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-red-900/10 pb-4">
        {[
          { key: 'upload', label: '1. Photo Capture' },
          { key: 'review', label: '2. Review & Confirm Books' },
          { key: 'indexing', label: '3. AI Recipe Indexing' },
          { key: 'success', label: '4. Collection Ready' },
        ].map((s, idx) => {
          const isActive = step === s.key;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? 'bg-red-700 text-white'
                    : 'bg-red-100 text-red-900'
                }`}
              >
                {idx + 1}
              </span>
              <span className={`text-xs font-semibold hidden sm:inline ${isActive ? 'text-red-950' : 'text-charcoal-500'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload or Capture */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif font-bold text-charcoal-900">
              Scan Your Physical Bookshelf
            </h1>
            <p className="text-sm text-charcoal-600 max-w-lg mx-auto">
              Take a clear picture of your cookbook spines or covers. Gemini Multimodal AI will scan all shelves, detect every cookbook, and automatically filter out books you already own!
            </p>
          </div>

          {/* Options Toggles */}
          <div className="bg-red-50/60 border border-red-200/70 p-4 rounded-2xl flex flex-wrap items-center justify-center gap-6 text-xs text-charcoal-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipCocktails}
                onChange={(e) => setSkipCocktails(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span className="font-semibold text-red-950">Skip cocktail & bar books</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={limitFirstOnly}
                onChange={(e) => setLimitFirstOnly(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span className="font-medium">Test routine: only scan 1st cookbook</span>
            </label>
          </div>

          {/* Mobile Camera Direct Capture Input */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Photo Library / File Picker Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="border-2 border-dashed border-red-300 hover:border-red-500 bg-white hover:bg-red-50/30 rounded-3xl p-6 sm:p-10 text-center transition-all flex flex-col items-center justify-center gap-4 group shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-100 group-hover:bg-red-200 text-red-800 flex items-center justify-center transition-colors">
              <Camera className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-charcoal-900">
                Snap or upload a photo of your bookshelf
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Direct camera capture on phone or upload JPG, PNG, WEBP from your gallery
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo (Camera)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 bg-charcoal-100 hover:bg-charcoal-200 active:bg-charcoal-300 text-charcoal-800 font-bold text-xs rounded-xl border border-charcoal-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-charcoal-600" />
                <span>Photo Library</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Review & Confirmation */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-serif font-bold text-charcoal-900 flex items-center gap-2">
                Confirm Detected Cookbooks
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                We matched your photo against your current library. Books you already own are marked and deselected automatically.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectOnlyNew}
                className="text-xs px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-semibold transition-colors"
              >
                Select Only New ({newBooksCount})
              </button>
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1.5 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-800 rounded-lg font-medium transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => setStep('upload')}
                className="text-xs text-charcoal-600 hover:text-charcoal-900 p-2 flex items-center gap-1"
                title="Re-scan bookshelf"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-red-50/60 border border-red-200/70 px-4 py-2.5 rounded-xl text-xs">
            <span className="font-semibold text-emerald-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> {newBooksCount} New Book(s) Ready to Import
            </span>
            {existingBooksCount > 0 && (
              <>
                <span className="text-red-300">•</span>
                <span className="text-charcoal-600 flex items-center gap-1">
                  <BookmarkCheck className="w-3.5 h-3.5 text-red-700" /> {existingBooksCount} Already in Library
                </span>
              </>
            )}
          </div>

          {/* Books List with Checkboxes */}
          <div className="bg-white rounded-2xl border border-red-900/10 divide-y divide-red-900/10 overflow-hidden shadow-sm">
            {detectedBooks.map((book, idx) => (
              <div
                key={idx}
                className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                  book.selected
                    ? 'bg-red-50/20'
                    : book.alreadyInLibrary
                    ? 'bg-charcoal-50/40 opacity-75'
                    : 'bg-charcoal-50/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={book.selected}
                    onChange={() => toggleBookSelection(idx)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif font-bold text-sm sm:text-base text-charcoal-900 truncate">
                        {book.title}
                      </h4>
                      {book.alreadyInLibrary ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                          <BookmarkCheck className="w-3 h-3 text-amber-700" /> Already in Library
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-2.5 h-2.5" /> New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      {book.author ? `By ${book.author}` : 'Author not detected'}
                      {book.edition && ` · ${book.edition}`}
                    </p>
                    {book.spineSnippet && (
                      <span className="text-[10px] text-red-800 bg-red-100/60 px-1.5 py-0.5 rounded mt-1 inline-block">
                        Spine: &ldquo;{book.spineSnippet}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveBook(idx)}
                  className="p-1.5 text-charcoal-400 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Manual Book Add Form */}
          <form
            onSubmit={handleAddManualBook}
            className="bg-red-50/50 border border-red-200/70 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <span className="text-xs font-semibold text-red-950 whitespace-nowrap">
              Missed a book?
            </span>
            <input
              type="text"
              placeholder="Cookbook Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
            <input
              type="text"
              placeholder="Author (Optional)"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              className="sm:w-48 px-3 py-2 text-xs bg-white rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </form>

          {/* Bottom Action Bar */}
          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs text-charcoal-600 font-medium">
              {detectedBooks.filter((b) => b.selected).length} of {detectedBooks.length} book(s) selected for indexing
            </span>

            <button
              onClick={handleStartIndexing}
              className="px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:scale-105 flex items-center gap-2"
            >
              Extract & Index Selected Recipes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Indexing in progress */}
      {step === 'indexing' && (
        <div className="text-center py-20 bg-white rounded-3xl border border-red-900/10 shadow-md space-y-4 px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto animate-spin shadow-inner">
            <ChefHat className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900">
            Indexing Recipes with Gemini AI...
          </h2>
          <p className="text-sm font-medium text-red-900 max-w-lg mx-auto">
            This is going to take a while because you have a lot of fucking books.
          </p>
          <p className="text-xs text-charcoal-500 max-w-md mx-auto">
            Extracting recipe titles, verified print page numbers, ingredient lists, and categorizing pantry requirements.
          </p>
        </div>
      )}

      {/* STEP 4: Success & Summary */}
      {step === 'success' && importSummary && (
        <div className="space-y-6 text-center">
          <div className="bg-gradient-to-br from-emerald-800 via-rose-900 to-crimson-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-full bg-white/20 text-white flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-300" />
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold">
                Cookbook Collection Digitized!
              </h2>
              <p className="text-red-100 text-sm mt-1">
                Your new recipes and ingredients have been indexed and saved to your private library.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <div>
                <div className="text-2xl sm:text-3xl font-serif font-bold">{importSummary.totalBooks}</div>
                <div className="text-[11px] text-red-200 uppercase font-semibold">New Books Added</div>
              </div>
              <div className="border-x border-white/20">
                <div className="text-2xl sm:text-3xl font-serif font-bold">{importSummary.totalRecipes}</div>
                <div className="text-[11px] text-red-200 uppercase font-semibold">Recipes Indexed</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-serif font-bold">{importSummary.totalUniqueIngredients}</div>
                <div className="text-[11px] text-red-200 uppercase font-semibold">Unique Ingredients</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/library"
                className="px-6 py-3 bg-white text-red-950 font-bold text-sm rounded-xl hover:bg-red-50 shadow-md transition-all"
              >
                Browse Digital Bookshelf
              </Link>
              <Link
                href="/match"
                className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm rounded-xl shadow-md transition-all"
              >
                Ready to Cook
              </Link>
            </div>
          </div>
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
