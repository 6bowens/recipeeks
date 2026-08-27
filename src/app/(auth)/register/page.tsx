'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ChefHat, Lock, Mail, User, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');

      // Auto sign in after registration
      const loginRes = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (loginRes?.error) {
        router.push('/login');
      } else {
        router.push('/scan');
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl border border-amber-900/10 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-charcoal-900">
            Create Your Recipeeks Account
          </h1>
          <p className="text-xs text-charcoal-500">
            Join Recipeeks to digitize your library and discover what to cook.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-terracotta-50 border border-terracotta-200 rounded-xl text-xs text-terracotta-800 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Your Name / Chef Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="text"
                required
                placeholder="Chef Brett"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-amber-50/30 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-charcoal-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="email"
                required
                placeholder="chef@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-amber-50/30 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-charcoal-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-amber-50/30 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-charcoal-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-charcoal-500 pt-2 border-t border-charcoal-100">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-amber-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
