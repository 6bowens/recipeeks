'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MiseDinnerPlaylist } from '@/components/MiseDinnerPlaylist';
import { MiseGroceryDelta } from '@/components/MiseGroceryDelta';
import { MiseRecipeVault } from '@/components/MiseRecipeVault';
import { Calendar, ShoppingCart, BookMarked, Sparkles } from 'lucide-react';

function MiseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = (searchParams.get('tab') as 'playlist' | 'delta' | 'vault') || 'playlist';

  const [playlistData, setPlaylistData] = useState<any | null>(null);
  const [groceryDeltaData, setGroceryDeltaData] = useState<any | null>(null);
  const [availableRecipesCount, setAvailableRecipesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchPlaylistAndDelta = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/mise/playlist');
      if (res.ok) {
        const data = await res.json();
        setPlaylistData(data.playlist || null);
        setGroceryDeltaData(data.groceryDelta || null);
        setAvailableRecipesCount(data.availableRecipesCount || 0);
      }
    } catch (err) {
      console.error('Error loading Mise data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylistAndDelta();
  }, []);

  const setTab = (tab: 'playlist' | 'delta' | 'vault') => {
    router.push(`/mise?tab=${tab}`);
  };

  return (
    <div className="space-y-6 pb-20 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Mobile-Friendly Sub-Navigation */}
      <div className="flex items-center justify-between border-b border-purple-900/30 pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setTab('playlist')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'playlist'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Dinner Playlist</span>
          </button>

          <button
            onClick={() => setTab('delta')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'delta'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Grocery Delta</span>
            {groceryDeltaData?.totalMissingCount > 0 && (
              <span className="bg-purple-950 border border-purple-400/50 text-purple-200 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full">
                {groceryDeltaData.totalMissingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('vault')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'vault'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-purple-300/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" />
            <span>Recipe Vault</span>
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {currentTab === 'playlist' && (
        <MiseDinnerPlaylist
          playlist={playlistData}
          availableRecipesCount={availableRecipesCount}
          onRefresh={fetchPlaylistAndDelta}
          onGoToDelta={() => setTab('delta')}
          onGoToVault={() => setTab('vault')}
        />
      )}

      {currentTab === 'delta' && (
        <MiseGroceryDelta
          groceryDelta={groceryDeltaData}
          onRefresh={fetchPlaylistAndDelta}
          onGoToPlaylist={() => setTab('playlist')}
        />
      )}

      {currentTab === 'vault' && (
        <MiseRecipeVault onRefresh={fetchPlaylistAndDelta} />
      )}
    </div>
  );
}

export default function MisePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-purple-300/60">Loading Mise...</div>}>
      <MiseContent />
    </Suspense>
  );
}
