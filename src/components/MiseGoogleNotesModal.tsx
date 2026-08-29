'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import {
  X,
  Sparkles,
  Check,
  Plus,
  BookMarked,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap,
  Globe,
  Loader2,
  Copy,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { FREQUENCY_CONFIG } from '@/lib/playlist-utils';

interface MiseGoogleNotesModalProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

export function MiseGoogleNotesModal({ onClose, onImportSuccess }: MiseGoogleNotesModalProps) {
  const { data: session } = useSession();
  const [scanTab, setScanTab] = useState<'google_auth' | 'paste'>('google_auth');

  // Google OAuth Live Scanner State
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [scanningGoogle, setScanningGoogle] = useState(false);
  const [googleScannedNotesCount, setGoogleScannedNotesCount] = useState<number | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);

  // Paste Scanner State
  const [noteText, setNoteText] = useState('');
  const [defaultFrequency, setDefaultFrequency] = useState('1_week');
  const [scanningPaste, setScanningPaste] = useState(false);

  // Extracted Recipes Preview & Selection
  const [extractedRecipes, setExtractedRecipes] = useState<any[] | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Check if user has Google Auth configured & connected
    fetch('/api/mise/google-keep/scan')
      .then((res) => res.json())
      .then((data) => {
        setIsConfigured(!!data.isConfigured);
        setIsGoogleConnected(!!data.connected);
      })
      .catch(() => {
        setIsConfigured(false);
        setIsGoogleConnected(false);
      })
      .finally(() => {
        setCheckingConnection(false);
      });
  }, []);

  const handleConnectGoogle = () => {
    if (!isConfigured) {
      alert('Google OAuth Client ID & Secret are not configured yet. See setup instructions below or use the Paste Notes tab.');
      return;
    }
    signIn('google', {
      callbackUrl: window.location.href,
    });
  };

  const handleLiveGoogleScan = async () => {
    try {
      setScanningGoogle(true);
      const res = await fetch('/api/mise/google-keep/scan', {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.connected === false) {
          setIsGoogleConnected(false);
          throw new Error('Google account not connected. Please authorize Google access.');
        }
        throw new Error(err.error || 'Failed to scan Google Keep notes');
      }

      const data = await res.json();
      setGoogleScannedNotesCount(data.notesCount || 0);

      const recipes = data.recipes || [];
      if (recipes.length === 0) {
        alert(
          data.message ||
            'Scanned your notes, but no recipes with ingredients were found. You can also paste note text directly!'
        );
        return;
      }

      setExtractedRecipes(recipes);
      setSelectedIndices(new Set(recipes.map((_: any, i: number) => i)));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setScanningGoogle(false);
    }
  };

  const handleScanPastedNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setScanningPaste(true);
      const res = await fetch('/api/mise/parse-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: noteText.trim(),
          defaultFrequency,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to scan notes');
      }

      const data = await res.json();
      const recipes = data.recipes || [];
      setExtractedRecipes(recipes);
      setSelectedIndices(new Set(recipes.map((_: any, i: number) => i)));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setScanningPaste(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSaveSelected = async () => {
    if (!extractedRecipes || selectedIndices.size === 0) return;

    try {
      setSavingBatch(true);
      const recipesToSave = extractedRecipes.filter((_, i) => selectedIndices.has(i));

      for (const rec of recipesToSave) {
        await fetch('/api/mise/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec),
        });
      }

      onImportSuccess();
      onClose();
    } catch (err) {
      alert('Error saving recipes: ' + (err as Error).message);
    } finally {
      setSavingBatch(false);
    }
  };

  const callbackUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback/google`
    : 'http://Brettflix:6968/api/auth/callback/google';

  const copyCallbackUri = () => {
    navigator.clipboard.writeText(callbackUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-[#140f20] border border-purple-900/50 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/5 flex items-start justify-between gap-4 bg-gradient-to-r from-[#171126] to-[#140f20]">
          <div className="space-y-1">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono">
              Google Notes & Keep
            </span>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
              Scan Notes for Recipes
            </h3>
            <p className="text-xs text-purple-200/70">
              Auto-scan your Google Keep notes with AI to identify and import all recipes into your vault.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-purple-300/60 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Only if not in preview) */}
        {!extractedRecipes && (
          <div className="px-5 sm:px-6 pt-4">
            <div className="bg-[#0b0813] p-1 rounded-xl flex items-center gap-1 text-xs">
              <button
                onClick={() => setScanTab('google_auth')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scanTab === 'google_auth'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Live Google Account Scan</span>
              </button>
              <button
                onClick={() => setScanTab('paste')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  scanTab === 'paste'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-purple-300/60 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Notes</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {extractedRecipes ? (
            /* EXTRACTED PREVIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 font-mono">
                  Found {extractedRecipes.length} Recipe{extractedRecipes.length === 1 ? '' : 's'}:
                </span>
                <span className="text-xs text-purple-400 font-mono">
                  {selectedIndices.size} selected
                </span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {extractedRecipes.map((rec, idx) => {
                  const isSelected = selectedIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-500'
                          : 'bg-white/[0.02] border-white/5 opacity-60'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-purple-500 border-purple-400 text-white'
                            : 'border-white/20 bg-black/40'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-serif font-bold text-sm text-white truncate">
                            {rec.title}
                          </h4>
                          {rec.cookTime && (
                            <span className="text-[10px] text-purple-300 font-mono shrink-0">
                              {rec.cookTime}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-purple-200/70 line-clamp-2 leading-relaxed">
                          {(rec.ingredients || []).map((i: any) => i.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExtractedRecipes(null)}
                  className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveSelected}
                  disabled={savingBatch || selectedIndices.size === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {savingBatch
                      ? 'Saving...'
                      : `Import ${selectedIndices.size} Recipe(s) to Vault`}
                  </span>
                </button>
              </div>
            </div>
          ) : scanTab === 'google_auth' ? (
            /* TAB 1: GOOGLE LIVE OAUTH SCAN */
            <div className="space-y-4 py-2">
              {checkingConnection ? (
                <div className="py-8 flex flex-col items-center gap-2 text-purple-300/60 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <span>Checking Google Auth status...</span>
                </div>
              ) : isGoogleConnected ? (
                <div className="bg-purple-950/40 border border-purple-800/40 rounded-2xl p-6 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-white">
                      Google Account Connected
                    </h4>
                    <p className="text-xs text-purple-200/70 mt-1 max-w-sm mx-auto">
                      Ready to scan your Google Keep and Notes. AI will filter out todos and extract only recipes with clean ingredients.
                    </p>
                  </div>

                  <button
                    onClick={handleLiveGoogleScan}
                    disabled={scanningGoogle}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 mx-auto cursor-pointer transition-all active:scale-95"
                  >
                    <Sparkles className={`w-4 h-4 ${scanningGoogle ? 'animate-spin' : ''}`} />
                    <span>{scanningGoogle ? 'Scanning All Notes with AI...' : 'Scan Google Keep Notes'}</span>
                  </button>
                </div>
              ) : isConfigured ? (
                <div className="bg-purple-950/40 border border-purple-800/40 rounded-2xl p-6 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-white">
                      Connect Google Account
                    </h4>
                    <p className="text-xs text-purple-200/70 mt-1 max-w-sm mx-auto">
                      Sign in with Google to grant read access to your Keep and Notes.
                    </p>
                  </div>

                  <button
                    onClick={handleConnectGoogle}
                    className="px-6 py-3 bg-white text-charcoal-900 hover:bg-white/90 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 mx-auto cursor-pointer transition-all hover:scale-105"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Connect with Google</span>
                  </button>
                </div>
              ) : (
                /* GOOGLE OAUTH SETUP GUIDE */
                <div className="bg-[#100b1a] border border-amber-500/30 rounded-2xl p-5 space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-sm text-white">
                        Google Cloud OAuth Credentials Required
                      </h4>
                      <p className="text-xs text-purple-200/70 mt-0.5 leading-relaxed">
                        To enable direct Google Keep scanning, Google requires registering an OAuth Client ID for your self-hosted server.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#0b0813] rounded-xl p-3.5 border border-white/5 space-y-2.5 text-xs text-purple-200/80">
                    <span className="font-bold text-purple-300 font-mono text-[11px] block">
                      Quick 1-Minute Setup:
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                      <li>
                        Go to{' '}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-400 underline hover:text-purple-300 font-semibold inline-flex items-center gap-0.5"
                        >
                          Google Cloud Credentials <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </li>
                      <li>Create Credentials → <strong>OAuth client ID</strong> → <strong>Web application</strong>.</li>
                      <li>Add this Authorized Redirect URI:</li>
                    </ol>

                    <div className="flex items-center justify-between gap-2 bg-black/50 border border-purple-800/40 rounded-lg p-2 font-mono text-[10px] text-purple-200">
                      <span className="truncate">{callbackUri}</span>
                      <button
                        onClick={copyCallbackUri}
                        className="p-1 text-purple-400 hover:text-white shrink-0 cursor-pointer"
                        title="Copy Redirect URI"
                      >
                        {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-[10px] text-purple-300/60 pt-1">
                      Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> into <code>~/docker/recipeeks/.env</code> on Brettflix.
                    </p>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      onClick={() => setScanTab('paste')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                    >
                      Or switch to &quot;Paste Notes&quot; tab to import without OAuth →
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: PASTE NOTES */
            <form onSubmit={handleScanPastedNotes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                  Paste Note Text (Supports Multiple Recipes)
                </label>
                <textarea
                  rows={8}
                  placeholder={`Paste one or multiple notes from Google Keep:\n\nGrandma's Meatballs:\n• 1 lb ground beef\n• 1/2 cup breadcrumbs\n• 1 egg\n• 2 cloves garlic\n\nChocolate Chip Cookies:\n• 2 cups flour\n• 1 cup butter\n• 1 cup chocolate chips`}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl p-4 text-xs focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-300 font-mono mb-1">
                  Default Rotation Cadence
                </label>
                <select
                  value={defaultFrequency}
                  onChange={(e) => setDefaultFrequency(e.target.value)}
                  className="w-full bg-[#0b0813] border border-purple-900/40 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {Object.entries(FREQUENCY_CONFIG).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-purple-300/60 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scanningPaste || !noteText.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 hover:from-purple-500 hover:to-purple-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${scanningPaste ? 'animate-spin' : ''}`} />
                  <span>{scanningPaste ? 'Scanning Recipes...' : 'Scan Pasted Notes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
