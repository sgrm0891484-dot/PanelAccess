import React, { useState, useMemo } from 'react';
import { Shield, KeyRound, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { VerificationSlider } from './VerificationSlider';
import { SecurityBadgeList } from './SecurityBadge';
import { playCyberBlip, playCyberClick, playSuccessSound, playAlertSound } from '../utils/audio';
import { UserSession } from '../types';
import { api } from '../services/api';

interface AuthCardProps {
  onLoginSuccess: (session: UserSession) => void;
  onShowToast: (title: string, msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const AuthCard: React.FC<AuthCardProps> = ({ onLoginSuccess, onShowToast }) => {
  const [authorizedId, setAuthorizedId] = useState('AGENT_01');
  const [passKey, setPassKey] = useState('AEGIS-KEY-9942');
  const [showPassword, setShowPassword] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Calculate dynamic cipher entropy
  const entropyInfo = useMemo(() => {
    if (!passKey) return { label: 'AWAITING KEY', level: 0, color: 'text-slate-500' };
    const length = passKey.length;
    const hasNum = /\d/.test(passKey);
    const hasSpecial = /[^A-Za-z0-9]/.test(passKey);
    const hasUpper = /[A-Z]/.test(passKey);

    let score = length * 5;
    if (hasNum) score += 20;
    if (hasSpecial) score += 25;
    if (hasUpper) score += 15;

    if (score < 30) return { label: 'LOW ENTROPY', level: 1, color: 'text-amber-400' };
    if (score < 60) return { label: 'STANDARD CIPHER', level: 2, color: 'text-cyan-400' };
    if (score < 80) return { label: 'HIGH INTEGRITY (91.4%)', level: 3, color: 'text-cyan-300' };
    return { label: 'QUANTUM CERTIFIED (99.8%)', level: 4, color: 'text-emerald-400' };
  }, [passKey]);

  const handlePreset = (id: string, key: string, role: string) => {
    playCyberClick();
    setAuthorizedId(id);
    setPassKey(key);
    onShowToast('Node Selected', `Credentials loaded for ${role}`, 'info');
  };

  const handleVerifyAccess = async () => {
    if (!authorizedId.trim()) {
      playAlertSound();
      onShowToast('Authentication Error', 'Please enter your Authorized ID', 'warn');
      return;
    }
    if (!passKey.trim()) {
      playAlertSound();
      onShowToast('Authentication Error', 'Please provide a valid pass key', 'warn');
      return;
    }
    if (!isHumanVerified) {
      playAlertSound();
      onShowToast('Verification Required', 'Please slide the Proof of Human Identity slider to decrypt token', 'warn');
      return;
    }

    setIsAuthenticating(true);
    playCyberBlip(1000);

    try {
      const res = await api.loginUser(authorizedId.trim(), passKey.trim());
      if (res.session) {
        playSuccessSound();
        onShowToast('Access Granted', `Quantum session token authorized for ${res.session.authorizedId}`, 'success');
        onLoginSuccess(res.session);
      }
    } catch (err: any) {
      playAlertSound();
      onShowToast('Authentication Failed', err.message || 'Invalid credentials', 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center">
      {/* Outer Glow Container */}
      <div 
        id="auth-card-panel"
        className="w-full rounded-2xl bg-[#091124]/85 border border-cyan-500/35 p-5 sm:p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.15)] relative overflow-hidden"
      >
        {/* Subtle decorative grid background */}
        <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

        {/* Top atmospheric accent line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Top Badge */}
        <div className="flex justify-center mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-mono-tech font-bold text-cyan-300 tracking-wider uppercase">
              SECURE AUTHENTICATION GATEWAY
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1.5 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-cyber font-bold tracking-wider text-white flex items-center justify-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400 inline-block drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            PANEL ACCESS
          </h1>
          <p className="text-xs sm:text-sm font-mono-tech text-cyan-300/80 tracking-wide max-w-md mx-auto">
            ENTER AUTHORIZED ID AND VALID PASS KEY TO ACCESS YOUR PANEL
          </p>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 sm:space-y-5 relative z-10">
          {/* Field 1: Authorized ID */}
          <div className="space-y-1.5" id="field-authorized-id">
            <div className="flex items-center justify-between text-xs font-mono-tech">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                Authorized ID
              </label>
              <span className="text-[10px] text-cyan-400/70 uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20">
                SHA-256 HASHED
              </span>
            </div>
            <div className="relative">
              <input
                id="input-authorized-id"
                type="text"
                value={authorizedId}
                onChange={(e) => setAuthorizedId(e.target.value)}
                placeholder="Enter Authorized ID"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#040817] border border-cyan-500/30 text-white font-mono-tech text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner transition-all"
              />
            </div>
          </div>

          {/* Field 2: Valid Pass Key */}
          <div className="space-y-1.5" id="field-pass-key">
            <div className="flex items-center justify-between text-xs font-mono-tech">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Valid Pass Key
              </label>
              <span className="text-[10px] text-cyan-400/70 uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-500/20">
                ENCRYPTED INPUT
              </span>
            </div>
            <div className="relative">
              <input
                id="input-pass-key"
                type={showPassword ? 'text' : 'password'}
                value={passKey}
                onChange={(e) => setPassKey(e.target.value)}
                placeholder="Enter Pass Key"
                className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-[#040817] border border-cyan-500/30 text-white font-mono-tech text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner transition-all"
              />
              <button
                type="button"
                id="btn-toggle-show-password"
                onClick={() => {
                  playCyberClick();
                  setShowPassword(!showPassword);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 transition-colors"
                title={showPassword ? 'Hide Key' : 'Show Key'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Node Preset Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-mono-tech text-slate-400">SELECT NODE:</span>
            <button
              id="btn-preset-agent"
              type="button"
              onClick={() => handlePreset('AGENT_01', 'AEGIS-KEY-9942', 'Primary Agent')}
              className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 transition-colors"
            >
              AGENT_01
            </button>
            <button
              id="btn-preset-admin"
              type="button"
              onClick={() => handlePreset('COMMAND_SEC_OP', 'QUANTUM-SEC-9900', 'Security Officer')}
              className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-blue-950/50 hover:bg-blue-900/60 border border-blue-500/30 text-blue-300 transition-colors"
            >
              COMMAND_SEC_OP
            </button>
            <button
              id="btn-preset-auditor"
              type="button"
              onClick={() => handlePreset('AUDITOR_NODE_99', 'AUDIT-SEC-7741', 'Auditor Node')}
              className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 transition-colors"
            >
              AUDITOR_NODE_99
            </button>
          </div>

          {/* Cipher Entropy Meter */}
          <div className="p-3 rounded-lg bg-[#040817]/90 border border-cyan-500/20 space-y-2" id="entropy-container">
            <div className="flex items-center justify-between text-xs font-mono-tech">
              <span className="text-slate-400">CIPHER ENTROPY:</span>
              <span className={`font-semibold tracking-wider ${entropyInfo.color}`}>
                {entropyInfo.label}
              </span>
            </div>

            {/* Segmented animated progress blocks */}
            <div className="grid grid-cols-4 gap-1.5 h-2">
              {[1, 2, 3, 4].map((seg) => {
                const isActive = entropyInfo.level >= seg;
                return (
                  <div
                    key={seg}
                    className={`rounded-sm transition-all duration-300 ${
                      isActive
                        ? seg === 4
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                          : 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.7)]'
                        : 'bg-slate-800/80'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Proof of Human Identity Slider */}
          <VerificationSlider
            isVerified={isHumanVerified}
            onVerify={(val) => setIsHumanVerified(val)}
          />

          {/* Verify & Access Button */}
          <button
            id="btn-verify-access"
            type="button"
            disabled={isAuthenticating}
            onClick={handleVerifyAccess}
            className={`w-full py-3.5 px-4 rounded-xl font-cyber font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 ${
              isAuthenticating
                ? 'bg-cyan-700 text-slate-300 cursor-wait'
                : 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 hover:from-cyan-400 hover:to-cyan-300 text-black shadow-[0_0_25px_rgba(6,182,212,0.55)] hover:shadow-[0_0_35px_rgba(6,182,212,0.8)] hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isAuthenticating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>AUTHENTICATING NODE...</span>
              </>
            ) : (
              <>
                <span>VERIFY & ACCESS PANEL</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>

        {/* Security Badges */}
        <SecurityBadgeList />
      </div>
    </div>
  );
};

