import React, { useState } from 'react';
import { 
  Shield, Terminal, ShieldAlert, LogOut, Search, Filter, 
  Sparkles, CheckCircle2, Lock, ArrowLeft, Cpu, Activity, RefreshCw,
  Copy, User, Clock, DollarSign, Key, Layers
} from 'lucide-react';
import { SecurityModule, RoutePath, UserSession } from '../types';
import { ModuleCard } from './ModuleCard';
import { playCyberClick, playCyberBlip } from '../utils/audio';

interface ModuleDashboardProps {
  modules: SecurityModule[];
  session: UserSession | null;
  onNavigate: (path: RoutePath) => void;
  onRequestAccess: (module: SecurityModule) => void;
  onOpenInspector: (module: SecurityModule) => void;
  onToggleModuleStatus: (moduleId: string) => void;
  onLogout: () => void;
  onShowToast?: (title: string, msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const ModuleDashboard: React.FC<ModuleDashboardProps> = ({
  modules,
  session,
  onNavigate,
  onRequestAccess,
  onOpenInspector,
  onToggleModuleStatus,
  onLogout,
  onShowToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'AUTHORIZED' | 'LOCKED'>('ALL');

  const customerId = session?.customerId || (session?.authorizedId?.startsWith('CUST-') ? session.authorizedId : 'CUST-001');
  const username = session?.authorizedId || 'AGENT_01';
  const status = session ? 'ACTIVE' : 'OFFLINE';
  const currentPrice = session?.useDefaultPrice ? '₹150 (STANDARD RATE)' : (session?.customPrice ? `₹${session.customPrice} (CUSTOM)` : '₹150');
  const expiryDate = session?.expiryDate || '2026-09-30';

  const isModuleAssigned = (modId: string) => {
    if (!session) return true;
    const assigned = session.assignedModules;
    if (!assigned || assigned.length === 0 || assigned.includes('ALL')) return true;
    return assigned.includes(modId);
  };

  const handleCopy = (text: string, label: string) => {
    playCyberBlip(1100);
    navigator.clipboard.writeText(text);
    if (onShowToast) {
      onShowToast('Copied', 'Copied successfully.', 'success');
    }
  };

  const filteredModules = modules.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'AUTHORIZED') return m.isAuthorized;
    if (filterType === 'LOCKED') return !m.isAuthorized;
    return true;
  });

