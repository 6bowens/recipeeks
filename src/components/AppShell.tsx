'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCocktails = pathname?.startsWith('/cocktails');
  const isMise = pathname?.startsWith('/mise');

  useEffect(() => {
    if (isMise) {
      document.documentElement.classList.add('dark-speakeasy');
      document.body.style.backgroundColor = '#0c0914';
      document.body.style.color = '#e2e8f0';
    } else if (isCocktails) {
      document.documentElement.classList.add('dark-speakeasy');
      document.body.style.backgroundColor = '#090b0e';
      document.body.style.color = '#e2e8f0';
    } else {
      document.documentElement.classList.remove('dark-speakeasy');
      document.body.style.backgroundColor = '#faf8f5';
      document.body.style.color = '#2d2d2d';
    }
  }, [isCocktails, isMise]);

  const bgClass = isMise
    ? 'bg-[#0c0914] text-purple-100'
    : isCocktails
    ? 'bg-[#090b0e] text-charcoal-100'
    : 'bg-[#faf8f5] text-[#2d2d2d]';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${bgClass}`}>
      {children}
    </div>
  );
}
