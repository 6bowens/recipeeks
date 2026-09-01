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
  Building2,
  Star,
} from 'lucide-react';
import { BookCard } from '@/components/BookCard';
import { RecipeModal } from '@/components/RecipeModal';
import { FavoritesModal } from '@/components/FavoritesModal';

export default function LibraryPage() {
  const [cookbooks, setCookbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCookbook, setSelectedCookbook] = useState<any | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  const fetchFavoritesCount = async () => {
    try {
      const res = await fetch('/api/favorites?type=recipe');
      if (res.ok) {
        const data = await res.json();
        setFavoritesCount(data.count || 0);
      }
    } catch {}
  };

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
    fetchFavoritesCount();
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
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-red-700" /> Digital Library
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
            Browse and manage physical cookbooks indexed in your personal culinary collection.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setShowFavorites(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            title="View all starred favourite recipes"
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>Favourites {favoritesCount > 0 ? `(${favoritesCount})` : ''}</span>
          </button>
          <Link
            href="/scan"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Bookshelf</span>
          </Link>
          <Link
            href="/pantry"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-charcoal-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-105 whitespace-nowrap"
          >
            <span>Update Fridge</span>
            <ArrowRight className="w-4 h-4 text-red-400" />
          </Link>
        </div>
      </div>

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

      {/* Favorites Modal */}
      <FavoritesModal
        isOpen={showFavorites}
        onClose={() => {
          setShowFavorites(false);
          fetchFavoritesCount();
        }}
        initialType="recipe"
        onFavoritesChange={fetchFavoritesCount}
      />
    </div>
  );
}