  const authorizedCount = modules.filter((m) => m.isAuthorized).length;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Gateway Title Card */}
      <div 
        id="gateway-authenticated-banner"
        className="w-full rounded-2xl bg-[#081126]/90 border border-cyan-500/35 p-4 sm:p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden"
      >
        <div className="absolute inset-0 cyber-grid-bg opacity-20 pointer-events-none" />

        {/* Top Status & Nav Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-cyan-500/20 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono-tech text-emerald-400 font-bold uppercase tracking-widest">
                COMMAND GATEWAY // AUTHENTICATED
              </span>
            </div>
            <div className="text-xs font-mono-tech text-cyan-400/80 mt-0.5">
              SESSION: <strong className="text-white">{session?.authorizedId || 'AGENT_01'}</strong> | ROLE: {session?.role || 'AGENT'}
            </div>
          </div>

          {/* Top Navigation Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-nav-console"
              onClick={() => {
                playCyberClick();
                onNavigate('/console');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono-tech text-xs font-medium flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)] hover:border-cyan-400"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>CONSOLE</span>
            </button>

            <button
              id="btn-nav-back-gateway"
              onClick={() => {
                playCyberClick();
                onLogout();
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-mono-tech text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>

        {/* Access Modules Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-cyber font-bold tracking-wider text-white flex items-center gap-2.5">
              <Cpu className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.7)]" />
              ACCESS MODULES
            </h1>
            <p className="text-xs sm:text-sm font-mono-tech text-cyan-300/80 mt-1">
              Select a module to request access and initialize defense runtime
            </p>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-lg bg-[#04091a] border border-cyan-500/30 text-xs font-mono-tech">
              <span className="text-slate-400">AUTHORIZED: </span>
              <strong className="text-emerald-400">{authorizedCount}</strong>
              <span className="text-slate-600"> / {modules.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MY ACCOUNT SECTION (CUSTOMER PRIVATE VIEW) */}
      {/* ==================================================== */}
      <div 
        id="my-account-panel"
        className="w-full rounded-2xl bg-[#081024]/95 border border-cyan-500/30 p-4 sm:p-5 backdrop-blur-xl shadow-[0_0_25px_rgba(6,182,212,0.12)] relative overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <h2 className="font-cyber font-bold text-sm sm:text-base text-white tracking-wider">
              MY ACCOUNT
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono-tech font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACCOUNT STATUS: {status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono-tech">
          {/* Item 1: Customer ID + Copy Button */}
          <div className="p-3 rounded-xl bg-[#040816] border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">CUSTOMER ID</span>
              <span className="text-cyan-400 font-bold">{customerId}</span>
            </div>
            <button
              id="btn-copy-customer-id"
              onClick={() => handleCopy(customerId, 'Customer ID')}
              className="w-full py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <Copy className="w-3 h-3" />
              <span>COPY CUSTOMER ID</span>
            </button>
          </div>

          {/* Item 2: Username + Copy Button */}
          <div className="p-3 rounded-xl bg-[#040816] border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">USERNAME</span>
              <span className="text-white font-bold">{username}</span>
            </div>
            <button
              id="btn-copy-username"
              onClick={() => handleCopy(username, 'Username')}
              className="w-full py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
            >
              <Copy className="w-3 h-3" />
              <span>COPY USERNAME</span>
            </button>
          </div>

          {/* Item 3: Current Price & Expiry */}
          <div className="p-3 rounded-xl bg-[#040816] border border-cyan-500/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">CURRENT PRICE</span>
              <span className="text-emerald-400 font-bold">{currentPrice}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">EXPIRY DATE</span>
              <span className="text-white font-bold">{expiryDate}</span>
            </div>
          </div>
        </div>

        {/* Item 4: Assigned Modules Row */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono-tech">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-semibold">ASSIGNED MODULES:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(!session?.assignedModules || session.assignedModules.length === 0 || session.assignedModules.includes('ALL')) ? (
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                ALL MODULES GRANTED
              </span>
            ) : (
              session.assignedModules.map((modId) => {
                const mod = modules.find(m => m.id === modId);
                return (
                  <span key={modId} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-semibold">
                    {mod?.name || modId}
                  </span>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-modules"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search defense modules, tags or protocols..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#060d20] border border-cyan-500/25 text-white font-mono-tech text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          {(['ALL', 'AUTHORIZED', 'LOCKED'] as const).map((filter) => {
            const isActive = filterType === filter;
            return (
              <button
                key={filter}
                id={`filter-btn-${filter.toLowerCase()}`}
                onClick={() => {
                  playCyberBlip(550);
                  setFilterType(filter);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-tech font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                    : 'bg-[#081126] border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30'
                }`}
              >
                {filter === 'ALL' && 'ALL MODULES'}
                {filter === 'AUTHORIZED' && 'AUTHORIZED'}
                {filter === 'LOCKED' && 'LOCKED (PASS REQ)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vertically Stacked Module Cards List */}
      <div className="space-y-3.5 sm:space-y-4" id="modules-list-container">
        {filteredModules.length > 0 ? (
          filteredModules.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              isAssigned={isModuleAssigned(mod.id)}
              onRequestAccess={onRequestAccess}
              onOpenInspector={onOpenInspector}
              onToggleStatus={onToggleModuleStatus}
            />
          ))
        ) : (
          <div className="text-center py-12 rounded-2xl bg-[#081026]/60 border border-slate-800 p-6 space-y-3">
            <Shield className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-mono-tech text-sm text-slate-400">
              No security modules found matching &quot;{searchQuery}&quot;
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('ALL');
              }}
              className="text-xs font-mono-tech text-cyan-400 underline hover:text-cyan-300"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
