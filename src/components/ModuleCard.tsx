import React from 'react';
import { 
  Shield, Cpu, Zap, Terminal, Radio, Crosshair, Eye, 
  Lock, CheckCircle2, ArrowRight, Activity, ToggleLeft, ToggleRight, Sparkles 
} from 'lucide-react';
import { SecurityModule } from '../types';
import { playCyberClick, playCyberBlip } from '../utils/audio';

interface ModuleCardProps {
  module: SecurityModule;
  isAssigned?: boolean;
  onRequestAccess: (module: SecurityModule) => void;
  onOpenInspector: (module: SecurityModule) => void;
  onToggleStatus: (moduleId: string) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  isAssigned = true,
  onRequestAccess,
  onOpenInspector,
  onToggleStatus
}) => {
  const getIcon = (type: SecurityModule['iconType']) => {
    switch (type) {
      case 'shield': return Shield;
      case 'cpu': return Cpu;
      case 'zap': return Zap;
      case 'terminal': return Terminal;
      case 'radio': return Radio;
      case 'crosshair': return Crosshair;
      case 'eye': return Eye;
      default: return Shield;
    }
  };

  const IconComponent = getIcon(module.iconType);
  const isOnline = module.status === 'ACTIVE';

  return (
    <div
      id={`module-card-${module.id}`}
      className={`w-full rounded-xl border transition-all duration-300 p-4 sm:p-5 relative overflow-hidden backdrop-blur-md ${
        module.isAuthorized
          ? 'bg-[#09152e]/85 border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:border-cyan-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]'
          : 'bg-[#080e1f]/75 border-slate-800 hover:border-cyan-500/30 hover:bg-[#0a1226]/85'
      }`}
    >
      {/* Top micro status bar */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Left Icon and Title */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center border transition-all ${
            module.isAuthorized
              ? 'bg-cyan-950/70 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'bg-slate-900/80 border-slate-700/70 text-slate-400'
          }`}>
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-cyber font-bold text-base sm:text-lg tracking-wide text-white">
                {module.name}
              </h3>
              <span className="text-[10px] font-mono-tech px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-semibold">
                {module.version}
              </span>
            </div>
            <p className="text-[11px] font-mono-tech text-cyan-400/70 tracking-tight">
              {module.subtitle}
            </p>
          </div>
        </div>

        {/* Right Switch / Status Indicator */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-mono-tech font-bold uppercase ${
              isOnline ? 'text-emerald-400' : 'text-slate-500'
            }`}>
              {isOnline ? 'ONLINE' : 'STANDBY'}
            </span>
            <button
              id={`btn-toggle-${module.id}`}
              onClick={(e) => {
                e.stopPropagation();
                playCyberBlip(isOnline ? 350 : 750);
                onToggleStatus(module.id);
              }}
              title={isOnline ? 'Switch to Standby' : 'Activate Module'}
              className="text-slate-400 hover:text-cyan-300 transition-colors"
            >
              {isOnline ? (
                <ToggleRight className="w-6 h-6 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs font-mono-tech text-slate-300/85 line-clamp-2 mb-3 leading-relaxed">
        {module.description}
      </p>

      {/* Feature tags */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        {module.tags.map((tag) => (
          <span
            key={tag}
            className="text-[9px] font-mono-tech px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-400 font-medium"
          >
            #{tag}
          </span>
        ))}
        {module.activePlan && (
          <span className="text-[9px] font-mono-tech px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            {module.activePlan}
          </span>
        )}
      </div>

      {/* Bottom Footer Action Bar */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
        {/* Pass Status */}
        <div className="flex items-center gap-1.5 text-xs font-mono-tech">
          {!isAssigned ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              ACCESS NOT ASSIGNED
            </span>
          ) : module.isAuthorized ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              AUTHORIZED & ACTIVE
            </span>
          ) : (
            <span className="text-amber-400/90 font-medium flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              REQUIRES ACCESS PASS
            </span>
          )}
        </div>

        {/* Action Button */}
        <div>
          {!isAssigned ? (
            <span
              id={`btn-unassigned-${module.id}`}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 font-mono-tech text-xs font-semibold uppercase tracking-wider inline-block cursor-not-allowed"
            >
              ACCESS NOT ASSIGNED
            </span>
          ) : module.isAuthorized ? (
            <button
              id={`btn-launch-${module.id}`}
              onClick={() => {
                playCyberClick();
                onOpenInspector(module);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 font-mono-tech text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.25)] hover:shadow-[0_0_15px_rgba(6,182,212,0.45)]"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>LAUNCH DIAGNOSTICS</span>
            </button>
          ) : (
            <button
              id={`btn-request-${module.id}`}
              onClick={() => {
                playCyberClick();
                onRequestAccess(module);
              }}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-cyber text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.7)]"
            >
              <span>REQUEST ACCESS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
