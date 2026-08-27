'use client';

import React, { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { UserCheck, LogOut, Loader2, Shield } from 'lucide-react';

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const [exiting, setExiting] = useState(false);

  const isImpersonating = (session?.user as any)?.isImpersonating;
  const originalAdminEmail = (session?.user as any)?.originalAdminEmail;

  if (!isImpersonating) return null;

  const handleExitImpersonation = async () => {
    try {
      setExiting(true);
      const res = await fetch('/api/admin/exit-impersonation', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to exit impersonation');
      const data = await res.json();

      await signIn('impersonate', {
        targetUserId: data.targetUserId,
        adminEmail: data.adminEmail,
        secretKey: data.secretKey,
        callbackUrl: '/admin',
      });
    } catch (e) {
      alert('Error returning to admin: ' + (e as Error).message);
      setExiting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-rose-700 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-4 sticky top-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 max-w-2xl truncate">
        <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
          <Shield className="w-3 h-3 text-amber-300" /> Admin Mode
        </span>
        <span className="truncate">
          Viewing Recipeeks as: <strong className="text-white underline">{session?.user?.email}</strong>
        </span>
      </div>

      <button
        onClick={handleExitImpersonation}
        disabled={exiting}
        className="px-3 py-1 bg-black/40 hover:bg-black/60 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition-all shrink-0 cursor-pointer shadow-xs border border-white/20"
      >
        {exiting ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Switching...</span>
          </>
        ) : (
          <>
            <LogOut className="w-3 h-3" />
            <span>Exit & Return to Admin</span>
          </>
        )}
      </button>
    </div>
  );
}
