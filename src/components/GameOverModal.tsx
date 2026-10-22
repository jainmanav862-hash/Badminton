import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MatchScore, MatchStats, Player } from '../types/game';
import { Trophy, RotateCcw, Sliders, Zap, Flame, Award, Scale } from 'lucide-react';

interface GameOverModalProps {
  score: MatchScore;
  stats: MatchStats;
  players: Player[];
  isDraw: boolean;
  winnerTeam: 'teamA' | 'teamB' | null;
  onRematch: () => void;
  onOpenSettings: () => void;
  isOpen: boolean;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  stats,
  players,
  isDraw,
  winnerTeam,
  onRematch,
  onOpenSettings,
  isOpen,
}) => {
  useEffect(() => {
    if (isOpen && !isDraw) {
      // Trigger festive confetti burst for winner
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B', '#FFFFFF'],
      });
    }
  }, [isOpen, isDraw]);

  if (!isOpen) return null;

  const teamAPlayers = players.filter((p) => p.team === 'teamA');
  const teamBPlayers = players.filter((p) => p.team === 'teamB');

  const teamAName = teamAPlayers.map((p) => p.name).join(' & ');
  const teamBName = teamBPlayers.map((p) => p.name).join(' & ');

  const winningPlayers = winnerTeam === 'teamA' ? teamAPlayers : teamBPlayers;
  const winningTeamName = winnerTeam === 'teamA' ? teamAName : teamBName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center">
        {/* Championship Header */}
        <div className="mb-4">
          {isDraw ? (
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
              <Scale className="w-8 h-8" />
            </div>
          ) : (
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
              <Trophy className="w-8 h-8" />
            </div>
          )}

          <h2 className="text-3xl font-black text-white font-athletic tracking-wide uppercase">
            {isDraw ? 'HONORABLE MATCH DRAW' : 'MATCH CHAMPION'}
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            {isDraw
              ? `Both competitors battled to a fierce stalemate at ${score.teamA}-${score.teamB}`
              : `${winningTeamName} triumphs in the BWF Olympic Arena!`}
          </p>
        </div>

        {/* Final Scoreboard Display */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-around">
          <div className="text-center">
            <div className="text-xs font-semibold text-slate-300 max-w-[120px] truncate">{teamAName}</div>
            <div className="text-3xl font-black tabular-nums font-athletic text-emerald-400 mt-0.5">
              {score.teamA}
            </div>
          </div>

          <div className="text-xs font-bold text-slate-600 uppercase">FINAL</div>

          <div className="text-center">
            <div className="text-xs font-semibold text-slate-300 max-w-[120px] truncate">{teamBName}</div>
            <div className="text-3xl font-black tabular-nums font-athletic text-rose-400 mt-0.5">
              {score.teamB}
            </div>
          </div>
        </div>

        {/* Detailed Match Statistics */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>Longest Rally</span>
            </div>
            <div className="text-lg font-bold text-slate-100 tabular-nums font-athletic mt-1">
              {stats.longestRally} <span className="text-xs font-normal text-slate-400">shots</span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Zap className="w-3 h-3 text-rose-500" />
              <span>Top Smash</span>
            </div>
            <div className="text-lg font-bold text-slate-100 tabular-nums font-athletic mt-1">
              {stats.highestSmashSpeed} <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Award className="w-3 h-3 text-emerald-500" />
              <span>Total Points</span>
            </div>
            <div className="text-lg font-bold text-slate-100 tabular-nums font-athletic mt-1">
              {stats.totalPoints}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Match Setup</span>
          </button>

          <button
            onClick={onRematch}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black tracking-wider uppercase font-athletic shadow-lg transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 fill-slate-950" />
            <span>Play Rematch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
