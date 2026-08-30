'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DigitalBartender } from '@/components/DigitalBartender';
import { BarManager } from '@/components/BarManager';
import { RestaurantMenusDirectory } from '@/components/RestaurantMenusDirectory';

function CocktailsContent() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bartender';

  return (
    <div className="space-y-6 pb-20 selection:bg-amber-500/30 selection:text-amber-200">
      {activeTab === 'bartender' && <DigitalBartender />}
      {activeTab === 'bar_cart' && <BarManager />}
      {activeTab === 'menus' && <RestaurantMenusDirectory />}
    </div>
  );
}

export default function CocktailsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-charcoal-400">Loading Pour Decisions...</div>}>
      <CocktailsContent />
    </Suspense>
  );
}
