import React from 'react';
import { Shield, Terminal, Volume2, VolumeX, LogOut } from 'lucide-react';
import { RoutePath, UserSession } from '../types';
import { playCyberClick, playCyberBlip } from '../utils/audio';

interface HeaderProps {
  currentPath: RoutePath;
  onNavigate: (path: RoutePath) => void;
  session: UserSession | null;
  onLogout: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAdminLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  session,
  onLogout,
  soundEnabled,
  onToggleSound,
  onOpenAdminLogin
}) => {
  return (
    <header className="w-full border-b border-cyan-500/20 bg-[#030712]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top micro-banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/60 to-cyan-950/40 border-b border-cyan-500/10 px-3 py-1 flex items-center justify-between text-[11px] font-mono-tech text-cyan-400/80">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="truncate tracking-wider">GATEWAY STATUS: <strong className="text-emerald-400">ONLINE (PROTECTED)</strong></span>
          <span className="hidden sm:inline text-cyan-700">|</span>
          <span className="hidden sm:inline text-slate-400">QUANTUM ROOT: 0x9B4E...A1F2</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-slate-400">LATENCY: <span className="text-cyan-300">1.2ms</span></span>
          {session && <span className="text-cyan-500/60">NODE: ASIA-SOUTH1</span>}
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        {/* Left branding - Clicking logo triggers Admin Portal Login */}
        <div 
          onClick={() => {
            playCyberClick();
            onOpenAdminLogin();
          }}
          className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group select-none"
          id="header-brand-logo"
          title="Admin Control Matrix Portal"
        >
          <div className="relative">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.7)] group-hover:border-cyan-300 transition-all duration-300">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[11px] sm:text-xs font-mono-tech text-cyan-400 tracking-widest uppercase font-semibold">
                VERIFY //
              </span>
              <span className="text-base sm:text-2xl font-cyber font-bold tracking-wider text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                BUY
              </span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-mono-tech uppercase font-medium">
                v4.8
              </span>
              <span className="hidden lg:inline-block text-[9px] font-mono-tech text-slate-400 border-l border-slate-700 pl-2 ml-0.5 tracking-tight">
                ENTERPRISE
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-cyan-400/70 font-mono-tech tracking-wider uppercase">
              KEY BUY AND VERIFY GATEWAY
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Console / Terminal button - only shown during active session */}
          {session && (
            <button
              id="header-btn-console"
              onClick={() => {
                playCyberClick();
                onNavigate('/console');
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono-tech flex items-center gap-1.5 transition-all duration-200 ${
                currentPath === '/console'
                  ? 'bg-cyan-500 text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                  : 'bg-slate-900/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 border border-cyan-500/25 hover:border-cyan-400/50'
              }`}
              title="Open Console Terminal"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden xs:inline tracking-wide">CONSOLE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
            </button>
          )}

          {/* Audio toggle button - only shown during active session */}
          {session && (
            <button
              id="header-btn-audio-toggle"
              onClick={() => {
                onToggleSound();
                playCyberBlip(soundEnabled ? 300 : 700);
              }}
              className={`p-1.5 sm:p-2 rounded-md border text-xs transition-all duration-200 ${
                soundEnabled
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900/80 border-slate-700 text-slate-500'
              }`}
              title={soundEnabled ? 'Mute Cyber Audio' : 'Enable Cyber Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}

          {/* Session / Logout */}
          {session && (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800 ml-1">
              <button
                id="header-btn-logout"
                onClick={() => {
                  playCyberClick();
                  onLogout();
                }}
                className="p-1.5 rounded-md bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs transition-all"
                title="Disconnect Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

