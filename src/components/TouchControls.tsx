import React, { useRef, useState } from 'react';
import { ShotType } from '../types/game';
import { Zap, ArrowUpCircle, Target, ShieldAlert } from 'lucide-react';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onShot: (type: ShotType, isJump?: boolean) => void;
  onDive: () => void;
  stamina: number;
  smashGauge: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onShot,
  onDive,
  stamina,
  smashGauge,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsDragging(true);
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist <= maxRadius) {
      setKnobPos({ x: dx, y: dy });
      onMove(dx / maxRadius, dy / maxRadius);
    } else {
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * maxRadius;
      const clampedY = Math.sin(angle) * maxRadius;
      setKnobPos({ x: clampedX, y: clampedY });
      onMove(clampedX / maxRadius, clampedY / maxRadius);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-3 px-4 flex items-end justify-between pointer-events-none select-none z-20">
      {/* Left: Virtual Analog Joystick */}
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative w-28 h-28 rounded-full bg-slate-900/70 border border-slate-700/60 backdrop-blur-md flex items-center justify-center active:border-emerald-500/80 transition-colors shadow-lg"
        >
          {/* Center deadzone mark */}
          <div className="w-4 h-4 rounded-full bg-slate-700/40" />

          {/* Draggable Knob */}
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="absolute w-12 h-12 rounded-full bg-emerald-500/90 border border-emerald-300 shadow-md flex items-center justify-center pointer-events-none"
          >
            <div className="w-4 h-4 rounded-full bg-white/70" />
          </div>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">MOVE</span>
      </div>

      {/* Right: Tactile Action Buttons */}
      <div className="pointer-events-auto flex items-end gap-2.5">
        {/* Dive Button */}
        <button
          onClick={onDive}
          disabled={stamina < 20}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-slate-800/85 hover:bg-slate-700 active:scale-95 border border-slate-700 disabled:opacity-40 transition-all text-amber-400 shadow-lg"
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">DIVE</span>
        </button>

        {/* Drop Shot */}
        <button
          onClick={() => onShot('drop')}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-cyan-950/80 hover:bg-cyan-900 active:scale-95 border border-cyan-500/50 transition-all text-cyan-300 shadow-lg"
        >
          <Target className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">DROP</span>
        </button>

        {/* Clear / High Lob */}
        <button
          onClick={() => onShot('clear')}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 active:scale-95 border border-indigo-500/50 transition-all text-indigo-300 shadow-lg"
        >
          <ArrowUpCircle className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-0.5">CLEAR</span>
        </button>

        {/* SMASH Button (Primary Action) */}
        <button
          onClick={() => onShot('smash', stamina > 25)}
          className="relative flex flex-col items-center justify-center w-18 h-18 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 active:scale-95 border border-amber-300/60 shadow-xl transition-all text-white"
        >
          {smashGauge >= 100 && (
            <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 text-[9px] font-black animate-pulse">
              MAX!
            </span>
          )}
          <Zap className="w-7 h-7 text-white fill-white" />
          <span className="text-[11px] font-black tracking-wider mt-0.5 font-athletic">SMASH</span>
        </button>
      </div>
    </div>
  );
};
