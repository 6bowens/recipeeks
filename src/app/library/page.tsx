'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Camera,
  Search,
  Plus,
  ChefHat,
  Filter,
  Sparkles,
  Trash2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { BookCard } from '@/components/BookCard';
import { RecipeModal } from '@/components/RecipeModal';

export default function LibraryPage() {
  const [cookbooks, setCookbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCookbook, setSelectedCookbook] = useState<any | null>(null);

  const fetchCookbooks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cookbooks');
      if (res.ok) {
        const data = await res.json();
        setCookbooks(data.cookbooks || []);

        if (data.hasMissingCovers) {
          // Trigger background backfill and silently update
          fetch('/api/cookbooks/backfill-covers', { method: 'POST' })
            .then((r) => r.json())
            .then((bf) => {
              if (bf?.updated > 0) {
                fetch('/api/cookbooks')
                  .then((r) => r.json())
                  .then((fresh) => setCookbooks(fresh.cookbooks || []));
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {
      console.error('Error fetching cookbooks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCookbooks();
  }, []);

  const handleOpenCookbook = async (id: string) => {
    try {
      const res = await fetch(`/api/cookbooks/${id}`);
      const data = await res.json();
      if (data?.cookbook) {
        setSelectedCookbook(data.cookbook);
      }
    } catch (e) {
      console.error('Error opening cookbook:', e);
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}" and all its indexed recipes from your library?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/cookbooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setCookbooks((prev) => prev.filter((b) => b.id !== id));
      if (selectedCookbook?.id === id) {
        setSelectedCookbook(null);
      }
    } catch (e) {
      alert('Error deleting cookbook: ' + (e as Error).message);
    }
  };

  const filtered = cookbooks.filter((book) => {
    const q = searchQuery.toLowerCase();
    return (
      book.title.toLowerCase().includes(q) ||
      (book.author && book.author.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-20 sm:pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-100 text-red-900 border border-red-200/80 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono">
              Step 1 of 3: Cookbooks
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-red-700" /> Digital Library
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
            Browse and manage physical cookbooks indexed in your personal culinary collection.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href="/scan"
            className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Camera className="w-4 h-4" /> Scan Bookshelf
          </Link>
          <Link
            href="/pantry"
            className="flex items-center gap-2 px-4 py-2.5 bg-charcoal-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-105"
          >
            <span>Next: Update Fridge</span>
            <ArrowRight className="w-4 h-4 text-red-400" />
          </Link>
        </div>
      </div>

      {/* Guided Next-Step Banner */}
      {cookbooks.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50/50 border border-red-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              2
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-charcoal-900 leading-tight">
                Step 2: Update Your Pantry & Fridge
              </h3>
              <p className="text-xs text-charcoal-600 mt-0.5">
                Scan your fridge/pantry or snap ingredient photos so Recipeeks can cross-reference your collection.
              </p>
            </div>
          </div>

          <Link
            href="/pantry"
            className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all hover:scale-105 shrink-0"
          >
            <span>Go to Step 2: Pantry & Fridge</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
        <input
          type="text"
          placeholder="Search cookbooks by title, author, or publisher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 text-sm bg-white rounded-2xl border border-red-900/10 shadow-xs focus:outline-none focus:ring-2 focus:ring-red-500/40 text-charcoal-800 placeholder-charcoal-400"
        />
      </div>

      {/* Shelf Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="aspect-[3/4] bg-charcoal-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-red-900/10 p-8 space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-red-600/30" />
          <h3 className="text-lg font-serif font-bold text-charcoal-800">
            {searchQuery ? 'No cookbooks match your search' : 'No cookbooks added yet'}
          </h3>
          <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with a different keyword or author name.'
              : 'Scan your bookshelf to start indexing your cookbooks and recipes.'}
          </p>
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-700 text-white rounded-xl text-xs font-semibold hover:bg-red-800 shadow-sm transition-colors"
          >
            <Camera className="w-4 h-4" /> Scan Bookshelf Photo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              id={book.id}
              title={book.title}
              author={book.author}
              edition={book.edition}
              coverColor={book.coverColor}
              coverImageUrl={book.coverImageUrl}
              totalRecipes={book._count?.recipes || 0}
              spineSnippet={book.spineSnippet}
              onClick={() => handleOpenCookbook(book.id)}
              onDelete={() => handleDeleteBook(book.id, book.title)}
              onIndexUpdated={fetchCookbooks}
            />
          ))}
        </div>
      )}

      {/* Floating Bottom Step Bar (Prominent on Mobile) */}
      {cookbooks.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-md bg-charcoal-950/95 border border-charcoal-700/70 backdrop-blur-xl text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-full bg-red-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
              1
            </span>
            <div className="leading-tight truncate">
              <div className="text-[10px] text-charcoal-400 font-semibold uppercase tracking-wider">Step 1 Complete</div>
              <div className="text-xs font-bold text-white truncate">{cookbooks.length} Books Indexed</div>
            </div>
          </div>

          <Link
            href="/pantry"
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105 shrink-0"
          >
            <span>Update Fridge</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
          </Link>
        </div>
      )}

      {/* Recipe Modal */}
      <RecipeModal
        cookbook={selectedCookbook}
        onClose={() => setSelectedCookbook(null)}
        onCookbookDeleted={() => {
          setSelectedCookbook(null);
          fetchCookbooks();
        }}
        onCookbookUpdated={() => {
          fetchCookbooks();
        }}
      />
    </div>
  );
}
