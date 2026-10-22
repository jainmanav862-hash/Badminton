import React from 'react';
import { MatchScore, MatchSettings, Player } from '../types/game';
import { Volume2, VolumeX, Pause, Play, Users, Award, Flame } from 'lucide-react';

interface ScoreBoardProps {
  score: MatchScore;
  settings: MatchSettings;
  players: Player[];
  highestSmashSpeed: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onToggleSound: () => void;
  onOpenMenu: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  settings,
  players,
  highestSmashSpeed,
  isPaused,
  onTogglePause,
  onToggleSound,
  onOpenMenu,
}) => {
  const teamAPlayers = players.filter((p) => p.team === 'teamA');
  const teamBPlayers = players.filter((p) => p.team === 'teamB');

  const teamAName = teamAPlayers.map((p) => p.name).join(' & ');
  const teamBName = teamBPlayers.map((p) => p.name).join(' & ');

  const isServerA = score.serverTeam === 'teamA';
  const isServerB = score.serverTeam === 'teamB';

  return (
    <header className="relative w-full z-30 select-none bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 shadow-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Tournament Badge & Menu Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Match Setup</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              {settings.gameMode === '1v1' ? '1v1 Singles' : '2v2 Doubles'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Target {settings.pointsToWin} Pts</span>
            {settings.drawAllowed && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400">Draw Allowed</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Live BWF Digital Scoreboard */}
        <div className="flex items-center bg-slate-900/90 border border-slate-700/70 rounded-xl px-4 py-1.5 shadow-inner">
          {/* Team A (Bottom / Near Court) */}
          <div className="flex items-center gap-2.5">
            {isServerA && (
              <span className="text-emerald-400 text-xs animate-bounce" title="Serving">
                🏸
              </span>
            )}
            <div className="text-right">
              <div className="text-xs font-bold text-slate-100 flex items-center justify-end gap-1.5">
                <span className="text-xs">{teamAPlayers[0]?.country || '🏸'}</span>
                <span className="max-w-[110px] sm:max-w-[150px] truncate">{teamAName}</span>
              </div>
              <div className="text-[10px] text-slate-400">Team Blue</div>
            </div>
            <div className="text-2xl font-black tabular-nums font-athletic text-emerald-400 px-2 py-0.5 rounded bg-slate-950/80 min-w-[34px] text-center border border-emerald-950">
              {score.teamA}
            </div>
          </div>

          {/* Separator & Set Marker */}
          <div className="flex flex-col items-center px-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">VS</span>
            {score.isMatchPoint && (
              <span className="text-[9px] font-black text-rose-400 tracking-tight animate-pulse whitespace-nowrap">
                MATCH POINT
              </span>
            )}
            {score.isDeuce && (
              <span className="text-[9px] font-bold text-amber-400 tracking-tight whitespace-nowrap">
                DEUCE
              </span>
            )}
          </div>

          {/* Team B (Top / Far Court) */}
          <div className="flex items-center gap-2.5">
            <div className="text-2xl font-black tabular-nums font-athletic text-rose-400 px-2 py-0.5 rounded bg-slate-950/80 min-w-[34px] text-center border border-rose-950">
              {score.teamB}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span className="max-w-[110px] sm:max-w-[150px] truncate">{teamBName}</span>
                <span className="text-xs">{teamBPlayers[0]?.country || '🏸'}</span>
              </div>
              <div className="text-[10px] text-slate-400">Team Red</div>
            </div>
            {isServerB && (
              <span className="text-rose-400 text-xs animate-bounce" title="Serving">
                🏸
              </span>
            )}
          </div>
        </div>

        {/* Right: Live Telemetry & Control Actions */}
        <div className="flex items-center gap-2.5">
          {/* Rally counter */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-400 text-[11px]">Rally:</span>
            <span className="font-bold tabular-nums text-amber-400">{score.rallyHits}</span>
          </div>

          {/* Top Smash Speed */}
          {highestSmashSpeed > 0 && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              <span>Top Smash:</span>
              <span className="font-bold tabular-nums text-rose-400">{highestSmashSpeed} km/h</span>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label={settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          {/* Pause Toggle */}
          <button
            onClick={onTogglePause}
            aria-label={isPaused ? 'Resume match' : 'Pause match'}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
