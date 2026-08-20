import React from 'react';
import { X, QrCode, ShieldCheck, ArrowRight, CreditCard, Smartphone, CheckCircle, Info } from 'lucide-react';
import { SecurityModule, RuntimePlan } from '../types';
import { playCyberClick } from '../utils/audio';

interface CheckoutModalProps {
  module: SecurityModule | null;
  plan: RuntimePlan | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  module,
  plan,
  isOpen,
  onClose,
  onProceedToPayment
}) => {
  if (!isOpen || !module || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="checkout-modal-panel"
        className="w-full max-w-md rounded-2xl bg-[#081024]/95 border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_40px_rgba(6,182,212,0.25)] relative overflow-hidden flex flex-col"
      >
        {/* Subtle grid background */}
        <div className="absolute inset-0 cyber-grid-bg opacity-20 pointer-events-none" />

        {/* Close Button */}
        <button
          id="btn-close-checkout-modal"
          onClick={() => {
            playCyberClick();
            onClose();
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60 hover:border-cyan-500/40 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header */}
        <div className="mb-5 relative z-10">
          <div className="text-[10px] sm:text-xs font-mono-tech text-cyan-400/80 uppercase tracking-widest font-semibold">
            CHECKOUT // {module.name}
          </div>
          <h2 className="text-xl sm:text-2xl font-cyber font-bold tracking-wider text-white mt-0.5">
            PAYMENT GATEWAY
          </h2>
        </div>

        {/* Summary Card */}
        <div className="rounded-xl bg-[#050b1a]/90 border border-cyan-500/25 p-4 space-y-3.5 relative z-10 mb-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <span className="text-xs font-mono-tech text-slate-400">Selected Module:</span>
            <span className="text-xs font-cyber font-bold text-white tracking-wide">{module.name}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <span className="text-xs font-mono-tech text-slate-400">Selected Runtime:</span>
            <span className="text-xs font-mono-tech font-bold text-cyan-300">{plan.duration}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <span className="text-xs font-mono-tech text-slate-400">Total Payable:</span>
            <span className="text-lg sm:text-xl font-cyber font-bold text-emerald-400">
              {plan.currency}{plan.price}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="pt-1">
            <div className="text-[11px] font-mono-tech text-slate-400 mb-2">
              Payment Method:
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-400/50 flex items-start gap-3 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              <div className="w-9 h-9 rounded-md bg-cyan-500 text-black flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-cyber font-bold text-sm tracking-wide text-white">
                    UPI QR PAYMENT
                  </span>
                  <span className="text-[9px] font-mono-tech px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    INSTANT
                  </span>
                </div>
                <p className="text-[11px] font-mono-tech text-cyan-300/80 mt-0.5">
                  Scan with GPay, PhonePe, Paytm, or any UPI app
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono-tech text-slate-400 mb-5 relative z-10">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Enterprise verified gateway. Encrypted tokenized settlement.</span>
        </div>

        {/* Large Proceed Button */}
        <button
          id="btn-confirm-proceed-pay"
          onClick={() => {
            playCyberClick();
            onProceedToPayment();
          }}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 hover:from-cyan-400 hover:to-cyan-300 text-black font-cyber font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:shadow-[0_0_35px_rgba(6,182,212,0.75)] transition-all relative z-10"
        >
          <span>PROCEED TO PAY {plan.currency}{plan.price}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
