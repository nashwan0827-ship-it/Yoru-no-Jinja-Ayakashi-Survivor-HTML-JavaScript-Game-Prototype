import { clamp } from "../core/utils.js";
import { PLAYER_CENTER_Y_OFFSET } from "../state/combatOffsets.js";
import { savePrefsFromState } from "../core/save.js";
import { createDefaultAchievementProgress, getPendingKillMilestoneRewards } from "../data/achievements.js";

const XP_GAIN_MULTIPLIER = 1.2;
const KAGEBOSHI_ANIM_FPS = 7;
const KAGEBOSHI_ATTACK_FRAME = 7;

export function stepEnemies(state, hud, audio, dt) {
  const p = state.player;
  const centerY = p.y + PLAYER_CENTER_Y_OFFSET;
  stepHostileProjectiles(state, audio, dt, p.x, centerY);

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];

    if (!e.isBoss && Number.isFinite(e.lifeTime)) {
      e.age = (e.age ?? 0) + dt;

      if (e.age >= e.lifeTime) {
        state.fx.push({
          t: 0,
          dur: 0.18,
          kind: "burst",
          x: e.x,
          y: e.y,
          color: "#cfefff",
          alphaMul: 0.9,
        });
        state.enemies.splice(i, 1);
        continue;
      }
    }

    e.stunTimer = Math.max(0, (e.stunTimer ?? 0) - dt);
    e.freezeTimer = Math.max(0, (e.freezeTimer ?? 0) - dt);
    e.slowTimer = Math.max(0, (e.slowTimer ?? 0) - dt);
    if (e.slowTimer <= 0) e.slowMultiplier = 1;
    const stunned = e.stunTimer > 0 || e.freezeTimer > 0;
    const speedMul = e.slowTimer > 0 ? clamp(e.slowMultiplier ?? 1, 0.1, 1) : 1;
    const move = getEnemyMove(state, e, p.x, centerY, dt, audio);
    const contactDx = move.toPlayerX;
    const contactDy = move.toPlayerY;

    e.face = move.face;

    if (e.knock > 0 && !e.noKnock) {
      e.x -= contactDx * e.knock * dt;
      e.y -= contactDy * e.knock * dt;
      e.knock = Math.max(0, e.knock - 260 * dt);
    } else if (stunned) {
      e.knock = Math.max(0, e.knock - 260 * dt);
    } else {
      e.x += move.vx * speedMul * dt;
      e.y += move.vy * speedMul * dt;
    }

    const rr = p.r + e.r;
    if (Math.hypot(p.x - e.x, centerY - e.y) < rr && p.iFrames <= 0) {
      if (state.debug?.invincible) {
        p.iFrames = Math.max(p.iFrames, 0.1);
      } else {
        p.hp -= e.dmg;
        p.iFrames = 0.55;
        audio.SE.hit();
        state.fx.push({ t: 0, dur: 0.18, kind: "hit", x: p.x, y: centerY });

        if (p.hp <= 0) {
          state._shouldGameOver = true;
        }
      }
    }

    if (e._killedByOfuda) {
      killEnemy(state, hud, audio, e, true);
      state.enemies.splice(i, 1);
      continue;
    }

    if (e.hp <= 0) {
      killEnemy(state, hud, audio, e, false);
      state.enemies.splice(i, 1);
      continue;
    }
  }
}

