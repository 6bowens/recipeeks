'use client';

import React, { useState, useEffect } from 'react';
import {
  Wine,
  Search,
  Camera,
  Building2,
  MapPin,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  GlassWater,
  Flame,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { MenuScanModal } from '@/components/MenuScanModal';
import { isRecognizedBarStaple } from '@/lib/cocktail-utils';

export function RestaurantMenusDirectory() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [expandedDrinkId, setExpandedDrinkId] = useState<string | null>(null);
  const [addingIng, setAddingIng] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const url = searchQuery
        ? `/api/cocktails/menus?q=${encodeURIComponent(searchQuery)}`
        : '/api/cocktails/menus';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMenus(data.menus || []);
        if (data.menus?.length > 0 && !expandedMenuId) {
          setExpandedMenuId(data.menus[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, [searchQuery]);

  const handleAddToBar = async (ingName: string) => {
    try {
      setAddingIng(ingName);
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ingName,
          category: 'spirits',
          quantity: '1 bottle',
        }),
      });

      if (!res.ok) throw new Error('Failed to add to bar');

      setToastMessage(`✓ Added "${ingName}" to your Bar Cart!`);
      setTimeout(() => setToastMessage(null), 3000);
      await fetchMenus();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAddingIng(null);
    }
  };

  const handleDeleteMenu = async (menuId: string, restaurantName: string) => {
    if (!confirm(`Delete restaurant menu for "${restaurantName}"?`)) return;
    try {
      const res = await fetch(`/api/cocktails/menus/${menuId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete');
      }
      await fetchMenus();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const totalDrinksCount = menus.reduce((acc, m) => acc + (m.cocktails?.length || 0), 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1c1214] via-[#140e10] to-[#241318] border border-amber-900/40 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5 font-mono">
              <Building2 className="w-3.5 h-3.5 text-amber-400" /> Global Restaurant Menus
            </span>
            <span className="text-xs text-amber-400/60 font-mono">Community Mixology</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white leading-tight">
            Restaurant & Speakeasy Cocktail Lists
          </h2>
          <p className="text-xs sm:text-sm text-amber-200/70 leading-relaxed">
            Snap cocktail menus from your favorite bars around the world. Gemini AI extracts the drink list and synthesizes authentic craft ratios, available globally for every chef.
          </p>
        </div>

        <button
          onClick={() => setShowScanModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>📸 Scan Cocktail Menu</span>
        </button>
      </div>

      {/* Search & Directory Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400/50" />
          <input
            type="text"
            placeholder="Search restaurants, cities, drinks, or spirits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#140e10] border border-amber-900/40 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 placeholder:text-amber-300/40 shadow-inner"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-amber-300/80 font-mono">
          <span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
            {menus.length} Menus
          </span>
          <span className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
            {totalDrinksCount} Craft Cocktails
          </span>
        </div>
      </div>

      {/* Menus List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs text-amber-300/60 font-mono">Loading global cocktail menus...</p>
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-[#140e10] border border-amber-900/30 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-xl">
          <Wine className="w-12 h-12 mx-auto text-amber-500/40" />
          <h3 className="text-lg font-bold text-white">No Restaurant Menus Found</h3>
          <p className="text-xs text-amber-200/70 max-w-md mx-auto">
            {searchQuery
              ? `No menus matching "${searchQuery}". Try a different term or clear the search.`
              : 'Be the first to scan a restaurant cocktail menu! Take a photo of a bar menu to share it globally.'}
          </p>
          <button
            onClick={() => setShowScanModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Scan First Menu</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {menus.map((menu) => {
            const isMenuExpanded = expandedMenuId === menu.id;

            return (
              <div
                key={menu.id}
                className="bg-[#140e10] border border-amber-900/30 rounded-3xl overflow-hidden shadow-xl transition-all"
              >
                {/* Menu Header Card */}
                <div
                  onClick={() => setExpandedMenuId(isMenuExpanded ? null : menu.id)}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/5"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-amber-400" />
                        <span>{menu.restaurantName}</span>
                      </span>
                      {menu.city && (
                        <span className="text-amber-200/70 text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400/80" /> {menu.city}
                        </span>
                      )}
                      <span className="text-[10px] text-amber-200/40">
                        Added by {menu.contributedBy}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-serif font-bold text-white truncate">
                      {menu.restaurantName}
                    </h3>
                    {menu.notes && (
                      <p className="text-xs text-amber-200/70 italic line-clamp-1">{menu.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs font-mono font-bold px-3 py-1 rounded-xl">
                      {menu.totalDrinks} Drinks
                    </span>

                    {menu.isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMenu(menu.id, menu.restaurantName);
                        }}
                        className="p-2 text-red-400/60 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Delete Menu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <div className="p-2 rounded-xl bg-white/5 text-amber-300/80">
                      {isMenuExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Cocktails in this Menu */}
                {isMenuExpanded && (
                  <div className="p-5 sm:p-6 bg-[#0f0a0c] space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {menu.cocktails.map((cocktail: any) => {
                        const isDrinkExpanded = expandedDrinkId === cocktail.id;

                        return (
                          <div
                            key={cocktail.id}
                            className="bg-[#171013] border border-amber-900/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md hover:border-amber-500/40 transition-colors flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              {/* Header Pill & Title */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                                      {cocktail.spiritBase}
                                    </span>
                                    <span className="bg-white/5 text-amber-200/70 text-[10px] px-2 py-0.5 rounded capitalize font-mono">
                                      {cocktail.flavorProfile}
                                    </span>
                                    {cocktail.glassware && (
                                      <span className="text-[10px] text-amber-200/50">· {cocktail.glassware}</span>
                                    )}
                                  </div>

                                  <h4 className="text-base font-serif font-bold text-white">
                                    {cocktail.name}
                                  </h4>
                                </div>

                                {/* Bar Inventory Match Badge */}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                                    cocktail.matchScore === 100
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                                      : cocktail.matchScore >= 50
                                      ? 'bg-blue-950/80 text-blue-300 border border-blue-700/60'
                                      : 'bg-white/5 text-amber-200/60 border border-white/10'
                                  }`}
                                >
                                  {cocktail.matchScore}% Bar Stock
                                </span>
                              </div>

                              {/* Menu description */}
                              {cocktail.menuDescription && (
                                <p className="text-xs text-amber-200/70 italic leading-relaxed">
                                  {cocktail.menuDescription}
                                </p>
                              )}

                              {/* Ingredients List */}
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono block">
                                  Craft Spec & Ratios:
                                </span>
                                <div className="grid grid-cols-1 gap-1">
                                  {cocktail.ingredients.map((ing: any) => (
                                    <div
                                      key={ing.id}
                                      className={`rounded-lg px-2.5 py-1 text-xs flex items-center justify-between border ${
                                        ing.isStocked
                                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-100'
                                          : 'bg-black/40 border-white/5 text-white/90'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${ing.isStocked ? 'bg-emerald-400' : 'bg-amber-500/50'}`} />
                                        <span className="truncate">{ing.name}</span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {(ing.amount || ing.unit) && (
                                          <span className="text-amber-300 font-mono text-[11px] font-bold">
                                            {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                          </span>
                                        )}

                                        {!ing.isStocked && (
                                          <button
                                            onClick={() => handleAddToBar(ing.name)}
                                            disabled={addingIng === ing.name}
                                            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 cursor-pointer transition-all"
                                            title="Add to your Bar Cart"
                                          >
                                            {addingIng === ing.name ? '...' : '+ Bar'}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Toggle Method & Instructions */}
                              {cocktail.instructions && cocktail.instructions.length > 0 && (
                                <div className="pt-1">
                                  <button
                                    onClick={() => setExpandedDrinkId(isDrinkExpanded ? null : cocktail.id)}
                                    className="text-[11px] text-amber-400/80 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{isDrinkExpanded ? 'Hide Method' : 'View Method & Garnish'}</span>
                                    {isDrinkExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  {isDrinkExpanded && (
                                    <div className="mt-2 p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 text-xs text-amber-100/90 leading-relaxed animate-in fade-in">
                                      <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                                        Technique: {cocktail.technique || 'Shaken'} · Ice: {cocktail.ice || 'Served Up'}
                                      </div>
                                      <ol className="list-decimal list-inside space-y-1">
                                        {cocktail.instructions.map((stepText: string, sIdx: number) => (
                                          <li key={sIdx}>{stepText}</li>
                                        ))}
                                      </ol>
                                      {cocktail.garnish && (
                                        <div className="text-[11px] text-amber-300/80 pt-1 font-mono">
                                          Garnish: {cocktail.garnish}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Menu Scan Modal */}
      <MenuScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onMenuSaved={() => fetchMenus()}
      />
    </div>
  );
}
