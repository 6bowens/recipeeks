'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ShoppingCart,
  BookMarked,
  Sparkles,
  RefreshCw,
  ChefHat,
  History,
  BookOpen,
  Refrigerator,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { MiseDinnerPlaylist } from '@/components/MiseDinnerPlaylist';
import { MiseGroceryDelta } from '@/components/MiseGroceryDelta';
import { MiseRecipeVault } from '@/components/MiseRecipeVault';
import { MiseMealHistory } from '@/components/MiseMealHistory';

function MiseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'recipes';

  const [loading, setLoading] = useState(true);
  const [playlistData, setPlaylistData] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [playlistRes, recipesRes] = await Promise.all([
        fetch('/api/mise/playlist'),
        fetch('/api/mise/recipes'),
      ]);

      if (playlistRes.ok) {
        const pData = await playlistRes.json();
        setPlaylistData(pData);
      }

      if (recipesRes.ok) {
        const rData = await recipesRes.json();
        setRecipes(rData.recipes || []);
      }
    } catch (err) {
      console.error('Error loading Mise data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleTabChange = (tab: string) => {
    router.push(`/mise?tab=${tab}`);
  };

  const handleAddToPlatelist = async (recipeId: string) => {
    try {
      const res = await fetch('/api/mise/playlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_recipe', recipeId }),
      });
      if (res.ok) {
        await fetchAllData();
        router.push('/mise?tab=platelist');
      }
    } catch (e) {
      console.error('Add to platelist error:', e);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 text-white selection:bg-purple-500/30 selection:text-purple-200">
      {/* Mise Navigation Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-purple-900/40 pb-4 flex-wrap">
        {/* Core Mise Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#120d1e] p-1.5 rounded-2xl border border-purple-900/40 shadow-xl overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabChange('recipes')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'recipes' || activeTab === 'vault'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Recipes</span>
            <span className="bg-white/10 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {recipes.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('platelist')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'platelist' || activeTab === 'playlist'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>The Platelist</span>
          </button>

          <button
            onClick={() => handleTabChange('delta')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'delta'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Grocery List</span>
            {playlistData?.groceryDelta?.totalMissingCount > 0 && (
              <span className="bg-purple-950 text-purple-200 border border-purple-400/50 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {playlistData.groceryDelta.totalMissingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Meal History</span>
          </button>
        </div>

        {/* Quick External Links: Cookbooks (Recipeeks), Pantry, Local Faves */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/library"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-rose-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95"
            title="Open Recipeeks digital library & bookshelf scanner"
          >
            <BookOpen className="w-3.5 h-3.5 text-rose-400" />
            <span>Cookbooks ↗</span>
          </Link>

          <Link
            href="/pantry"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 border border-charcoal-700 text-charcoal-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95"
            title="Open pantry & fridge inventory"
          >
            <Refrigerator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pantry ↗</span>
          </Link>

          <Link
            href="/restaurant-menus"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95"
            title="Browse and scan restaurant menus in Local Faves"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Local Faves ↗</span>
          </Link>
        </div>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center animate-pulse">
            <Sparkles className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
          <p className="text-xs font-mono text-purple-300/60 uppercase tracking-wider">
            Loading Mise...
          </p>
        </div>
      ) : activeTab === 'platelist' || activeTab === 'playlist' ? (
        <MiseDinnerPlaylist
          playlist={playlistData?.playlist || null}
          availableRecipesCount={playlistData?.availableRecipesCount || recipes.length}
          onRefresh={fetchAllData}
          onGoToDelta={() => handleTabChange('delta')}
          onGoToVault={() => handleTabChange('recipes')}
        />
      ) : activeTab === 'delta' ? (
        <MiseGroceryDelta
          groceryDelta={playlistData?.groceryDelta || null}
          onRefresh={fetchAllData}
          onGoToPlaylist={() => handleTabChange('platelist')}
        />
      ) : activeTab === 'history' ? (
        <MiseMealHistory />
      ) : (
        <MiseRecipeVault
          recipes={recipes}
          onRefresh={fetchAllData}
          onAddToPlatelist={handleAddToPlatelist}
        />
      )}
    </div>
  );
}

export default function MisePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-purple-400">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
      }
    >
      <MiseContent />
    </Suspense>
  );
}
