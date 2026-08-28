'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Camera,
  BookOpen,
  UtensilsCrossed,
  Sparkles,
  Layers,
  ArrowRight,
  Plus,
  CheckCircle2,
  ChefHat,
  Heart,
  Zap,
} from 'lucide-react';
import { BookCard } from '@/components/BookCard';
import { RecipeModal } from '@/components/RecipeModal';

export default function HomePage() {
  const { data: session } = useSession();
  const [cookbooks, setCookbooks] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    totalCookbooks: number;
    totalRecipes: number;
    totalUniqueIngredients: number;
    estimatedAiSpend?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCookbook, setSelectedCookbook] = useState<any | null>(null);

  const fetchCollection = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cookbooks');
      if (res.ok) {
        const data = await res.json();
        setCookbooks(data.cookbooks || []);
        setStats(data.stats || null);

        if (data.hasMissingCovers) {
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
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchCollection();
    } else {
      setLoading(false);
    }
  }, [session]);

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
      fetchCollection();
      if (selectedCookbook?.id === id) {
        setSelectedCookbook(null);
      }
    } catch (e) {
      alert('Error deleting cookbook: ' + (e as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner (Shown only for guests or before books are indexed) */}
      {(!session?.user || cookbooks.length === 0) && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-crimson-950 via-crimson-900 to-charcoal-950 text-white p-8 sm:p-12 shadow-xl animate-in fade-in">
          <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 bg-rose-500/20 border border-rose-400/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-rose-200">
              <ChefHat className="w-3.5 h-3.5" /> Interactive Cookbook Engine
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold font-serif leading-tight">
              Turn your physical bookshelf into an interactive cookbook engine.
            </h1>

            <p className="text-rose-100/90 text-sm sm:text-base leading-relaxed">
              Take a photo of your cookbooks and fridge. Recipeeks indexes every recipe with exact book and page numbers, matching what you have on hand to tell you what to make tonight.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              {session?.user ? (
                <>
                  <Link
                    href="/scan"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm shadow-md transition-all hover:scale-105"
                  >
                    <Camera className="w-4 h-4" /> Scan Physical Bookshelf
                  </Link>
                  <Link
                    href="/match"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all border border-white/20"
                  >
                    <Sparkles className="w-4 h-4 text-rose-300" /> Ready to Cook
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm shadow-md transition-all hover:scale-105"
                  >
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all border border-white/20"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      {session?.user && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-red-900/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold font-serif text-charcoal-900">
                {stats.totalCookbooks}
              </div>
              <div className="text-xs text-charcoal-500 font-medium">Indexed Cookbooks</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-red-900/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold font-serif text-charcoal-900">
                {stats.totalRecipes}
              </div>
              <div className="text-xs text-charcoal-500 font-medium">Searchable Recipes</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-red-900/10 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold font-serif text-charcoal-900">
                {stats.totalUniqueIngredients}
              </div>
              <div className="text-xs text-charcoal-500 font-medium">Tracked Ingredients</div>
            </div>
          </div>
        </div>
      )}

      {/* Bookshelf Section */}
      {session?.user ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-serif font-bold text-charcoal-900">
                Your Digital Bookshelf
              </h2>
              <p className="text-xs text-charcoal-500">
                Click any book to browse indexed recipes, print page numbers, and ingredient checklists.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/scan"
                className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>+ Scan Books</span>
              </Link>
              <Link
                href="/library"
                className="text-xs font-semibold text-charcoal-700 hover:text-red-900 flex items-center gap-1"
              >
                View Full Shelf <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="aspect-[3/4] bg-charcoal-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : cookbooks.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-red-300 p-8">
              <BookOpen className="w-12 h-12 mx-auto text-red-600/40 mb-3" />
              <h3 className="text-lg font-serif font-bold text-charcoal-900">
                Your bookshelf is empty
              </h3>
              <p className="text-xs text-charcoal-500 max-w-md mx-auto mt-1 mb-5">
                Take a quick photo of your physical cookbook spines or load a sample collection to get started.
              </p>
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-700 text-white font-semibold text-xs shadow-md hover:bg-red-800 transition-colors"
              >
                <Camera className="w-4 h-4" /> Scan Bookshelf Now
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {cookbooks.slice(0, 5).map((book) => (
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
                  onIndexUpdated={fetchCollection}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Logged-out Feature Showcase */
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-white p-6 rounded-3xl border border-red-900/10 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-charcoal-900">
              1. Photo Bookshelf OCR
            </h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Snap a picture of your physical bookshelf. Gemini multimodal AI identifies every book title, volume, and author simultaneously.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-red-900/10 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-charcoal-900">
              2. Recipe & Page Indexing
            </h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              The AI parses the canonical index and table of contents, mapping out recipes with exact print page numbers and ingredients.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-red-900/10 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-charcoal-900">
              3. Smart Pantry Matchmaker
            </h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Take a snapshot of your fridge or pantry. The matching engine finds which physical recipes you can cook right now.
            </p>
          </div>
        </section>
      )}

      {/* Selected Cookbook Modal */}
      <RecipeModal
        cookbook={selectedCookbook}
        onClose={() => setSelectedCookbook(null)}
        onCookbookDeleted={() => {
          setSelectedCookbook(null);
          fetchCollection();
        }}
        onCookbookUpdated={() => {
          fetchCollection();
        }}
      />
    </div>
  );
}
