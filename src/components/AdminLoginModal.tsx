import React, { useState } from 'react';
import { Shield, Lock, Key, X, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AdminSession } from '../types';
import { api } from '../services/api';
import { playCyberClick, playSuccessSound, playAlertSound } from '../utils/audio';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (adminSession: AdminSession) => void;
  onSuccess?: (adminSession: AdminSession) => void;
  onShowToast?: (title: string, msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSuccess,
  onShowToast
}) => {
  const [adminId, setAdminId] = useState('');
  const [passKey, setPassKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId.trim() || !passKey.trim()) {
      setErrorMessage('Enter both Admin ID and Admin Pass Key');
      playAlertSound();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    playCyberClick();

    try {
      const res = await api.loginAdmin(adminId.trim(), passKey.trim());
      if (res.adminSession) {
        playSuccessSound();
        if (onLoginSuccess) onLoginSuccess(res.adminSession);
        else if (onSuccess) onSuccess(res.adminSession);
        if (onShowToast) onShowToast('Admin Authenticated', `Welcome, ${res.adminSession.adminId}`, 'success');
        onClose();
      }
    } catch (err: any) {
      playAlertSound();
      setErrorMessage(err.message || 'INVALID ADMIN CREDENTIALS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="admin-login-modal"
        className="w-full max-w-md rounded-2xl bg-[#070e22]/95 border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.3)] relative overflow-hidden flex flex-col"
      >
        {/* Cyber grid background */}
        <div className="absolute inset-0 cyber-grid-bg opacity-25 pointer-events-none" />

        {/* Close Button */}
        <button
          id="btn-close-admin-login"
          onClick={() => {
            playCyberClick();
            onClose();
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60 hover:border-cyan-500/40 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Badge */}
        <div className="mb-5 relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-950/70 border border-cyan-400/60 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-[11px] font-mono-tech text-cyan-400 uppercase tracking-widest font-semibold">
            SECURE CONTROL MATRIX
          </div>
          <h2 className="text-xl sm:text-2xl font-cyber font-bold tracking-wider text-white mt-0.5">
            ADMIN PANEL LOGIN
          </h2>
          <p className="text-xs font-mono-tech text-slate-400 mt-1">
            Elevated administrative clearance required
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div 
            id="admin-login-error"
            className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 flex items-center gap-2.5 text-xs font-mono-tech text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-in slide-in-from-top duration-200 relative z-10"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-cyan-300 mb-1.5 font-medium">
              ADMIN ID:
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-admin-id"
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="Enter Admin ID"
                autoComplete="off"
                disabled={isLoading}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#040815] border border-cyan-500/30 text-white font-mono-tech text-xs tracking-wider placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono-tech uppercase tracking-wider text-cyan-300 mb-1.5 font-medium">
              ADMIN PASS KEY:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-admin-passkey"
                type="password"
                value={passKey}
                onChange={(e) => setPassKey(e.target.value)}
                placeholder="Enter Admin Pass Key"
                autoComplete="off"
                disabled={isLoading}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#040815] border border-cyan-500/30 text-white font-mono-tech text-xs tracking-wider placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
              />
            </div>
          </div>

          <button
            id="btn-submit-admin-login"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 hover:from-cyan-400 hover:to-cyan-300 text-black font-cyber font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.65)] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>AUTHENTICATING ENCLAVE...</span>
              </span>
            ) : (
              <>
                <span>VERIFY & ACCESS ADMIN PANEL</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security watermark */}
        <div className="mt-4 pt-3 border-t border-cyan-500/20 text-center relative z-10">
          <span className="text-[10px] font-mono-tech text-cyan-400/60">
            PROTECTED BY KYBER-1024 QUANTUM RESISTANT ENCLAVE
          </span>
        </div>
      </div>
    </div>
  );
};
