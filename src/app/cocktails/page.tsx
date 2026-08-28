'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wine,
  Sparkles,
  Layers,
  BookOpen,
  Camera,
  Plus,
  Flame,
  GlassWater,
} from 'lucide-react';
import { DigitalBartender } from '@/components/DigitalBartender';
import { BarManager } from '@/components/BarManager';

export default function CocktailsPage() {
  const [activeTab, setActiveTab] = useState<'bartender' | 'bar_cart'>('bartender');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Hub Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-charcoal-200 pb-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-red-800 to-rose-700 text-white font-bold text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
              <Wine className="w-3.5 h-3.5" /> Pour Decisions
            </span>
            <span className="text-xs text-charcoal-500 font-serif italic">Cocktail & Mixology Studio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900 mt-1">
            The Craft Cocktail Engine
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-charcoal-100/80 p-1 rounded-2xl border border-charcoal-200/80 text-xs">
          <button
            onClick={() => setActiveTab('bartender')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bartender'
                ? 'bg-red-800 text-white shadow-xs'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Digital Bartender (Q&A)</span>
          </button>

          <button
            onClick={() => setActiveTab('bar_cart')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bar_cart'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/50'
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Bar Cart & Bottles</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'bartender' && <DigitalBartender />}
      {activeTab === 'bar_cart' && <BarManager />}
    </div>
  );
}
