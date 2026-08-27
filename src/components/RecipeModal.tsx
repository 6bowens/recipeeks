'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Users,
  ExternalLink,
  Search,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Camera,
  RotateCw,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { BudgetLimitModal } from '@/components/BudgetLimitModal';

interface Ingredient {
  id: string;
  name: string;
  amount?: string | null;
  unit?: string | null;
  optional?: boolean;
}

interface Recipe {
  id: string;
  title: string;
  pageNumber?: number | null;
  isFact: boolean;
  category?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: string | null;
  sourceUrl?: string | null;
  ingredients: Ingredient[];
}

interface CookbookDetail {
  id: string;
  title: string;
  author?: string | null;
  edition?: string | null;
  coverColor?: string | null;
  coverImageUrl?: string | null;
  spineSnippet?: string | null;
  totalRecipes?: number;
  recipes: Recipe[];
}

interface RecipeModalProps {
  cookbook: CookbookDetail | null;
  onClose: () => void;
  onCookbookDeleted?: () => void;
  onCookbookUpdated?: (cookbook: CookbookDetail) => void;
}

export function RecipeModal({
  cookbook: initialCookbook,
  onClose,
  onCookbookDeleted,
  onCookbookUpdated,
}: RecipeModalProps) {
  const [cookbook, setCookbook] = useState<CookbookDetail | null>(initialCookbook);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [budgetModal, setBudgetModal] = useState<{ isOpen: boolean; message?: string; currentSpend?: number; spendLimit?: number }>({
    isOpen: false,
  });

  // In-line page number editing state
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [tempPageNumber, setTempPageNumber] = useState<string>('');
  const [isSavingPage, setIsSavingPage] = useState(false);

  // Index scan state
  const [isScanningIndex, setIsScanningIndex] = useState(false);
  const indexFileInputRef = useRef<HTMLInputElement>(null);

  // Cover Image Picker State
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverSearchQuery, setCoverSearchQuery] = useState('');
  const [candidateCovers, setCandidateCovers] = useState<{ url: string; title: string; source: string; publisher?: string }[]>([]);
  const [loadingCovers, setLoadingCovers] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [isGeneratingAiCover, setIsGeneratingAiCover] = useState(false);
  const coverUploadInputRef = useRef<HTMLInputElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setCookbook(initialCookbook);
  }, [initialCookbook]);

  if (!cookbook) return null;

  const categories = ['all', ...Array.from(new Set(cookbook.recipes.map((r) => r.category || 'Main')))];

  const filteredRecipes = cookbook.recipes.filter((recipe) => {
    const matchesSearch =
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients?.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (recipe.category && recipe.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || (recipe.category || 'Main') === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const toggleIngredientCheck = (ingId: string) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [ingId]: !prev[ingId],
    }));
  };

  const handleStartEditPage = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRecipeId(recipe.id);
    setTempPageNumber(recipe.pageNumber ? String(recipe.pageNumber) : '');
  };

  const handleSavePageNumber = async (recipeId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSavingPage) return;

    const parsedPage = tempPageNumber.trim() ? parseInt(tempPageNumber.trim(), 10) : null;

    try {
      setIsSavingPage(true);
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: parsedPage,
          isFact: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to update page number');
      const data = await res.json();

      if (data?.recipe && cookbook) {
        const updated = {
          ...cookbook,
          recipes: cookbook.recipes.map((r) =>
            r.id === recipeId ? { ...r, pageNumber: data.recipe.pageNumber, isFact: true } : r
          ),
        };
        setCookbook(updated);
        if (onCookbookUpdated) onCookbookUpdated(updated);
      }
      setEditingRecipeId(null);
    } catch (err) {
      alert('Error updating page number: ' + (err as Error).message);
    } finally {
      setIsSavingPage(false);
    }
  };

  // OCR Index / Table of Contents Photo Upload
  const handleIndexPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cookbook) return;

    try {
      setIsScanningIndex(true);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const res = await fetch('/api/ai/scan-index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cookbookId: cookbook.id,
            imageBase64: base64,
            mimeType: file.type || 'image/jpeg',
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
            setIsScanningIndex(false);
            return;
          }
          throw new Error(data.error || 'Failed to scan index page');
        }

        alert(`📖 Index scanned! ${data.message || 'Page numbers updated successfully.'}`);

        // Refetch updated cookbook
        const refreshRes = await fetch(`/api/cookbooks/${cookbook.id}`);
        const refreshData = await refreshRes.json();
        if (refreshData?.cookbook) {
          setCookbook(refreshData.cookbook);
          if (onCookbookUpdated) onCookbookUpdated(refreshData.cookbook);
        }
        setIsScanningIndex(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('Error scanning index page: ' + (err as Error).message);
      setIsScanningIndex(false);
    }
  };

  // Open Cover Picker and search for covers
  const handleOpenCoverPicker = () => {
    setShowCoverPicker(true);
    setCoverSearchQuery(cookbook.title);
    fetchCoverCandidates(cookbook.title, cookbook.author || undefined);
  };

  const fetchCoverCandidates = async (title: string, author?: string, customQuery?: string) => {
    try {
      setLoadingCovers(true);
      const params = new URLSearchParams();
      if (customQuery) {
        params.set('q', customQuery);
      } else {
        params.set('title', title);
        if (author) params.set('author', author);
      }

      const res = await fetch(`/api/cookbooks/search-covers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCandidateCovers(data.covers || []);
      }
    } catch (e) {
      console.error('Error searching covers:', e);
    } finally {
      setLoadingCovers(false);
    }
  };

  // Generate Bespoke AI Illustrated Cover
  const handleGenerateAiCover = async () => {
    if (!cookbook) return;
    try {
      setIsGeneratingAiCover(true);
      const res = await fetch('/api/cookbooks/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cookbook.title,
          author: cookbook.author,
          color: cookbook.coverColor || '#991b1b',
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
        throw new Error(data.error || 'Failed to generate AI cover');
      }

      if (data?.coverUrl) {
        await handleApplyCover(data.coverUrl);
      }
    } catch (err) {
      alert('Error generating cover with AI: ' + (err as Error).message);
    } finally {
      setIsGeneratingAiCover(false);
    }
  };

  // Apply a chosen cover URL
  const handleApplyCover = async (imageUrl: string | null) => {
    if (!cookbook) return;
    try {
      setIsSavingCover(true);
      const res = await fetch(`/api/cookbooks/${cookbook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: imageUrl }),
      });

      if (!res.ok) throw new Error('Failed to update cover');
      const data = await res.json();

      if (data?.cookbook) {
        const updated = { ...cookbook, coverImageUrl: imageUrl };
        setCookbook(updated);
        if (onCookbookUpdated) onCookbookUpdated(updated);
      }
      setShowCoverPicker(false);
    } catch (e) {
      alert('Error saving cover image: ' + (e as Error).message);
    } finally {
      setIsSavingCover(false);
    }
  };

  // Upload Custom Cover File
  const handleUploadCustomCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await handleApplyCover(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteCookbook = async () => {
    if (
      !confirm(
        `Are you sure you want to remove "${cookbook.title}" and all its ${cookbook.recipes.length} indexed recipes from your collection?`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/cookbooks/${cookbook.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onClose();
      if (onCookbookDeleted) onCookbookDeleted();
    } catch (e) {
      alert('Error deleting cookbook: ' + (e as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-charcoal-950/75 backdrop-blur-sm flex justify-center items-end sm:items-center sm:p-4">
      <div className="bg-white w-full max-w-4xl h-[94dvh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-red-900/10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Book Cover Styling */}
        <div
          className="p-4 sm:p-6 text-white relative flex flex-col justify-end min-h-[130px] sm:min-h-[160px] shrink-0"
          style={{
            backgroundColor: cookbook.coverColor || '#991b1b',
            backgroundImage: `linear-gradient(135deg, ${cookbook.coverColor || '#991b1b'} 0%, #170707 100%)`,
          }}
        >
          {cookbook.coverImageUrl && (
            <img
              src={cookbook.coverImageUrl}
              alt={cookbook.title}
              className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-overlay pointer-events-none"
            />
          )}

          {/* Close & Header Action Buttons (Enlarged 44px touch targets for mobile) */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-30 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCoverPicker();
              }}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 active:bg-black text-white text-xs font-semibold backdrop-blur-md transition-all shadow-md border border-white/20 cursor-pointer touch-manipulation active:scale-95"
              title="Find or upload a different cover image for this book"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Change Cover</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 active:bg-black text-white flex items-center justify-center transition-all shadow-md border border-white/20 cursor-pointer touch-manipulation active:scale-95 shrink-0"
              aria-label="Close modal"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative z-10 pr-32 sm:pr-40">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif leading-tight drop-shadow-md">
              {cookbook.title}
            </h2>
            {cookbook.author && (
              <p className="text-rose-100 text-xs sm:text-sm font-serif italic mt-0.5">
                By {cookbook.author}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-[11px] text-white/90">
              <span>📖 {cookbook.recipes.length} Recipes</span>
              <span>🌿 {cookbook.recipes.reduce((acc, r) => acc + (r.ingredients?.length || 0), 0)} Ingredients</span>
            </div>
          </div>
        </div>

        {/* Compact Toolbar: Search & Actions on 1 row */}
        <div className="p-2.5 sm:p-3 bg-red-50/50 border-b border-red-200/60 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
            <input
              type="text"
              placeholder="Search recipes or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/40 text-charcoal-800 placeholder-charcoal-400"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Scan Printed Index Page Button */}
            <input
              type="file"
              ref={indexFileInputRef}
              onChange={handleIndexPhotoUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => indexFileInputRef.current?.click()}
              disabled={isScanningIndex}
              title="Snap a photo of the printed Index or Table of Contents"
              className="text-xs text-charcoal-800 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer touch-manipulation"
            >
              <Camera className="w-3.5 h-3.5 text-red-700" />
              <span className="hidden sm:inline">{isScanningIndex ? 'Reading...' : 'Scan Index'}</span>
            </button>

            {/* Change Cover Toolbar Button (Extra accessible) */}
            <button
              onClick={handleOpenCoverPicker}
              title="Find or generate alternate cover artwork"
              className="text-xs text-charcoal-800 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer touch-manipulation"
            >
              <ImageIcon className="w-3.5 h-3.5 text-red-700" />
              <span className="hidden sm:inline">Cover</span>
            </button>

            {/* Delete Book Button */}
            <button
              onClick={handleDeleteCookbook}
              disabled={isDeleting}
              className="text-xs text-red-700 bg-white hover:bg-red-50 border border-red-200 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer touch-manipulation"
              title="Delete this cookbook"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 2 && (
          <div className="px-3 py-1.5 border-b border-red-900/5 bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs shrink-0">
            <span className="text-charcoal-400 font-medium text-[11px] shrink-0">Filter:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full capitalize font-medium text-[11px] whitespace-nowrap transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-red-700 text-white'
                    : 'bg-charcoal-100 text-charcoal-700 hover:bg-charcoal-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Recipe List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-10 text-charcoal-400">
              <BookOpen className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-red-600" />
              <p className="text-xs font-medium">No recipes found matching your query.</p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => {
              const isExpanded = expandedRecipeId === recipe.id;
              const completedCount = (recipe.ingredients || []).filter((i) => checkedIngredients[i.id]).length;
              const totalCount = (recipe.ingredients || []).length;
              const isEditingThisPage = editingRecipeId === recipe.id;
              const webSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${cookbook.title} ${recipe.title} recipe`)}`;

              return (
                <div
                  key={recipe.id}
                  className={`border rounded-xl transition-all ${
                    isExpanded
                      ? 'border-red-300 bg-red-50/20 shadow-xs'
                      : 'border-charcoal-200/80 hover:border-red-200 bg-white'
                  }`}
                >
                  {/* Recipe Header Row - Compact, clean & aligned */}
                  <div
                    onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                    className="p-3 cursor-pointer flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Compact Page Number Pill */}
                      {isEditingThisPage ? (
                        <form
                          onSubmit={(e) => handleSavePageNumber(recipe.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 bg-white border border-red-600 rounded-lg p-0.5 shadow-md shrink-0"
                        >
                          <span className="text-[9px] font-bold text-charcoal-400 pl-0.5">P.</span>
                          <input
                            type="number"
                            autoFocus
                            value={tempPageNumber}
                            onChange={(e) => setTempPageNumber(e.target.value)}
                            className="w-10 text-[11px] font-bold text-charcoal-900 focus:outline-none"
                            placeholder="67"
                          />
                          <button
                            type="submit"
                            disabled={isSavingPage}
                            className="p-0.5 bg-red-700 hover:bg-red-800 text-white rounded font-bold"
                          >
                            <Check className="w-2.5 h-2.5" />
                          </button>
                        </form>
                      ) : (
                        <div
                          onClick={(e) => handleStartEditPage(recipe, e)}
                          title="Click to correct page number"
                          className="group/page relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 hover:bg-red-100 text-red-950 flex flex-col items-center justify-center text-[8px] sm:text-[9px] font-bold border border-red-200/70 shrink-0 cursor-pointer transition-colors"
                        >
                          <span className="leading-none opacity-70">P.</span>
                          <span className="text-[11px] sm:text-xs leading-none font-bold mt-0.5">{recipe.pageNumber || '—'}</span>
                          <span className="opacity-0 group-hover/page:opacity-100 absolute -top-1 -right-1 p-0.5 bg-red-700 text-white rounded-full transition-opacity shadow-xs">
                            <Edit2 className="w-2 h-2" />
                          </span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-serif font-bold text-sm sm:text-base text-charcoal-900 truncate">
                            {recipe.title}
                          </h4>
                          {recipe.isFact ? (
                            <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100/70 px-1 py-0.2 rounded flex items-center gap-0.5">
                              <Check className="w-2 h-2" /> Verified
                            </span>
                          ) : null}
                          {recipe.category && (
                            <span className="text-[9px] text-charcoal-500 bg-charcoal-100 px-1.5 py-0.2 rounded-full capitalize">
                              {recipe.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-charcoal-500 mt-0.5 truncate">
                          {recipe.prepTime && <span>Prep: {recipe.prepTime}</span>}
                          {recipe.cookTime && <span>· Cook: {recipe.cookTime}</span>}
                          {recipe.servings && <span>· {recipe.servings}</span>}
                          <span>· {(recipe.ingredients || []).length} ingr.</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-charcoal-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Recipe Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-red-200/50 bg-white/80 rounded-b-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600">
                          Ingredients ({completedCount}/{totalCount} checked)
                        </span>
                        <a
                          href={webSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-900 hover:underline"
                        >
                          Search Online <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Ingredient checklist grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                        {(recipe.ingredients || []).map((ing) => {
                          const isChecked = !!checkedIngredients[ing.id];
                          return (
                            <div
                              key={ing.id}
                              onClick={() => toggleIngredientCheck(ing.id)}
                              className={`p-2 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-50/80 border-emerald-200 text-charcoal-500 line-through'
                                  : 'bg-white border-charcoal-200 hover:border-red-300 text-charcoal-800'
                              }`}
                            >
                              {isChecked ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-charcoal-300 shrink-0" />
                              )}
                              <div className="min-w-0 flex-1 truncate">
                                <span className="font-semibold text-red-950">
                                  {ing.amount} {ing.unit}{' '}
                                </span>
                                <span>{ing.name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Page instruction reminder */}
                      <div className="p-2.5 bg-red-50 rounded-lg border border-red-200/70 text-[11px] text-red-950 flex items-center justify-between gap-2">
                        <span>
                          📖 Open <strong>{cookbook.title}</strong> to <strong>Page {recipe.pageNumber || '—'}</strong> for full chef instructions.
                        </span>
                        <button
                          onClick={(e) => handleStartEditPage(recipe, e)}
                          className="text-[10px] text-red-800 font-bold underline shrink-0"
                        >
                          Edit page #
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2.5 sm:p-3 bg-charcoal-50 border-t border-charcoal-200 flex items-center justify-between text-xs text-charcoal-500 shrink-0">
          <span>{cookbook.recipes.length} recipes in index</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-charcoal-800 hover:bg-charcoal-900 text-white rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Cover Image Picker Dialog (High Z-Index full screen overlay) */}
      {showCoverPicker && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-charcoal-200 overflow-hidden flex flex-col max-h-[85vh] relative z-10">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-crimson-950 via-crimson-900 to-rose-900 text-white flex items-center justify-between">
              <div className="pr-4 min-w-0">
                <h3 className="text-base sm:text-lg font-serif font-bold truncate">
                  Choose Cover for &ldquo;{cookbook.title}&rdquo;
                </h3>
                <p className="text-[11px] text-rose-100/90 mt-0.5">
                  Select alternate web artwork, upload a photo, or generate with AI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCoverPicker(false)}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search, AI Generator & Custom Inputs Bar */}
            <div className="p-3 bg-red-50/50 border-b border-red-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchCoverCandidates(cookbook.title, cookbook.author || undefined, coverSearchQuery);
                  }}
                  className="flex items-center gap-2 flex-1"
                >
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
                    <input
                      type="text"
                      value={coverSearchQuery}
                      onChange={(e) => setCoverSearchQuery(e.target.value)}
                      placeholder="Search web images, Amazon, Google Books..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-red-200 text-charcoal-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingCovers}
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer"
                  >
                    {loadingCovers ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {/* Generate AI Cover Button */}
                <button
                  onClick={handleGenerateAiCover}
                  disabled={isGeneratingAiCover}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-crimson-900 to-rose-800 hover:from-crimson-950 hover:to-rose-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
                  title="Generate a custom illustrated cookbook cover with Gemini AI"
                >
                  {isGeneratingAiCover ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" />
                      <span>Designing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                      <span>Generate AI Cover</span>
                    </>
                  )}
                </button>
              </div>

              {/* URL input or Upload file row */}
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Or paste image URL (https://...)"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white rounded-lg border border-red-200 text-charcoal-900 text-xs focus:outline-none"
                />
                {customImageUrl && (
                  <button
                    onClick={() => handleApplyCover(customImageUrl.trim())}
                    disabled={isSavingCover}
                    className="px-2.5 py-1.5 bg-red-700 text-white font-semibold rounded-lg hover:bg-red-800 shrink-0 text-xs"
                  >
                    Apply
                  </button>
                )}

                <input
                  type="file"
                  ref={coverUploadInputRef}
                  onChange={handleUploadCustomCover}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => coverUploadInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white border border-red-200 text-charcoal-800 hover:bg-red-50 rounded-lg font-medium flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap text-xs shrink-0"
                >
                  <Upload className="w-3 h-3 text-red-700" />
                  Upload
                </button>
              </div>
            </div>

            {/* Candidate Covers Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {loadingCovers ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-charcoal-400">
                  <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
                  <p className="text-xs">Searching Google Books & Open Library...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {/* Original Shelf Spine Card (if available from bookshelf scan) */}
                  {cookbook.spineSnippet && (
                    <div
                      onClick={() => handleApplyCover(cookbook.spineSnippet!)}
                      className={`group relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all p-1 flex flex-col justify-between ${
                        cookbook.coverImageUrl === cookbook.spineSnippet
                          ? 'border-emerald-600 ring-2 ring-emerald-600/30 shadow-md bg-emerald-50'
                          : 'border-charcoal-200 hover:border-emerald-400 bg-charcoal-50'
                      }`}
                    >
                      <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-charcoal-900 flex items-center justify-center">
                        <img
                          src={cookbook.spineSnippet}
                          alt="Original Bookshelf Spine"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {cookbook.coverImageUrl === cookbook.spineSnippet && (
                          <div className="absolute top-1 right-1 bg-emerald-700 text-white p-0.5 rounded-full shadow-md">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <div className="p-1 text-center">
                        <p className="text-[10px] text-emerald-800 font-bold truncate">
                          🪵 Original Shelf Spine
                        </p>
                      </div>
                    </div>
                  )}

                  {candidateCovers.map((cover, idx) => {
                    const isSelected = cookbook.coverImageUrl === cover.url;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleApplyCover(cover.url)}
                        className={`group relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all p-1 flex flex-col justify-between ${
                          isSelected
                            ? 'border-red-600 ring-2 ring-red-600/30 shadow-md bg-red-50'
                            : 'border-charcoal-200 hover:border-red-400 bg-charcoal-50'
                        }`}
                      >
                        <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-charcoal-100 flex items-center justify-center">
                          <img
                            src={cover.url}
                            alt={cover.title}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-red-700 text-white p-0.5 rounded-full shadow-md z-10">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div className="p-1 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            cover.source === 'Web Images'
                              ? 'bg-rose-100 text-rose-800'
                              : cover.source === 'Google Books'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-charcoal-100 text-charcoal-700'
                          }`}>
                            {cover.source}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-charcoal-50 border-t border-charcoal-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {cookbook.spineSnippet && (
                  <button
                    onClick={() => handleApplyCover(cookbook.spineSnippet!)}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold text-[11px]"
                  >
                    🪵 Revert to Spine
                  </button>
                )}
                <button
                  onClick={() => handleApplyCover(null)}
                  className="text-red-700 hover:text-red-900 font-semibold text-[11px]"
                >
                  Reset to Plain Color
                </button>
              </div>

              <button
                onClick={() => setShowCoverPicker(false)}
                className="px-3 py-1.5 bg-charcoal-800 hover:bg-charcoal-900 text-white rounded-lg font-semibold text-xs"
              >
                Done
              </button>
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
