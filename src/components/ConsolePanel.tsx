import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, ArrowLeft, Send, Play, Shield, Copy, Check, Download } from 'lucide-react';
import { LogEntry, RoutePath, SecurityModule } from '../types';
import { playCyberClick, playCyberBlip, playSuccessSound } from '../utils/audio';

interface ConsolePanelProps {
  logs: LogEntry[];
  modules: SecurityModule[];
  onClearLogs: () => void;
  onAddLog: (level: LogEntry['level'], message: string, src: string) => void;
  onNavigate: (path: RoutePath) => void;
  onShowToast: (title: string, msg: string, type: 'info' | 'success' | 'warn' | 'error') => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({
  logs,
  modules,
  onClearLogs,
  onAddLog,
  onNavigate,
  onShowToast
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleExecuteCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    playCyberBlip(800);
    onAddLog('SYS', `EXEC: ${cmd}`, 'USER_CLI');
    setCommandInput('');

    const lowerCmd = cmd.toLowerCase();

    if (lowerCmd === 'help') {
      onAddLog('INFO', 'AVAILABLE COMMANDS: help, status, modules, verify, entropy, ping, diagnostics, clear', 'CLI_HELPER');
    } else if (lowerCmd === 'status') {
      onAddLog('INFO', 'GATEWAY STATUS: ONLINE | QUANTUM ROOT: 0x9B4E...A1F2 | UPTIME: 99.98%', 'SYS_MONITOR');
    } else if (lowerCmd === 'modules') {
      const authCount = modules.filter((m) => m.isAuthorized).length;
      onAddLog('INFO', `LOADED MODULES: ${modules.length} (${authCount} Authorized: ${modules.filter((m) => m.isAuthorized).map((m) => m.name).join(', ') || 'None'})`, 'MODULE_REGISTRY');
    } else if (lowerCmd === 'ping') {
      onAddLog('SYS', `PING node.aegis-quantum.internal (10.0.4.1): 32 data bytes, latency 1.14ms`, 'NETWORK_STACK');
    } else if (lowerCmd === 'entropy') {
      onAddLog('ENCRYPT', 'ENTROPY MEASUREMENT: 99.984% Randomness (Kyber-1024 Certified)', 'CRYPTO_CORE');
    } else if (lowerCmd === 'diagnostics') {
      playSuccessSound();
      onAddLog('SYS', 'DIAGNOSTICS: Memory Integrity 100% | Zero Tampering | Invariants Valid', 'DIAG_SUITE');
    } else if (lowerCmd === 'clear') {
      onClearLogs();
    } else {
      onAddLog('WARN', `COMMAND NOT RECOGNIZED: '${cmd}'. Type 'help' for safe command manual.`, 'CLI_PARSER');
    }
  };

  const handleCopyLogs = () => {
    playCyberClick();
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}`).join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    onShowToast('Logs Copied', 'Console log stream copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4">
      {/* Top Header Card */}
      <div className="w-full rounded-2xl bg-[#081126]/90 border border-cyan-500/35 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            id="btn-console-back"
            onClick={() => {
              playCyberClick();
              onNavigate('/panel');
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-lg sm:text-xl font-cyber font-bold tracking-wider text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                AEGIS // TERMINAL CONSOLE
              </h1>
            </div>
            <p className="text-xs font-mono-tech text-cyan-400/80">
              Interactive safe diagnostic stream and gateway audit recorder
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-copy-console-logs"
            onClick={handleCopyLogs}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono-tech text-xs flex items-center gap-1.5 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copied ? 'COPIED' : 'COPY LOGS'}</span>
          </button>

          <button
            id="btn-clear-console"
            onClick={() => {
              playCyberClick();
              onClearLogs();
              onShowToast('Console Cleared', 'Log buffer emptied', 'info');
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-mono-tech text-xs flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR CONSOLE</span>
          </button>
        </div>
      </div>

      {/* Terminal Display Container */}
      <div 
        id="terminal-window"
        className="w-full rounded-2xl bg-[#030712] border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col h-[520px] font-mono-tech relative"
      >
        {/* Terminal Title Bar */}
        <div className="bg-[#081024] border-b border-cyan-500/20 px-4 py-2 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-cyan-400 font-bold tracking-wider">aegis@gateway-node-01:~$</span>
          </div>
          <span className="text-[10px] text-slate-500">TTY // UTF-8 // AES-GCM</span>
        </div>

        {/* Terminal Logs Scroll Area */}
        <div 
          ref={logContainerRef}
          className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-2 text-xs custom-scrollbar select-text bg-[#030712]/95"
        >
          {logs.map((log) => (
            <div key={log.id} className="leading-relaxed flex items-start gap-2">
              <span className="text-slate-500 select-none">[{log.timestamp}]</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold select-none shrink-0 ${
                log.level === 'WARN' ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30' :
                log.level === 'PAY' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' :
                log.level === 'ENCRYPT' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30' :
                log.level === 'AUTH' ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30' : 'bg-slate-900 text-slate-300'
              }`}>
                {log.level}
              </span>
              <span className="text-cyan-500/80 select-none">[{log.source}]</span>
              <span className={`font-mono-tech ${
                log.level === 'WARN' ? 'text-amber-200' :
                log.level === 'PAY' ? 'text-emerald-300' :
                log.level === 'ENCRYPT' ? 'text-cyan-200' : 'text-slate-200'
              }`}>
                {log.message}
              </span>
            </div>
          ))}
        </div>

        {/* Command Input Bar */}
        <form 
          onSubmit={handleExecuteCommand}
          className="p-3 bg-[#060c1d] border-t border-cyan-500/25 flex items-center gap-2"
        >
          <span className="text-cyan-400 font-bold pl-2">›</span>
          <input
            id="input-terminal-command"
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type 'help', 'status', 'modules', 'ping', 'entropy' or 'clear'..."
            className="flex-1 bg-transparent text-white font-mono-tech text-xs focus:outline-none placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-cyber font-bold text-xs flex items-center gap-1 transition-all shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          >
            <span>SEND</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>

      {/* Suggested Quick Commands */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-mono-tech text-slate-400">
        <span>QUICK RUN:</span>
        {['help', 'status', 'modules', 'ping', 'entropy', 'diagnostics'].map((cmd) => (
          <button
            key={cmd}
            onClick={() => {
              playCyberClick();
              setCommandInput(cmd);
            }}
            className="px-2 py-0.5 rounded bg-slate-900/80 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 text-[11px] transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
};
