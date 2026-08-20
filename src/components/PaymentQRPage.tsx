import React, { useState, useEffect } from 'react';
import { 
  QrCode, Clock, ShieldCheck, CheckCircle2, XCircle, 
  ArrowLeft, RefreshCw, AlertTriangle, Sparkles, Copy, Check 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentSession, OrderRecord } from '../types';
import { api } from '../services/api';
import { playCyberBlip, playCyberClick, playSuccessSound, playAlertSound, playScanSound } from '../utils/audio';
import { extractErrorMessage } from '../utils/errorUtils';

interface PaymentQRPageProps {
  session: PaymentSession;
  username: string;
  onPaymentSuccess: (session: PaymentSession, order: OrderRecord) => void;
  onCancel: () => void;
}

export const PaymentQRPage: React.FC<PaymentQRPageProps> = ({
  session,
  username,
  onPaymentSuccess,
  onCancel
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes
  const [verifyingStep, setVerifyingStep] = useState<number | null>(null);
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState<OrderRecord | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const upiId = session.upiVpa || 'aegis.defense@icici';

  // Countdown timer
  useEffect(() => {
    if (verifyingStep !== null || isDone) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [verifyingStep, isDone]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyUPI = () => {
    playCyberClick();
    navigator.clipboard?.writeText(upiId).catch(() => {});
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2000);
  };

  const handleConfirmPayment = async () => {
    playScanSound();
    setVerifyingStep(1);
    setErrorText(null);

    // Step 1 animation
    setTimeout(() => {
      playCyberBlip(700);
      setVerifyingStep(2);
    }, 900);

    // Step 2 animation
    setTimeout(() => {
      playCyberBlip(950);
      setVerifyingStep(3);
    }, 1800);

    // Call server-side verification endpoint
    try {
      const res = await api.verifyPayment(
        session.sessionId,
        session.module.id,
        session.plan.id,
        username,
        session.transactionId || `UPI-TXN-${Date.now().toString().slice(-7)}`
      );

      if (res.verified && res.order) {
        setVerifiedOrder(res.order);
        setTimeout(() => {
          setVerifyingStep(null);
          setIsDone(true);
          playSuccessSound();

          try {
            confetti({
              particleCount: 80,
              spread: 75,
              origin: { y: 0.6 },
              colors: ['#00f0ff', '#10b981', '#3b82f6']
            });
          } catch {
            // ignore
          }

          setTimeout(() => {
            onPaymentSuccess(session, res.order);
          }, 1600);
        }, 2200);
      } else {
        throw new Error('Server payment verification failed');
      }
    } catch (err: unknown) {
      setVerifyingStep(null);
      playAlertSound();
      setErrorText(extractErrorMessage(err, 'Payment settlement check timed out'));
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div 
        id="payment-qr-session-card"
        className="w-full rounded-2xl bg-[#081126]/90 border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_40px_rgba(6,182,212,0.2)] relative overflow-hidden backdrop-blur-xl"
      >
        {/* Background Grid */}
        <div className="absolute inset-0 cyber-grid-bg opacity-25 pointer-events-none" />

        {/* Top Session Header */}
        <div className="flex items-center justify-between gap-3 mb-5 relative z-10">
          <button
            id="btn-back-qr-page"
            onClick={() => {
              playCyberClick();
              onCancel();
            }}
            className="flex items-center gap-1.5 text-xs font-mono-tech text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>CANCEL</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono-tech text-cyan-300 font-semibold tracking-wider uppercase">
              SECURE UPI PAYMENT SESSION
            </span>
          </div>
        </div>

        {/* Module & Runtime Header */}
        <div className="text-center space-y-1 mb-5 relative z-10">
          <div className="text-[11px] font-mono-tech text-cyan-400/80 uppercase tracking-widest font-semibold">
            {session.module.name} // {session.plan.duration}
          </div>
          <div className="text-3xl sm:text-4xl font-cyber font-bold tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
            {session.plan.currency}{session.amount}
          </div>
          <p className="text-xs font-mono-tech text-slate-400">
            Scan QR code with any UPI app to dispatch runtime pass
          </p>
        </div>

        {/* Error Notification */}
        {errorText && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center gap-2 text-xs font-mono-tech text-rose-300 relative z-10">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Verification Loader Modal Overlay */}
        {verifyingStep !== null && (
          <div className="absolute inset-0 bg-[#040816]/95 z-30 flex flex-col items-center justify-center p-6 text-center space-y-4 backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.4)] animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-cyber font-bold tracking-wide text-white">
                SERVER-SIDE PAYMENT VERIFICATION
              </h3>
              <p className="text-xs font-mono-tech text-cyan-400">
                {verifyingStep === 1 && 'Querying UPI Settlement Network & Bank Gateway...'}
                {verifyingStep === 2 && 'Validating Ephemeral Ledger Token & Order Attestation...'}
                {verifyingStep === 3 && 'Authorizing Quantum Gateway Node Key & Dispatching Pass...'}
              </p>
            </div>

            {/* Step Progress Indicators */}
            <div className="flex items-center gap-2 pt-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-1.5 rounded-full transition-all duration-300 ${
                    verifyingStep >= step
                      ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Success Verified Overlay */}
        {isDone && (
          <div className="absolute inset-0 bg-[#040816]/95 z-30 flex flex-col items-center justify-center p-6 text-center space-y-3 backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/70 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-bounce" />
            </div>
            <h3 className="text-xl font-cyber font-bold text-white tracking-wider">
              PAYMENT VERIFIED & ORDER CONFIRMED
            </h3>
            <p className="text-xs font-mono-tech text-emerald-400">
              Module runtime pass dispatched! Order ID: {verifiedOrder?.id || 'CONFIRMED'}
            </p>
          </div>
        )}

        {/* High-Tech QR Container */}
        <div className="flex flex-col items-center justify-center mb-5 relative z-10">
          <div className="relative p-4 sm:p-5 rounded-2xl bg-white/95 border-2 border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] flex flex-col items-center group">
            {/* Cyber Corner Brackets */}
            <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
            <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
            <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

            {/* Scanline Animation Effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80 animate-scanline" />
            </div>

            {/* SVG High-Tech Vector QR Pattern */}
            <svg
              className="w-48 h-48 sm:w-56 sm:h-56"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Corner Position Targets */}
              {/* Top-Left Target */}
              <rect x="15" y="15" width="45" height="45" rx="6" stroke="#081024" strokeWidth="6" fill="white" />
              <rect x="26" y="26" width="23" height="23" rx="3" fill="#081024" />

              {/* Top-Right Target */}
              <rect x="140" y="15" width="45" height="45" rx="6" stroke="#081024" strokeWidth="6" fill="white" />
              <rect x="151" y="26" width="23" height="23" rx="3" fill="#081024" />

              {/* Bottom-Left Target */}
              <rect x="15" y="140" width="45" height="45" rx="6" stroke="#081024" strokeWidth="6" fill="white" />
              <rect x="26" y="151" width="23" height="23" rx="3" fill="#081024" />

              {/* Data Blocks Pattern */}
              <rect x="70" y="20" width="10" height="10" fill="#081024" />
              <rect x="90" y="20" width="20" height="10" fill="#081024" />
              <rect x="120" y="20" width="10" height="10" fill="#081024" />
              <rect x="70" y="40" width="20" height="10" fill="#081024" />
              <rect x="100" y="40" width="10" height="20" fill="#081024" />
              <rect x="120" y="40" width="10" height="10" fill="#081024" />

              <rect x="20" y="70" width="10" height="20" fill="#081024" />
              <rect x="40" y="70" width="20" height="10" fill="#081024" />
              <rect x="70" y="70" width="10" height="10" fill="#081024" />
              <rect x="90" y="70" width="20" height="20" fill="#081024" />
              <rect x="120" y="70" width="20" height="10" fill="#081024" />
              <rect x="150" y="70" width="10" height="20" fill="#081024" />
              <rect x="170" y="70" width="10" height="10" fill="#081024" />

              <rect x="20" y="100" width="20" height="10" fill="#081024" />
              <rect x="50" y="100" width="10" height="20" fill="#081024" />
              <rect x="70" y="100" width="10" height="10" fill="#081024" />
              <rect x="120" y="100" width="10" height="20" fill="#081024" />
              <rect x="140" y="100" width="20" height="10" fill="#081024" />
              <rect x="170" y="100" width="10" height="20" fill="#081024" />

              <rect x="70" y="120" width="20" height="10" fill="#081024" />
              <rect x="100" y="120" width="10" height="10" fill="#081024" />
              <rect x="150" y="120" width="10" height="10" fill="#081024" />

              <rect x="70" y="140" width="10" height="20" fill="#081024" />
              <rect x="90" y="140" width="20" height="10" fill="#081024" />
              <rect x="120" y="140" width="10" height="20" fill="#081024" />
              <rect x="140" y="140" width="20" height="10" fill="#081024" />
              <rect x="170" y="140" width="10" height="20" fill="#081024" />

              <rect x="70" y="170" width="20" height="10" fill="#081024" />
              <rect x="100" y="160" width="10" height="20" fill="#081024" />
              <rect x="120" y="170" width="20" height="10" fill="#081024" />
              <rect x="150" y="160" width="20" height="20" fill="#081024" />

              {/* Center Logo Shield Badge */}
              <circle cx="100" cy="100" r="17" fill="#00f0ff" stroke="#081024" strokeWidth="3" />
              <path d="M100 89 L110 93 V100 C110 106 100 112 100 112 C100 112 90 106 90 100 V93 Z" fill="#081024" />
            </svg>

            {/* Verified Label */}
            <div className="mt-2 px-3 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-mono-tech text-[10px] font-bold tracking-wider uppercase border border-cyan-400">
              VERIFIED SECURE UPI QR
            </div>
          </div>

          {/* Supported UPI Apps Pills */}
          <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
            {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'CRED'].map((app) => (
              <span
                key={app}
                className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300 font-semibold"
              >
                {app}
              </span>
            ))}
          </div>
        </div>

        {/* Timer & UPI Copy */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[#040817] border border-cyan-500/20 mb-5 relative z-10">
          {/* Countdown timer */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono-tech text-slate-400">SESSION EXPIRES IN:</span>
            <span className="text-sm font-mono-tech font-bold text-cyan-300 tracking-wider">
              {formatTime(secondsRemaining)}
            </span>
          </div>

          {/* Copy UPI */}
          <button
            type="button"
            onClick={handleCopyUPI}
            className="flex items-center gap-1.5 text-xs font-mono-tech text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-500/30 transition-colors"
          >
            {copiedUPI ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUPI ? 'COPIED UPI VPA' : `COPY UPI: ${upiId}`}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 relative z-10">
          <button
            id="btn-complete-payment"
            onClick={handleConfirmPayment}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-black font-cyber font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.8)] transition-all active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I HAVE COMPLETED PAYMENT</span>
          </button>

          <button
            id="btn-cancel-payment"
            onClick={() => {
              playCyberClick();
              onCancel();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-mono-tech text-xs tracking-wider uppercase transition-colors"
          >
            CANCEL PAYMENT
          </button>
        </div>
      </div>
    </div>
  );
};
