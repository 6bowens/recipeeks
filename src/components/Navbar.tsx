'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  ChefHat,
  Wine,
  Sparkles,
  BookOpen,
  Layers,
  Menu,
  X,
  LogOut,
  Shield,
  Zap,
  ChevronDown,
  ArrowRight,
  Download,
  Calendar,
  ShoppingCart,
  BookMarked,
  UtensilsCrossed,
  History,
} from 'lucide-react';

function NavbarContent() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<{
    totalCookbooks: number;
    totalRecipes: number;
    totalUniqueIngredients: number;
    estimatedAiSpend?: string;
    estimatedAiSpendExact?: string;
  } | null>(null);

  const searchParams = useSearchParams();
  const isAdmin = session?.user?.email === '6bowens@gmail.com';
  const isCocktails = pathname.startsWith('/cocktails');
  const isMise = pathname.startsWith('/mise');
  const cocktailTab = searchParams.get('tab') || 'bartender';
  const miseTab = searchParams.get('tab') || 'playlist';

  const cookingNavLinks = [
    { href: '/library', step: 1, label: 'Library', shortLabel: '1. Library', icon: BookOpen },
    { href: '/pantry', step: 2, label: 'Pantry & Fridge', shortLabel: '2. Fridge & Pantry', icon: Layers },
    { href: '/match', step: 3, label: 'Ready to Cook', shortLabel: '3. Ready to Cook', icon: Sparkles, highlight: true },
  ];

  const cocktailNavLinks = [
    {
      href: '/cocktails?tab=bartender',
      tabId: 'bartender',
      label: 'Cocktails',
      icon: Sparkles,
    },
    {
      href: '/cocktails?tab=bar_cart',
      tabId: 'bar_cart',
      label: 'Bar Cart & Bottles',
      icon: Wine,
    },
  ];

  const miseNavLinks = [
    {
      href: '/mise?tab=playlist',
      tabId: 'playlist',
      label: 'Dinner Playlist',
      icon: Calendar,
    },
    {
      href: '/mise?tab=delta',
      tabId: 'delta',
      label: 'Grocery Delta',
      icon: ShoppingCart,
    },
    {
      href: '/mise?tab=vault',
      tabId: 'vault',
      label: 'Recipe Vault',
      icon: BookMarked,
    },
    {
      href: '/mise?tab=history',
      tabId: 'history',
      label: 'Meal History',
      icon: History,
    },
  ];

  const activeLinks = isMise ? miseNavLinks : isCocktails ? cocktailNavLinks : cookingNavLinks;

  useEffect(() => {
    if (session?.user) {
      fetch('/api/cookbooks')
        .then((res) => res.json())
        .then((data) => {
          if (data?.stats) {
            setStats(data.stats);
          }
        })
        .catch(() => {});
    }
  }, [session, pathname]);

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const res = await fetch('/api/stats/export?format=csv');
      if (!res.ok) throw new Error('Failed to export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recipeeks-collection-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Error exporting collection: ' + (e as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const headerBgClass = isMise
    ? 'bg-[#0c0914]/95 border-b border-purple-900/40 text-white shadow-xl'
    : isCocktails
    ? 'bg-[#0b0d10]/95 border-b border-amber-900/30 text-white shadow-lg'
    : 'bg-white/95 border-b border-charcoal-200/80 shadow-xs';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md transition-colors ${headerBgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* 3-Way Brand Switcher Logo */}
          <div className="flex items-center gap-4 sm:gap-6">
            {isMise ? (
              <Link
                href="/library"
                title="Switch to Recipeeks (Kitchen & Bookshelf)"
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-purple-400 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <div className="leading-tight">
                  <span className="text-xl font-bold font-serif tracking-tight text-purple-200 group-hover:text-purple-100 transition-colors">
                    Mise
                  </span>
                </div>
              </Link>
            ) : isCocktails ? (
              <Link
                href="/mise"
                title="Switch to Mise (Meal Playlist & Grocery Delta)"
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-charcoal-950 shadow-md group-hover:scale-105 transition-transform">
                  <Wine className="w-5 h-5 text-charcoal-950" />
                </div>
                <div className="leading-tight">
                  <span className="text-xl font-bold font-serif tracking-tight text-amber-300 group-hover:text-amber-200 transition-colors">
                    Pour Decisions
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/cocktails"
                title="Switch to Pour Decisions (Cocktails & Bar Cart)"
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-800 to-rose-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div className="leading-tight">
                  <span className="text-xl font-bold font-serif tracking-tight text-charcoal-900 group-hover:text-red-800 transition-colors">
                    Recipeeks
                  </span>
                </div>
              </Link>
            )}

            {/* Subtle Collection Stats */}
            {session?.user && stats && !isCocktails && !isMise && (
              <div className="hidden xl:flex items-center gap-3 text-xs text-charcoal-500 pl-4 border-l border-charcoal-200">
                <span>
                  <strong className="text-charcoal-900 font-semibold">{stats.totalCookbooks}</strong> Books
                </span>
                <span>•</span>
                <span>
                  <strong className="text-charcoal-900 font-semibold">{stats.totalRecipes}</strong> Recipes
                </span>
                <span>•</span>
                <span>
                  <strong className="text-charcoal-900 font-semibold">{stats.totalUniqueIngredients}</strong> Ingredients
                </span>
              </div>
            )}
          </div>

          {/* Center/Right Nav Links & Spend Badge */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
              {session?.user && !isCocktails && !isMise ? (
                <div className="flex items-center gap-1 bg-charcoal-50 p-1 rounded-2xl border border-charcoal-200/70 shadow-2xs">
                  {cookingNavLinks.map((link, idx) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                      <React.Fragment key={link.href}>
                        <Link
                          href={link.href}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-red-800 text-white shadow-xs'
                              : link.highlight
                              ? 'text-red-900 bg-red-100/70 hover:bg-red-200/80 border border-red-200/80'
                              : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center ${
                              isActive
                                ? 'bg-white text-red-900'
                                : 'bg-charcoal-200/90 text-charcoal-700'
                            }`}
                          >
                            {link.step}
                          </span>
                          <span>{link.label}</span>
                        </Link>
                        {idx < cookingNavLinks.length - 1 && (
                          <span className="text-charcoal-300 text-xs px-0.5 select-none font-bold">
                            →
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : session?.user && isMise ? (
                miseNavLinks.map((link: any) => {
                  const Icon = link.icon;
                  const isActive = link.tabId === miseTab;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white font-bold shadow-md'
                          : 'text-purple-300/70 hover:text-white hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })
              ) : session?.user && isCocktails ? (
                cocktailNavLinks.map((link: any) => {
                  const Icon = link.icon;
                  const isActive = link.tabId === cocktailTab;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-charcoal-950 font-bold shadow-md'
                          : 'text-charcoal-300 hover:text-white hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })
              ) : null}

              {/* AI Spend Badge */}
              {session?.user && stats?.estimatedAiSpend && (
                <div
                  className={`hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg ml-1 border ${
                    isMise
                      ? 'text-purple-300 bg-purple-950/50 border-purple-800'
                      : isCocktails
                      ? 'text-amber-300 bg-amber-950/50 border-amber-800'
                      : 'text-emerald-800 bg-emerald-50 border-emerald-200/80'
                  }`}
                  title={`Estimated API spend: ${stats.estimatedAiSpendExact || stats.estimatedAiSpend}`}
                >
                  <Zap className="w-3 h-3 text-emerald-600 fill-emerald-500" />
                  <span>Spend: {stats.estimatedAiSpend}</span>
                </div>
              )}
            </nav>

            {/* Auth / User Profile Button with Dropdown */}
            <div className="flex items-center gap-2">
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-charcoal-100 animate-pulse" />
              ) : session?.user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl transition-all border cursor-pointer ${
                      isMise
                        ? 'bg-[#181324] hover:bg-[#221c32] border-purple-900/40 text-purple-200 shadow-sm'
                        : isCocktails
                        ? 'bg-[#161a22] hover:bg-[#1f2430] border-amber-900/40 text-amber-200 shadow-sm'
                        : 'bg-charcoal-50 hover:bg-charcoal-100 border-charcoal-200/80 text-charcoal-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shadow-xs ${
                        isMise
                          ? 'bg-purple-600 text-white'
                          : isCocktails
                          ? 'bg-amber-500 text-charcoal-950'
                          : 'bg-red-800 text-white'
                      }`}
                    >
                      {session.user.name?.[0]?.toUpperCase() ||
                        session.user.email?.[0]?.toUpperCase() ||
                        'U'}
                    </div>
                    <span className="hidden sm:inline text-xs font-semibold max-w-[110px] truncate">
                      {session.user.name || session.user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div
                      className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 ${
                        isMise
                          ? 'bg-[#140f20] border-purple-900/40 text-white shadow-black/80'
                          : isCocktails
                          ? 'bg-[#13161c] border-amber-900/40 text-white shadow-black/80'
                          : 'bg-white border-charcoal-200 text-charcoal-800'
                      }`}
                    >
                      <div
                        className={`p-3 border-b mb-1 ${
                          isMise || isCocktails ? 'border-white/10' : 'border-charcoal-100'
                        }`}
                      >
                        <p className="font-bold text-xs truncate">
                          {session.user.name || 'User'}
                        </p>
                        <p className="text-[11px] text-charcoal-400 truncate mt-0.5">
                          {session.user.email}
                        </p>
                        {stats?.estimatedAiSpend && (
                          <div className="mt-2 text-[11px] font-semibold flex items-center gap-1 text-emerald-500">
                            <Zap className="w-3 h-3 fill-emerald-500" />
                            <span>AI Spend: {stats.estimatedAiSpend}</span>
                          </div>
                        )}
                      </div>

                      {/* 3-Way Mode Switcher Links */}
                      <div className="py-1 px-1 space-y-1">
                        <div className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider px-2 py-0.5 font-mono">
                          Switch Space:
                        </div>
                        <Link
                          href="/library"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            !isCocktails && !isMise
                              ? 'bg-red-800/20 text-red-700 font-bold'
                              : 'hover:bg-white/5 text-charcoal-300'
                          }`}
                        >
                          <ChefHat className="w-3.5 h-3.5 text-red-600" />
                          <span>Recipeeks (Kitchen)</span>
                        </Link>
                        <Link
                          href="/cocktails"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isCocktails
                              ? 'bg-amber-500/20 text-amber-300 font-bold'
                              : 'hover:bg-white/5 text-charcoal-300'
                          }`}
                        >
                          <Wine className="w-3.5 h-3.5 text-amber-400" />
                          <span>Pour Decisions (Cocktails)</span>
                        </Link>
                        <Link
                          href="/mise"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isMise
                              ? 'bg-purple-600/20 text-purple-300 font-bold'
                              : 'hover:bg-white/5 text-charcoal-300'
                          }`}
                        >
                          <UtensilsCrossed className="w-3.5 h-3.5 text-purple-400" />
                          <span>Mise (Dinner & Delta)</span>
                        </Link>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-white/5">
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              isMise
                                ? 'hover:bg-purple-500/10 text-purple-300'
                                : isCocktails
                                ? 'hover:bg-amber-500/10 text-amber-300'
                                : 'hover:bg-red-50 text-red-700'
                            }`}
                          >
                            <Shield className="w-4 h-4 text-amber-400" />
                            <div className="flex-1 flex items-center justify-between">
                              <span>Admin Dashboard</span>
                              <span className="text-[9px] bg-red-950 text-red-200 border border-red-800/60 px-1.5 py-0.2 rounded font-mono font-bold">
                                Admin
                              </span>
                            </div>
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleExportCSV();
                          }}
                          disabled={isExporting}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            isMise || isCocktails
                              ? 'hover:bg-white/5 text-charcoal-300'
                              : 'hover:bg-charcoal-100 text-charcoal-700'
                          }`}
                        >
                          <Download className="w-4 h-4 text-charcoal-400" />
                          <span>{isExporting ? 'Exporting...' : 'Export Collection (CSV)'}</span>
                        </button>

                        <div
                          className={`border-t my-1 ${
                            isMise || isCocktails ? 'border-white/10' : 'border-charcoal-100'
                          }`}
                        />

                        <button
                          onClick={() => signOut({ callbackUrl: '/login' })}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 text-xs font-semibold text-charcoal-700 hover:text-charcoal-900 hover:bg-charcoal-100 rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-xs transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              {session?.user && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`p-2 md:hidden rounded-lg ${
                    isMise || isCocktails
                      ? 'text-charcoal-300 hover:text-white'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile dropdown navigation */}
        {mobileMenuOpen && session?.user && (
          <div
            className={`md:hidden py-3 border-t space-y-1.5 animate-in fade-in ${
              isMise
                ? 'border-purple-900/30'
                : isCocktails
                ? 'border-amber-900/30'
                : 'border-charcoal-200'
            }`}
          >
            {!isCocktails && !isMise && (
              <div className="px-2 py-1 text-[10px] font-bold text-charcoal-400 uppercase tracking-wider font-mono">
                Kitchen Engine Steps:
              </div>
            )}

            {activeLinks.map((link: any) => {
              const Icon = link.icon;
              const isActive = isMise
                ? link.tabId === miseTab
                : isCocktails
                ? link.tabId === cocktailTab
                : pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isMise
                      ? isActive
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-purple-300/70 hover:bg-white/5'
                      : isCocktails
                      ? isActive
                        ? 'bg-amber-500 text-charcoal-950 font-bold'
                        : 'text-charcoal-300 hover:bg-white/5'
                      : isActive
                      ? 'bg-red-800 text-white font-bold shadow-xs'
                      : 'text-charcoal-700 hover:bg-charcoal-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {link.step ? (
                      <span
                        className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                          isActive
                            ? 'bg-white text-red-900'
                            : 'bg-charcoal-200 text-charcoal-800'
                        }`}
                      >
                        {link.step}
                      </span>
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span>{link.label}</span>
                  </div>

                  {link.step && (
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-charcoal-400'}`}
                    />
                  )}
                </Link>
              );
            })}

            {/* Mobile 3-Way Brand Switcher Section */}
            <div className="pt-2 mt-2 border-t border-white/5 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-charcoal-400 uppercase tracking-wider font-mono">
                Switch Experience:
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                <Link
                  href="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
                    !isCocktails && !isMise
                      ? 'bg-red-900/30 border-red-700 text-red-300 font-bold'
                      : 'bg-white/5 border-white/5 text-charcoal-400'
                  }`}
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Recipeeks</span>
                </Link>
                <Link
                  href="/cocktails"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
                    isCocktails
                      ? 'bg-amber-900/30 border-amber-700 text-amber-300 font-bold'
                      : 'bg-white/5 border-white/5 text-charcoal-400'
                  }`}
                >
                  <Wine className="w-4 h-4" />
                  <span>Cocktails</span>
                </Link>
                <Link
                  href="/mise"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${
                    isMise
                      ? 'bg-purple-900/30 border-purple-700 text-purple-300 font-bold'
                      : 'bg-white/5 border-white/5 text-charcoal-400'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Mise</span>
                </Link>
              </div>
            </div>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isMise
                    ? 'text-purple-300 hover:bg-white/5'
                    : isCocktails
                    ? 'text-amber-300 hover:bg-white/5'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function Navbar() {
  return (
    <Suspense fallback={<header className="h-16 bg-white/95 border-b border-charcoal-200/80" />}>
      <NavbarContent />
    </Suspense>
  );
}
