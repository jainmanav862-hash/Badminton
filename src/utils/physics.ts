import { GameMode, MatchSettings, Player, ShotType, Shuttlecock } from '../types/game';

// Court dimensions in meters
export const COURT = {
  HALF_LENGTH: 6.70,     // Total length 13.4m
  SINGLES_WIDTH: 2.59,   // Total 5.18m (-2.59 to +2.59)
  DOUBLES_WIDTH: 3.05,   // Total 6.10m (-3.05 to +3.05)
  SHORT_SERVICE_Y: 1.98, // Distance from net to short service line
  DOUBLES_LONG_SERVICE_Y: 5.94, // 0.76m from back line
  NET_HEIGHT_CENTER: 1.524,
  NET_HEIGHT_POST: 1.55,
  GRAVITY: 9.81,
  DRAG_COEFFICIENT: 0.165,
};

/**
 * Updates 3D shuttlecock aerodynamics with authentic feather drag and gravity
 */
export function updateShuttlecock(
  shuttle: Shuttlecock,
  dt: number,
  onNetCollision: (graze: boolean) => void
): { landed: boolean; netFault: boolean } {
  if (!shuttle.inAir) return { landed: false, netFault: false };

  // Calculate speed
  const speed = Math.sqrt(shuttle.vx * shuttle.vx + shuttle.vy * shuttle.vy + shuttle.vz * shuttle.vz);
  shuttle.speedKmH = Math.round(speed * 3.6);

  // Aerodynamic drag force proportional to v^2
  const dragForce = COURT.DRAG_COEFFICIENT * speed;
  const ax = -dragForce * shuttle.vx;
  const ay = -dragForce * shuttle.vy;
  const az = -COURT.GRAVITY - dragForce * shuttle.vz;

  const prevY = shuttle.y;
  const nextX = shuttle.x + shuttle.vx * dt + 0.5 * ax * dt * dt;
  const nextY = shuttle.y + shuttle.vy * dt + 0.5 * ay * dt * dt;
  const nextZ = shuttle.z + shuttle.vz * dt + 0.5 * az * dt * dt;

  shuttle.vx += ax * dt;
  shuttle.vy += ay * dt;
  shuttle.vz += az * dt;

  // Check Net Crossing at Y = 0
  if ((prevY < 0 && nextY >= 0) || (prevY > 0 && nextY <= 0)) {
    const t = Math.abs(prevY) / (Math.abs(prevY) + Math.abs(nextY));
    const netCrossingZ = shuttle.z + (nextZ - shuttle.z) * t;
    const netCrossingX = shuttle.x + (nextX - shuttle.x) * t;

    // Post distance calculation
    const edgeDistRatio = Math.min(1, Math.abs(netCrossingX) / COURT.DOUBLES_WIDTH);
    const netHeightAtX = COURT.NET_HEIGHT_CENTER + (COURT.NET_HEIGHT_POST - COURT.NET_HEIGHT_CENTER) * edgeDistRatio;

    // Net graze / deflection band (within 4cm of tape)
    if (netCrossingZ >= netHeightAtX - 0.04 && netCrossingZ <= netHeightAtX + 0.03) {
      // Net tape tumble! Shuttlecock clips the top tape and tumbles over
      shuttle.vz = Math.max(-1.5, shuttle.vz * 0.4);
      shuttle.vy = shuttle.vy * 0.45;
      shuttle.z = netHeightAtX + 0.02;
      onNetCollision(true);
    } else if (netCrossingZ < netHeightAtX - 0.04) {
      // Direct collision with net mesh!
      shuttle.x = nextX;
      shuttle.y = 0;
      shuttle.z = Math.max(0, netCrossingZ);
      shuttle.vx *= 0.1;
      shuttle.vy = -shuttle.vy * 0.15; // Soft rebound off mesh
      shuttle.vz = -1.2;
      shuttle.inAir = false;
      onNetCollision(false);
      return { landed: true, netFault: true };
    }
  }

  shuttle.x = nextX;
  shuttle.y = nextY;
  shuttle.z = nextZ;

  // Add trail particle for motion blur / smash visual
  shuttle.trail.unshift({
    x: shuttle.x,
    y: shuttle.y,
    z: shuttle.z,
    speed: shuttle.speedKmH,
    alpha: 1.0,
  });
  if (shuttle.trail.length > 14) {
    shuttle.trail.pop();
  }
  // Decay older trails
  for (const t of shuttle.trail) {
    t.alpha *= 0.88;
  }

  // Floor landing check
  if (shuttle.z <= 0) {
    shuttle.z = 0;
    shuttle.inAir = false;
    shuttle.vx = 0;
    shuttle.vy = 0;
    shuttle.vz = 0;
    return { landed: true, netFault: false };
  }

  return { landed: false, netFault: false };
}

