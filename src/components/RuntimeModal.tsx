import React, { useState } from 'react';
import { X, Sparkles, Shield, Check, Clock, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SecurityModule, RuntimePlan } from '../types';
import { DEFAULT_PLANS } from '../utils/storage';
import { playCyberClick, playCyberBlip } from '../utils/audio';

interface RuntimeModalProps {
  module: SecurityModule | null;
  plans?: RuntimePlan[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (module: SecurityModule, plan: RuntimePlan) => void;
}

export const RuntimeModal: React.FC<RuntimeModalProps> = ({
  module,
  plans,
  isOpen,
  onClose,
  onSelectPlan
}) => {
  const activePlans = plans && plans.length > 0 ? plans : DEFAULT_PLANS;
  const [selectedPlanId, setSelectedPlanId] = useState<string>(activePlans[0]?.id || 'plan-30d');

  if (!isOpen || !module) return null;

  const currentPlan = activePlans.find((p) => p.id === selectedPlanId) || activePlans[0] || DEFAULT_PLANS[2];

  const handleSelectPlan = (plan: RuntimePlan) => {
    playCyberBlip(600);
    setSelectedPlanId(plan.id);
  };

  const handleProceed = () => {
    playCyberClick();
    onSelectPlan(module, currentPlan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="runtime-selection-modal"
        className="w-full max-w-xl rounded-2xl bg-[#081024]/95 border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_40px_rgba(6,182,212,0.25)] relative overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top subtle grid background */}
        <div className="absolute inset-0 cyber-grid-bg opacity-20 pointer-events-none" />

        {/* Close Button */}
        <button
          id="btn-close-runtime-modal"
          onClick={() => {
            playCyberClick();
            onClose();
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60 hover:border-cyan-500/40 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4 sm:mb-5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-400/40 text-[10px] sm:text-xs font-mono-tech text-cyan-300 uppercase tracking-widest font-semibold mb-2">
            <Clock className="w-3 h-3 text-cyan-400" />
            RUNTIME SELECTION
          </div>
          <h2 className="text-xl sm:text-2xl font-cyber font-bold tracking-wider text-white flex items-center gap-2">
            <span>{module.name}</span>
            <span className="text-xs font-mono-tech px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
              {module.version}
            </span>
          </h2>
          <p className="text-xs font-mono-tech text-cyan-400/80 mt-1">
            Choose a runtime duration to authorize and dispatch the module.
          </p>
        </div>

        {/* Plan Cards Stack */}
        <div className="space-y-2.5 sm:space-y-3 overflow-y-auto pr-1 flex-1 relative z-10 custom-scrollbar">
          {activePlans.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            return (
              <div
                key={plan.id}
                id={`plan-card-${plan.id}`}
                onClick={() => handleSelectPlan(plan)}
                className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 relative ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/50'
                    : 'bg-[#060c1d]/80 border-slate-800 hover:border-cyan-500/30 hover:bg-[#09122a]/70'
                }`}
              >
                {/* Left Radio and Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Custom Cyber Radio */}
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                      : 'border-slate-700 bg-slate-900'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-cyber font-bold text-sm sm:text-base tracking-wide text-white">
                        {plan.duration}
                      </span>
                      {plan.badge === 'RECOMMENDED' && (
                        <span className="text-[9px] font-mono-tech px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold uppercase tracking-wider shadow-[0_0_6px_rgba(6,182,212,0.4)]">
                          RECOMMENDED
                        </span>
                      )}
                      {plan.badge === 'LIFETIME' && (
                        <span className="text-[9px] font-mono-tech px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400 text-amber-300 font-bold uppercase tracking-wider">
                          LIFETIME
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono-tech text-slate-400 mt-0.5 line-clamp-1">
                      {plan.description}
                    </p>
                  </div>
                </div>

                {/* Right Price & Pay Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="text-right">
                    <span className="text-base sm:text-xl font-cyber font-bold text-cyan-300">
                      {plan.currency}{plan.price}
                    </span>
                    <div className="text-[9px] font-mono-tech text-slate-500">
                      ONE-TIME
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan);
                      onSelectPlan(module, plan);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-cyber font-bold tracking-wider uppercase transition-all ${
                      isSelected
                        ? 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                        : 'bg-slate-800 text-slate-300 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700'
                    }`}
                  >
                    PAY
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Plan Details & Bottom Proceed CTA */}
        <div className="mt-4 pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="text-xs font-mono-tech text-slate-400 flex items-center gap-1.5">
            <span>SELECTED:</span>
            <strong className="text-cyan-300 font-semibold">{currentPlan.duration}</strong>
            <span className="text-slate-600">|</span>
            <span className="text-white font-bold">{currentPlan.currency}{currentPlan.price}</span>
          </div>

          <button
            id="btn-proceed-checkout"
            onClick={handleProceed}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-cyber font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:shadow-[0_0_28px_rgba(6,182,212,0.7)] transition-all"
          >
            <span>PROCEED TO CHECKOUT</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
