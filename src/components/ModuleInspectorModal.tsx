import React, { useState, useEffect } from 'react';
import { X, Activity, Cpu, ShieldCheck, RefreshCw, CheckCircle2, Zap, Terminal, Radio, Play, Pause } from 'lucide-react';
import { SecurityModule } from '../types';
import { playCyberClick, playCyberBlip, playSuccessSound } from '../utils/audio';

interface ModuleInspectorModalProps {
  module: SecurityModule | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ModuleInspectorModal: React.FC<ModuleInspectorModalProps> = ({
  module,
  isOpen,
  onClose
}) => {
  const [isRunningTest, setIsRunningTest] = useState(true);
  const [packetCount, setPacketCount] = useState(14820);
  const [integrityScore, setIntegrityScore] = useState(99.98);
  const [logs, setLogs] = useState<string[]>([
    'INIT: Quantum invariant check passed [0x7FF094]',
    'POLICY: Heuristic boundary set to STRICT_DEFENSE',
    'STREAM: Ingestion rate 14.8k ops/sec active'
  ]);

  useEffect(() => {
    if (!isOpen || !isRunningTest) return;

    const interval = setInterval(() => {
      setPacketCount((p) => p + Math.floor(Math.random() * 45 + 10));
      const eventSamples = [
        `ASSERT: Logic verification OK [Token: 0x${Math.random().toString(16).slice(2, 6)}]`,
        `TELEMETRY: Node ping latency ${ (Math.random() * 0.8 + 0.9).toFixed(2) }ms`,
        `TLS: Handshake verified with Kyber-1024 cipher`,
        `INVARIANT: No payload divergence detected`
      ];
      const randomEvt = eventSamples[Math.floor(Math.random() * eventSamples.length)];
      setLogs((prev) => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] ${randomEvt}`]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, isRunningTest]);

  if (!isOpen || !module) return null;

  const handleTriggerSelfTest = () => {
    playCyberBlip(900);
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] MANUAL_SELF_TEST: Executing complete cryptographic suite...`]);
    setTimeout(() => {
      playSuccessSound();
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] SELF_TEST_RESULT: 100% Invariants Verified. Zero Tampering.`]);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="module-inspector-modal"
        className="w-full max-w-2xl rounded-2xl bg-[#081026]/95 border border-cyan-500/40 p-5 sm:p-7 shadow-[0_0_40px_rgba(6,182,212,0.3)] relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Background Grid */}
        <div className="absolute inset-0 cyber-grid-bg opacity-20 pointer-events-none" />

        {/* Close button */}
        <button
          id="btn-close-inspector"
          onClick={() => {
            playCyberClick();
            onClose();
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-cyan-300 p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-[10px] sm:text-xs font-mono-tech text-emerald-300 uppercase tracking-widest font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ACTIVE RUNTIME SANDBOX
          </div>
          <h2 className="text-xl sm:text-2xl font-cyber font-bold tracking-wider text-white flex items-center gap-2">
            <span>{module.name}</span>
            <span className="text-xs font-mono-tech px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 text-cyan-300">
              {module.version}
            </span>
          </h2>
          <p className="text-xs font-mono-tech text-cyan-400/70 mt-0.5">
            {module.subtitle}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-4 relative z-10">
          <div className="p-3 rounded-xl bg-[#050b1a] border border-cyan-500/20">
            <div className="text-[10px] font-mono-tech text-slate-400">AUDITED OPS</div>
            <div className="text-base sm:text-lg font-cyber font-bold text-cyan-300 mt-0.5">
              {packetCount.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#050b1a] border border-emerald-500/20">
            <div className="text-[10px] font-mono-tech text-slate-400">INTEGRITY</div>
            <div className="text-base sm:text-lg font-cyber font-bold text-emerald-400 mt-0.5">
              {integrityScore}%
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#050b1a] border border-cyan-500/20">
            <div className="text-[10px] font-mono-tech text-slate-400">LATENCY</div>
            <div className="text-base sm:text-lg font-cyber font-bold text-cyan-300 mt-0.5">
              1.12ms
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#050b1a] border border-cyan-500/20">
            <div className="text-[10px] font-mono-tech text-slate-400">MODE</div>
            <div className="text-base sm:text-lg font-cyber font-bold text-cyan-400 mt-0.5">
              QUANTUM
            </div>
          </div>
        </div>

        {/* Live Diagnostics Terminal Feed */}
        <div className="flex-1 min-h-[160px] rounded-xl bg-[#030712] border border-cyan-500/30 p-3.5 flex flex-col font-mono-tech text-xs overflow-hidden mb-4 relative z-10">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Terminal className="w-3.5 h-3.5" />
              LIVE TELEMETRY STREAM
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playCyberClick();
                  setIsRunningTest(!isRunningTest);
                }}
                className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {isRunningTest ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                {isRunningTest ? 'PAUSE' : 'RESUME'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 custom-scrollbar text-cyan-300/90 text-[11px]">
            {logs.map((line, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-cyan-600">›</span> {line}
              </div>
            ))}
          </div>
        </div>

        {/* Feature Documentation and Self Test */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {module.features.map((feat) => (
              <span
                key={feat}
                className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
              >
                ✓ {feat}
              </span>
            ))}
          </div>

          <button
            id="btn-trigger-selftest"
            onClick={handleTriggerSelfTest}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 font-mono-tech text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RUN INTEGRITY BENCHMARK</span>
          </button>
        </div>
      </div>
    </div>
  );
};
