'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import {
  Shield,
  Users,
  BookOpen,
  Layers,
  DollarSign,
  AlertTriangle,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  Check,
  X,
  Sparkles,
  Camera,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
  LogIn,
  UserCheck,
  Eye,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  aiSpendUsd: number;
  spendLimitUsd: number;
  adminNotified: boolean;
  isLimitReached: boolean;
  createdAt: string;
  updatedAt: string;
  stats: {
    cookbooksCount: number;
    recipesCount: number;
    pantryItemsCount: number;
    scanSessionsCount: number;
    aiLogsCount: number;
  };
}

interface AdminMetrics {
  totalUsers: number;
  totalCookbooks: number;
  totalRecipes: number;
  totalPantryItems: number;
  totalScanSessions: number;
  totalAiSpend: number;
  pendingAlerts: number;
}

interface RecentLog {
  id: string;
  actionType: string;
  costUsd: number;
  promptChars: number;
  createdAt: string;
  userEmail: string;
  userName: string;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newSpendLimit, setNewSpendLimit] = useState<number>(20);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // User Inspection & Batch Re-index State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexStatus, setReindexStatus] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleOpenInspect = async (user: AdminUser) => {
    setSelectedUser(user);
    setInspectLoading(true);
    setReindexStatus(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      if (data.success) {
        setInspectData(data.user);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleBatchReindex = async (targetUserId: string, cookbookId?: string, onlyLowCount: boolean = false) => {
    try {
      setIsReindexing(true);
      setReindexStatus({ text: '⚡ Re-indexing cookbooks with Gemini AI (extracting 20-30 real recipes per book)...' });
      const res = await fetch(`/api/admin/users/${targetUserId}/reindex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookbookId, onlyLowCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to re-index');

      setReindexStatus({
        text: `✓ Successfully re-indexed ${data.processedCount} cookbooks with ${data.totalRecipesIndexed} authentic recipes!`,
      });

      // Refresh inspected user data & main table
      const updatedRes = await fetch(`/api/admin/users/${targetUserId}`);
      const updatedData = await updatedRes.json();
      if (updatedData.success) {
        setInspectData(updatedData.user);
      }
      await fetchAdminData();
    } catch (err) {
      setReindexStatus({ text: `✗ Error: ${(err as Error).message}`, isError: true });
    } finally {
      setIsReindexing(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load admin data');
      const data = await res.json();
      setMetrics(data.metrics);
      setUsers(data.users || []);
      setRecentLogs(data.recentLogs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email === '6bowens@gmail.com') {
      fetchAdminData();
    }
  }, [session]);

  const handleUpdateLimit = async (userId: string, limit: number) => {
    try {
      setActionLoading(userId);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spendLimitUsd: limit }),
      });
      if (!res.ok) throw new Error('Failed to update limit');
      setEditingUserId(null);
      await fetchAdminData();
    } catch (e) {
      alert('Error updating limit: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetSpend = async (userId: string) => {
    if (!confirm('Reset AI spend to $0.00 for this user?')) return;
    try {
      setActionLoading(userId);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetSpend: true }),
      });
      if (!res.ok) throw new Error('Failed to reset spend');
      await fetchAdminData();
    } catch (e) {
      alert('Error resetting spend: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAlert = async (userId: string) => {
    try {
      setActionLoading(userId);
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAlert: true }),
      });
      if (!res.ok) throw new Error('Failed to clear alert');
      await fetchAdminData();
    } catch (e) {
      alert('Error clearing alert: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (user: AdminUser) => {
    if (!confirm(`Switch session and log in as ${user.email}?`)) return;
    try {
      setActionLoading(user.id);
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize session');

      await signIn('impersonate', {
        targetUserId: data.targetUserId,
        adminEmail: data.adminEmail,
        secretKey: data.secretKey,
        callbackUrl: '/library',
      });
    } catch (e) {
      alert('Error logging in as user: ' + (e as Error).message);
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to delete ${user.email} and all their cookbooks/pantry items?`)) return;
    try {
      setActionLoading(user.id);
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete user');
      }
      await fetchAdminData();
    } catch (e) {
      alert('Error deleting user: ' + (e as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-charcoal-400" />
      </div>
    );
  }

  if (session?.user?.email !== '6bowens@gmail.com') {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl shadow-xl border border-red-200 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-serif font-bold text-charcoal-900">Admin Privileges Required</h2>
        <p className="text-xs text-charcoal-600">
          This portal is restricted to system administrators. Log in with your admin credentials to continue.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold text-xs transition-colors"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    return u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-charcoal-950 via-charcoal-900 to-crimson-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-red-500/20 border border-red-400/30 text-rose-300 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-300" /> Admin Command Center
            </span>
            <span className="text-xs text-charcoal-400 font-mono">6bowens@gmail.com</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold leading-tight">
            User Analytics & System Metrics
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-300 mt-1 max-w-2xl">
            Live overview of all registered chefs, indexed cookbook libraries, pantry inventories, and Gemini AI spend.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-xs flex items-center gap-2 backdrop-blur-md transition-all shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-serif font-bold text-charcoal-900">{metrics.totalUsers}</div>
            <p className="text-[11px] text-charcoal-500 mt-1">Active registered accounts</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Cookbooks</span>
              <BookOpen className="w-4 h-4 text-crimson-600" />
            </div>
            <div className="text-3xl font-serif font-bold text-charcoal-900">{metrics.totalCookbooks}</div>
            <p className="text-[11px] text-charcoal-500 mt-1">{metrics.totalRecipes} recipes indexed</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Pantry Items</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-serif font-bold text-charcoal-900">{metrics.totalPantryItems}</div>
            <p className="text-[11px] text-charcoal-500 mt-1">Ingredients across kitchens</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-charcoal-200/80 shadow-xs">
            <div className="flex items-center justify-between text-charcoal-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total AI Spend</span>
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-serif font-bold text-charcoal-900">${metrics.totalAiSpend.toFixed(2)}</div>
            <p className="text-[11px] text-charcoal-500 mt-1">{metrics.totalScanSessions} total vision scans</p>
          </div>

          <div className={`p-5 rounded-2xl border shadow-xs ${
            metrics.pendingAlerts > 0
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-white border-charcoal-200/80'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Budget Alerts</span>
              <AlertTriangle className={`w-4 h-4 ${metrics.pendingAlerts > 0 ? 'text-rose-600' : 'text-charcoal-400'}`} />
            </div>
            <div className="text-3xl font-serif font-bold">
              {metrics.pendingAlerts}
            </div>
            <p className="text-[11px] mt-1 opacity-80">
              {metrics.pendingAlerts > 0 ? 'Users requested limit increase' : 'All users within budget'}
            </p>
          </div>
        </div>
      )}

      {/* Users Management Section */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-charcoal-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-charcoal-900">User Directory</h2>
            <p className="text-xs text-charcoal-500">Manage user quotas, inspect collections, and adjust spend limits.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-charcoal-50 rounded-xl border border-charcoal-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 text-charcoal-900"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal-700">
            <thead className="bg-charcoal-50/80 text-charcoal-600 text-[11px] uppercase tracking-wider font-semibold border-b border-charcoal-200">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">User / Email</th>
                <th className="py-3.5 px-4">Cookbooks & Recipes</th>
                <th className="py-3.5 px-4">Pantry Inventory</th>
                <th className="py-3.5 px-4">AI Spend & Cap</th>
                <th className="py-3.5 px-4">Status / Alert</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-charcoal-400">
                    No users matching &ldquo;{searchQuery}&rdquo;
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const spendPercent = Math.min(100, Math.round((user.aiSpendUsd / user.spendLimitUsd) * 100));
                  const isEditing = editingUserId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-charcoal-50/50 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-semibold text-charcoal-900 flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {user.email === '6bowens@gmail.com' && (
                            <span className="bg-crimson-100 text-crimson-800 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-charcoal-500">{user.email}</div>
                        <div className="text-[10px] text-charcoal-400 mt-0.5">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Cookbooks & Recipes */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-charcoal-900">
                          {user.stats.cookbooksCount} <span className="font-normal text-charcoal-500 text-[11px]">books</span>
                        </div>
                        <div className="text-[11px] text-charcoal-500">
                          {user.stats.recipesCount} indexed recipes
                        </div>
                      </td>

                      {/* Pantry Inventory */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-charcoal-900">
                          {user.stats.pantryItemsCount} <span className="font-normal text-charcoal-500 text-[11px]">items</span>
                        </div>
                        <div className="text-[11px] text-charcoal-500">
                          {user.stats.scanSessionsCount} photo sessions
                        </div>
                      </td>

                      {/* AI Spend & Cap */}
                      <td className="py-4 px-4 min-w-[150px]">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className={user.isLimitReached ? 'text-rose-700 font-bold' : 'text-charcoal-900'}>
                            ${user.aiSpendUsd.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-charcoal-500">
                            / ${user.spendLimitUsd.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-charcoal-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              user.isLimitReached
                                ? 'bg-rose-600'
                                : spendPercent > 75
                                ? 'bg-amber-500'
                                : 'bg-emerald-600'
                            }`}
                            style={{ width: `${spendPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Status / Alert */}
                      <td className="py-4 px-4">
                        {user.adminNotified ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Requested Limit +
                          </span>
                        ) : user.isLimitReached ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Limit Hit ($20)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right space-y-1">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              value={newSpendLimit}
                              onChange={(e) => setNewSpendLimit(Number(e.target.value))}
                              className="w-16 px-2 py-1 bg-charcoal-50 border border-red-300 rounded text-xs"
                              min={5}
                              max={500}
                            />
                            <button
                              onClick={() => handleUpdateLimit(user.id, newSpendLimit)}
                              disabled={actionLoading === user.id}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                              title="Save Limit"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="p-1 bg-charcoal-200 hover:bg-charcoal-300 text-charcoal-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Inspect User Drawer Button */}
                            <button
                              onClick={() => handleOpenInspect(user)}
                              className="px-2.5 py-1 bg-charcoal-900 hover:bg-black text-white rounded font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                              title={`Inspect ${user.email}'s cookbooks & library`}
                            >
                              <Eye className="w-3 h-3 text-rose-300" />
                              <span>Inspect</span>
                            </button>

                            {/* Quick +$10 Limit Button */}
                            <button
                              onClick={() => handleUpdateLimit(user.id, user.spendLimitUsd + 10)}
                              disabled={actionLoading === user.id}
                              className="px-2 py-1 bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-800 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                              title="Add $10 to spend limit"
                            >
                              +$10
                            </button>

                            {/* Reset Spend */}
                            <button
                              onClick={() => handleResetSpend(user.id)}
                              disabled={actionLoading === user.id}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded font-semibold text-[10px] transition-colors cursor-pointer"
                              title="Reset user AI spend back to $0"
                            >
                              Reset $0
                            </button>

                            {/* Custom Edit Limit */}
                            <button
                              onClick={() => {
                                setEditingUserId(user.id);
                                setNewSpendLimit(user.spendLimitUsd);
                              }}
                              className="p-1 text-charcoal-500 hover:text-charcoal-800 hover:bg-charcoal-100 rounded cursor-pointer"
                              title="Custom limit"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>

                            {/* Log in as user (Impersonate) */}
                            {user.email !== '6bowens@gmail.com' && (
                              <button
                                onClick={() => handleImpersonate(user)}
                                disabled={actionLoading === user.id}
                                className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                                title={`Switch session and log in as ${user.email}`}
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Log In As</span>
                              </button>
                            )}

                            {/* Delete User (disabled for admin oneself) */}
                            {user.email !== '6bowens@gmail.com' && (
                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={actionLoading === user.id}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded cursor-pointer"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER INSPECTION & BATCH RE-INDEX DRAWER */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 bg-charcoal-950 text-white flex items-start justify-between gap-4 border-b border-charcoal-800">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                    User Inspection
                  </span>
                  <span className="text-xs text-charcoal-400 font-mono">
                    ID: {selectedUser.id}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-white truncate">
                  {selectedUser.name}
                </h3>
                <p className="text-xs text-charcoal-300">{selectedUser.email}</p>
              </div>

              <button
                onClick={() => {
                  setSelectedUser(null);
                  setInspectData(null);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-charcoal-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Re-indexing Status Banner */}
            {reindexStatus && (
              <div
                className={`p-4 text-xs font-semibold flex items-center gap-2 ${
                  reindexStatus.isError
                    ? 'bg-rose-50 text-rose-900 border-b border-rose-200'
                    : 'bg-emerald-50 text-emerald-950 border-b border-emerald-200'
                }`}
              >
                {reindexStatus.isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{reindexStatus.text}</span>
              </div>
            )}

            {/* Drawer Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-charcoal-800">
              {inspectLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-red-700" />
                  <p className="text-xs text-charcoal-500 font-medium">Loading user library and metrics...</p>
                </div>
              ) : (
                <>
                  {/* AI Spend Overview */}
                  <div className="bg-charcoal-50 border border-charcoal-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-charcoal-900 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-amber-600" /> AI Spend & Limit
                      </span>
                      <span className="font-mono text-charcoal-700">
                        ${selectedUser.aiSpendUsd.toFixed(2)} / ${selectedUser.spendLimitUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-charcoal-200 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((selectedUser.aiSpendUsd / selectedUser.spendLimitUsd) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-charcoal-500">
                      <span>Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateLimit(selectedUser.id, selectedUser.spendLimitUsd + 10)}
                          className="px-2 py-0.5 bg-white border border-charcoal-300 hover:bg-charcoal-100 rounded font-semibold text-charcoal-800 cursor-pointer"
                        >
                          +$10 Limit
                        </button>
                        <button
                          onClick={() => handleResetSpend(selectedUser.id)}
                          className="px-2 py-0.5 bg-amber-100 border border-amber-300 hover:bg-amber-200 rounded font-semibold text-amber-900 cursor-pointer"
                        >
                          Reset Spend
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* BATCH RE-INDEX ACTIONS CARD */}
                  <div className="bg-gradient-to-br from-charcoal-900 to-crimson-950 text-white rounded-2xl p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-rose-400" />
                          <span>Gemini AI Recipe Indexer</span>
                        </span>
                        <h4 className="text-sm font-serif font-bold text-white">
                          Cookbook Extraction & Refresh
                        </h4>
                      </div>

                      <span className="bg-white/10 text-rose-200 text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                        {inspectData?.cookbooks?.length || 0} Books Total
                      </span>
                    </div>

                    <p className="text-xs text-charcoal-300 leading-relaxed">
                      Automatically queries Gemini AI to extract 20–30 authentic recipes with print page numbers, times, and structured ingredients for all cookbooks.
                    </p>

                    <div className="flex items-center gap-2.5 flex-wrap pt-1">
                      {/* 1-Click Re-index All */}
                      <button
                        onClick={() => handleBatchReindex(selectedUser.id, undefined, false)}
                        disabled={isReindexing || (inspectData?.cookbooks?.length || 0) === 0}
                        className="px-4 py-2.5 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:from-red-500 hover:to-rose-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
                        <span>{isReindexing ? 'Re-Indexing in Progress...' : '⚡ Re-Index All Cookbooks'}</span>
                      </button>

                      {/* Re-index Low-Count Books Only */}
                      <button
                        onClick={() => handleBatchReindex(selectedUser.id, undefined, true)}
                        disabled={isReindexing || (inspectData?.cookbooks?.length || 0) === 0}
                        className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-charcoal-200 hover:text-white disabled:opacity-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        title="Only re-indexes books with 5 or fewer recipes"
                      >
                        <Layers className="w-3.5 h-3.5 text-rose-300" />
                        <span>Fix Low-Recipe Books (&le; 5)</span>
                      </button>
                    </div>
                  </div>

                  {/* Cookbooks List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-600 font-mono flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-red-700" />
                        <span>Cookbooks Library ({inspectData?.cookbooks?.length || 0})</span>
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {(inspectData?.cookbooks || []).length === 0 ? (
                        <p className="text-xs text-charcoal-400 py-6 text-center bg-charcoal-50 rounded-xl border border-charcoal-200">
                          This user has not scanned or added any cookbooks yet.
                        </p>
                      ) : (
                        inspectData.cookbooks.map((book: any) => (
                          <div
                            key={book.id}
                            className="bg-charcoal-50/70 border border-charcoal-200 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-charcoal-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className="w-9 h-12 rounded shadow-xs flex items-center justify-center text-white text-[10px] font-serif font-bold text-center p-1 shrink-0 overflow-hidden bg-cover bg-center"
                                style={{
                                  backgroundColor: book.coverColor || '#8B0000',
                                  backgroundImage: book.coverImageUrl ? `url(${book.coverImageUrl})` : undefined,
                                }}
                              >
                                {!book.coverImageUrl && book.title.slice(0, 8)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-bold text-charcoal-900 truncate">
                                  {book.title}
                                </h5>
                                <p className="text-[11px] text-charcoal-500 truncate">
                                  {book.author || 'Unknown Author'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                                  book.totalRecipes >= 15
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : book.totalRecipes > 4
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {book.totalRecipes} recipes
                              </span>

                              {/* Single Book Re-Index Button */}
                              <button
                                onClick={() => handleBatchReindex(selectedUser.id, book.id, false)}
                                disabled={isReindexing}
                                className="p-1.5 text-charcoal-500 hover:text-red-700 hover:bg-white rounded-lg border border-charcoal-200 cursor-pointer transition-colors"
                                title={`Re-index "${book.title}"`}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-charcoal-50 border-t border-charcoal-200 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setInspectData(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 cursor-pointer"
              >
                Close Drawer
              </button>

              {selectedUser.email !== '6bowens@gmail.com' && (
                <button
                  onClick={() => handleImpersonate(selectedUser)}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log In As {selectedUser.name}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live AI Audit Trail */}
      <div className="bg-white rounded-2xl border border-charcoal-200/80 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-charcoal-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-700" /> Recent AI Audit Activity
            </h2>
            <p className="text-xs text-charcoal-500">Live feed of AI image scans and generation events.</p>
          </div>
        </div>

        <div className="divide-y divide-charcoal-100">
          {recentLogs.length === 0 ? (
            <p className="text-xs text-charcoal-400 py-4">No AI logs recorded yet.</p>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-red-600" />
                  <span className="font-semibold text-charcoal-900 capitalize">
                    {log.actionType.replace('_', ' ')}
                  </span>
                  <span className="text-charcoal-400">by</span>
                  <span className="text-charcoal-700 font-medium">{log.userEmail}</span>
                </div>

                <div className="flex items-center gap-4 text-charcoal-500 text-[11px]">
                  <span className="font-mono text-emerald-700 font-semibold">+${log.costUsd.toFixed(3)}</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
