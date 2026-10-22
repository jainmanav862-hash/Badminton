export type GameMode = '1v1' | '2v2';

export type MultiplayerType = 
  | 'p1_vs_ai'        // 1v1: Player vs AI
  | 'p1_vs_p2'        // 1v1: Player 1 vs Player 2 (Local)
  | 'coop_vs_ai'      // 2v2: Player 1 & Player 2 vs AI Team
  | 'p1_ai_vs_p2_ai'  // 2v2: Player 1 + AI vs Player 2 + AI
  | 'ai_vs_ai'        // Spectator Mode
  | 'four_players';   // 2v2: 4 Human Players (P1, P2, P3, P4)

export type MatchState = 
  | 'MENU' 
  | 'COUNTDOWN' 
  | 'SERVING' 
  | 'RALLY' 
  | 'POINT_SCORED' 
  | 'REPLAY' 
  | 'GAME_OVER' 
  | 'PAUSED';

export type ShotType = 'smash' | 'clear' | 'drop' | 'drive' | 'net_tap' | 'serve';

export type CourtTheme = 'olympic_green' | 'wooden_parquet' | 'midnight_blue';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'champion';

export type PlayerActionState = 
  | 'idle' 
  | 'running' 
  | 'swing_smash' 
  | 'jump_smash' 
  | 'swing_clear' 
  | 'swing_drop' 
  | 'dive' 
  | 'celebrate' 
  | 'disappointed';

export interface Player {
  id: string;
  name: string;
  country: string;
  team: 'teamA' | 'teamB'; // teamA is near side (bottom), teamB is far side (top)
  isAI: boolean;
  controllerIndex?: number; // For gamepad or local player index (0=P1, 1=P2, etc)
  
  // Real-world court coordinates (meters)
  // X: -3.05m to +3.05m (0 is center line)
  // Y: -6.7m to +6.7m (0 is net. teamA is positive Y: 0 to 6.7m, teamB is negative Y: -6.7 to 0)
  // Z: 0 (ground) up to ~1.2m when jumping
  x: number;
  y: number;
  z: number;
  
  vx: number;
  vy: number;
  vz: number;
  
  speed: number;
  facing: number; // 1 facing upward (teamA), -1 facing downward (teamB)
  actionState: PlayerActionState;
  stateTimer: number; // seconds remaining in current action
  
  // Appearance
  jerseyColor: string;
  shortsColor: string;
  skinColor: string;
  hairColor: string;
  racketColor: string;
  
  // Mechanics
  stamina: number;      // 0 to 100
  smashGauge: number;   // 0 to 100
  canHit: boolean;
  hitCooldown: number;
  
  // AI specific attributes
  reactionDelay?: number;
  targetX?: number;
  targetY?: number;
}

export interface Shuttlecock {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  
  speedKmH: number;
  lastHitBy?: string;
  lastHitTeam?: 'teamA' | 'teamB';
  lastShotType?: ShotType;
  inAir: boolean;
  
  // Historical trail for smash / motion blur
  trail: Array<{ x: number; y: number; z: number; speed: number; alpha: number }>;
}

export interface Spectator {
  x: number;
  y: number;
  tier: number;
  stand: 'north' | 'south' | 'east' | 'west';
  shirtColor: string;
  headColor: string;
  hasFlag: boolean;
  flagColor?: string;
  bobOffset: number;
  bobSpeed: number;
  armsUp: boolean;
  clapping: boolean;
}

export interface MatchScore {
  teamA: number;
  teamB: number;
  gamesTeamA: number;
  gamesTeamB: number;
  serverTeam: 'teamA' | 'teamB';
  serverPlayerId: string;
  receiverPlayerId: string;
  rallyHits: number;
  isDeuce: boolean;
  isMatchPoint: boolean;
}

export interface MatchStats {
  durationSeconds: number;
  totalPoints: number;
  longestRally: number;
  highestSmashSpeed: number;
  smashesTeamA: number;
  smashesTeamB: number;
  smashWinnersTeamA: number;
  smashWinnersTeamB: number;
  unforcedErrorsTeamA: number;
  unforcedErrorsTeamB: number;
  dropShotWinnersTeamA: number;
  dropShotWinnersTeamB: number;
}

export interface MatchSettings {
  gameMode: GameMode;
  multiplayerType: MultiplayerType;
  pointsToWin: number; // 7, 11, or 21
  winByTwo: boolean;
  drawAllowed: boolean; // If enabled, tied at max cap results in a Draw
  maxPointsCap: number; // e.g. 30 in BWF, or 21 in Draw mode
  aiDifficulty: AIDifficulty;
  courtTheme: CourtTheme;
  soundEnabled: boolean;
  crowdCheeringEnabled: boolean;
}

export type PowerType = 
  | 'thunder_smash'   // 400+ km/h flaming smash
  | 'deceptive_drop'  // Hairpin tumbling net slice
  | 'iron_defense'    // Reflexive dive and counter-attack shield
  | 'stamina_surge';  // Full stamina restore & 40% speed boost

export interface PowerOption {
  id: PowerType;
  name: string;
  signaturePlayer: string;
  description: string;
  icon: string;
  cooldownSeconds: number;
  currentCooldown: number;
  energyCost: number;
  active: boolean;
}

export interface HawkEyeReview {
  isOpen: boolean;
  landingX: number;
  landingY: number;
  nearestLine: 'sideline' | 'baseline' | 'service';
  distanceFromLineMm: number;
  originalCall: 'IN' | 'OUT';
  reviewedCall: 'IN' | 'OUT';
  overturned: boolean;
  challengerTeam: 'teamA' | 'teamB';
  challengesRemainingA: number;
  challengesRemainingB: number;
}

export interface BWFIntervalState {
  isActive: boolean;
  leadingTeam: 'teamA' | 'teamB';
  scoreLead: string;
  coachAdvice: string;
}

export interface ReplayFrame {
  shuttlecock: { x: number; y: number; z: number; speedKmH: number };
  players: Array<{ id: string; x: number; y: number; z: number; actionState: PlayerActionState }>;
}
