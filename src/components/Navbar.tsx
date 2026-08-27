'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  BookOpen,
  Camera,
  UtensilsCrossed,
  Sparkles,
  Download,
  LogOut,
  User as UserIcon,
  ChefHat,
  Menu,
  X,
  Layers,
  Zap,
  Shield,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<{
    totalCookbooks: number;
    totalRecipes: number;
    totalUniqueIngredients: number;
    estimatedAiSpend?: string;
    estimatedAiSpendExact?: string;
    totalVisionScans?: number;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin = session?.user?.email === '6bowens@gmail.com';

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

  const navLinks = [
    { href: '/library', label: 'Library', icon: BookOpen },
    { href: '/pantry', label: 'Pantry & Fridge', icon: Layers },
    { href: '/match', label: 'Ready to Cook', icon: Sparkles, highlight: true },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-charcoal-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-800 to-rose-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <ChefHat className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="text-xl font-bold font-serif tracking-tight text-charcoal-900">
                  Recipeeks
                </span>
              </div>
            </Link>

            {/* Subtle Collection Stats */}
            {session?.user && stats && (
              <div className="hidden xl:flex items-center gap-3 text-xs text-charcoal-500 pl-4 border-l border-charcoal-200">
                <span><strong className="text-charcoal-900 font-semibold">{stats.totalCookbooks}</strong> Books</span>
                <span>•</span>
                <span><strong className="text-charcoal-900 font-semibold">{stats.totalRecipes}</strong> Recipes</span>
                <span>•</span>
                <span><strong className="text-charcoal-900 font-semibold">{stats.totalUniqueIngredients}</strong> Ingredients</span>
              </div>
            )}
          </div>

          {/* Center/Right Nav Links & Spend Badge */}
          <div className="flex items-center gap-3">
            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
              {session?.user &&
                navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-red-50 text-red-900 shadow-xs'
                          : link.highlight
                          ? 'text-red-900 bg-red-50/50 hover:bg-red-100/80 border border-red-200/70'
                          : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-charcoal-100/70'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${link.highlight ? 'text-red-700' : ''}`} />
                      {link.label}
                    </Link>
                  );
                })}

              {/* AI Spend Badge */}
              {session?.user && stats?.estimatedAiSpend && (
                <div
                  className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 rounded-lg ml-1"
                  title={`Estimated API spend: ${stats.estimatedAiSpendExact || stats.estimatedAiSpend}`}
                >
                  <Zap className="w-3 h-3 text-emerald-600 fill-emerald-500" />
                  <span>Spend: {stats.estimatedAiSpend}</span>
                </div>
              )}

              {/* Export Button */}
              {session?.user && (
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  title="Export collection to CSV"
                  className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-charcoal-500 hover:text-charcoal-900 hover:bg-charcoal-100 rounded-lg transition-colors ml-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Export</span>
                </button>
              )}
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              {status === 'loading' ? (
                <div className="w-8 h-8 rounded-full bg-charcoal-100 animate-pulse" />
              ) : session?.user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-charcoal-200">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-900 font-bold text-xs flex items-center justify-center border border-red-200">
                    {session.user.name?.[0]?.toUpperCase() ||
                      session.user.email?.[0]?.toUpperCase() ||
                      'U'}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title="Sign Out"
                    className="p-1.5 text-charcoal-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
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
                  className="p-2 md:hidden text-charcoal-600 hover:text-charcoal-900 rounded-lg"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && session?.user && (
          <div className="md:hidden py-3 border-t border-charcoal-200 space-y-1 animate-in fade-in">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-red-50 text-red-950 font-bold'
                      : 'text-charcoal-700 hover:bg-charcoal-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            {stats?.estimatedAiSpend && (
              <div className="px-3 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> AI Spend: {stats.estimatedAiSpend}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
