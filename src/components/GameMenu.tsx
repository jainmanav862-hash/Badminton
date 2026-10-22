import React, { useState } from 'react';
import { AIDifficulty, CourtTheme, GameMode, MatchSettings, MultiplayerType } from '../types/game';
import { Play, Trophy, Users, Shield, Sliders, Volume2, Gamepad2, Sparkles, Scale } from 'lucide-react';

interface GameMenuProps {
  settings: MatchSettings;
  onStartMatch: (newSettings: MatchSettings) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const GameMenu: React.FC<GameMenuProps> = ({
  settings,
  onStartMatch,
  onClose,
  isOpen,
}) => {
  const [mode, setMode] = useState<GameMode>(settings.gameMode);
  const [multiplayer, setMultiplayer] = useState<MultiplayerType>(settings.multiplayerType);
  const [points, setPoints] = useState<number>(settings.pointsToWin);
  const [winByTwo, setWinByTwo] = useState<boolean>(settings.winByTwo);
  const [drawAllowed, setDrawAllowed] = useState<boolean>(settings.drawAllowed);
  const [difficulty, setDifficulty] = useState<AIDifficulty>(settings.aiDifficulty);
  const [theme, setTheme] = useState<CourtTheme>(settings.courtTheme);
  const [activeTab, setActiveTab] = useState<'match' | 'controls'>('match');

  if (!isOpen) return null;

  const handleApply = () => {
    onStartMatch({
      ...settings,
      gameMode: mode,
      multiplayerType: multiplayer,
      pointsToWin: points,
      winByTwo,
      drawAllowed,
      maxPointsCap: drawAllowed ? points : 30,
      aiDifficulty: difficulty,
      courtTheme: theme,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Banner with Olympic Stadium visual */}
        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-emerald-950 via-slate-900 to-sky-950 flex items-end p-5 border-b border-slate-800">
          <img
            src="/src/assets/images/badminton_arena_banner_1792661332141.jpg"
            alt="Badminton Arena"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-white font-athletic tracking-wide flex items-center gap-2">
              <span>SUPER SMASH ARENA</span>
            </h1>
            <p className="text-xs text-slate-300">
              Olympic-Grade 1v1 Singles & 2v2 Doubles Badminton Tournament
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('match')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'match'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Match Configuration
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${
              activeTab === 'controls'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Controls & Gameplay Guide
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {activeTab === 'match' ? (
            <>
              {/* Game Mode (1v1 vs 2v2) */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  1. Court Discipline
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('1v1');
                      if (multiplayer === 'four_players' || multiplayer === 'coop_vs_ai') {
                        setMultiplayer('p1_vs_ai');
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === '1v1'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-100 flex items-center justify-between">
                      <span>1 vs 1 Singles</span>
                      {mode === '1v1' && <span className="text-emerald-400 text-xs font-mono">SELECTED</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Full court length with narrow singles sidelines. Intense solo rallies.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('2v2');
                      if (multiplayer === 'p1_vs_p2') {
                        setMultiplayer('coop_vs_ai');
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      mode === '2v2'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-100 flex items-center justify-between">
                      <span>2 vs 2 Doubles</span>
                      {mode === '2v2' && <span className="text-emerald-400 text-xs font-mono">SELECTED</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Wider court doubles alleys with 4 players, rotations, and frontline attacks.
                    </div>
                  </button>
                </div>
              </div>

              {/* Multiplayer / Match Participant Setup */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  2. Players & Opponents
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {mode === '1v1' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setMultiplayer('p1_vs_ai')}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          multiplayer === 'p1_vs_ai'
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">1 Player vs Smart AI</div>
                        <div className="text-[11px] text-slate-500">Solo tournament match</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMultiplayer('p1_vs_p2')}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          multiplayer === 'p1_vs_p2'
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">2 Players Local Couch (P1 vs P2)</div>
                        <div className="text-[11px] text-slate-500">WASD vs Arrow Keys / Gamepad</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMultiplayer('ai_vs_ai')}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          multiplayer === 'ai_vs_ai'
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">Spectator Mode (AI vs AI)</div>
                        <div className="text-[11px] text-slate-500">Sit back and enjoy the stadium match</div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setMultiplayer('p1_vs_ai')}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          multiplayer === 'p1_vs_ai'
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">Player + AI Partner vs AI Duo</div>
                        <div className="text-[11px] text-slate-500">Tactical team synergy</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMultiplayer('coop_vs_ai')}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          multiplayer === 'coop_vs_ai'
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">2 Players Co-op vs AI Team</div>
                        <div className="text-[11px] text-slate-500">You and a friend on the same side</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMultiplayer('p1_ai_vs_p2_ai')}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          multiplayer === 'p1_ai_vs_p2_ai'
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">P1 + AI vs P2 + AI (Rivals)</div>
                        <div className="text-[11px] text-slate-500">Head-to-head with AI teammates</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMultiplayer('four_players')}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          multiplayer === 'four_players'
                            ? 'bg-slate-800 border-emerald-500 text-white'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="font-semibold text-xs text-slate-200">4 Human Players (Full Doubles)</div>
                        <div className="text-[11px] text-slate-500">Keyboards & Gamepads connected</div>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Match Scoring & Win / Draw Conditions */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                  3. Match Format & Win / Draw Rules
                </label>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  {[7, 11, 21].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPoints(p)}
                      className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                        points === p
                          ? 'bg-emerald-950/80 border-emerald-500 text-white font-bold'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-sm">{p} Points</div>
                      <div className="text-[10px] text-slate-500">
                        {p === 7 ? 'Speed Shootout' : p === 11 ? 'Classic Quick' : 'BWF Championship'}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Draw vs Sudden Death Toggle */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-amber-400" />
                      <span>Allow Match Draw at Target Cap</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      When enabled, reaching {points}-{points} concludes in an honorable Tie/Draw instead of endless Deuce.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={drawAllowed}
                    onChange={(e) => setDrawAllowed(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* AI Difficulty & Court Theme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    AI Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as AIDifficulty)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="easy">Casual Club (Easy)</option>
                    <option value="medium">State Champion (Medium)</option>
                    <option value="hard">Super Series Pro (Hard)</option>
                    <option value="champion">Olympic Legend (Champion)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Court Surface
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as CourtTheme)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="olympic_green">Olympic Emerald Mat</option>
                    <option value="wooden_parquet">Classic Wooden Parquet</option>
                    <option value="midnight_blue">Midnight Blue Championship</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            /* Controls Guide Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  Player 1 Controls (Team Blue)
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">W A S D</span>
                    <span className="text-slate-400">Move court footwork</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">J / SPACE</span>
                    <span className="text-slate-400">Clear / Defensive Lob</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">K</span>
                    <span className="text-slate-400">POWER SMASH / Jump Smash</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">L</span>
                    <span className="text-slate-400">Drop Shot (Net tape touch)</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">SHIFT</span>
                    <span className="text-slate-400">Sprint / Diving Lunge</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
                  Player 2 Controls (Team Red / Couch Partner)
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">↑ ← ↓ →</span>
                    <span className="text-slate-400">Move footwork</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">NUM 1 / ,</span>
                    <span className="text-slate-400">Clear / Lob</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">NUM 2 / .</span>
                    <span className="text-slate-400">SMASH</span>
                  </div>
                  <div>
                    <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded mr-2">NUM 3 / /</span>
                    <span className="text-slate-400">Drop Shot</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                  <Gamepad2 className="w-4 h-4" />
                  <span>Gamepad & Mobile Touch Support</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Plug in any Xbox, PlayStation, or generic controller. D-pad/Left Stick controls movement, A is Clear, X is Smash, B is Drop, Right Trigger is Dash. On mobile or touch devices, an on-screen analog joystick and tactile action buttons appear automatically!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel / Back to Game
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg transition-all cursor-pointer font-athletic"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Apply & Start Match</span>
          </button>
        </div>
      </div>
    </div>
  );
};
