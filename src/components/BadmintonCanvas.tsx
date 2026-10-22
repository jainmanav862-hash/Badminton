import React, { useEffect, useRef, useState } from 'react';
import { CourtTheme, GameMode, MatchScore, MatchSettings, Player, PowerType, ShotType, Shuttlecock, Spectator } from '../types/game';
import { COURT } from '../utils/physics';

interface BadmintonCanvasProps {
  players: Player[];
  shuttlecock: Shuttlecock;
  score: MatchScore;
  settings: MatchSettings;
  eventBanner: { text: string; subtext?: string; type: 'info' | 'smash' | 'point' | 'deuce' | 'draw' } | null;
  cameraFlash: boolean;
  isServing: boolean;
  isPlayerInRange: boolean;
  mouseTarget: { x: number; y: number } | null;
  activePower?: PowerType | null;
  chargingPower?: number | null;
  screenShake?: number;
  onCourtClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCourtMouseMove?: (x: number, y: number) => void;
  onCourtMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCourtMouseUp?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export const BadmintonCanvas: React.FC<BadmintonCanvasProps> = ({
  players,
  shuttlecock,
  score,
  settings,
  eventBanner,
  cameraFlash,
  isServing,
  isPlayerInRange,
  mouseTarget,
  activePower,
  chargingPower,
  screenShake = 0,
  onCourtClick,
  onCourtMouseMove,
  onCourtMouseDown,
  onCourtMouseUp,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectatorsRef = useRef<Spectator[]>([]);
  const wavePhaseRef = useRef<number>(0);
  const flashPointsRef = useRef<Array<{ x: number; y: number; life: number }>>([]);
  const netWobbleRef = useRef<number>(0);

  // Initialize crowd spectators
  useEffect(() => {
    const crowd: Spectator[] = [];
    const shirtColors = [
      '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
      '#EC4899', '#06B6D4', '#F97316', '#F3F4F6', '#1E293B'
    ];
    const skinTones = ['#FCD34D', '#FBBF24', '#D97706', '#B45309', '#78350F'];

    // Back stands (North - Top)
    for (let tier = 0; tier < 4; tier++) {
      for (let i = 0; i < 36; i++) {
        crowd.push({
          stand: 'north',
          tier,
          x: (i / 35) * 1.6 - 0.8, // Normalized -0.8 to 0.8
          y: -COURT.HALF_LENGTH - 1.2 - tier * 0.7,
          shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
          headColor: skinTones[Math.floor(Math.random() * skinTones.length)],
          hasFlag: Math.random() < 0.18,
          flagColor: Math.random() > 0.5 ? '#3B82F6' : '#EF4444',
          bobOffset: Math.random() * Math.PI * 2,
          bobSpeed: 2.5 + Math.random() * 2.0,
          armsUp: false,
          clapping: false,
        });
      }
    }

    // Left stands (West)
    for (let tier = 0; tier < 3; tier++) {
      for (let i = 0; i < 20; i++) {
        crowd.push({
          stand: 'west',
          tier,
          x: -COURT.DOUBLES_WIDTH - 1.0 - tier * 0.8,
          y: (i / 19) * COURT.HALF_LENGTH * 2 - COURT.HALF_LENGTH,
          shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
          headColor: skinTones[Math.floor(Math.random() * skinTones.length)],
          hasFlag: Math.random() < 0.15,
          bobOffset: Math.random() * Math.PI * 2,
          bobSpeed: 2.0 + Math.random() * 2.0,
          armsUp: false,
          clapping: false,
        });
      }
    }

    // Right stands (East)
    for (let tier = 0; tier < 3; tier++) {
      for (let i = 0; i < 20; i++) {
        crowd.push({
          stand: 'east',
          tier,
          x: COURT.DOUBLES_WIDTH + 1.0 + tier * 0.8,
          y: (i / 19) * COURT.HALF_LENGTH * 2 - COURT.HALF_LENGTH,
          shirtColor: shirtColors[Math.floor(Math.random() * shirtColors.length)],
          headColor: skinTones[Math.floor(Math.random() * skinTones.length)],
          hasFlag: Math.random() < 0.15,
          bobOffset: Math.random() * Math.PI * 2,
          bobSpeed: 2.0 + Math.random() * 2.0,
          armsUp: false,
          clapping: false,
        });
      }
    }

    spectatorsRef.current = crowd;
  }, []);

  // Main high-framerate rendering loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high DPI / retina displays
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Camera shake for explosive smashes and max power hits
      if (screenShake > 0) {
        const shakeMag = screenShake * 7;
        const shakeX = (Math.random() - 0.5) * shakeMag;
        const shakeY = (Math.random() - 0.5) * shakeMag;
        ctx.translate(shakeX, shakeY);
      }

      // Camera & 2.5D Perspective Projection System
      // Origin (0,0) is center of court net
      const courtOriginX = width * 0.5;
      const courtOriginY = height * 0.52;
      
      // Perspective scale factors
      const scaleX = Math.min(width / 13, height / 20) * 1.5;
      const scaleY = scaleX * 0.68; // perspective compression along court length

      // Perspective projection mapping (3D to 2D screen)
      const project = (x: number, y: number, z: number = 0) => {
        // Perspective depth foreshortening: objects further away (negative y) are smaller and converge
        const depth = 1 + (y / COURT.HALF_LENGTH) * 0.22;
        const px = courtOriginX + x * scaleX * depth;
        const py = courtOriginY + y * scaleY - z * scaleY * 1.25;
        return { px, py, depth };
      };

      // 1. Draw Stadium Arena Background & Lighting
      drawStadiumBackground(ctx, width, height, settings.courtTheme);

      // 2. Draw Cheering Audience in the Grandstands
      drawCrowd(ctx, project, time, score.rallyHits);

      // 3. Draw Camera Flashes in the crowd
      updateAndDrawCameraFlashes(ctx, width, height, dt, cameraFlash);

      // 4. Draw Official Badminton Court Floor, Markings & BWF Banners
      drawBadmintonCourt(ctx, project, settings.gameMode, settings.courtTheme);

      // 5. Draw Shadows for Players & Shuttlecock
      drawShadows(ctx, project, players, shuttlecock);

      // Draw Sweet-Spot / Hit-Now Reticle when shuttlecock is reachable by human player
      if (isPlayerInRange && !isServing) {
        drawHitReticle(ctx, project, shuttlecock, time);
      }

      // 6. Draw Far Court Players (Team B, y < 0)
      const farPlayers = players.filter((p) => p.y < 0);
      for (const p of farPlayers) {
        drawPlayer(ctx, project, p, time);
      }

      // 7. Draw 3D Badminton Net with Wobble
      drawNet(ctx, project, netWobbleRef.current);
      if (netWobbleRef.current > 0) {
        netWobbleRef.current = Math.max(0, netWobbleRef.current - dt * 2.5);
      }

      // 8. Draw Shuttlecock & Motion Trails
      drawShuttlecock(ctx, project, shuttlecock, time);

      // 9. Draw Near Court Players (Team A, y >= 0)
      const nearPlayers = players.filter((p) => p.y >= 0);
      for (const p of nearPlayers) {
        drawPlayer(ctx, project, p, time);
      }

      // 10. Draw Umpire Chair and Referee
      drawUmpire(ctx, project, shuttlecock);

      // 11. Draw Event Banner (Smash speed, Deuce, Point, Match Point)
      if (eventBanner) {
        drawBroadcastBanner(ctx, width, height, eventBanner);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [players, shuttlecock, score, settings, eventBanner, cameraFlash, isServing, isPlayerInRange, activePower, chargingPower, screenShake]);

  // Background stadium styling
  const drawStadiumBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, theme: CourtTheme) => {
    // Deep stadium arena gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#020617'); // Stadium rafters / night
    bgGrad.addColorStop(0.3, '#0b1329'); // Bleachers
    bgGrad.addColorStop(0.7, '#0f172a'); // Courtside
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stadium Floodlights at top corners
    const drawFloodlight = (x: number, y: number) => {
      const grad = ctx.createRadialGradient(x, y, 10, x, y, 220);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      grad.addColorStop(0.4, 'rgba(56, 189, 248, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 220, 0, Math.PI * 2);
      ctx.fill();

      // Light fixture bank
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(x - 24, y - 6, 48, 12);
    };

    drawFloodlight(w * 0.18, 40);
    drawFloodlight(w * 0.5, 30);
    drawFloodlight(w * 0.82, 40);
  };

  // Audience rendering with real-time reaction
  const drawCrowd = (
    ctx: CanvasRenderingContext2D, 
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    time: number,
    rallyHits: number
  ) => {
    const crowd = spectatorsRef.current;
    const isExcitedRally = rallyHits >= 6;
    wavePhaseRef.current += 0.04;

    for (let i = 0; i < crowd.length; i++) {
      const s = crowd[i];
      // Wave motion calculation
      const wave = Math.sin(wavePhaseRef.current + s.x * 3 + s.tier);
      const isWavePeak = wave > 0.7;
      
      const bob = Math.sin((time / 1000) * s.bobSpeed + s.bobOffset) * (isExcitedRally ? 3.5 : 1.2);
      const jumpY = isWavePeak ? -5 : 0;

      const { px, py, depth } = project(s.x, s.y, 0.4 + s.tier * 0.3);
      const headRadius = Math.max(2, 4.5 * depth);
      const bodyWidth = Math.max(4, 9 * depth);
      const bodyHeight = Math.max(5, 12 * depth);

      const renderY = py + bob + jumpY;

      // Spectator Body / Shirt
      ctx.fillStyle = s.shirtColor;
      ctx.beginPath();
      ctx.ellipse(px, renderY, bodyWidth * 0.5, bodyHeight * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spectator Head
      ctx.fillStyle = s.headColor;
      ctx.beginPath();
      ctx.arc(px, renderY - bodyHeight * 0.5 - headRadius * 0.7, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Arms up or flag waving when excited
      if ((isExcitedRally && i % 3 === 0) || isWavePeak) {
        ctx.strokeStyle = s.shirtColor;
        ctx.lineWidth = 1.8 * depth;
        ctx.beginPath();
        ctx.moveTo(px - bodyWidth * 0.4, renderY);
        ctx.lineTo(px - bodyWidth * 0.7, renderY - bodyHeight * 0.9);
        ctx.moveTo(px + bodyWidth * 0.4, renderY);
        ctx.lineTo(px + bodyWidth * 0.7, renderY - bodyHeight * 0.9);
        ctx.stroke();

        // Flag
        if (s.hasFlag && s.flagColor) {
          ctx.fillStyle = s.flagColor;
          ctx.fillRect(px + bodyWidth * 0.7, renderY - bodyHeight * 1.3, 10 * depth, 6 * depth);
        }
      }
    }
  };

  // Camera flashes in the crowd
  const updateAndDrawCameraFlashes = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dt: number,
    forceFlash: boolean
  ) => {
    // Spawn random flashes or forced flash on smash
    if (forceFlash || Math.random() < 0.08) {
      flashPointsRef.current.push({
        x: w * 0.15 + Math.random() * (w * 0.7),
        y: h * 0.12 + Math.random() * (h * 0.25),
        life: 0.25,
      });
    }

    const alive: Array<{ x: number; y: number; life: number }> = [];
    for (const f of flashPointsRef.current) {
      f.life -= dt;
      if (f.life > 0) {
        alive.push(f);
        const radius = (1 - f.life / 0.25) * 45;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.3, 'rgba(224, 242, 254, 0.5)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    flashPointsRef.current = alive;
  };

  // Court floor and line markings
  const drawBadmintonCourt = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    mode: GameMode,
    theme: CourtTheme
  ) => {
    // Court perimeter surrounding apron
    const apronW = COURT.DOUBLES_WIDTH + 0.9;
    const apronL = COURT.HALF_LENGTH + 0.9;

    const pTL = project(-apronW, -apronL);
    const pTR = project(apronW, -apronL);
    const pBR = project(apronW, apronL);
    const pBL = project(-apronW, apronL);

    // Arena apron color
    ctx.fillStyle = '#064e3b'; // Darker emerald surround
    ctx.beginPath();
    ctx.moveTo(pTL.px, pTL.py);
    ctx.lineTo(pTR.px, pTR.py);
    ctx.lineTo(pBR.px, pBR.py);
    ctx.lineTo(pBL.px, pBL.py);
    ctx.closePath();
    ctx.fill();

    // Main Court Mat
    const cW = COURT.DOUBLES_WIDTH;
    const cL = COURT.HALF_LENGTH;

    const cTL = project(-cW, -cL);
    const cTR = project(cW, -cL);
    const cBR = project(cW, cL);
    const cBL = project(-cW, cL);

    let courtMatColor = '#059669'; // Olympic Emerald
    if (theme === 'wooden_parquet') courtMatColor = '#b45309';
    if (theme === 'midnight_blue') courtMatColor = '#1d4ed8';

    ctx.fillStyle = courtMatColor;
    ctx.beginPath();
    ctx.moveTo(cTL.px, cTL.py);
    ctx.lineTo(cTR.px, cTR.py);
    ctx.lineTo(cBR.px, cBR.py);
    ctx.lineTo(cBL.px, cBL.py);
    ctx.closePath();
    ctx.fill();

    // Subtle court mat embossing / texture lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let y = -cL + 0.8; y <= cL; y += 0.8) {
      const p1 = project(-cW, y);
      const p2 = project(cW, y);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    }

    // Court White Line Markings (Standard 40mm BWF Lines)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';

    const drawLine = (x1: number, y1: number, x2: number, y2: number, width: number = 2.2) => {
      ctx.lineWidth = width;
      const p1 = project(x1, y1);
      const p2 = project(x2, y2);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    };

    // Doubles outer sidelines
    drawLine(-COURT.DOUBLES_WIDTH, -cL, -COURT.DOUBLES_WIDTH, cL);
    drawLine(COURT.DOUBLES_WIDTH, -cL, COURT.DOUBLES_WIDTH, cL);

    // Singles inner sidelines
    drawLine(-COURT.SINGLES_WIDTH, -cL, -COURT.SINGLES_WIDTH, cL, 1.8);
    drawLine(COURT.SINGLES_WIDTH, -cL, COURT.SINGLES_WIDTH, cL, 1.8);

    // Back boundary lines
    drawLine(-COURT.DOUBLES_WIDTH, -cL, COURT.DOUBLES_WIDTH, -cL);
    drawLine(-COURT.DOUBLES_WIDTH, cL, COURT.DOUBLES_WIDTH, cL);

    // Doubles long service lines (0.76m inside back line)
    drawLine(-COURT.DOUBLES_WIDTH, -COURT.DOUBLES_LONG_SERVICE_Y, COURT.DOUBLES_WIDTH, -COURT.DOUBLES_LONG_SERVICE_Y, 1.8);
    drawLine(-COURT.DOUBLES_WIDTH, COURT.DOUBLES_LONG_SERVICE_Y, COURT.DOUBLES_WIDTH, COURT.DOUBLES_LONG_SERVICE_Y, 1.8);

    // Short service lines (1.98m from net)
    drawLine(-COURT.DOUBLES_WIDTH, -COURT.SHORT_SERVICE_Y, COURT.DOUBLES_WIDTH, -COURT.SHORT_SERVICE_Y);
    drawLine(-COURT.DOUBLES_WIDTH, COURT.SHORT_SERVICE_Y, COURT.DOUBLES_WIDTH, COURT.SHORT_SERVICE_Y);

    // Center service lines (from short service line to back line)
    drawLine(0, -cL, 0, -COURT.SHORT_SERVICE_Y);
    drawLine(0, COURT.SHORT_SERVICE_Y, 0, cL);

    // Sponsor boards around court boundary (Yonex / Super Series aesthetic)
    drawSponsorBoards(ctx, project);
  };

  const drawSponsorBoards = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number }
  ) => {
    // Backboards
    const brands = ['YONEX', 'SUPER SERIES', 'OLYMPICS', 'VICTOR'];
    const boardL = COURT.HALF_LENGTH + 0.95;
    const p1 = project(-COURT.DOUBLES_WIDTH - 0.6, -boardL, 0);
    const p2 = project(COURT.DOUBLES_WIDTH + 0.6, -boardL, 0);
    const p1Top = project(-COURT.DOUBLES_WIDTH - 0.6, -boardL, 0.45);
    const p2Top = project(COURT.DOUBLES_WIDTH + 0.6, -boardL, 0.45);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(p1.px, p1.py);
    ctx.lineTo(p2.px, p2.py);
    ctx.lineTo(p2Top.px, p2Top.py);
    ctx.lineTo(p1Top.px, p1Top.py);
    ctx.closePath();
    ctx.fill();

    // Board text
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    const midTop = project(0, -boardL, 0.22);
    ctx.fillText('BWF WORLD CHAMPIONSHIP · ARENA', midTop.px, midTop.py);
  };

  // 3D Badminton Net
  const drawNet = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    wobble: number
  ) => {
    const postX = COURT.DOUBLES_WIDTH;
    const netY = 0;

    // Posts on both sides (height 1.55m)
    const leftPostBottom = project(-postX, netY, 0);
    const leftPostTop = project(-postX, netY, COURT.NET_HEIGHT_POST);
    const rightPostBottom = project(postX, netY, 0);
    const rightPostTop = project(postX, netY, COURT.NET_HEIGHT_POST);

    // Sturdy metal net posts
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftPostBottom.px, leftPostBottom.py);
    ctx.lineTo(leftPostTop.px, leftPostTop.py);
    ctx.moveTo(rightPostBottom.px, rightPostBottom.py);
    ctx.lineTo(rightPostTop.px, rightPostTop.py);
    ctx.stroke();

