import React from 'react';
import { BWFIntervalState } from '../types/game';
import { Coffee, Play, Zap, Shield, Sparkles } from 'lucide-react';

interface IntervalModalProps {
  interval: BWFIntervalState;
  onResume: () => void;
  onApplyTacticalBuff: (buffType: 'attack' | 'defense' | 'stamina') => void;
}

export const IntervalModal: React.FC<IntervalModalProps> = ({
  interval,
  onResume,
  onApplyTacticalBuff,
}) => {
  if (!interval.isActive) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 text-center">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2 text-emerald-400">
          <Coffee className="w-6 h-6" />
          <span className="text-2xl font-black uppercase font-athletic tracking-wider text-white">
            OFFICIAL BWF 11-POINT INTERVAL
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Towel break & coach consultation. Score: <span className="font-bold text-white">{interval.scoreLead}</span>
        </p>

        {/* Coach Tactical Briefing Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left mb-5">
          <div className="text-[11px] font-bold uppercase text-amber-400 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>National Coach Strategic Insight:</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed italic">
            "{interval.coachAdvice}"
          </p>
        </div>

        {/* Tactical Buff Choices for 2nd Half */}
        <div className="mb-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-left">
            Select Interval Tactical Adjustment:
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => onApplyTacticalBuff('attack')}
              className="p-3 rounded-xl bg-slate-950/60 hover:bg-rose-950/60 border border-rose-500/40 text-left transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-5 h-5 text-rose-400 mb-1" />
              <div className="text-xs font-bold text-slate-200">Hyper Attack</div>
              <div className="text-[10px] text-slate-400">+20% Smash Speed</div>
            </button>

            <button
              onClick={() => onApplyTacticalBuff('defense')}
              className="p-3 rounded-xl bg-slate-950/60 hover:bg-emerald-950/60 border border-emerald-500/40 text-left transition-all active:scale-95 cursor-pointer"
            >
              <Shield className="w-5 h-5 text-emerald-400 mb-1" />
              <div className="text-xs font-bold text-slate-200">Iron Wall</div>
              <div className="text-[10px] text-slate-400">+25% Reach Radius</div>
            </button>

            <button
              onClick={() => onApplyTacticalBuff('stamina')}
              className="p-3 rounded-xl bg-slate-950/60 hover:bg-cyan-950/60 border border-cyan-500/40 text-left transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-cyan-400 mb-1" />
              <div className="text-xs font-bold text-slate-200">Full Recharge</div>
              <div className="text-[10px] text-slate-400">100% Stamina Full</div>
            </button>
          </div>
        </div>

        {/* Resume Match */}
        <button
          onClick={onResume}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-widest uppercase font-athletic shadow-lg transition-all cursor-pointer active:scale-95"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>Resume 2nd Half of Match</span>
        </button>
      </div>
    </div>
  );
};
