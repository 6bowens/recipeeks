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
  ArrowLeft,
} from 'lucide-react';
import { DigitalBartender } from '@/components/DigitalBartender';
import { BarManager } from '@/components/BarManager';

export default function CocktailsPage() {
  const [activeTab, setActiveTab] = useState<'bartender' | 'bar_cart'>('bartender');

  return (
    <div className="min-h-screen bg-[#090b0e] text-charcoal-100 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 pb-20 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Speakeasy Top Navigation & Ambience Header */}
        <div className="flex items-center justify-between gap-4 border-b border-amber-900/30 pb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-widest px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                <Wine className="w-3.5 h-3.5 text-amber-400" /> Pour Decisions
              </span>
              <span className="text-xs text-amber-400/60 font-serif italic">Craft Speakeasy Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              <span>The Craft Cocktail Engine</span>
              <span className="text-base text-amber-400/80 font-mono text-xs border border-amber-500/30 px-2 py-0.5 rounded-full">
                Dark Mode
              </span>
            </h1>
          </div>

          {/* Speakeasy Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#12151b] p-1.5 rounded-2xl border border-amber-900/30 text-xs shadow-inner">
            <button
              onClick={() => setActiveTab('bartender')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'bartender'
                  ? 'bg-gradient-to-r from-red-950 to-rose-950 text-amber-200 border border-amber-700/50 shadow-md ring-1 ring-amber-500/20'
                  : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Digital Bartender (Q&A)</span>
            </button>

            <button
              onClick={() => setActiveTab('bar_cart')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'bar_cart'
                  ? 'bg-gradient-to-r from-amber-950 to-amber-900 text-amber-100 border border-amber-600/50 shadow-md ring-1 ring-amber-500/20'
                  : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-white/5'
              }`}
            >
              <Wine className="w-3.5 h-3.5 text-amber-300" />
              <span>Bar Cart & Bottles</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === 'bartender' && <DigitalBartender />}
        {activeTab === 'bar_cart' && <BarManager />}
      </div>
    </div>
  );
}
