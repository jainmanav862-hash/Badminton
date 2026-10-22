import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BadmintonCanvas } from './components/BadmintonCanvas';
import { ScoreBoard } from './components/ScoreBoard';
import { GameMenu } from './components/GameMenu';
import { GameOverModal } from './components/GameOverModal';
import { InstantReplay } from './components/InstantReplay';
import { PowerOptionsBar } from './components/PowerOptionsBar';
import { HawkEyeModal } from './components/HawkEyeModal';
import { IntervalModal } from './components/IntervalModal';
import { ShotPowerDeck, ShotPowerLevels } from './components/ShotPowerDeck';
import { 
  BWFIntervalState,
  CourtTheme, 
  GameMode, 
  HawkEyeReview,
  MatchScore, 
  MatchSettings, 
  MatchStats, 
  Player, 
  PowerOption,
  PowerType,
  ReplayFrame, 
  ShotType, 
  Shuttlecock 
} from './types/game';
import { 
  checkCourtInBounds, 
  COURT, 
  executeShot, 
  predictShuttleLanding, 
  updateAIPlayer, 
  updateShuttlecock 
} from './utils/physics';
import { sound } from './utils/audio';
import { Zap, ArrowUpCircle, Target, ShieldAlert, MousePointer } from 'lucide-react';

const DEFAULT_SETTINGS: MatchSettings = {
  gameMode: '1v1',
  multiplayerType: 'p1_vs_ai',
  pointsToWin: 11,
  winByTwo: true,
  drawAllowed: true,
  maxPointsCap: 11,
  aiDifficulty: 'medium',
  courtTheme: 'olympic_green',
  soundEnabled: true,
  crowdCheeringEnabled: true,
};

const INITIAL_POWERS: PowerOption[] = [
  {
    id: 'thunder_smash',
    name: 'Thunder Smash',
    signaturePlayer: 'Lin Dan (420 km/h)',
    description: 'Unleashes a supersonic 400+ km/h missile smash with a flame trail.',
    icon: 'Zap',
    cooldownSeconds: 12,
    currentCooldown: 0,
    energyCost: 35,
    active: false,
  },
  {
    id: 'deceptive_drop',
    name: 'Deceptive Slice',
    signaturePlayer: 'Tai Tzu-ying',
    description: 'Wind up like a smash, then deceptive slice drops dead over the net tape.',
    icon: 'Wind',
    cooldownSeconds: 8,
    currentCooldown: 0,
    energyCost: 25,
    active: false,
  },
  {
    id: 'iron_defense',
    name: 'Iron Defense',
    signaturePlayer: 'Hendra Setiawan',
    description: 'Automatic reflexive block: absorbs any smash and counters with laser flat drive.',
    icon: 'Shield',
    cooldownSeconds: 14,
    currentCooldown: 0,
    energyCost: 40,
    active: false,
  },
  {
    id: 'stamina_surge',
    name: 'Stamina Surge',
    signaturePlayer: 'Viktor Axelsen',
    description: 'Instantly restores 100% stamina and grants +40% sprint speed.',
    icon: 'Flame',
    cooldownSeconds: 16,
    currentCooldown: 0,
    energyCost: 30,
    active: false,
  },
];