function getEnemyMove(state, e, playerX, playerY, dt, audio) {
  let dx = playerX - e.x;
  let dy = playerY - e.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;

  if (e.isBoss) {
    return stepBossMove(state, e, dx, dy, d, dt, playerX, playerY, audio);
  }

  if (e.type === 6) {
    return stepBoarMove(e, dx, dy, d, dt);
  }

  if (e.type === 7 || e.type === 8) {
    stepKageboshiAttack(state, e, dx, dy, d, dt);
    if (d <= (e.attackRange ?? 460)) {
      return {
        vx: 0,
        vy: 0,
        face: dx < 0 ? -1 : 1,
        toPlayerX: dx,
        toPlayerY: dy,
      };
    }
  }

  if (e.type === 4 && Number.isFinite(e.fastRushDirX) && Number.isFinite(e.fastRushDirY)) {
    const rushX = e.fastRushDirX;
    const rushY = e.fastRushDirY;
    return {
      vx: rushX * (e.fastRushSpeed ?? e.spd * 2.4),
      vy: rushY * (e.fastRushSpeed ?? e.spd * 2.4),
      face: rushX < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  return {
    vx: dx * e.spd,
    vy: dy * e.spd,
    face: dx < 0 ? -1 : 1,
    toPlayerX: dx,
    toPlayerY: dy,
  };
}

function stepKageboshiAttack(state, e, dirX, dirY, dist, dt) {
  e.rangedAttackTimer = Math.max(0, (e.rangedAttackTimer ?? e.attackInterval ?? 2.2) - dt);
  if (dist > (e.attackRange ?? 460) || e.rangedAttackTimer > 0) return;

  const frameCount = 8;
  const frame = Math.floor((state.timeSurvived ?? 0) * KAGEBOSHI_ANIM_FPS) % frameCount;
  if (frame !== KAGEBOSHI_ATTACK_FRAME) return;

  e.rangedAttackTimer = e.attackInterval ?? 2.2;
  state.hostileProjectiles ??= [];
  const speed = e.projectileSpeed ?? 235;
  state.hostileProjectiles.push({
    kind: "kageboshiOrb",
    x: e.x + dirX * ((e.r ?? 18) + 12),
    y: e.y + dirY * ((e.r ?? 18) + 12),
    vx: dirX * speed,
    vy: dirY * speed,
    speed,
    turnRate: 0,
    r: e.projectileRadius ?? 10,
    dmg: e.projectileDamage ?? Math.max(1, Math.round((e.dmg ?? 12) * 0.78)),
    life: 3.0,
    color: e.projectileColor ?? "#8c65ff",
  });
  state.fx.push({
    t: 0,
    dur: 0.14,
    kind: "burst",
    x: e.x + dirX * 24,
    y: e.y + dirY * 24,
    color: e.projectileColor ?? "#8c65ff",
    alphaMul: 0.9,
  });
}

function stepBossMove(state, e, dx, dy, dist, dt, playerX, playerY, audio) {
  const enraged = e.hp <= e.hpMax * 0.5;
  e.bossPhase = enraged ? 1 : 0;
  e.bossState = e.bossState ?? "idle";
  e.bossTimer = Math.max(0, e.bossTimer ?? 0);
  e.bossDashCooldown = Math.max(0, (e.bossDashCooldown ?? 0) - dt);
  e.bossShockwaveCooldown = Math.max(0, (e.bossShockwaveCooldown ?? 0) - dt);
  e.bossBeamCooldown = Math.max(0, (e.bossBeamCooldown ?? 0) - dt);
  e.bossHomingCooldown = Math.max(0, (e.bossHomingCooldown ?? 0) - dt);

  const baseSpd = enraged ? (e.bossEnrageSpd ?? e.spd * 1.18) : e.spd;
  const recoverSpd = baseSpd * 0.38;
  const dashSpd = enraged ? (e.bossRushSpeedEnraged ?? baseSpd * 4.6) : (e.bossRushSpeed ?? baseSpd * 3.9);
  const shockwaveRadius = enraged ? (e.bossShockwaveRadiusEnraged ?? 150) : (e.bossShockwaveRadius ?? 120);
  const beamWidth = enraged ? (e.bossBeamWidthEnraged ?? 34) : (e.bossBeamWidth ?? 26);
  const beamLength = e.bossBeamLength ?? 380;
  e.bossShockwaveDrawRadius = shockwaveRadius;
  e.bossBeamDrawWidth = beamWidth;
  e.bossBeamDrawLength = beamLength;

  if (e.bossState === "rush") {
    e.bossTimer -= dt;
    if (e.bossTimer <= 0) {
      e.bossState = "recover";
      e.bossTimer = enraged ? (e.bossRecoverDurEnraged ?? 0.42) : (e.bossRecoverDur ?? 0.34);
      e.bossDashCooldown = enraged ? 2.3 : 3.0;
    }
    return {
      vx: (e.bossDashDirX ?? dx) * dashSpd,
      vy: (e.bossDashDirY ?? dy) * dashSpd,
      face: (e.bossDashDirX ?? dx) < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.bossState === "beamFire") {
    e.bossTimer -= dt;
    if (e.bossTimer <= 0) {
      e.bossState = "recover";
      e.bossTimer = enraged ? 0.48 : 0.4;
    }
    return {
      vx: 0,
      vy: 0,
      face: (e.bossBeamDirX ?? dx) < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.bossState === "beamAim") {
    e.bossTimer -= dt;
    if (e.bossTimer <= 0) {
      e.bossState = "beamFire";
      e.bossTimer = enraged
        ? (e.bossBeamFireDurEnraged ?? 0.24)
        : (e.bossBeamFireDur ?? 0.18);
      triggerBossBeam(state, e, playerX, playerY, beamLength, beamWidth, audio);
      state.fx.push({
        t: 0,
        dur: 0.18,
        kind: "burst",
        x: e.x + (e.bossBeamDirX ?? dx) * 42,
        y: e.y + (e.bossBeamDirY ?? dy) * 42,
        color: e.bossPhase >= 1 ? "#ff8fbf" : "#c9f2ff",
        alphaMul: 1.25,
      });
    }
    return {
      vx: 0,
      vy: 0,
      face: (e.bossBeamDirX ?? dx) < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.bossState === "shockwave") {
    e.bossTimer -= dt;
    if (e.bossTimer <= 0) {
      e.bossState = "recover";
      e.bossTimer = enraged ? 0.52 : 0.44;
    }
    return {
      vx: 0,
      vy: 0,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.bossState === "recover") {
    e.bossTimer -= dt;
    if (e.bossTimer <= 0) {
      e.bossState = "idle";
    }
    return {
      vx: dx * recoverSpd,
      vy: dy * recoverSpd,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.bossBeamCooldown <= 0 && dist <= (enraged ? 310 : 280)) {
    e.bossBeamDirX = dx;
    e.bossBeamDirY = dy;
    e.bossState = "beamAim";
    e.bossTimer = enraged
      ? (e.bossBeamAimDurEnraged ?? 0.5)
      : (e.bossBeamAimDur ?? 0.64);
    e.bossBeamAimTotal = e.bossTimer;
    e.bossBeamCooldown = enraged ? 4.8 : 6.2;
    state.fx.push({
      t: 0,
      dur: Math.min(0.24, e.bossTimer),
      kind: "burst",
      x: e.x + dx * 34,
      y: e.y + dy * 34,
      color: e.bossPhase >= 1 ? "#ff8fbf" : "#c9f2ff",
      alphaMul: 0.9,
    });
    return {
      vx: 0,
      vy: 0,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.bossShockwaveCooldown <= 0 && dist <= (enraged ? 126 : 110)) {
    e.bossState = "shockwave";
    e.bossTimer = enraged ? 0.22 : 0.18;
    e.bossShockwaveCooldown = enraged ? 4.0 : 5.0;
    triggerBossShockwave(state, e, playerX, playerY, shockwaveRadius, audio);
    return {
      vx: 0,
      vy: 0,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.bossDashCooldown <= 0 && dist <= (enraged ? 236 : 204)) {
    e.bossDashDirX = dx;
    e.bossDashDirY = dy;
    e.bossState = "rush";
    e.bossTimer = enraged ? (e.bossRushDurEnraged ?? 0.4) : (e.bossRushDur ?? 0.32);
    state.fx.push({
      t: 0,
      dur: 0.16,
      kind: "burst",
      x: e.x,
      y: e.y,
      color: "#ffd0c2",
      alphaMul: 1.4,
    });
    return {
      vx: dx * dashSpd,
      vy: dy * dashSpd,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  const homingRange = enraged ? (e.bossHomingRange ?? 640) * 1.1 : (e.bossHomingRange ?? 640);
  if (e.bossHomingCooldown <= 0 && dist <= homingRange && dist >= 170) {
    fireBossHomingProjectiles(state, e, dx, dy, enraged);
    e.bossHomingCooldown = enraged ? 1.55 : 2.15;
    return {
      vx: dx * baseSpd * 0.2,
      vy: dy * baseSpd * 0.2,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  const strafe = Math.sin((state.timeSurvived ?? 0) * (enraged ? 3.8 : 3.1) + e.x * 0.01) * 0.28;
  const tx = -dy;
  const ty = dx;
  const moveX = dx * 0.94 + tx * strafe;
  const moveY = dy * 0.94 + ty * strafe;
  const ml = Math.hypot(moveX, moveY) || 1;

  return {
    vx: (moveX / ml) * baseSpd,
    vy: (moveY / ml) * baseSpd,
    face: dx < 0 ? -1 : 1,
    toPlayerX: dx,
    toPlayerY: dy,
  };
}

function fireBossHomingProjectiles(state, e, dirX, dirY, enraged) {
  state.hostileProjectiles ??= [];
  const count = enraged ? 2 : 1;
  const spread = enraged ? 0.26 : 0;
  const baseAngle = Math.atan2(dirY, dirX);

  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i - 0.5) * spread;
    const angle = baseAngle + offset;
    const speed = (e.bossHomingSpeed ?? 235) * (enraged ? 1.08 : 1);
    state.hostileProjectiles.push({
      kind: "bossHoming",
      x: e.x + Math.cos(angle) * (e.r * 0.62),
      y: e.y + Math.sin(angle) * (e.r * 0.62),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      turnRate: (e.bossHomingTurnRate ?? 2.4) * (enraged ? 1.15 : 1),
      r: enraged ? 13 : 11,
      dmg: Math.max(1, Math.round(e.dmg * (e.bossHomingDamageMul ?? 0.42))),
      life: enraged ? 3.4 : 3.1,
      age: 0,
      color: enraged ? "#ff75b8" : "#99ecff",
    });
  }

  state.fx.push({
    t: 0,
    dur: 0.16,
    kind: "burst",
    x: e.x + dirX * 42,
    y: e.y + dirY * 42,
    color: enraged ? "#ff75b8" : "#99ecff",
    alphaMul: 1.05,
  });
}

function stepHostileProjectiles(state, audio, dt, playerX, playerY) {
  const projectiles = state.hostileProjectiles ?? [];
  state.hostileProjectiles = projectiles;
  const p = state.player;

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const shot = projectiles[i];
    shot.age = (shot.age ?? 0) + dt;
    shot.life -= dt;
    if (shot.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    const speed = shot.speed ?? (Math.hypot(shot.vx, shot.vy) || 220);
    if ((shot.turnRate ?? 0) > 0) {
      const desired = Math.atan2(playerY - shot.y, playerX - shot.x);
      const current = Math.atan2(shot.vy, shot.vx);
      const maxTurn = (shot.turnRate ?? 0) * dt;
      const nextAngle = current + clampAngle(desired - current, -maxTurn, maxTurn);
      shot.vx = Math.cos(nextAngle) * speed;
      shot.vy = Math.sin(nextAngle) * speed;
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;

    if (tryBlockHostileProjectileWithOrbit(state, shot)) {
      projectiles.splice(i, 1);
      continue;
    }

    if (Math.hypot(playerX - shot.x, playerY - shot.y) >= (p.r ?? 10) + (shot.r ?? 10)) {
      continue;
    }

    projectiles.splice(i, 1);
    state.fx.push({
      t: 0,
      dur: 0.16,
      kind: "burst",
      x: shot.x,
      y: shot.y,
      color: shot.color,
      alphaMul: 1.2,
    });

    if (p.iFrames > 0) continue;
    if (state.debug?.invincible) {
      p.iFrames = Math.max(p.iFrames, 0.1);
      continue;
    }

    p.hp -= shot.dmg ?? 1;
    p.iFrames = 0.45;
    audio?.SE?.hit?.();
    state.fx.push({ t: 0, dur: 0.18, kind: "hit", x: p.x, y: playerY });
    if (p.hp <= 0) {
      state._shouldGameOver = true;
    }
  }
}

function tryBlockHostileProjectileWithOrbit(state, shot) {
  const info = state._orbitInfo;
  if (!info?.blocksHostileProjectiles || (info.count ?? 0) <= 0) return false;

  const p = state.player;
  const count = Math.max(1, Math.round(info.count ?? 1));
  const centerY = p.y + (info.centerYOffset ?? PLAYER_CENTER_Y_OFFSET);
  const blockRadius = 18 * (info.sizeMul ?? 1) + (shot.r ?? 8);

  for (let i = 0; i < count; i++) {
    const ang = (info.angle ?? 0) + ((Math.PI * 2) / count) * i;
    const ox = p.x + Math.cos(ang) * (info.r ?? 0);
    const oy = centerY + Math.sin(ang) * (info.r ?? 0);
    if (Math.hypot(shot.x - ox, shot.y - oy) > blockRadius) continue;

    state.fx.push({
      t: 0,
      dur: 0.16,
      kind: "burst",
      x: shot.x,
      y: shot.y,
      color: shot.color ?? "#99ecff",
      alphaMul: 1.1,
      radius: 24,
    });
    state.fx.push({
      t: 0,
      dur: 0.12,
      kind: "spark",
      x: ox,
      y: oy,
    });
    return true;
  }

  return false;
}

function clampAngle(value, min, max) {
  let angle = ((value + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (angle < -Math.PI) angle += Math.PI * 2;
  return clamp(angle, min, max);
}

function triggerBossShockwave(state, e, playerX, playerY, radius, audio) {
  state.fx.push({
    t: 0,
    dur: 0.28,
    kind: "ring",
    x: e.x,
    y: e.y,
    R: radius,
    color: e.bossPhase >= 1 ? "#ff8f8f" : "#ffd7c7",
    alphaMul: e.bossPhase >= 1 ? 1.7 : 1.35,
  });
  state.fx.push({
    t: 0,
    dur: 0.22,
    kind: "burst",
    x: e.x,
    y: e.y,
    color: e.bossPhase >= 1 ? "#ff8a8a" : "#fff1ea",
    alphaMul: 1.2,
  });

  const p = state.player;
  const dist = Math.hypot(playerX - e.x, playerY - e.y);
  if (dist > radius + p.r || p.iFrames > 0) return;

  if (state.debug?.invincible) {
    p.iFrames = Math.max(p.iFrames, 0.1);
    return;
  }

  const dmg = Math.round(e.dmg * 0.75);
  p.hp -= dmg;
  p.iFrames = 0.55;
  audio?.SE?.hit?.();
  state.fx.push({ t: 0, dur: 0.18, kind: "hit", x: p.x, y: playerY });
  if (p.hp <= 0) {
    state._shouldGameOver = true;
  }
}

function triggerBossBeam(state, e, playerX, playerY, length, width, audio) {
  const p = state.player;
  const dirX = e.bossBeamDirX ?? 1;
  const dirY = e.bossBeamDirY ?? 0;
  const originX = e.x + dirX * (e.r * 0.6);
  const originY = e.y + dirY * (e.r * 0.6);
  const endX = originX + dirX * length;
  const endY = originY + dirY * length;

  state.fx.push({
    t: 0,
    dur: 0.14,
    kind: "screenFlash",
    color: e.bossPhase >= 1 ? "rgba(255,180,210,1)" : "rgba(215,245,255,1)",
    alphaMul: 0.12,
  });

  if (p.iFrames > 0) return;

  const hitDist = distancePointToSegment(playerX, playerY, originX, originY, endX, endY);
  if (hitDist > width + p.r) return;

  if (state.debug?.invincible) {
    p.iFrames = Math.max(p.iFrames, 0.1);
    return;
  }

  const dmg = Math.round(e.dmg * 1.1);
  p.hp -= dmg;
  p.iFrames = 0.55;
  audio?.SE?.hit?.();
  state.fx.push({ t: 0, dur: 0.18, kind: "hit", x: p.x, y: playerY });
  if (p.hp <= 0) {
    state._shouldGameOver = true;
  }
}

function distancePointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 0.0001) return Math.hypot(px - ax, py - ay);

  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function stepBoarMove(e, dx, dy, dist, dt) {
  e.boarCooldown = Math.max(0, (e.boarCooldown ?? 0) - dt);

  if (e.boarState === "charge") {
    e.boarTimer -= dt;
    if (e.boarTimer <= 0) {
      e.boarState = "rush";
      e.boarTimer = e.boarRushDur ?? 0.26;
    }
    return {
      vx: dx * e.spd * 0.18,
      vy: dy * e.spd * 0.18,
      face: (e.boarDashDirX ?? dx) < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.boarState === "rush") {
    e.boarTimer -= dt;
    if (e.boarTimer <= 0) {
      e.boarState = "recover";
      e.boarTimer = e.boarRecoverDur ?? 0.34;
      e.boarCooldown = 1.8 + Math.random() * 1.1;
    }
    return {
      vx: (e.boarDashDirX ?? dx) * (e.boarRushSpeed ?? e.spd * 3.35),
      vy: (e.boarDashDirY ?? dy) * (e.boarRushSpeed ?? e.spd * 3.35),
      face: (e.boarDashDirX ?? dx) < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.boarState === "recover") {
    e.boarTimer -= dt;
    if (e.boarTimer <= 0) {
      e.boarState = "idle";
    }
    return {
      vx: dx * e.spd * 0.42,
      vy: dy * e.spd * 0.42,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  if (e.boarCooldown <= 0 && dist <= (e.boarTriggerRange ?? 220)) {
    e.boarState = "charge";
    e.boarTimer = e.boarChargeDur ?? 0.56;
    e.boarDashDirX = dx;
    e.boarDashDirY = dy;
    return {
      vx: dx * e.spd * 0.12,
      vy: dy * e.spd * 0.12,
      face: dx < 0 ? -1 : 1,
      toPlayerX: dx,
      toPlayerY: dy,
    };
  }

  return {
    vx: dx * e.spd,
    vy: dy * e.spd,
    face: dx < 0 ? -1 : 1,
    toPlayerX: dx,
    toPlayerY: dy,
  };
}

export function killEnemy(state, hud, audio, e, fromOfuda = false) {
  if (e.isBoss) {
    state.bossActive = false;
    state._bossDefeatedPending = true;
    state._lastDefeatedBossName = e.name || "\u3069\u306b\u3083";
    if (Array.isArray(state.hostileProjectiles)) state.hostileProjectiles.length = 0;
  }

  state.score += e.isBoss ? 2000 : 100;
  audio.SE.kill();

  const amount = Math.max(
    1,
    Math.round((e.isBoss ? 60 : fromOfuda ? 7 : 5) * XP_GAIN_MULTIPLIER),
  );

  if (e.isBoss) {
    const n = 8;
    for (let k = 0; k < n; k++) {
      state.drops.push({
        x: e.x,
        y: e.y,
        r: 6,
        xp: Math.max(1, Math.floor(amount / n)),
        vx: (Math.random() * 2 - 1) * 40,
        vy: (Math.random() * 2 - 1) * 40,
      });
    }
    state.fx.push({
      t: 0,
      dur: 0.42,
      kind: "burst",
      x: e.x,
      y: e.y,
      color: "#fff1ea",
      alphaMul: 2.1,
    });
    state.fx.push({
      t: 0,
      dur: 0.34,
      kind: "burst",
      x: e.x,
      y: e.y,
      color: "#ff7a7a",
      alphaMul: 1.45,
    });
    state.fx.push({
      t: 0,
      dur: 0.28,
      kind: "ring",
      x: e.x,
      y: e.y,
      R: e.r + 18,
      color: "#ffd7c7",
      alphaMul: 1.9,
    });
    state.fx.push({
      t: 0,
      dur: 0.42,
      kind: "ring",
      x: e.x,
      y: e.y,
      R: e.r + 62,
      color: "#b32727",
      alphaMul: 1.35,
    });
    state.fx.push({
      t: 0,
      dur: 0.16,
      kind: "screenFlash",
      color: "#fff4ee",
      alphaMul: 0.65,
    });
    for (let k = 0; k < 10; k++) {
      const ang = (Math.PI * 2 * k) / 10;
      const dist = e.r + 12 + k * 2;
      state.fx.push({
        t: 0,
        dur: 0.2 + k * 0.01,
        kind: "spark",
        x: e.x + Math.cos(ang) * dist,
        y: e.y + Math.sin(ang) * dist,
      });
    }
  } else {
    state.drops.push({
      x: e.x,
      y: e.y,
      r: 6,
      xp: amount,
      vx: (Math.random() * 2 - 1) * 12,
      vy: (Math.random() * 2 - 1) * 12,
    });
    state.fx.push({ t: 0, dur: 0.22, kind: "burst", x: e.x, y: e.y });
  }

  dropSoulShards(state, e);

  state.kills++;
  grantKillMilestoneRewards(state, hud);
}

function dropSoulShards(state, e) {
  const stageMul = Math.max(1, Math.floor(state.stage ?? 1));
  const rewardMul = getDifficultySoulShardMultiplier(state.selectedDifficultyId);
  const normalDropChance = Math.min(0.5, 0.12 * rewardMul);
  const count = e.isBoss
    ? Math.max(1, Math.round((4 + stageMul * 2) * rewardMul))
    : Math.random() < normalDropChance ? 1 : 0;
  for (let k = 0; k < count; k++) {
    state.drops.push({
      kind: "soulShard",
      x: e.x,
      y: e.y,
      r: 7,
      amount: 1,
      vx: (Math.random() * 2 - 1) * (e.isBoss ? 54 : 22),
      vy: (Math.random() * 2 - 1) * (e.isBoss ? 54 : 22),
    });
  }
}

function grantKillMilestoneRewards(state, hud) {
  const progress = state.achievementProgress ?? createDefaultAchievementProgress();
  const totalKills = Math.max(0, Math.floor(progress.totalKills ?? 0)) + 1;
  progress.totalKills = totalKills;
  state.achievementProgress = progress;

  const rewards = getPendingKillMilestoneRewards(progress, totalKills);
  for (const reward of rewards) {
    progress.rewardedKillMilestones = [...new Set([
      ...(progress.rewardedKillMilestones ?? []),
      reward.kills,
    ])];
    state.soulShards = Math.max(0, Math.floor(state.soulShards ?? 0)) + reward.soulShards;
    state.runSoulShards = Math.max(0, Math.floor(state.runSoulShards ?? 0)) + reward.soulShards;
    hud?.flash?.(`累計${reward.kills}体撃破達成 魂片+${reward.soulShards}`);
  }

  if (rewards.length > 0) {
    window.dispatchEvent(new CustomEvent("soul-shards-changed"));
  }

  if (rewards.length > 0 || totalKills % 10 === 0) {
    savePrefsFromState(state, {
      soulShards: state.soulShards,
      achievementProgress: progress,
    });
    state._lastSavedAchievementTotalKills = totalKills;
  }
}

function getDifficultySoulShardMultiplier(difficultyId) {
  if (difficultyId === "hard") return 3;
  if (difficultyId === "normal") return 2;
  return 1;
}


