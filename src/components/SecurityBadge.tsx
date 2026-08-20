import React from 'react';
import { Lock, ShieldCheck, Cpu, Award } from 'lucide-react';

export const SecurityBadgeList: React.FC = () => {
  const badges = [
    {
      id: 'badge-tls',
      title: 'TLS 1.3',
      sub: 'ENCRYPTED',
      icon: Lock,
      color: 'text-cyan-400',
      border: 'border-cyan-500/25',
      bg: 'bg-cyan-950/20'
    },
    {
      id: 'badge-zkp',
      title: 'ZKP',
      sub: 'ZERO-KNOWLEDGE',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      border: 'border-emerald-500/25',
      bg: 'bg-emerald-950/20'
    },
    {
      id: 'badge-kyber',
      title: 'KYBER-1024',
      sub: 'QUANTUM RESIST',
      icon: Cpu,
      color: 'text-cyan-400',
      border: 'border-cyan-500/25',
      bg: 'bg-cyan-950/20'
    },
    {
      id: 'badge-soc2',
      title: 'SOC2 TYPE II',
      sub: 'COMPLIANT',
      icon: Award,
      color: 'text-blue-400',
      border: 'border-blue-500/25',
      bg: 'bg-blue-950/20'
    }
  ];

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mt-6">
      {badges.map((b) => {
        const IconComponent = b.icon;
        return (
          <div
            key={b.id}
            id={b.id}
            className={`p-2.5 rounded-lg border ${b.border} ${b.bg} backdrop-blur-sm flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-cyan-400/50 hover:bg-cyan-950/30 group`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <IconComponent className={`w-3.5 h-3.5 ${b.color} group-hover:scale-110 transition-transform`} />
              <span className="font-cyber font-bold text-xs tracking-wider text-slate-100">
                {b.title}
              </span>
            </div>
            <span className="font-mono-tech text-[10px] text-cyan-400/80 font-medium tracking-tight">
              {b.sub}
            </span>
          </div>
        );
      })}
    </div>
  );
};
