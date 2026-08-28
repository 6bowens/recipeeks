'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Wine,
  Sparkles,
} from 'lucide-react';
import { DigitalBartender } from '@/components/DigitalBartender';
import { BarManager } from '@/components/BarManager';

function CocktailsContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bartender';

  return (
    <div className="min-h-screen bg-[#090b0e] text-charcoal-100 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-6 pb-20 selection:bg-amber-500/30 selection:text-amber-200">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Main Content Area switched via Top Navigation Bar */}
        {activeTab === 'bartender' && <DigitalBartender />}
        {activeTab === 'bar_cart' && <BarManager />}
      </div>
    </div>
  );
}

export default function CocktailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090b0e] text-charcoal-400 py-12 text-center text-xs">Loading Pour Decisions...</div>}>
      <CocktailsContent />
    </Suspense>
  );
}