/**
 * Checks if landing coordinate (x, y) is legal "IN" or "OUT"
 */
export function checkCourtInBounds(
  x: number,
  y: number,
  mode: GameMode,
  isService: boolean,
  serverTeam: 'teamA' | 'teamB',
  serverScore: number
): { isIn: boolean; reason?: string } {
  const halfWidth = mode === '1v1' ? COURT.SINGLES_WIDTH : COURT.DOUBLES_WIDTH;
  const halfLength = COURT.HALF_LENGTH;

  // General court boundaries check
  if (Math.abs(x) > halfWidth) {
    return { isIn: false, reason: 'Sideline Out' };
  }

  if (Math.abs(y) > halfLength) {
    return { isIn: false, reason: 'Baseline Out' };
  }

  // Service Specific Court Bounds (BWF Rules)
  if (isService) {
    const isEven = serverScore % 2 === 0;
    // Target side of court
    if (serverTeam === 'teamA') {
      // Served by teamA (y > 0) towards teamB (y < 0)
      if (y > -COURT.SHORT_SERVICE_Y) {
        return { isIn: false, reason: 'Short Service' };
      }
      if (mode === '2v2' && y < -COURT.DOUBLES_LONG_SERVICE_Y) {
        return { isIn: false, reason: 'Long Service' };
      }
      // Diagonal box check:
      // Even score: server serves from right box (x > 0) to opponent's right box (x > 0 in teamB coordinates, so receiver right is x < 0 from top view)
      // Standard diagonal rule:
      const targetSideRight = isEven ? x <= 0.05 : x >= -0.05;
      if (!targetSideRight) {
        return { isIn: false, reason: 'Wrong Service Court' };
      }
    } else {
      // Served by teamB (y < 0) towards teamA (y > 0)
      if (y < COURT.SHORT_SERVICE_Y) {
        return { isIn: false, reason: 'Short Service' };
      }
      if (mode === '2v2' && y > COURT.DOUBLES_LONG_SERVICE_Y) {
        return { isIn: false, reason: 'Long Service' };
      }
      const targetSideRight = isEven ? x >= -0.05 : x <= 0.05;
      if (!targetSideRight) {
        return { isIn: false, reason: 'Wrong Service Court' };
      }
    }
  }

  return { isIn: true };
}

/**
 * Executes a shot from a player onto the shuttlecock with dynamic power control and in-bounds calibration
 */