    // Net mesh grid
    const numCols = 32;
    const numRows = 7;
    const wobbleOffset = Math.sin(Date.now() / 80) * wobble * 0.05;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;

    // Mesh columns
    for (let c = 0; c <= numCols; c++) {
      const frac = c / numCols;
      const x = -postX + frac * (postX * 2);
      // Net sag in center (1.524m center vs 1.55m edges)
      const sag = Math.sin(frac * Math.PI) * (COURT.NET_HEIGHT_POST - COURT.NET_HEIGHT_CENTER);
      const topZ = COURT.NET_HEIGHT_POST - sag + wobbleOffset;
      const bottomZ = 0.75; // Net height is 760mm deep

      const pTop = project(x, netY, topZ);
      const pBottom = project(x, netY, bottomZ);

      ctx.beginPath();
      ctx.moveTo(pTop.px, pTop.py);
      ctx.lineTo(pBottom.px, pBottom.py);
      ctx.stroke();
    }

    // Mesh rows
    for (let r = 0; r <= numRows; r++) {
      const zFrac = r / numRows;
      ctx.beginPath();
      for (let c = 0; c <= numCols; c++) {
        const frac = c / numCols;
        const x = -postX + frac * (postX * 2);
        const sag = Math.sin(frac * Math.PI) * (COURT.NET_HEIGHT_POST - COURT.NET_HEIGHT_CENTER);
        const z = 0.75 + zFrac * (COURT.NET_HEIGHT_POST - 0.75 - sag) + wobbleOffset;
        const p = project(x, netY, z);
        if (c === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();
    }

    // White Top Tape (75mm wide official white cord tape)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    for (let c = 0; c <= numCols; c++) {
      const frac = c / numCols;
      const x = -postX + frac * (postX * 2);
      const sag = Math.sin(frac * Math.PI) * (COURT.NET_HEIGHT_POST - COURT.NET_HEIGHT_CENTER);
      const p = project(x, netY, COURT.NET_HEIGHT_POST - sag + wobbleOffset);
      if (c === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();
  };

  // Shadows for players and shuttlecock
  const drawShadows = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    playerList: Player[],
    shuttle: Shuttlecock
  ) => {
    // Player shadows on the floor
    for (const p of playerList) {
      const shadowPos = project(p.x, p.y, 0);
      const radiusX = (14 - p.z * 4) * shadowPos.depth;
      const radiusY = (7 - p.z * 2) * shadowPos.depth;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(shadowPos.px, shadowPos.py, Math.max(3, radiusX), Math.max(2, radiusY), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shuttlecock shadow on the floor (Accurate depth perception!)
    const shuttleShadowPos = project(shuttle.x, shuttle.y, 0);
    // Shadow gets larger and lighter as altitude Z increases
    const shadowAlpha = Math.max(0.12, 0.65 - shuttle.z * 0.08);
    const shadowSize = Math.max(3, (4.5 + shuttle.z * 1.5) * shuttleShadowPos.depth);

    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(shuttleShadowPos.px, shuttleShadowPos.py, shadowSize * 1.2, shadowSize * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Landing Ring Indicator when shuttlecock is high
    if (shuttle.z > 0.5 && shuttle.inAir) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(0.7, shadowAlpha * 1.2)})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.ellipse(shuttleShadowPos.px, shuttleShadowPos.py, shadowSize * 1.8, shadowSize * 1.0, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // Detailed stylized badminton player
  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    player: Player,
    time: number
  ) => {
    const { px, py, depth } = project(player.x, player.y, player.z);
    const scale = depth * 1.1;

    ctx.save();
    ctx.translate(px, py);

    // Running / step wobble
    const isMoving = player.actionState === 'running';
    const legPhase = isMoving ? Math.sin(time / 80) : 0;
    const isJumping = player.z > 0.1 || player.actionState === 'jump_smash';
    const isSmashing = player.actionState === 'jump_smash' || player.actionState === 'swing_smash';

    // Player Height & dimensions
    const headRadius = 7 * scale;
    const bodyHeight = 22 * scale;
    const bodyWidth = 14 * scale;

    // ACTIVE POWER SPECIAL VISUAL FX
    if (player.id === 'p1' && activePower) {
      ctx.save();
      if (activePower === 'thunder_smash') {
        // Fiery thunder smash flames
        const flamePulse = 1 + Math.sin(time / 40) * 0.2;
        const grad = ctx.createRadialGradient(0, -bodyHeight * 0.5, 5, 0, -bodyHeight * 0.5, 32 * scale * flamePulse);
        grad.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
        grad.addColorStop(0.5, 'rgba(239, 68, 68, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -bodyHeight * 0.5, 32 * scale * flamePulse, 0, Math.PI * 2);
        ctx.fill();
      } else if (activePower === 'iron_defense') {
        // Golden Iron Wall Energy Dome
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.ellipse(0, -bodyHeight * 0.45, 26 * scale, 34 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (activePower === 'stamina_surge') {
        // Speed Surge Cyan Trail
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.arc(0, -bodyHeight * 0.5, 24 * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 1. Legs & Shoes
    ctx.fillStyle = '#0f172a'; // dark athletic socks/shoes
    ctx.lineWidth = 3.5 * scale;
    ctx.strokeStyle = player.skinColor;

    // Left leg
    const leftLegY = isJumping ? -bodyHeight * 0.4 : 0;
    const rightLegY = isJumping ? -bodyHeight * 0.3 : 0;

    ctx.beginPath();
    ctx.moveTo(-bodyWidth * 0.25, -bodyHeight * 0.3);
    ctx.lineTo(-bodyWidth * 0.3 + (legPhase * 4 * scale), leftLegY);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(bodyWidth * 0.25, -bodyHeight * 0.3);
    ctx.lineTo(bodyWidth * 0.3 - (legPhase * 4 * scale), rightLegY);
    ctx.stroke();

    // Badminton shoes (white with accent)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-bodyWidth * 0.35 + (legPhase * 4 * scale), leftLegY - 2 * scale, 7 * scale, 3.5 * scale);
    ctx.fillRect(bodyWidth * 0.25 - (legPhase * 4 * scale), rightLegY - 2 * scale, 7 * scale, 3.5 * scale);

    // 2. Shorts
    ctx.fillStyle = player.shortsColor;
    ctx.fillRect(-bodyWidth * 0.35, -bodyHeight * 0.5, bodyWidth * 0.7, bodyHeight * 0.25);

    // 3. Torso / Jersey
    ctx.fillStyle = player.jerseyColor;
    ctx.beginPath();
    ctx.roundRect(-bodyWidth * 0.45, -bodyHeight * 0.95, bodyWidth * 0.9, bodyHeight * 0.5, 4 * scale);
    ctx.fill();

    // Jersey number or flag emblem
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.round(8 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(player.team === 'teamA' ? '1' : '2', 0, -bodyHeight * 0.65);

    // 4. Arms & Badminton Racket
    const racketArmAngle = isSmashing ? -Math.PI * 0.75 : (player.actionState === 'swing_clear' ? -Math.PI * 0.4 : -0.2);
    const racketLength = 24 * scale;

    // Right arm (Racket arm)
    const shoulderX = bodyWidth * 0.4;
    const shoulderY = -bodyHeight * 0.85;

    const elbowX = shoulderX + Math.cos(racketArmAngle) * 10 * scale;
    const elbowY = shoulderY + Math.sin(racketArmAngle) * 10 * scale;

    const handX = elbowX + Math.cos(racketArmAngle - 0.4) * 12 * scale;
    const handY = elbowY + Math.sin(racketArmAngle - 0.4) * 12 * scale;

    ctx.strokeStyle = player.skinColor;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Badminton Racket Shaft & Head
    const racketHeadX = handX + Math.cos(racketArmAngle - 0.6) * racketLength;
    const racketHeadY = handY + Math.sin(racketArmAngle - 0.6) * racketLength;

    // Shaft
    ctx.strokeStyle = player.racketColor;
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(racketHeadX, racketHeadY);
    ctx.stroke();

    // Isometric Oval Racket Head (Strung with white high tension strings)
    ctx.strokeStyle = player.racketColor;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.ellipse(racketHeadX, racketHeadY, 8 * scale, 12 * scale, racketArmAngle, 0, Math.PI * 2);
    ctx.stroke();

    // String cross pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.8 * scale;
    ctx.beginPath();
    ctx.moveTo(racketHeadX - 4 * scale, racketHeadY);
    ctx.lineTo(racketHeadX + 4 * scale, racketHeadY);
    ctx.moveTo(racketHeadX, racketHeadY - 6 * scale);
    ctx.lineTo(racketHeadX, racketHeadY + 6 * scale);
    ctx.stroke();

    // 5. Head & Hair
    const headY = -bodyHeight - headRadius * 0.8;
    ctx.fillStyle = player.skinColor;
    ctx.beginPath();
    ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Headband
    ctx.fillStyle = player.hairColor;
    ctx.beginPath();
    ctx.arc(0, headY - 2 * scale, headRadius * 0.95, Math.PI, Math.PI * 2);
    ctx.fill();

    // Headband
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(0, headY - 1 * scale, headRadius * 0.98, Math.PI * 0.9, Math.PI * 2.1);
    ctx.stroke();

    // 6. Player Name & Indicator Tag
    const tagY = headY - 12 * scale;
    const isHuman = !player.isAI;
    ctx.font = `600 ${Math.max(9, Math.round(9 * scale))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';

    // Label tag pill background
    const labelText = isHuman ? `${player.name}` : `${player.name} (AI)`;
    const textWidth = ctx.measureText(labelText).width;

    ctx.fillStyle = isHuman ? 'rgba(16, 185, 129, 0.88)' : 'rgba(30, 41, 59, 0.8)';
    ctx.beginPath();
    ctx.roundRect(-textWidth * 0.5 - 5, tagY - 9, textWidth + 10, 14, 4);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(labelText, 0, tagY + 2);

    // Active Hold-to-Charge Real-time Power Meter (Over Player 1)
    if (player.id === 'p1' && chargingPower !== null && chargingPower !== undefined) {
      const pwr = Math.max(0, Math.min(100, chargingPower));
      const meterW = Math.max(52, 44 * scale);
      const meterH = Math.max(9, 7.5 * scale);
      const meterY = tagY - 24;

      ctx.save();
      ctx.shadowColor = pwr >= 95 ? '#EF4444' : (pwr > 70 ? '#F59E0B' : '#10B981');
      ctx.shadowBlur = 10;

      // Meter Background frame
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.strokeStyle = pwr >= 95 ? '#EF4444' : (pwr > 70 ? '#F59E0B' : '#38BDF8');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-meterW * 0.5 - 2, meterY - 2, meterW + 4, meterH + 4, 4);
      ctx.fill();
      ctx.stroke();

      // Dynamic Fill Bar
      const fillW = (pwr / 100) * meterW;
      const grad = ctx.createLinearGradient(-meterW * 0.5, 0, meterW * 0.5, 0);
      grad.addColorStop(0, '#10B981');
      grad.addColorStop(0.55, '#F59E0B');
      grad.addColorStop(1, '#EF4444');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(-meterW * 0.5, meterY, fillW, meterH, 2.5);
      ctx.fill();

      // Power Level Text Overlay
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.max(9, Math.round(8 * scale))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      const label = pwr >= 98 ? '🔥 100% MAX!' : `⚡ ${Math.round(pwr)}% PWR`;
      ctx.fillText(label, 0, meterY + meterH - 1.5);
      ctx.restore();
    }

    // Stamina & Smash Bar (For active human players)
    if (isHuman) {
      const barW = 28 * scale;
      const barH = 3 * scale;
      const barY = tagY + 9;

      // Stamina (Green to yellow to red)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(-barW * 0.5, barY, barW, barH);
      ctx.fillStyle = player.stamina > 40 ? '#10B981' : (player.stamina > 20 ? '#F59E0B' : '#EF4444');
      ctx.fillRect(-barW * 0.5, barY, (player.stamina / 100) * barW, barH);

      // Smash gauge bar right under stamina
      if (player.smashGauge > 0) {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(-barW * 0.5, barY + barH + 1, (player.smashGauge / 100) * barW, 2 * scale);
      }
    }

    ctx.restore();
  };

  // 3D Shuttlecock with trailing motion blur & speed spark effects
  const drawShuttlecock = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    shuttle: Shuttlecock,
    time: number
  ) => {
    // Draw motion blur trail
    if (shuttle.trail && shuttle.trail.length > 0) {
      for (let i = 0; i < shuttle.trail.length; i++) {
        const t = shuttle.trail[i];
        const pos = project(t.x, t.y, t.z);
        const trailAlpha = t.alpha * 0.45;
        const radius = Math.max(1.5, 3.5 * pos.depth * (1 - i / shuttle.trail.length));

        // Smash speed trail: Glowing orange/yellow streaks when fast
        if (t.speed > 240) {
          ctx.fillStyle = `rgba(249, 115, 22, ${trailAlpha * 1.2})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${trailAlpha})`;
        }

        ctx.beginPath();
        ctx.arc(pos.px, pos.py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const { px, py, depth } = project(shuttle.x, shuttle.y, shuttle.z);
    const size = Math.max(3.5, 6.5 * depth);

    // Shuttlecock flight angle based on velocity
    const angle = Math.atan2(shuttle.vy, shuttle.vx);

    ctx.save();
    ctx.translate(px, py);

    // Cork (Rubberized tip)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Cork green band (Official tournament shuttlecock tape)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    // 16 Goose Feathers skirt flare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    // Skirt flare opposite to motion direction
    const skirtAngle = angle + Math.PI;
    const skirtDist = size * 1.5;
    const skirtSpread = 0.55;

    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(skirtAngle - skirtSpread) * skirtDist, Math.sin(skirtAngle - skirtSpread) * skirtDist);
    ctx.lineTo(Math.cos(skirtAngle + skirtSpread) * skirtDist, Math.sin(skirtAngle + skirtSpread) * skirtDist);
    ctx.closePath();
    ctx.fill();

    // Subtle feather ribs
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Speed particles on smashes (> 260 km/h)
    if (shuttle.speedKmH > 260 && shuttle.inAir) {
      for (let s = 0; s < 3; s++) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkDist = (Math.random() * 8 + 4) * depth;
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(Math.cos(sparkAngle) * sparkDist, Math.sin(sparkAngle) * sparkDist, 2, 2);
      }
    }

    ctx.restore();
  };

  // Umpire High Chair with animated head following shuttlecock
  const drawUmpire = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    shuttle: Shuttlecock
  ) => {
    const chairX = COURT.DOUBLES_WIDTH + 0.65;
    const chairY = 0;
    const seatZ = 1.75; // Umpire sitting high above net

    const basePos = project(chairX, chairY, 0);
    const seatPos = project(chairX, chairY, seatZ);

    // Sturdy high ladder legs
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(basePos.px - 8, basePos.py);
    ctx.lineTo(seatPos.px - 6, seatPos.py);
    ctx.moveTo(basePos.px + 8, basePos.py);
    ctx.lineTo(seatPos.px + 6, seatPos.py);
    // Ladder rungs
    for (let r = 0.3; r < seatZ; r += 0.45) {
      const rungP = project(chairX, chairY, r);
      ctx.moveTo(rungP.px - 7, rungP.py);
      ctx.lineTo(rungP.px + 7, rungP.py);
    }
    ctx.stroke();

    // Umpire body (Navy jacket)
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(seatPos.px - 7, seatPos.py - 16, 14, 16);

    // Umpire head tracking the shuttlecock
    const shuttleP = project(shuttle.x, shuttle.y, shuttle.z);
    const lookAngle = Math.atan2(shuttleP.py - (seatPos.py - 22), shuttleP.px - seatPos.px);
    const headX = seatPos.px + Math.cos(lookAngle) * 2;
    const headY = seatPos.py - 22 + Math.sin(lookAngle) * 2;

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(headX, headY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Small umpire cap
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(headX - 5, headY - 6, 10, 3);
  };

  // Broadcast HUD banner for game events
  const drawBroadcastBanner = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    banner: { text: string; subtext?: string; type: string }
  ) => {
    const bannerY = h * 0.22;
    ctx.save();

    // Backdrop bar
    let bgColor = 'rgba(15, 23, 42, 0.88)';
    let accentColor = '#10B981';

    if (banner.type === 'smash') {
      bgColor = 'rgba(239, 68, 68, 0.9)';
      accentColor = '#FEF08A';
    } else if (banner.type === 'deuce' || banner.type === 'draw') {
      bgColor = 'rgba(168, 85, 247, 0.9)';
      accentColor = '#FFFFFF';
    } else if (banner.type === 'point') {
      bgColor = 'rgba(16, 185, 129, 0.92)';
      accentColor = '#FFFFFF';
    }

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(w * 0.2, bannerY - 26, w * 0.6, banner.subtext ? 58 : 46, 10);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = accentColor;
    ctx.font = '700 22px Antonio, Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(banner.text, w * 0.5, bannerY + 2);

    if (banner.subtext) {
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '500 13px Outfit, sans-serif';
      ctx.fillText(banner.subtext, w * 0.5, bannerY + 22);
    }

    ctx.restore();
  };

  // Sweet-spot hitting reticle when shuttlecock is reachable
  const drawHitReticle = (
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number, z?: number) => { px: number; py: number; depth: number },
    shuttle: Shuttlecock,
    time: number
  ) => {
    const { px, py, depth } = project(shuttle.x, shuttle.y, shuttle.z);
    const pulse = 1 + Math.sin(time / 60) * 0.18;
    const radius = 18 * depth * pulse;

    ctx.save();
    // Expanding neon ring
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary dashed outer ring
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(px, py, radius * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Prompt badge
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(px - 34, py - radius - 18, 68, 16, 4);
    ctx.fill();

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ HIT / SMASH!', px, py - radius - 6);

    ctx.restore();
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCourtMouseMove || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const courtOriginX = width * 0.5;
    const courtOriginY = height * 0.52;
    const scaleX = Math.min(width / 13, height / 20) * 1.5;
    const scaleY = scaleX * 0.68;

    // Invert perspective projection to estimate court (x, y)
    const normY = (mouseY - courtOriginY) / scaleY;
    const depth = 1 + (normY / COURT.HALF_LENGTH) * 0.22;
    const normX = (mouseX - courtOriginX) / (scaleX * Math.max(0.2, depth));

    onCourtMouseMove(normX, normY);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden flex items-center justify-center bg-slate-950">
      <canvas
        ref={canvasRef}
        onClick={onCourtClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseDown={onCourtMouseDown}
        onMouseUp={onCourtMouseUp}
        className="w-full h-full block cursor-crosshair touch-none"
      />
    </div>
  );
};
