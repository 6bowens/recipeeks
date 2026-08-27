'use client';

import React, { useState } from 'react';
import { AlertOctagon, ShieldAlert, Check, X, Mail, Sparkles } from 'lucide-react';

interface BudgetLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSpend?: number;
  spendLimit?: number;
  message?: string;
}

export function BudgetLimitModal({
  isOpen,
  onClose,
  currentSpend = 20.0,
  spendLimit = 20.0,
  message,
}: BudgetLimitModalProps) {
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);

  if (!isOpen) return null;

  const handleNotifyAdmin = async () => {
    try {
      setNotifying(true);
      const res = await fetch('/api/ai/budget-status', { method: 'POST' });
      if (res.ok) {
        setNotified(true);
      }
    } catch (e) {
      console.error('Failed to notify admin:', e);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-md flex justify-center items-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-950 via-red-900 to-crimson-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <ShieldAlert className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold leading-tight">
                AI Budget Limit Reached
              </h3>
              <p className="text-xs text-rose-200">
                ${currentSpend.toFixed(2)} / ${spendLimit.toFixed(2)} Limit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-charcoal-700 text-xs sm:text-sm leading-relaxed">
          <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 font-medium">
            {message ||
              `You have reached the $${spendLimit.toFixed(2)} AI usage limit. Subsequent AI bookshelf scans, recipe extractions, and cover generation have been paused to protect server resources.`}
          </div>

          <p className="text-xs text-charcoal-500">
            Please notify the administrator to review your usage and increase your monthly AI budget cap.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-charcoal-50 border-t border-charcoal-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-charcoal-200 hover:bg-charcoal-300 text-charcoal-800 rounded-xl font-semibold text-xs transition-colors"
          >
            Dismiss
          </button>

          <button
            onClick={handleNotifyAdmin}
            disabled={notifying || notified}
            className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
              notified
                ? 'bg-emerald-700 text-white'
                : 'bg-red-700 hover:bg-red-800 text-white'
            }`}
          >
            {notified ? (
              <>
                <Check className="w-3.5 h-3.5" /> Admin Notified
              </>
            ) : notifying ? (
              'Notifying...'
            ) : (
              <>
                <Mail className="w-3.5 h-3.5" /> Request Limit Increase
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