export function executeShot(
  player: Player,
  shuttle: Shuttlecock,
  type: ShotType,
  aimXDirection: number = 0, // -1 (left), 0 (center), 1 (right)
  isJump: boolean = false,
  powerRatio: number = 0.78 // 0.3 (soft) to 1.0 (max power). Default 0.78 is safe in-bounds
): { speedKmH: number } {
  const isTeamA = player.team === 'teamA';
  const directionY = isTeamA ? -1 : 1;

  let vx = 0;
  let vy = 0;
  let vz = 0;
  let speedKmH = 150;

  // Stamina check
  const staminaFactor = 0.85 + 0.15 * (player.stamina / 100);
  const clampedPower = Math.max(0.35, Math.min(1.15, powerRatio));

  switch (type) {
    case 'smash': {
      // Explosive downward smash at true tournament velocities (240 - 380+ km/h!)
      const baseSmashSpeed = isJump ? 75 : 64; // m/s
      const chargeBonus = 1 + (player.smashGauge / 100) * 0.25;
      const effectiveSpeed = baseSmashSpeed * chargeBonus * staminaFactor * (0.75 + clampedPower * 0.55);

      speedKmH = Math.round(effectiveSpeed * 3.6);
      vy = directionY * (effectiveSpeed * 0.82);
      // Downward velocity (steep downward whip)
      vz = isJump ? -15.5 : -11.0;
      vx = aimXDirection * (effectiveSpeed * 0.22);

      player.actionState = isJump ? 'jump_smash' : 'swing_smash';
      player.stateTimer = 0.35;
      player.stamina = Math.max(0, player.stamina - (isJump ? 14 : 7));
      player.smashGauge = 0;
      break;
    }
    case 'clear': {
      // Powerful high clear carrying deeply across the full court length
      const clearPowerSpeed = 24 + clampedPower * 18; // up to 42 m/s (~150 km/h)
      speedKmH = Math.round(clearPowerSpeed * 3.6);
      vy = directionY * (clearPowerSpeed * 0.72);
      vz = 13.5 + clampedPower * 3.5; // High defensive/attacking trajectory
      vx = aimXDirection * 4.2;

      player.actionState = 'swing_clear';
      player.stateTimer = 0.28;
      player.stamina = Math.max(0, player.stamina - 4);
      player.smashGauge = Math.min(100, player.smashGauge + 15);
      break;
    }
    case 'drop': {
      // Deceptive soft touch dropping right over the net tape
      const dropPowerSpeed = 10 + clampedPower * 7;
      speedKmH = Math.round(dropPowerSpeed * 3.6);
      vy = directionY * (dropPowerSpeed * 0.75);
      vz = Math.max(2.4, (COURT.NET_HEIGHT_CENTER + 0.4) - player.z);
      vx = aimXDirection * 1.8;

      player.actionState = 'swing_drop';
      player.stateTimer = 0.22;
      player.stamina = Math.max(0, player.stamina - 2);
      player.smashGauge = Math.min(100, player.smashGauge + 10);
      break;
    }
    case 'drive': {
      // Blazing flat crosscourt or down-the-line laser punch
      const drivePowerSpeed = 28 + clampedPower * 18; // up to 46 m/s (~165 km/h)
      speedKmH = Math.round(drivePowerSpeed * 3.6);
      vy = directionY * (drivePowerSpeed * 0.95);
      vz = 1.3;
      vx = aimXDirection * 6.5;

      player.actionState = 'swing_smash';
      player.stateTimer = 0.25;
      player.stamina = Math.max(0, player.stamina - 5);
      player.smashGauge = Math.min(100, player.smashGauge + 12);
      break;
    }
    case 'serve': {
      // Service velocity
      const isHigh = clampedPower > 0.8;
      if (isHigh) {
        vy = directionY * (16 + clampedPower * 8);
        vz = 13.0;
        vx = aimXDirection * 1.8;
        speedKmH = 110;
      } else {
        vy = directionY * (12 + clampedPower * 4);
        vz = 3.6;
        vx = aimXDirection * 1.2;
        speedKmH = 85;
      }

      player.actionState = 'swing_clear';
      player.stateTimer = 0.3;
      break;
    }
  }

  shuttle.vx = vx;
  shuttle.vy = vy;
  shuttle.vz = vz;
  shuttle.speedKmH = speedKmH;
  shuttle.lastHitBy = player.id;
  shuttle.lastHitTeam = player.team;
  shuttle.lastShotType = type;
  shuttle.inAir = true;

  return { speedKmH };
}

