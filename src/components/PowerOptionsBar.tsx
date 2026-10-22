import React from 'react';
import { PowerOption, PowerType } from '../types/game';
import { Zap, Wind, Shield, Flame, Eye, Sparkles } from 'lucide-react';

interface PowerOptionsBarProps {
  powers: PowerOption[];
  onActivatePower: (type: PowerType) => void;
  canChallenge: boolean;
  onTriggerHawkEye: () => void;
  challengesRemaining: number;
}

export const PowerOptionsBar: React.FC<PowerOptionsBarProps> = ({
  powers,
  onActivatePower,
  canChallenge,
  onTriggerHawkEye,
  challengesRemaining,
}) => {
  const getIcon = (id: PowerType) => {
    switch (id) {
      case 'thunder_smash':
        return <Zap className="w-5 h-5 text-amber-300" />;
      case 'deceptive_drop':
        return <Wind className="w-5 h-5 text-cyan-300" />;
      case 'iron_defense':
        return <Shield className="w-5 h-5 text-emerald-300" />;
      case 'stamina_surge':
        return <Flame className="w-5 h-5 text-rose-300" />;
    }
  };

  const getGradient = (id: PowerType, active: boolean) => {
    if (active) {
      return 'bg-gradient-to-tr from-yellow-500 to-amber-300 text-slate-950 ring-2 ring-yellow-400 animate-pulse';
    }
    switch (id) {
      case 'thunder_smash':
        return 'bg-slate-900/90 hover:bg-amber-950/70 border-amber-500/50 text-amber-300';
      case 'deceptive_drop':
        return 'bg-slate-900/90 hover:bg-cyan-950/70 border-cyan-500/50 text-cyan-300';
      case 'iron_defense':
        return 'bg-slate-900/90 hover:bg-emerald-950/70 border-emerald-500/50 text-emerald-300';
      case 'stamina_surge':
        return 'bg-slate-900/90 hover:bg-rose-950/70 border-rose-500/50 text-rose-300';
    }
  };

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Power Options */}
      {powers.map((p, idx) => {
        const onCooldown = p.currentCooldown > 0;
        const cooldownPct = onCooldown ? (p.currentCooldown / p.cooldownSeconds) * 100 : 0;

        return (
          <button
            key={p.id}
            onClick={() => onActivatePower(p.id)}
            disabled={onCooldown}
            title={`${p.name} (${p.signaturePlayer}): ${p.description}`}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md transition-all shadow-lg active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${getGradient(
              p.id,
              p.active
            )}`}
          >
            {/* Cooldown radial overlay */}
            {onCooldown && (
              <div
                style={{ height: `${cooldownPct}%` }}
                className="absolute inset-x-0 bottom-0 bg-black/60 rounded-xl pointer-events-none transition-all"
              />
            )}

            <div className="relative z-10 flex items-center gap-2">
              <div className="p-1 rounded-lg bg-black/30">{getIcon(p.id)}</div>
              <div className="text-left hidden lg:block">
                <div className="text-[11px] font-black uppercase font-athletic tracking-wide leading-none">
                  {p.name}
                </div>
                <div className="text-[9px] text-slate-300/80 font-medium">
                  {onCooldown ? `${p.currentCooldown.toFixed(1)}s` : p.signaturePlayer}
                </div>
              </div>
            </div>

            {/* Shortcut key indicator */}
            <span className="hidden sm:inline-block text-[9px] font-mono px-1 py-0.5 rounded bg-black/40 text-slate-300">
              {idx + 1}
            </span>
          </button>
        );
      })}

      {/* Official BWF Hawk-Eye Challenge Button */}
      {canChallenge && challengesRemaining > 0 && (
        <button
          onClick={onTriggerHawkEye}
          className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-xl active:scale-95 transition-all border border-cyan-300/60 animate-pulse cursor-pointer font-athletic"
          title="Challenge line call using official BWF Hawk-Eye"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">HAWK-EYE CHALLENGE</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-950/60 font-mono">
            {challengesRemaining} LEFT
          </span>
        </button>
      )}
    </div>
  );
};
