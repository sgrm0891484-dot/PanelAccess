import React, { useState } from 'react';
import { 
  Shield, Terminal, ShieldAlert, LogOut, Search, Filter, 
  Sparkles, CheckCircle2, Lock, ArrowLeft, Cpu, Activity, RefreshCw 
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
}

export const ModuleDashboard: React.FC<ModuleDashboardProps> = ({
  modules,
  session,
  onNavigate,
  onRequestAccess,
  onOpenInspector,
  onToggleModuleStatus,
  onLogout
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'AUTHORIZED' | 'LOCKED'>('ALL');

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