/**
 * Predicts where and when the shuttlecock will reach player's reachable height (Z <= 2.2m)
 */
export function predictShuttleLanding(
  shuttle: Shuttlecock,
  targetZ: number = 1.2,
  maxSteps: number = 120
): { x: number; y: number; timeToReach: number } {
  let simulatedX = shuttle.x;
  let simulatedY = shuttle.y;
  let simulatedZ = shuttle.z;
  let simulatedVx = shuttle.vx;
  let simulatedVy = shuttle.vy;
  let simulatedVz = shuttle.vz;
  const dt = 0.02;

  for (let step = 0; step < maxSteps; step++) {
    const speed = Math.sqrt(simulatedVx * simulatedVx + simulatedVy * simulatedVy + simulatedVz * simulatedVz);
    const dragForce = COURT.DRAG_COEFFICIENT * speed;
    const ax = -dragForce * simulatedVx;
    const ay = -dragForce * simulatedVy;
    const az = -COURT.GRAVITY - dragForce * simulatedVz;

    simulatedVx += ax * dt;
    simulatedVy += ay * dt;
    simulatedVz += az * dt;

    simulatedX += simulatedVx * dt;
    simulatedY += simulatedVy * dt;
    simulatedZ += simulatedVz * dt;

    if (simulatedZ <= targetZ || simulatedZ <= 0) {
      return {
        x: simulatedX,
        y: simulatedY,
        timeToReach: step * dt,
      };
    }
  }

  return {
    x: simulatedX,
    y: simulatedY,
    timeToReach: maxSteps * dt,
  };
}

/**
 * Intelligent AI logic for Singles & Doubles badminton partners
 */
