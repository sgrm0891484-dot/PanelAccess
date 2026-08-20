import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-[#041416]/95 border-emerald-500/50 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]';
      case 'warn':
        return 'bg-[#181105]/95 border-amber-500/50 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.3)]';
      case 'error':
        return 'bg-[#17050a]/95 border-rose-500/50 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]';
      default:
        return 'bg-[#040e22]/95 border-cyan-500/50 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.3)]';
    }
  };

  return (
    <div
      className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md flex items-start justify-between gap-3 transition-all animate-in slide-in-from-bottom-2 ${getStyles()}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="min-w-0">
          <h4 className="font-cyber font-bold text-xs tracking-wide uppercase text-white">
            {toast.title}
          </h4>
          <p className="font-mono-tech text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            {toast.message}
          </p>
        </div>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-1 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
