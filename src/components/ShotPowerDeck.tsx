import React from 'react';
import { ShotType } from '../types/game';
import { ArrowUpCircle, Target, Zap, Activity, ShieldCheck, ShieldAlert, Flame } from 'lucide-react';

export interface ShotPowerLevels {
  smash: number;
  clear: number;
  drop: number;
  drive: number;
}

interface ShotPowerDeckProps {
  shotPowers: ShotPowerLevels;
  onUpdatePower: (shot: keyof ShotPowerLevels, value: number) => void;
  onTriggerShot: (shot: ShotType, forceMax?: boolean) => void;
  autoInBoundsLock: boolean;
  onToggleAutoLock: () => void;
  isPlayerInRange: boolean;
  fullPowerMode?: boolean;
  onToggleFullPower?: () => void;
  onStartCharge?: (shot: ShotType) => void;
  onReleaseCharge?: () => void;
  chargingPower?: number | null;
}

export const ShotPowerDeck: React.FC<ShotPowerDeckProps> = ({
  shotPowers,
  onUpdatePower,
  onTriggerShot,
  autoInBoundsLock,
  onToggleAutoLock,
  isPlayerInRange,
  fullPowerMode = false,
  onToggleFullPower,
  onStartCharge,
  onReleaseCharge,
  chargingPower,
}) => {
  return (
    <div className="flex flex-col gap-2 pointer-events-auto select-none">
      {/* Top mini-bar: In-Bounds Safety Lock indicator & 100% Full Power Toggle */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          {/* 100% UNRESTRICTED FULL POWER TOGGLE */}
          {onToggleFullPower && (
            <button
              onClick={onToggleFullPower}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                fullPowerMode
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-lg shadow-red-500/30 border border-amber-300 ring-2 ring-red-500/50 animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600'
              }`}
              title="Toggle 100% Olympic Full Power: Every shot fires at maximum explosive velocity!"
            >
              <Flame className={`w-3.5 h-3.5 ${fullPowerMode ? 'fill-white text-yellow-300 animate-bounce' : 'text-amber-400'}`} />
              <span>{fullPowerMode ? '💥 100% FULL POWER: ON' : '💥 100% FULL POWER'}</span>
            </button>
          )}

          <button
            onClick={onToggleAutoLock}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              autoInBoundsLock
                ? 'bg-emerald-500/20 border border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
            title="When ON, power automatically limits out-of-bounds errors. When OFF, you have complete manual power control."
          >
            {autoInBoundsLock ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
            <span>{autoInBoundsLock ? 'Safety Lock: ON' : 'Safety Lock: OFF (Max)'}</span>
          </button>
        </div>

        {/* Real-time charging power status if charging */}
        {chargingPower !== null && chargingPower !== undefined ? (
          <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-500/60 px-2.5 py-0.5 rounded-lg">
            <span className="text-[10px] font-bold text-red-300 animate-pulse">CHARGING:</span>
            <span className="text-xs font-mono font-black text-amber-300 tabular-nums">{Math.round(chargingPower)}%</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            Hold button or key to charge · Release to strike!
          </span>
        )}
      </div>

      {/* Main Shot Cards Grid: Each card has its dedicated shot trigger & individual power control */}
      <div className="flex items-end gap-2.5">
        {/* 1. CLEAR LOB CARD */}
        <div className={`flex flex-col rounded-2xl bg-slate-900/95 border p-2 shadow-xl transition-all ${
          fullPowerMode ? 'border-amber-500/60 shadow-amber-500/10' : 'border-indigo-500/40 hover:border-indigo-400/70'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1 px-1">
            <span className="text-[10px] font-black uppercase text-indigo-300 font-athletic tracking-wider">
              CLEAR
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-400 tabular-nums">
              {fullPowerMode ? '100%' : `${shotPowers.clear}%`}
            </span>
          </div>

          {/* Quick Power Stepper / Preset */}
          <div className="flex items-center gap-1 mb-2 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onUpdatePower('clear', 65)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.clear === 65 && !fullPowerMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mid
            </button>
            <button
              onClick={() => onUpdatePower('clear', 75)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.clear === 75 && !fullPowerMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Deep
            </button>
            <button
              onClick={() => onUpdatePower('clear', 100)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-black transition-all cursor-pointer ${
                (shotPowers.clear === 100 || fullPowerMode) ? 'bg-gradient-to-r from-indigo-500 to-amber-500 text-white' : 'text-amber-400 hover:text-white'
              }`}
            >
              100%
            </button>
          </div>

          {/* Hit Button */}
          <button
            onClick={() => onTriggerShot('clear')}
            onMouseDown={() => onStartCharge && onStartCharge('clear')}
            onMouseUp={() => onReleaseCharge && onReleaseCharge()}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 active:scale-95 border border-indigo-500/50 text-indigo-200 font-black text-xs transition-all shadow-md cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4 text-indigo-400" />
            <span>HIT CLEAR</span>
            <span className="text-[8px] text-indigo-400/80 font-mono hidden sm:inline">[J]</span>
          </button>
        </div>

        {/* 2. DROP SHOT CARD */}
        <div className={`flex flex-col rounded-2xl bg-slate-900/95 border p-2 shadow-xl transition-all ${
          fullPowerMode ? 'border-amber-500/60 shadow-amber-500/10' : 'border-cyan-500/40 hover:border-cyan-400/70'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1 px-1">
            <span className="text-[10px] font-black uppercase text-cyan-300 font-athletic tracking-wider">
              DROP
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-400 tabular-nums">
              {fullPowerMode ? '100%' : `${shotPowers.drop}%`}
            </span>
          </div>

          {/* Quick Power Stepper */}
          <div className="flex items-center gap-1 mb-2 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onUpdatePower('drop', 48)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.drop === 48 && !fullPowerMode ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tight
            </button>
            <button
              onClick={() => onUpdatePower('drop', 65)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.drop === 65 && !fullPowerMode ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Push
            </button>
            <button
              onClick={() => onUpdatePower('drop', 100)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-black transition-all cursor-pointer ${
                (shotPowers.drop === 100 || fullPowerMode) ? 'bg-gradient-to-r from-cyan-500 to-amber-500 text-white' : 'text-amber-400 hover:text-white'
              }`}
            >
              100%
            </button>
          </div>

          {/* Hit Button */}
          <button
            onClick={() => onTriggerShot('drop')}
            onMouseDown={() => onStartCharge && onStartCharge('drop')}
            onMouseUp={() => onReleaseCharge && onReleaseCharge()}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 active:scale-95 border border-cyan-500/50 text-cyan-200 font-black text-xs transition-all shadow-md cursor-pointer"
          >
            <Target className="w-4 h-4 text-cyan-400" />
            <span>HIT DROP</span>
            <span className="text-[8px] text-cyan-400/80 font-mono hidden sm:inline">[L]</span>
          </button>
        </div>

        {/* 3. FLAT DRIVE CARD */}
        <div className={`flex flex-col rounded-2xl bg-slate-900/95 border p-2 shadow-xl transition-all ${
          fullPowerMode ? 'border-amber-500/60 shadow-amber-500/10' : 'border-teal-500/40 hover:border-teal-400/70'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1 px-1">
            <span className="text-[10px] font-black uppercase text-teal-300 font-athletic tracking-wider">
              DRIVE
            </span>
            <span className="text-[10px] font-mono font-bold text-teal-400 tabular-nums">
              {fullPowerMode ? '100%' : `${shotPowers.drive}%`}
            </span>
          </div>

          {/* Quick Power Stepper */}
          <div className="flex items-center gap-1 mb-2 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onUpdatePower('drive', 65)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.drive === 65 && !fullPowerMode ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Soft
            </button>
            <button
              onClick={() => onUpdatePower('drive', 80)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.drive === 80 && !fullPowerMode ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fast
            </button>
            <button
              onClick={() => onUpdatePower('drive', 100)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-black transition-all cursor-pointer ${
                (shotPowers.drive === 100 || fullPowerMode) ? 'bg-gradient-to-r from-teal-500 to-amber-500 text-white' : 'text-amber-400 hover:text-white'
              }`}
            >
              100%
            </button>
          </div>

          {/* Hit Button */}
          <button
            onClick={() => onTriggerShot('drive')}
            onMouseDown={() => onStartCharge && onStartCharge('drive')}
            onMouseUp={() => onReleaseCharge && onReleaseCharge()}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-teal-950 hover:bg-teal-900 active:scale-95 border border-teal-500/50 text-teal-200 font-black text-xs transition-all shadow-md cursor-pointer"
          >
            <Activity className="w-4 h-4 text-teal-400" />
            <span>HIT DRIVE</span>
            <span className="text-[8px] text-teal-400/80 font-mono hidden sm:inline">[U]</span>
          </button>
        </div>

        {/* 4. POWER SMASH CARD (Hero primary action) */}
        <div className={`flex flex-col rounded-2xl bg-gradient-to-b from-rose-950/95 to-slate-900 border-2 p-2 shadow-2xl transition-all ${
          fullPowerMode ? 'border-red-500 shadow-red-500/20 ring-2 ring-amber-400/50' : 'border-amber-500/70 hover:border-amber-400'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1 px-1">
            <span className="text-[11px] font-black uppercase text-amber-300 font-athletic tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>SMASH</span>
            </span>
            <span className="text-[10px] font-mono font-black text-amber-300 tabular-nums">
              {fullPowerMode ? '🔥 100% MAX' : `${shotPowers.smash}%`}
            </span>
          </div>

          {/* Quick Power Stepper */}
          <div className="flex items-center gap-1 mb-2 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onUpdatePower('smash', 75)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.smash === 75 && !fullPowerMode ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              75%
            </button>
            <button
              onClick={() => onUpdatePower('smash', 90)}
              className={`px-1.5 py-0.5 text-[9px] rounded font-semibold transition-all cursor-pointer ${
                shotPowers.smash === 90 && !fullPowerMode ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              90%
            </button>
            <button
              onClick={() => onUpdatePower('smash', 100)}
              className={`px-2 py-0.5 text-[9px] rounded font-black transition-all cursor-pointer ${
                (shotPowers.smash === 100 || fullPowerMode) ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white ring-1 ring-amber-300' : 'text-amber-400 hover:text-white'
              }`}
            >
              🔥 100%
            </button>
          </div>

          {/* Big SMASH Hit Button */}
          <button
            onClick={() => onTriggerShot('smash')}
            onMouseDown={() => onStartCharge && onStartCharge('smash')}
            onMouseUp={() => onReleaseCharge && onReleaseCharge()}
            className={`relative flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 active:scale-95 text-white font-black text-xs tracking-wider uppercase font-athletic shadow-xl transition-all cursor-pointer ${
              isPlayerInRange ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''
            }`}
          >
            {isPlayerInRange && (
              <span className="absolute -top-2.5 px-1.5 py-0.2 rounded-full bg-yellow-400 text-slate-950 text-[8px] font-black animate-bounce">
                HIT NOW!
              </span>
            )}
            <Zap className="w-4 h-4 fill-white" />
            <span>{fullPowerMode ? '🔥 100% SMASH' : 'SMASH'}</span>
            <span className="text-[8px] text-amber-200 font-mono hidden sm:inline">[K]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
