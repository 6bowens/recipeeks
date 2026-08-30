'use client';

import React, { Suspense } from 'react';
import { RestaurantDishesDirectory } from '@/components/RestaurantDishesDirectory';

function RestaurantMenusContent() {
  return (
    <div className="space-y-6 pb-20 selection:bg-rose-500/30 selection:text-rose-200">
      <RestaurantDishesDirectory />
    </div>
  );
}

export default function RestaurantMenusPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-charcoal-400">Loading Restaurant Menus & Recipes...</div>}>
      <RestaurantMenusContent />
    </Suspense>
  );
}