export default function App() {
  const [settings, setSettings] = useState<MatchSettings>(DEFAULT_SETTINGS);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isDraw, setIsDraw] = useState<boolean>(false);
  const [winnerTeam, setWinnerTeam] = useState<'teamA' | 'teamB' | null>(null);

  const [eventBanner, setEventBanner] = useState<{
    text: string;
    subtext?: string;
    type: 'info' | 'smash' | 'point' | 'deuce' | 'draw';
  } | null>({ 
    text: 'YOUR TURN TO SERVE!', 
    subtext: 'Click "SERVE" or press SPACE to begin the rally!', 
    type: 'info' 
  });

  const [cameraFlash, setCameraFlash] = useState<boolean>(false);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isServingState, setIsServingState] = useState<boolean>(true);
  const [isHumanServerState, setIsHumanServerState] = useState<boolean>(true);
  const [isPlayerInRangeState, setIsPlayerInRangeState] = useState<boolean>(false);
  const [mouseControlEnabled, setMouseControlEnabled] = useState<boolean>(true);

  // Individual Hitting Power Controls for each single shot type on main screen
  const [shotPowers, setShotPowers] = useState<ShotPowerLevels>({
    smash: 100,
    clear: 80,
    drop: 65,
    drive: 85,
  });
  const [autoInBoundsLock, setAutoInBoundsLock] = useState<boolean>(false);
  const [hitPower, setHitPower] = useState<number>(100);
  const [fullPowerMode, setFullPowerMode] = useState<boolean>(false);
  const [chargingPower, setChargingPower] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState<number>(0);
  const chargeStartTimeRef = useRef<number | null>(null);
  const chargingShotTypeRef = useRef<ShotType>('smash');
  // In-Game Power Options State
  const [powers, setPowers] = useState<PowerOption[]>(INITIAL_POWERS);
  const [activePower, setActivePower] = useState<PowerType | null>(null);
  const activePowerTimerRef = useRef<number>(0);

  // BWF Official Hawk-Eye Instant Review State
  const [canChallenge, setCanChallenge] = useState<boolean>(false);
  const [challengesRemainingA, setChallengesRemainingA] = useState<number>(2);
  const [challengesRemainingB, setChallengesRemainingB] = useState<number>(2);
  const [hawkEyeReview, setHawkEyeReview] = useState<HawkEyeReview>({
    isOpen: false,
    landingX: 0,
    landingY: 0,
    nearestLine: 'sideline',
    distanceFromLineMm: 5.4,
    originalCall: 'OUT',
    reviewedCall: 'IN',
    overturned: false,
    challengerTeam: 'teamA',
    challengesRemainingA: 2,
    challengesRemainingB: 2,
  });

  const lastPointDataRef = useRef<{
    landingX: number;
    landingY: number;
    awardedTeam: 'teamA' | 'teamB';
    hittingTeam: 'teamA' | 'teamB';
    isIn: boolean;
    distanceMm: number;
    reason: string;
  } | null>(null);

  // BWF Official 11-Point Interval Break State
  const [intervalState, setIntervalState] = useState<BWFIntervalState>({
    isActive: false,
    leadingTeam: 'teamA',
    scoreLead: '11 - 8',
    coachAdvice: 'Attack the backhand corner and exploit high clears!',
  });
  const hasTriggeredIntervalRef = useRef<boolean>(false);

  // Tactical Buff from interval
  const [tacticalBuff, setTacticalBuff] = useState<'attack' | 'defense' | 'stamina' | null>(null);

  // Match score state
  const [score, setScore] = useState<MatchScore>({
    teamA: 0,
    teamB: 0,
    gamesTeamA: 0,
    gamesTeamB: 0,
    serverTeam: 'teamA',
    serverPlayerId: 'p1',
    receiverPlayerId: 'p2',
    rallyHits: 0,
    isDeuce: false,
    isMatchPoint: false,
  });

  // Match statistics
  const [stats, setStats] = useState<MatchStats>({
    durationSeconds: 0,
    totalPoints: 0,
    longestRally: 0,
    highestSmashSpeed: 0,
    smashesTeamA: 0,
    smashesTeamB: 0,
    smashWinnersTeamA: 0,
    smashWinnersTeamB: 0,
    unforcedErrorsTeamA: 0,
    unforcedErrorsTeamB: 0,
    dropShotWinnersTeamA: 0,
    dropShotWinnersTeamB: 0,
  });

  // Active Players & Shuttlecock
  const playersRef = useRef<Player[]>([]);
  const shuttleRef = useRef<Shuttlecock>({
    x: 1.2,
    y: 4.2,
    z: 1.1,
    vx: 0,
    vy: 0,
    vz: 0,
    speedKmH: 0,
    inAir: false,
    trail: [],
  });

  // Replay frame buffer
  const replayBufferRef = useRef<ReplayFrame[]>([]);
  const isServingRef = useRef<boolean>(true);
  const isHumanServerRef = useRef<boolean>(true);
  const serveCountdownRef = useRef<number>(2.0);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const mouseTargetRef = useRef<{ x: number; y: number } | null>(null);
  const bufferedShotRef = useRef<{ type: ShotType; timer: number } | null>(null);

  // Initialize players
  const initPlayers = useCallback((currentSettings: MatchSettings) => {
    const list: Player[] = [];
    const isDoubles = currentSettings.gameMode === '2v2';
    const multi = currentSettings.multiplayerType;

    // Player 1 (Team A - Bottom Court - YOU)
    list.push({
      id: 'p1',
      name: 'Player 1 (You)',
      country: 'USA',
      team: 'teamA',
      isAI: multi === 'ai_vs_ai',
      x: isDoubles ? 1.0 : 0,
      y: 4.5,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: 7.8,
      facing: 1,
      actionState: 'idle',
      stateTimer: 0,
      jerseyColor: '#2563EB',
      shortsColor: '#1E293B',
      skinColor: '#FCD34D',
      hairColor: '#475569',
      racketColor: '#38BDF8',
      stamina: 100,
      smashGauge: 60,
      canHit: true,
      hitCooldown: 0,
    });

    // Player 2 (Team B - Top Court - Opponent)
    const isP2Human = multi === 'p1_vs_p2' || multi === 'p1_ai_vs_p2_ai' || multi === 'four_players';
    list.push({
      id: 'p2',
      name: isP2Human ? 'Player 2' : 'Axelsen (AI)',
      country: 'DEN',
      team: 'teamB',
      isAI: !isP2Human,
      x: isDoubles ? -1.0 : 0,
      y: -4.5,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: 7.2,
      facing: -1,
      actionState: 'idle',
      stateTimer: 0,
      jerseyColor: '#DC2626',
      shortsColor: '#1E293B',
      skinColor: '#FBBF24',
      hairColor: '#D97706',
      racketColor: '#F87171',
      stamina: 100,
      smashGauge: 30,
      canHit: true,
      hitCooldown: 0,
    });

    if (isDoubles) {
      const isP3Human = multi === 'coop_vs_ai' || multi === 'four_players';
      list.push({
        id: 'p3',
        name: isP3Human ? 'Player 3' : 'Lee (AI Teammate)',
        country: 'MAS',
        team: 'teamA',
        isAI: !isP3Human,
        x: -1.0,
        y: 2.8,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        speed: 7.4,
        facing: 1,
        actionState: 'idle',
        stateTimer: 0,
        jerseyColor: '#3B82F6',
        shortsColor: '#1E293B',
        skinColor: '#FCD34D',
        hairColor: '#1E293B',
        racketColor: '#60A5FA',
        stamina: 100,
        smashGauge: 50,
        canHit: true,
        hitCooldown: 0,
      });

      const isP4Human = multi === 'four_players';
      list.push({
        id: 'p4',
        name: isP4Human ? 'Player 4' : 'Gideon (AI)',
        country: 'INA',
        team: 'teamB',
        isAI: !isP4Human,
        x: 1.0,
        y: -2.8,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        speed: 7.2,
        facing: -1,
        actionState: 'idle',
        stateTimer: 0,
        jerseyColor: '#EF4444',
        shortsColor: '#1E293B',
        skinColor: '#B45309',
        hairColor: '#0F172A',
        racketColor: '#FCA5A5',
        stamina: 100,
        smashGauge: 50,
        canHit: true,
        hitCooldown: 0,
      });
    }

    playersRef.current = list;
  }, []);

  // Position players for service
  const setupService = useCallback((serverTeam: 'teamA' | 'teamB', currentScore: MatchScore) => {
    isServingRef.current = true;
    setIsServingState(true);
    setCanChallenge(false);

    const isHuman = serverTeam === 'teamA';
    isHumanServerRef.current = isHuman;
    setIsHumanServerState(isHuman);
    serveCountdownRef.current = 2.2;

    const isTeamAEven = currentScore.teamA % 2 === 0;
    const isTeamBEven = currentScore.teamB % 2 === 0;

    const pList = playersRef.current;
    const p1 = pList.find((p) => p.id === 'p1');
    const p2 = pList.find((p) => p.id === 'p2');
    const p3 = pList.find((p) => p.id === 'p3');
    const p4 = pList.find((p) => p.id === 'p4');

    if (serverTeam === 'teamA') {
      const serverX = isTeamAEven ? 1.2 : -1.2;
      if (p1) {
        p1.x = serverX;
        p1.y = 4.2;
        p1.z = 0;
      }
      if (p2) {
        p2.x = isTeamAEven ? -1.2 : 1.2;
        p2.y = -3.8;
        p2.z = 0;
      }
      if (p3) {
        p3.x = -serverX;
        p3.y = 5.2;
      }
      if (p4) {
        p4.x = isTeamAEven ? 1.2 : -1.2;
        p4.y = -5.0;
      }

      shuttleRef.current = {
        x: serverX,
        y: 4.2,
        z: 1.1,
        vx: 0,
        vy: 0,
        vz: 0,
        speedKmH: 0,
        inAir: false,
        lastHitTeam: 'teamA',
        trail: [],
      };

      setEventBanner({
        text: '🏸 YOUR SERVE!',
        subtext: 'Click SERVE or press SPACE to serve',
        type: 'info',
      });
    } else {
      const serverX = isTeamBEven ? -1.2 : 1.2;
      if (p2) {
        p2.x = serverX;
        p2.y = -4.2;
        p2.z = 0;
      }
      if (p1) {
        p1.x = isTeamBEven ? 1.2 : -1.2;
        p1.y = 3.8;
        p1.z = 0;
      }
      if (p4) {
        p4.x = -serverX;
        p4.y = -5.2;
      }
      if (p3) {
        p3.x = isTeamBEven ? -1.2 : 1.2;
        p3.y = 5.0;
      }

      shuttleRef.current = {
        x: serverX,
        y: -4.2,
        z: 1.1,
        vx: 0,
        vy: 0,
        vz: 0,
        speedKmH: 0,
        inAir: false,
        lastHitTeam: 'teamB',
        trail: [],
      };

      setEventBanner({
        text: 'OPPONENT SERVING',
        subtext: 'Get ready in position!',
        type: 'info',
      });
    }
  }, []);

  // Activate In-Game Power
  const handleActivatePower = (powerType: PowerType) => {
    const power = powers.find((p) => p.id === powerType);
    if (!power || power.currentCooldown > 0) return;

    sound.playHit('smash', 320);

    // Apply immediate benefits
    const p1 = playersRef.current.find((p) => p.id === 'p1');
    if (powerType === 'stamina_surge' && p1) {
      p1.stamina = 100;
      p1.speed = 10.2;
      setEventBanner({
        text: '⚡ STAMINA SURGE ACTIVATED!',
        subtext: 'Max speed & unlimited sprint for 6 seconds!',
        type: 'smash',
      });
    } else if (powerType === 'thunder_smash') {
      setEventBanner({
        text: '🔥 THUNDER SMASH PRIMED!',
        subtext: 'Next smash reaches 400+ km/h hyper velocity!',
        type: 'smash',
      });
    } else if (powerType === 'deceptive_drop') {
      setEventBanner({
        text: '🌪️ DECEPTIVE SLICE READY!',
        subtext: 'Next drop shot cuts dead over the net cord!',
        type: 'info',
      });
    } else if (powerType === 'iron_defense') {
      setEventBanner({
        text: '🛡️ IRON WALL ACTIVATED!',
        subtext: 'Auto-absorbs incoming attacks with flat drives!',
        type: 'info',
      });
    }

    setActivePower(powerType);
    activePowerTimerRef.current = 6.0;

    // Start cooldown
    setPowers((prev) =>
      prev.map((p) =>
        p.id === powerType ? { ...p, currentCooldown: p.cooldownSeconds, active: true } : p
      )
    );
  };

  // Handle player hitting shuttlecock
  const handleHitShuttle = useCallback(
    (player: Player, shotType: ShotType, aimX: number = 0, isJump: boolean = false, powerRatio?: number) => {
      const shuttle = shuttleRef.current;
      const isPlayer1 = player.id === 'p1';

      // Check active power modifications
      let effectiveType = shotType;
      let powerBoosted = false;

      if (isPlayer1 && activePower) {
        if (activePower === 'thunder_smash' && shotType === 'smash') {
          powerBoosted = true;
          isJump = true;
        } else if (activePower === 'deceptive_drop' && (shotType === 'drop' || shotType === 'clear')) {
          effectiveType = 'drop';
          powerBoosted = true;
        }
      }

      // Safe power control for human player: default 75% keeps shots reliably in-bounds
      const effectivePower = powerRatio !== undefined ? powerRatio : (isPlayer1 ? hitPower / 100 : 0.76);
      const { speedKmH } = executeShot(player, shuttle, effectiveType, aimX, isJump, effectivePower);
      let finalSpeed = speedKmH;

      if (powerBoosted && activePower === 'thunder_smash') {
        finalSpeed = Math.round(speedKmH * 1.35 + 50); // up to 420+ km/h
        shuttle.speedKmH = finalSpeed;
        shuttle.vy *= 1.35;
        shuttle.vz = -15; // ultra steep downward smash
        setActivePower(null);
        setPowers((prev) => prev.map((p) => (p.id === 'thunder_smash' ? { ...p, active: false } : p)));
      }

      sound.playHit(effectiveType, finalSpeed);

      setStats((prev) => ({
        ...prev,
        highestSmashSpeed: Math.max(prev.highestSmashSpeed, finalSpeed),
        smashesTeamA: effectiveType === 'smash' && player.team === 'teamA' ? prev.smashesTeamA + 1 : prev.smashesTeamA,
        smashesTeamB: effectiveType === 'smash' && player.team === 'teamB' ? prev.smashesTeamB + 1 : prev.smashesTeamB,
      }));

      setScore((prev) => {
        const nextHits = prev.rallyHits + 1;
        if (nextHits === 6) sound.playCrowdCheer('small');
        if (nextHits === 12) sound.playCrowdCheer('medium');
        if (effectiveType === 'smash' && finalSpeed > 270) {
          sound.playCrowdGasp();
          setCameraFlash(true);
          setTimeout(() => setCameraFlash(false), 200);
          setScreenShake(2.2);
          setEventBanner({
            text: `SUPER SMASH! ${finalSpeed} KM/H ⚡`,
            subtext: `${player.name} fires an unstoppable strike!`,
            type: 'smash',
          });
        } else if (effectivePower >= 0.95) {
          setCameraFlash(true);
          setTimeout(() => setCameraFlash(false), 180);
          setScreenShake(1.6);
          setEventBanner({
            text: `🔥 100% FULL POWER ${effectiveType.toUpperCase()}! ${finalSpeed} KM/H`,
            subtext: `${player.name} unleashed maximum Olympic power!`,
            type: 'smash',
          });
        }
        return { ...prev, rallyHits: nextHits };
      });

      isServingRef.current = false;
      setIsServingState(false);
      bufferedShotRef.current = null;
    },
    [activePower]
  );

  // Score a point and check win/draw/interval
  const scorePoint = useCallback(
    (winningTeam: 'teamA' | 'teamB', reason: string, landingData?: { x: number; y: number; distanceMm: number; isIn: boolean; hittingTeam: 'teamA' | 'teamB' }) => {
      sound.playWhistle();
      sound.playCrowdCheer('medium');

      // Store landing data for Hawk-Eye challenge if close call
      if (landingData) {
        lastPointDataRef.current = {
          landingX: landingData.x,
          landingY: landingData.y,
          awardedTeam: winningTeam,
          hittingTeam: landingData.hittingTeam,
          isIn: landingData.isIn,
          distanceMm: landingData.distanceMm,
          reason,
        };

        // If line call was close (within 18cm) and point was lost by team A, enable challenge!
        if (landingData.distanceMm <= 180 && challengesRemainingA > 0) {
          setCanChallenge(true);
        }
      }

      setScore((prevScore) => {
        const newScoreA = winningTeam === 'teamA' ? prevScore.teamA + 1 : prevScore.teamA;
        const newScoreB = winningTeam === 'teamB' ? prevScore.teamB + 1 : prevScore.teamB;

        setStats((prev) => ({
          ...prev,
          totalPoints: prev.totalPoints + 1,
          longestRally: Math.max(prev.longestRally, prevScore.rallyHits),
        }));

        // BWF Official 11-Point Interval Check
        const intervalTarget = Math.floor(settings.pointsToWin / 2) + 1;
        if (!hasTriggeredIntervalRef.current && (newScoreA === intervalTarget || newScoreB === intervalTarget)) {
          hasTriggeredIntervalRef.current = true;
          const leader = newScoreA >= newScoreB ? 'teamA' : 'teamB';
          setIntervalState({
            isActive: true,
            leadingTeam: leader,
            scoreLead: `${newScoreA} - ${newScoreB}`,
            coachAdvice:
              leader === 'teamA'
                ? 'Great tempo! Keep forcing them into defensive lifts and prepare the thunder smash.'
                : 'Stay patient! Use crosscourt deceptive drops to disrupt their footwork and reset.',
          });
        }

        // Check for Draw (Stalemate at target points cap)
        if (settings.drawAllowed && newScoreA === settings.pointsToWin && newScoreB === settings.pointsToWin) {
          setIsGameOver(true);
          setIsDraw(true);
          setWinnerTeam(null);
          sound.playDrawChime();
          setEventBanner({
            text: 'MATCH DRAW! 🤝',
            subtext: `Honorable stalemate reached at ${newScoreA}-${newScoreB}`,
            type: 'draw',
          });
          return {
            ...prevScore,
            teamA: newScoreA,
            teamB: newScoreB,
            serverTeam: winningTeam,
            rallyHits: 0,
          };
        }

        // Check for Victory condition
        const target = settings.pointsToWin;
        const reachedTargetA = newScoreA >= target;
        const reachedTargetB = newScoreB >= target;

        let hasWinner = false;
        let victor: 'teamA' | 'teamB' | null = null;

        if (settings.winByTwo) {
          if (reachedTargetA && newScoreA - newScoreB >= 2) {
            hasWinner = true;
            victor = 'teamA';
          } else if (reachedTargetB && newScoreB - newScoreA >= 2) {
            hasWinner = true;
            victor = 'teamB';
          } else if (newScoreA === settings.maxPointsCap) {
            hasWinner = true;
            victor = 'teamA';
          } else if (newScoreB === settings.maxPointsCap) {
            hasWinner = true;
            victor = 'teamB';
          }
        } else {
          if (reachedTargetA) {
            hasWinner = true;
            victor = 'teamA';
          } else if (reachedTargetB) {
            hasWinner = true;
            victor = 'teamB';
          }
        }

        if (hasWinner && victor) {
          setIsGameOver(true);
          setIsDraw(false);
          setWinnerTeam(victor);
          sound.playVictoryFanfare();
          const winName = victor === 'teamA' ? 'YOU (TEAM BLUE)' : 'OPPONENT (TEAM RED)';
          setEventBanner({
            text: `${winName} WINS! 🏆`,
            subtext: `Championship secured ${newScoreA} - ${newScoreB}`,
            type: 'point',
          });
          return {
            ...prevScore,
            teamA: newScoreA,
            teamB: newScoreB,
            serverTeam: winningTeam,
            rallyHits: 0,
          };
        }

        // Deuce and Match Point flags
        const isDeuce = settings.winByTwo && newScoreA >= target - 1 && newScoreA === newScoreB;
        const isMatchPoint =
          (newScoreA === target - 1 && newScoreA > newScoreB) ||
          (newScoreB === target - 1 && newScoreB > newScoreA);

        const bannerText = `${winningTeam === 'teamA' ? 'Point for You!' : 'Point Opponent'} (${reason})`;
        setEventBanner({
          text: bannerText,
          subtext: `${newScoreA} - ${newScoreB}`,
          type: isDeuce ? 'deuce' : isMatchPoint ? 'smash' : 'point',
        });

        const nextScore: MatchScore = {
          ...prevScore,
          teamA: newScoreA,
          teamB: newScoreB,
          serverTeam: winningTeam,
          rallyHits: 0,
          isDeuce,
          isMatchPoint,
        };

        setTimeout(() => {
          setupService(winningTeam, nextScore);
        }, 1400);

        return nextScore;
      });
    },
    [settings, challengesRemainingA, setupService]
  );

  // Trigger BWF Hawk-Eye Instant Review Challenge
  const handleTriggerHawkEye = () => {
    if (!lastPointDataRef.current || challengesRemainingA <= 0) return;
    const last = lastPointDataRef.current;

    // Simulate 50% chance of overturn on close calls
    const willOverturn = Math.random() < 0.55;
    const distanceMm = Math.round(last.distanceMm * 10) / 10;
    const reviewedCall = willOverturn ? (last.isIn ? 'OUT' : 'IN') : (last.isIn ? 'IN' : 'OUT');

    setHawkEyeReview({
      isOpen: true,
      landingX: last.landingX,
      landingY: last.landingY,
      nearestLine: 'sideline',
      distanceFromLineMm: distanceMm,
      originalCall: last.isIn ? 'IN' : 'OUT',
      reviewedCall: reviewedCall as 'IN' | 'OUT',
      overturned: willOverturn,
      challengerTeam: 'teamA',
      challengesRemainingA: willOverturn ? challengesRemainingA : challengesRemainingA - 1,
      challengesRemainingB: challengesRemainingB,
    });

    if (!willOverturn) {
      setChallengesRemainingA((prev) => prev - 1);
    }
    setCanChallenge(false);
  };

  const handleFinishHawkEye = (overturned: boolean) => {
    setHawkEyeReview((prev) => ({ ...prev, isOpen: false }));
    if (overturned && lastPointDataRef.current) {
      // Overturn the previous point! Award to team A
      setScore((prev) => ({
        ...prev,
        teamA: prev.teamA + 1,
        teamB: Math.max(0, prev.teamB - 1),
        serverTeam: 'teamA',
      }));
      setEventBanner({
        text: 'HAWK-EYE OVERTURNS CALL! Point to Team Blue',
        subtext: 'BWF Virtual Eye confirms line contact!',
        type: 'point',
      });
      setTimeout(() => {
        setupService('teamA', score);
      }, 1000);
    }
  };

  // Tactical buff application from interval
  const handleApplyTacticalBuff = (buff: 'attack' | 'defense' | 'stamina') => {
    setTacticalBuff(buff);
    setIntervalState((prev) => ({ ...prev, isActive: false }));

    const p1 = playersRef.current.find((p) => p.id === 'p1');
    if (buff === 'stamina' && p1) {
      p1.stamina = 100;
    }
    setEventBanner({
      text: `TACTICAL BUFF: ${buff.toUpperCase()} ACTIVE`,
      subtext: 'Resuming 2nd half with tactical advantage!',
      type: 'info',
    });
  };

  // Initialize match
  useEffect(() => {
    initPlayers(settings);
    setupService('teamA', {
      teamA: 0,
      teamB: 0,
      gamesTeamA: 0,
      gamesTeamB: 0,
      serverTeam: 'teamA',
      serverPlayerId: 'p1',
      receiverPlayerId: 'p2',
      rallyHits: 0,
      isDeuce: false,
      isMatchPoint: false,
    });
  }, [settings, initPlayers, setupService]);

  // Attempt user shot with buffering and real-time power control
  const triggerUserShot = useCallback(
    (shotType: ShotType, explicitPowerRatio?: number) => {
      const p1 = playersRef.current.find((p) => p.id === 'p1');
      if (!p1) return;

      if (isServingRef.current) {
        if (score.serverTeam === 'teamA') {
          const sPower = explicitPowerRatio !== undefined ? explicitPowerRatio : (fullPowerMode ? 1.05 : 0.85);
          handleHitShuttle(p1, 'serve', 0, false, sPower);
          return;
        }
      }

      const shuttle = shuttleRef.current;
      if (!shuttle.inAir) return;

      const reachBonus = tacticalBuff === 'defense' ? 0.6 : 0;
      const dist2D = Math.hypot(p1.x - shuttle.x, p1.y - shuttle.y);
      const reachable = dist2D < (2.4 + reachBonus) && shuttle.z >= 0.05 && shuttle.z <= 3.5;

      // Determine power ratio: explicit charged power > full power mode (100% full blast) > deck setting
      let powerRatio = 0.85;
      if (explicitPowerRatio !== undefined) {
        powerRatio = explicitPowerRatio;
      } else if (fullPowerMode) {
        powerRatio = 1.05; // 100%+ Maximum Unleashed Olympic Power
      } else {
        const key = shotType as keyof ShotPowerLevels;
        powerRatio = (shotPowers[key] || hitPower || 85) / 100;
        if (autoInBoundsLock) {
          if (shotType === 'clear') powerRatio = Math.min(0.78, powerRatio);
          if (shotType === 'drop') powerRatio = Math.min(0.65, powerRatio);
          if (shotType === 'smash') powerRatio = Math.min(0.92, powerRatio);
          if (shotType === 'drive') powerRatio = Math.min(0.80, powerRatio);
        }
      }

      if (reachable) {
        const isJump = shotType === 'smash' && (shuttle.z > 1.6 || p1.z > 0.1) && p1.stamina > 20;
        p1.hitCooldown = 0.3;
        handleHitShuttle(p1, shotType, 0, isJump, powerRatio);
      } else {
        bufferedShotRef.current = { type: shotType, timer: 0.22 };
        p1.actionState = shotType === 'smash' ? 'swing_smash' : 'swing_clear';
        p1.stateTimer = 0.25;
      }
    },
    [score.serverTeam, tacticalBuff, shotPowers, autoInBoundsLock, hitPower, fullPowerMode, handleHitShuttle]
  );

  // Hold-to-Charge Power Handlers
  const handleStartCharge = useCallback((shotType: ShotType) => {
    if (chargeStartTimeRef.current !== null) return;
    chargeStartTimeRef.current = performance.now();
    chargingShotTypeRef.current = shotType;
    setChargingPower(40);
  }, []);

  const handleReleaseCharge = useCallback(() => {
    if (chargeStartTimeRef.current === null) return;
    const elapsed = (performance.now() - chargeStartTimeRef.current) / 1000;
    const charged = Math.min(100, 40 + (elapsed / 0.5) * 60);
    const shot = chargingShotTypeRef.current || 'smash';

    chargeStartTimeRef.current = null;
    setChargingPower(null);

    if (isServingRef.current && score.serverTeam === 'teamA') {
      const p1 = playersRef.current.find((p) => p.id === 'p1');
      if (p1) handleHitShuttle(p1, 'serve', 0, false, fullPowerMode ? 1.05 : charged / 100);
      return;
    }

    triggerUserShot(shot, fullPowerMode ? 1.05 : charged / 100);
  }, [score.serverTeam, fullPowerMode, triggerUserShot, handleHitShuttle]);

  // Keyboard Event Listeners for controls and powers (1, 2, 3, 4, H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      activeKeysRef.current.add(e.code);

      // Power hotkeys: 1=Thunder Smash, 2=Deceptive Drop, 3=Iron Defense, 4=Stamina Surge
      if (e.code === 'Digit1') handleActivatePower('thunder_smash');
      else if (e.code === 'Digit2') handleActivatePower('deceptive_drop');
      else if (e.code === 'Digit3') handleActivatePower('iron_defense');
      else if (e.code === 'Digit4') handleActivatePower('stamina_surge');
      else if (e.code === 'KeyH' && canChallenge) handleTriggerHawkEye();

      // Manual Serve Trigger
      if (isServingRef.current && score.serverTeam === 'teamA') {
        if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK' || e.code === 'Enter') {
          const p1 = playersRef.current.find((p) => p.id === 'p1');
          if (p1) handleHitShuttle(p1, 'serve', 0, false, fullPowerMode ? 1.05 : 0.85);
          return;
        }
      }

      // Shot key hold-to-charge or instant tap
      if (!e.repeat) {
        if (e.code === 'KeyK') handleStartCharge('smash');
        else if (e.code === 'KeyJ' || e.code === 'Space') handleStartCharge('clear');
        else if (e.code === 'KeyL') handleStartCharge('drop');
        else if (e.code === 'KeyU') handleStartCharge('drive');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeysRef.current.delete(e.code);

      if (['KeyK', 'KeyJ', 'KeyL', 'KeyU', 'Space'].includes(e.code)) {
        if (chargeStartTimeRef.current !== null) {
          handleReleaseCharge();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [score.serverTeam, canChallenge, fullPowerMode, handleStartCharge, handleReleaseCharge, handleHitShuttle]);

  // Main Game Physics Loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.05, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // Update hold-to-charge meter
      if (chargeStartTimeRef.current !== null) {
        const elapsed = (currentTime - chargeStartTimeRef.current) / 1000;
        const pwr = Math.min(100, 40 + (elapsed / 0.5) * 60);
        setChargingPower(pwr);
      }

      // Smoothly decay screen shake
      setScreenShake((prev) => (prev > 0.04 ? prev * 0.85 : 0));

      if (!isPaused && !isGameOver && !intervalState.isActive && !hawkEyeReview.isOpen) {
        const keys = activeKeysRef.current;
        const pList = playersRef.current;
        const shuttle = shuttleRef.current;
        const p1 = pList.find((p) => p.id === 'p1');

        // Update active power timer and power cooldowns
        if (activePowerTimerRef.current > 0) {
          activePowerTimerRef.current -= dt;
          if (activePowerTimerRef.current <= 0) {
            setActivePower(null);
            setPowers((prev) => prev.map((p) => ({ ...p, active: false })));
            if (p1) p1.speed = 7.8;
          }
        }

        setPowers((prev) =>
          prev.map((p) => {
            if (p.currentCooldown > 0) {
              const nextCd = Math.max(0, p.currentCooldown - dt);
              return { ...p, currentCooldown: nextCd };
            }
            return p;
          })
        );

        // Check if shuttlecock is in player reach
        if (p1 && shuttle.inAir) {
          const reachBonus = tacticalBuff === 'defense' ? 0.6 : 0;
          const dist2D = Math.hypot(p1.x - shuttle.x, p1.y - shuttle.y);
          const inRange = dist2D < (2.4 + reachBonus) && shuttle.z >= 0.05 && shuttle.z <= 3.5;
          setIsPlayerInRangeState(inRange);

          // Iron Defense Auto-Block against opponent smash
          if (activePower === 'iron_defense' && shuttle.lastHitTeam === 'teamB' && dist2D < 3.2 && shuttle.z <= 2.2) {
            handleHitShuttle(p1, 'drive', 1);
            sound.playHit('drive', 260);
            setActivePower(null);
            setPowers((prev) => prev.map((p) => (p.id === 'iron_defense' ? { ...p, active: false } : p)));
          }

          if (bufferedShotRef.current) {
            bufferedShotRef.current.timer -= dt;
            if (inRange) {
              const shot = bufferedShotRef.current.type;
              bufferedShotRef.current = null;
              handleHitShuttle(p1, shot, 0, shot === 'smash' && shuttle.z > 1.6);
            } else if (bufferedShotRef.current.timer <= 0) {
              bufferedShotRef.current = null;
            }
          }
        } else {
          setIsPlayerInRangeState(false);
        }

        // Only auto-serve if AI is serving
        if (isServingRef.current) {
          const isHumanServer = score.serverTeam === 'teamA';
          if (!isHumanServer) {
            serveCountdownRef.current -= dt;
            if (serveCountdownRef.current <= 0) {
              const server = pList.find((p) => p.team === score.serverTeam);
              if (server) handleHitShuttle(server, 'serve');
            }
          }
        }

        // 1. Process Player 1
        if (p1 && !p1.isAI) {
          let dx = 0;
          let dy = 0;
          let isSprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');

          if (keys.has('KeyW')) dy -= 1;
          if (keys.has('KeyS')) dy += 1;
          if (keys.has('KeyA')) dx -= 1;
          if (keys.has('KeyD')) dx += 1;

          if (mouseControlEnabled && mouseTargetRef.current && dx === 0 && dy === 0 && !isServingRef.current) {
            const mdx = mouseTargetRef.current.x - p1.x;
            const mdy = mouseTargetRef.current.y - p1.y;
            const dist = Math.hypot(mdx, mdy);
            if (dist > 0.3) {
              dx = mdx / dist;
              dy = mdy / dist;
              if (dist > 2.0) isSprinting = true;
            }
          }

          const len = Math.hypot(dx, dy);
          if (len > 0.1) {
            const speedMult = isSprinting && p1.stamina > 15 ? 1.4 : 1.0;
            p1.x += (dx / len) * p1.speed * speedMult * dt;
            p1.y += (dy / len) * p1.speed * speedMult * dt;
            if (p1.actionState === 'idle') p1.actionState = 'running';
            if (isSprinting && activePower !== 'stamina_surge') p1.stamina = Math.max(0, p1.stamina - 15 * dt);
          } else {
            if (p1.actionState === 'running') p1.actionState = 'idle';
            p1.stamina = Math.min(100, p1.stamina + 12 * dt);
          }

          if (p1.hitCooldown > 0) p1.hitCooldown -= dt;
          if (p1.stateTimer > 0) {
            p1.stateTimer -= dt;
            if (p1.stateTimer <= 0) p1.actionState = 'idle';
          }

          const halfW = settings.gameMode === '1v1' ? COURT.SINGLES_WIDTH : COURT.DOUBLES_WIDTH;
          p1.x = Math.max(-halfW + 0.2, Math.min(halfW - 0.2, p1.x));
          p1.y = Math.max(0.6, Math.min(COURT.HALF_LENGTH - 0.2, p1.y));
        }

        // 2. Process AI Players
        for (const p of pList) {
          if (p.isAI) {
            const partner = pList.find((other) => other.team === p.team && other.id !== p.id) || null;
            updateAIPlayer(p, partner, shuttle, settings, dt, (aiPlayer, shot, aimX, isJump) => {
              handleHitShuttle(aiPlayer, shot, aimX, isJump);
            });
          }
        }

        // 3. Update 3D Shuttlecock Aerodynamics
        const { landed, netFault } = updateShuttlecock(shuttle, dt, (isGraze) => {
          sound.playNetClip();
          if (isGraze) setEventBanner({ text: 'NET CORD CLIP!', type: 'info' });
        });

        replayBufferRef.current.push({
          shuttlecock: { x: shuttle.x, y: shuttle.y, z: shuttle.z, speedKmH: shuttle.speedKmH },
          players: pList.map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z, actionState: p.actionState })),
        });
        if (replayBufferRef.current.length > 90) replayBufferRef.current.shift();

        // 4. Handle Point Conclusion
        if (landed) {
          sound.playBounce();
          if (netFault) {
            const winningTeam = shuttle.lastHitTeam === 'teamA' ? 'teamB' : 'teamA';
            scorePoint(winningTeam, 'Net Fault');
          } else {
            const isService = isServingRef.current;
            const serverScore = score.serverTeam === 'teamA' ? score.teamA : score.teamB;
            const { isIn, reason } = checkCourtInBounds(
              shuttle.x,
              shuttle.y,
              settings.gameMode,
              isService,
              score.serverTeam,
              serverScore
            );

            // Calculate distance to nearest boundary line for Hawk-Eye millimeter review
            const halfW = settings.gameMode === '1v1' ? COURT.SINGLES_WIDTH : COURT.DOUBLES_WIDTH;
            const distSideline = Math.abs(Math.abs(shuttle.x) - halfW) * 1000; // mm
            const distBaseline = Math.abs(Math.abs(shuttle.y) - COURT.HALF_LENGTH) * 1000;
            const distanceMm = Math.min(distSideline, distBaseline);

            const landingSideTeam = shuttle.y > 0 ? 'teamA' : 'teamB';
            const hittingTeam = shuttle.lastHitTeam || (landingSideTeam === 'teamA' ? 'teamB' : 'teamA');

            if (isIn) {
              scorePoint(hittingTeam, 'In-Court Winner', {
                x: shuttle.x,
                y: shuttle.y,
                distanceMm,
                isIn: true,
                hittingTeam,
              });
            } else {
              const winningTeam = hittingTeam === 'teamA' ? 'teamB' : 'teamA';
              scorePoint(winningTeam, reason || 'Out of Bounds', {
                x: shuttle.x,
                y: shuttle.y,
                distanceMm,
                isIn: false,
                hittingTeam,
              });
            }
          }
        }
      }

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [
    isPaused, 
    isGameOver, 
    score, 
    settings, 
    mouseControlEnabled, 
    activePower, 
    intervalState.isActive, 
    hawkEyeReview.isOpen, 
    handleHitShuttle, 
    scorePoint
  ]);

  const handleCourtMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isServingRef.current && score.serverTeam === 'teamA') {
      handleStartCharge('serve');
      return;
    }
    const shuttle = shuttleRef.current;
    const shotToPrime: ShotType = shuttle.z > 1.6 ? 'smash' : 'clear';
    handleStartCharge(shotToPrime);
  };

  const handleCourtMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleReleaseCharge();
  };

  const handleCourtClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (chargeStartTimeRef.current === null) {
      if (isServingRef.current && score.serverTeam === 'teamA') {
        const p1 = playersRef.current.find((p) => p.id === 'p1');
        if (p1) handleHitShuttle(p1, 'serve', 0, false, fullPowerMode ? 1.05 : 0.85);
      } else {
        const shuttle = shuttleRef.current;
        const shot: ShotType = shuttle.z > 1.6 ? 'smash' : 'clear';
        triggerUserShot(shot);
      }
    }
  };

  const handleCourtMouseMove = (normX: number, normY: number) => {
    const halfW = settings.gameMode === '1v1' ? COURT.SINGLES_WIDTH : COURT.DOUBLES_WIDTH;
    const clampedX = Math.max(-halfW + 0.3, Math.min(halfW - 0.3, normX));
    const clampedY = Math.max(0.8, Math.min(COURT.HALF_LENGTH - 0.3, normY));
    mouseTargetRef.current = { x: clampedX, y: clampedY };
  };

  const handleRematch = () => {
    setIsGameOver(false);
    setIsDraw(false);
    setWinnerTeam(null);
    setChallengesRemainingA(2);
    setChallengesRemainingB(2);
    hasTriggeredIntervalRef.current = false;
    setTacticalBuff(null);
    setActivePower(null);
    setPowers(INITIAL_POWERS);

    setScore({
      teamA: 0,
      teamB: 0,
      gamesTeamA: 0,
      gamesTeamB: 0,
      serverTeam: 'teamA',
      serverPlayerId: 'p1',
      receiverPlayerId: 'p2',
      rallyHits: 0,
      isDeuce: false,
      isMatchPoint: false,
    });
    setStats({
      durationSeconds: 0,
      totalPoints: 0,
      longestRally: 0,
      highestSmashSpeed: 0,
      smashesTeamA: 0,
      smashesTeamB: 0,
      smashWinnersTeamA: 0,
      smashWinnersTeamB: 0,
      unforcedErrorsTeamA: 0,
      unforcedErrorsTeamB: 0,
      dropShotWinnersTeamA: 0,
      dropShotWinnersTeamB: 0,
    });
    initPlayers(settings);
    setupService('teamA', {
      teamA: 0,
      teamB: 0,
      gamesTeamA: 0,
      gamesTeamB: 0,
      serverTeam: 'teamA',
      serverPlayerId: 'p1',
      receiverPlayerId: 'p2',
      rallyHits: 0,
      isDeuce: false,
      isMatchPoint: false,
    });
  };

  const p1 = playersRef.current.find((p) => p.id === 'p1');

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col select-none">
      {/* Top BWF Olympic Scoreboard */}
      <ScoreBoard
        score={score}
        settings={settings}
        players={playersRef.current}
        highestSmashSpeed={stats.highestSmashSpeed}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        onToggleSound={() => {
          const next = !settings.soundEnabled;
          setSettings((s) => ({ ...s, soundEnabled: next }));
          sound.setSoundEnabled(next);
        }}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      {/* Main 2.5D Stadium Canvas */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <BadmintonCanvas
          players={playersRef.current}
          shuttlecock={shuttleRef.current}
          score={score}
          settings={settings}
          eventBanner={eventBanner}
          cameraFlash={cameraFlash}
          isServing={isServingState}
          isPlayerInRange={isPlayerInRangeState}
          mouseTarget={mouseTargetRef.current}
          activePower={activePower}
          chargingPower={chargingPower}
          screenShake={screenShake}
          onCourtClick={handleCourtClick}
          onCourtMouseMove={handleCourtMouseMove}
          onCourtMouseDown={handleCourtMouseDown}
          onCourtMouseUp={handleCourtMouseUp}
        />

        {/* PROMINENT SERVE BUTTON */}
        {isServingState && isHumanServerState && !isGameOver && !isPaused && (
          <div className="absolute inset-x-0 bottom-28 flex flex-col items-center justify-center z-40 pointer-events-none animate-bounce">
            <button
              onClick={() => {
                const server = playersRef.current.find((p) => p.id === 'p1');
                if (server) handleHitShuttle(server, 'serve', 0, false, fullPowerMode ? 1.05 : 0.85);
              }}
              className="pointer-events-auto flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-widest uppercase shadow-2xl border-2 border-white/80 active:scale-95 transition-all cursor-pointer font-athletic"
            >
              <span>🏸 CLICK TO SERVE (OR PRESS SPACE)</span>
            </button>
            <span className="text-xs text-white/90 font-semibold mt-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
              You are serving · Hold to charge power or tap to hit
            </span>
          </div>
        )}

        {/* IN-GAME ACTION & POWER OPTIONS HUD */}
        <div className="absolute inset-x-0 bottom-3 px-4 z-30 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
          {/* Left: Interactive In-Game Power Options Bar */}
          <div className="pointer-events-auto">
            <PowerOptionsBar
              powers={powers}
              onActivatePower={handleActivatePower}
              canChallenge={canChallenge}
              onTriggerHawkEye={handleTriggerHawkEye}
              challengesRemaining={challengesRemainingA}
            />
          </div>

          {/* Right: Individual Shot Power Deck (Direct Shot Triggers with individual power controls per shot) */}
          <div className="pointer-events-auto">
            <ShotPowerDeck
              shotPowers={shotPowers}
              onUpdatePower={(shot, val) => setShotPowers((prev) => ({ ...prev, [shot]: val }))}
              onTriggerShot={(shot, forceMax) => triggerUserShot(shot, forceMax ? 1.05 : undefined)}
              autoInBoundsLock={autoInBoundsLock}
              onToggleAutoLock={() => setAutoInBoundsLock((prev) => !prev)}
              isPlayerInRange={isPlayerInRangeState}
              fullPowerMode={fullPowerMode}
              onToggleFullPower={() => setFullPowerMode((prev) => !prev)}
              onStartCharge={handleStartCharge}
              onReleaseCharge={handleReleaseCharge}
              chargingPower={chargingPower}
            />
          </div>
        </div>

        {/* Slow-mo Replay Overlay */}
        {isReplaying && (
          <InstantReplay
            frames={replayBufferRef.current}
            onFinish={() => setIsReplaying(false)}
          />
        )}
      </div>

      {/* Official BWF Hawk-Eye Review Modal */}
      <HawkEyeModal
        review={hawkEyeReview}
        onFinishReview={handleFinishHawkEye}
      />

      {/* Official BWF 11-Point Interval Break Modal */}
      <IntervalModal
        interval={intervalState}
        onResume={() => setIntervalState((prev) => ({ ...prev, isActive: false }))}
        onApplyTacticalBuff={handleApplyTacticalBuff}
      />

      {/* Match Setup & Options Modal */}
      <GameMenu
        settings={settings}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onStartMatch={(newSettings) => {
          setSettings(newSettings);
          sound.setSoundEnabled(newSettings.soundEnabled);
          sound.setCrowdEnabled(newSettings.crowdCheeringEnabled);
          setIsMenuOpen(false);
          handleRematch();
        }}
      />

      {/* Game Over / Win / Draw Modal */}
      <GameOverModal
        isOpen={isGameOver}
        score={score}
        stats={stats}
        players={playersRef.current}
        isDraw={isDraw}
        winnerTeam={winnerTeam}
        onRematch={handleRematch}
        onOpenSettings={() => {
          setIsGameOver(false);
          setIsMenuOpen(true);
        }}
      />
    </main>
  );
}