export function updateAIPlayer(
  ai: Player,
  partner: Player | null,
  shuttle: Shuttlecock,
  settings: MatchSettings,
  dt: number,
  onAttemptHit: (player: Player, shot: ShotType, aimX: number, isJump: boolean, powerRatio?: number) => void
) {
  // Recover stamina and decay timers
  ai.stamina = Math.min(100, ai.stamina + 12 * dt);
  ai.smashGauge = Math.min(100, ai.smashGauge + 8 * dt);

  if (ai.stateTimer > 0) {
    ai.stateTimer -= dt;
    if (ai.stateTimer <= 0) {
      ai.actionState = 'idle';
    }
  }

  if (ai.hitCooldown > 0) {
    ai.hitCooldown -= dt;
  }

  // Difficulty adjustment parameters
  let reactionSpeed = 6.8; // m/s movement speed
  let predictionError = 0.25; // meters
  let smashAggression = 0.65;

  if (settings.aiDifficulty === 'easy') {
    reactionSpeed = 5.2;
    predictionError = 0.6;
    smashAggression = 0.3;
  } else if (settings.aiDifficulty === 'medium') {
    reactionSpeed = 6.4;
    predictionError = 0.35;
    smashAggression = 0.55;
  } else if (settings.aiDifficulty === 'hard') {
    reactionSpeed = 7.4;
    predictionError = 0.15;
    smashAggression = 0.75;
  } else if (settings.aiDifficulty === 'champion') {
    reactionSpeed = 8.2;
    predictionError = 0.05;
    smashAggression = 0.88;
  }

  // Check if shuttlecock is coming toward AI's half
  const isTeamA = ai.team === 'teamA';
  const headingTowardUs = isTeamA ? shuttle.vy > 0 : shuttle.vy < 0;

  // Base home position
  let homeX = 0;
  let homeY = isTeamA ? 4.2 : -4.2;

  // In 2v2 doubles, position dynamically: front/back or left/right formation
  if (partner) {
    // If AI is front court or back court
    const isFrontPlayer = Math.abs(ai.y) < Math.abs(partner.y);
    if (isFrontPlayer) {
      homeY = isTeamA ? 2.6 : -2.6;
      homeX = shuttle.x * 0.4;
    } else {
      homeY = isTeamA ? 5.2 : -5.2;
      homeX = -partner.x * 0.5;
    }
  }

  let desiredX = homeX;
  let desiredY = homeY;

  // If shuttlecock is moving toward our half, predict landing
  if (headingTowardUs && shuttle.inAir) {
    const prediction = predictShuttleLanding(shuttle, 1.2);

    // In doubles, check whether this AI or partner should field it
    let shouldField = true;
    if (partner) {
      const distAI = Math.hypot(ai.x - prediction.x, ai.y - prediction.y);
      const distPartner = Math.hypot(partner.x - prediction.x, partner.y - prediction.y);
      if (distPartner < distAI - 0.5) {
        shouldField = false;
      }
    }

    if (shouldField) {
      desiredX = Math.max(-COURT.SINGLES_WIDTH, Math.min(COURT.SINGLES_WIDTH, prediction.x));
      desiredY = Math.max(isTeamA ? 0.8 : -COURT.HALF_LENGTH, Math.min(isTeamA ? COURT.HALF_LENGTH : -0.8, prediction.y));
    }
  }

  // Move towards desired position
  const dx = desiredX - ai.x;
  const dy = desiredY - ai.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 0.15) {
    const moveX = (dx / distance) * reactionSpeed;
    const moveY = (dy / distance) * reactionSpeed;
    ai.x += moveX * dt;
    ai.y += moveY * dt;
    if (ai.actionState === 'idle') {
      ai.actionState = 'running';
    }
  } else {
    if (ai.actionState === 'running') {
      ai.actionState = 'idle';
    }
  }

  // Constrain AI within its court half
  const halfWidth = settings.gameMode === '1v1' ? COURT.SINGLES_WIDTH : COURT.DOUBLES_WIDTH;
  ai.x = Math.max(-halfWidth + 0.3, Math.min(halfWidth - 0.3, ai.x));
  if (isTeamA) {
    ai.y = Math.max(0.6, Math.min(COURT.HALF_LENGTH - 0.3, ai.y));
  } else {
    ai.y = Math.max(-COURT.HALF_LENGTH + 0.3, Math.min(-0.6, ai.y));
  }

  // Hit Detection for AI
  if (shuttle.inAir && shuttle.lastHitTeam !== ai.team && ai.hitCooldown <= 0) {
    const distToShuttle2D = Math.hypot(ai.x - shuttle.x, ai.y - shuttle.y);
    const reachableZ = shuttle.z >= 0.1 && shuttle.z <= 2.6;

    if (distToShuttle2D < 1.4 && reachableZ) {
      // AI in hitting zone! Choose best tactical shot
      let shot: ShotType = 'clear';
      let isJump = false;
      let aimX = 0;

      // Decide aim direction (exploit empty corners)
      aimX = Math.random() > 0.5 ? 1 : -1;

      if (shuttle.z > 1.8 && Math.abs(ai.y) < 5.0 && Math.random() < smashAggression) {
        // High ball in attack zone: JUMP SMASH!
        shot = 'smash';
        isJump = Math.random() > 0.3 && ai.stamina > 30;
      } else if (Math.abs(ai.y) < 2.5 && shuttle.z < 1.6) {
        // Near net tape: Drop shot or Drive
        shot = Math.random() > 0.4 ? 'drop' : 'drive';
      } else if (ai.stamina < 25) {
        // Low stamina: defensive clear to reset
        shot = 'clear';
      } else {
        // Standard rally selection
        const roll = Math.random();
        if (roll < 0.4) shot = 'clear';
        else if (roll < 0.7) shot = 'drive';
        else shot = 'drop';
      }

      ai.hitCooldown = 0.45;
      const aiPower = 0.74 + Math.random() * 0.08; // Safe calibrated in-bounds power (0.74 - 0.82)
      onAttemptHit(ai, shot, aimX, isJump, aiPower);
    }
  }
}
