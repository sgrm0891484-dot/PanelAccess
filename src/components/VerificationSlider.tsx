import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ShieldCheck, ChevronRight, Lock, CheckCircle2 } from 'lucide-react';
import { playCyberBlip, playSuccessSound, playDecryptSound } from '../utils/audio';

interface VerificationSliderProps {
  isVerified: boolean;
  onVerify: (verified: boolean) => void;
  disabled?: boolean;
}

export const VerificationSlider: React.FC<VerificationSliderProps> = ({
  isVerified,
  onVerify,
  disabled = false
}) => {
  const [sliderPos, setSliderPos] = useState(0); // 0 to 100 percentage
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleStart = (clientX: number) => {
    if (disabled || isVerified) return;
    setIsDragging(true);
    updatePosition(clientX);
    playCyberBlip(500);
  };

  const updatePosition = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const width = rect.width - 48; // thumb width approx 48px
    const offsetX = clientX - rect.left - 24;
    const percentage = Math.max(0, Math.min(100, (offsetX / width) * 100));
    setSliderPos(percentage);

    if (percentage > 88 && !isVerified) {
      setIsDragging(false);
      setSliderPos(100);
      onVerify(true);
      playDecryptSound();
      setTimeout(() => {
        playSuccessSound();
      }, 150);
    }
  }, [disabled, isVerified, onVerify]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (sliderPos < 88 && !isVerified) {
          setSliderPos(0);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        if (sliderPos < 88 && !isVerified) {
          setSliderPos(0);
        }
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, sliderPos, isVerified, updatePosition]);

  return (
    <div className="w-full space-y-2 select-none" id="human-verification-container">
      <div className="flex items-center justify-between text-xs font-mono-tech">
        <span className="text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          PROOF OF HUMAN IDENTITY
        </span>
        <span className={`text-[11px] font-semibold ${isVerified ? 'text-emerald-400' : 'text-cyan-400/80'}`}>
          {isVerified ? 'TOKEN DECRYPTED' : 'AWAITING SWIPE'}
        </span>
      </div>

      <div
        ref={trackRef}
        id="slider-track"
        className={`relative h-12 w-full rounded-lg border overflow-hidden transition-colors duration-300 flex items-center ${
          isVerified
            ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            : 'bg-[#060c1d]/90 border-cyan-500/30'
        }`}
      >
        {/* Fill progress bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 transition-all duration-75 ${
            isVerified
              ? 'bg-emerald-500/20 border-r border-emerald-400'
              : 'bg-cyan-500/15 border-r border-cyan-400/50'
          }`}
          style={{ width: `${isVerified ? 100 : sliderPos}%` }}
        />

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
          <span className={`text-xs font-mono-tech tracking-wider uppercase font-medium flex items-center gap-2 ${
            isVerified ? 'text-emerald-300' : 'text-cyan-300/70'
          }`}>
            {isVerified ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                IDENTITY ATTESTED // VERIFIED
              </>
            ) : (
              <>
                <span>SLIDE TO DECRYPT ACCESS TOKEN</span>
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400 animate-pulse hidden sm:inline" />
              </>
            )}
          </span>
        </div>

        {/* Draggable thumb */}
        {!isVerified ? (
          <div
            id="slider-thumb"
            onMouseDown={(e) => handleStart(e.clientX)}
            onTouchStart={(e) => e.touches[0] && handleStart(e.touches[0].clientX)}
            style={{ left: `calc(${sliderPos}% * 0.86)` }}
            className={`absolute top-1 bottom-1 w-11 rounded-md bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center cursor-grab active:cursor-grabbing text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-transform duration-75 ${
              isDragging ? 'scale-105 shadow-[0_0_20px_rgba(6,182,212,1)]' : ''
            }`}
          >
            <Lock className="w-4 h-4 text-black" />
          </div>
        ) : (
          <div className="absolute right-2 top-2 bottom-2 w-9 rounded-md bg-emerald-500 flex items-center justify-center text-black shadow-[0_0_12px_rgba(16,185,129,0.8)]">
            <CheckCircle2 className="w-4 h-4 text-black" />
          </div>
        )}
      </div>
    </div>
  );
};
