'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Calendar,
  ShoppingCart,
  BookMarked,
  Sparkles,
  RefreshCw,
  ChefHat,
  History,
} from 'lucide-react';
import { MiseDinnerPlaylist } from '@/components/MiseDinnerPlaylist';
import { MiseGroceryDelta } from '@/components/MiseGroceryDelta';
import { MiseRecipeVault } from '@/components/MiseRecipeVault';
import { MiseMealHistory } from '@/components/MiseMealHistory';

function MiseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get('tab') || 'playlist';

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

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 text-white">
      {/* Mise Tab Navigation Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-purple-900/40 pb-4 flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2 bg-[#120d1e] p-1.5 rounded-2xl border border-purple-900/40 shadow-xl overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabChange('playlist')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'playlist'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Dinner Playlist</span>
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
            onClick={() => handleTabChange('vault')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'vault'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Recipe Vault</span>
            <span className="bg-white/10 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {recipes.length}
            </span>
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
      ) : activeTab === 'playlist' ? (
        <MiseDinnerPlaylist
          playlist={playlistData?.playlist || null}
          availableRecipesCount={playlistData?.availableRecipesCount || recipes.length}
          onRefresh={fetchAllData}
          onGoToDelta={() => handleTabChange('delta')}
          onGoToVault={() => handleTabChange('vault')}
        />
      ) : activeTab === 'delta' ? (
        <MiseGroceryDelta
          groceryDelta={playlistData?.groceryDelta || null}
          onRefresh={fetchAllData}
          onGoToPlaylist={() => handleTabChange('playlist')}
        />
      ) : activeTab === 'history' ? (
        <MiseMealHistory />
      ) : (
        <MiseRecipeVault recipes={recipes} onRefresh={fetchAllData} />
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
