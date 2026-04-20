// src/systems/player.js
import { clamp, norm, dist2 } from "../core/utils.js";
import { getWeapon } from "../data/weapons.js";
import { findOwned } from "../data/upgrades.js";
import { STAGE1_TORII_OBJECTS, getToriiCollisionRects } from "../data/stageObjects.js";
import { PLAYER_CENTER_Y_OFFSET } from "../state/combatOffsets.js";
import { recordEnemyDamage } from "./damageStats.js";
import { applyPriorityTargetDamageBonus } from "./priorityTarget.js";

const ORBIT_CENTER_Y_OFFSET = PLAYER_CENTER_Y_OFFSET;
const MAP_EDGE_PUSH = 280;

export function stepPlayer(state, input, hud, audio, dt) {
  updatePlayer(state, input, dt);
  shootAll(state, audio, dt);
  slashTick(state, dt);
  thunderTick(state, dt);
  orbitTick(state, dt);
  auraTick(state, dt);
  // 進化武器
  sakuranamiTick(state, dt);
  raiukkekkaiTick(state, dt);
}

export function getPlayerDamageMultiplier(state) {
  return state.player?.atkMul ?? 1;
}

export function getPlayerAttackSpeedMultiplier(state) {
  return state.player?.aspdMul ?? 1;
}

export function getPlayerRangeMultiplier(state) {
  return state.player?.areaMul ?? 1;
}

function updatePlayer(state, input, dt) {
  const p = state.player;
  let mx = 0;
  let my = 0;

  if (input.down("w") || input.down("arrowup")) my -= 1;
  if (input.down("s") || input.down("arrowdown")) my += 1;
  if (input.down("a") || input.down("arrowleft")) mx -= 1;
  if (input.down("d") || input.down("arrowright")) mx += 1;

  if (input.joystick?.active) {
    mx += input.joystick.x;
    my += input.joystick.y;
  } else if (input.pointer.down && !input.isTouchLike) {
    const cx = input.canvasApi.W / 2;
    const cy = input.canvasApi.H / 2;
    const dx = input.pointer.x - cx;
    const dy = input.pointer.y - cy;
    const L = Math.hypot(dx, dy) || 1;
    mx += dx / L;
    my += dy / L;
  }

  p.moving = !!(mx || my);
  if (mx < -0.001) p.facing = -1;
  if (mx > 0.001) p.facing = 1;

  if (mx || my) {
    [mx, my] = norm(mx, my);
    const moveScale = getMapMoveScale(state, p.x, p.y);
    const move = p.speed * moveScale * dt;
    p.x += mx * move;
    resolveStageObjectCollisions(state, p);
    p.y += my * move;
    resolveStageObjectCollisions(state, p);
  }

  applyMapBoundary(state, p, dt);

  if (p.iFrames > 0) p.iFrames -= dt;

  // リジェネ適用
  if (p.regen > 0) {
    p.hp = clamp(p.hp + p.regen * dt, 0, p.hpMax);
  }
}

function resolveStageObjectCollisions(state, player) {
  if (state.stage !== 1) return;

  for (const obj of STAGE1_TORII_OBJECTS) {
    for (const rect of getToriiCollisionRects(obj)) {
      const hitCircle = { x: player.x, y: player.y + PLAYER_CENTER_Y_OFFSET };
      pushCircleOutOfRect(hitCircle, player.r, rect);
      player.x = hitCircle.x;
      player.y = hitCircle.y - PLAYER_CENTER_Y_OFFSET;
    }
  }
}

function pushCircleOutOfRect(circle, radius, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  let dx = circle.x - nearestX;
  let dy = circle.y - nearestY;
  let distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) return;

  if (distSq <= 0.0001) {
    const left = Math.abs(circle.x - rect.x);
    const right = Math.abs(rect.x + rect.w - circle.x);
    const top = Math.abs(circle.y - rect.y);
    const bottom = Math.abs(rect.y + rect.h - circle.y);
    const min = Math.min(left, right, top, bottom);

    if (min === left) {
      circle.x = rect.x - radius;
    } else if (min === right) {
      circle.x = rect.x + rect.w + radius;
    } else if (min === top) {
      circle.y = rect.y - radius;
    } else {
      circle.y = rect.y + rect.h + radius;
    }
    return;
  }

  const dist = Math.sqrt(distSq);
  const push = radius - dist;
  dx /= dist;
  dy /= dist;
  circle.x += dx * push;
  circle.y += dy * push;
}

function getMapMoveScale(state, x, y) {
  const map = state.map;
  if (!map || map.enabled === false) return 1;

  const dx = x - map.centerX;
  const dy = y - map.centerY;
  const dist = Math.hypot(dx, dy);
  if (dist <= map.slowRadius) return 1;
  if (dist >= map.radius) return 0.08;

  const t = (dist - map.slowRadius) / Math.max(1, map.radius - map.slowRadius);
  return 1 - t * 0.72;
}

function applyMapBoundary(state, player, dt) {
  const map = state.map;
  if (!map || map.enabled === false) return;

  const dx = player.x - map.centerX;
  const dy = player.y - map.centerY;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist <= map.radius) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const overshoot = dist - map.radius;
  const pull = Math.min(overshoot + MAP_EDGE_PUSH * dt, overshoot + 18);
  const nextDist = Math.min(map.radius, dist - pull);
  player.x = map.centerX + nx * nextDist;
  player.y = map.centerY + ny * nextDist;
}

function shootAll(state, audio, dt) {
  const p = state.player;
  if (!p.weapons) return;

  for (const entry of p.weapons) {
    const def = getWeapon(entry.weaponId);
    if (!def || def.weaponType !== "ranged") continue;

    const cdKey = `_fireCD_${entry.weaponId}`;
    p[cdKey] = (p[cdKey] ?? 0) - dt;
    if (p[cdKey] > 0) continue;

    const ws = weaponStats(def, entry.level);
    const target = nearestEnemy(state);
    if (!target) continue;

    p[cdKey] += 1 / Math.max(0.2, ws.fireRate * getPlayerAttackSpeedMultiplier(state));
    if (audio?.SE?.shoot) audio.SE.shoot();

    let dx = target.x - p.x;
    let dy = target.y - p.y;
    [dx, dy] = norm(dx, dy);

    const multi = ws.multi ?? 1;
    const spread = Math.min(0.55, 0.18 + multi * 0.03);
    const angleOffsets = getProjectileAngleOffsets(entry.weaponId, multi, spread);

    for (let i = 0; i < angleOffsets.length; i++) {
      const a = angleOffsets[i];
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const vx = dx * ca - dy * sa;
      const vy = dx * sa + dy * ca;

      if (entry.weaponId === "petal") {
        spawnPetals(
          state,
          p.x + vx * (p.r + 10),
          p.y + vy * (p.r + 10),
          6,
          vx * 260,
          vy * 260,
        );
        state.projectiles.push({
          x: p.x + vx * (p.r + 6),
          y: p.y + vy * (p.r + 6),
          vx: vx * ws.projSpeed,
          vy: vy * ws.projSpeed,
          r: 6,
          dmg: Math.round(ws.dmg),
          pierce: ws.pierce ?? 0,
          life: 1.55,
          kind: "petal",
        });
      } else {
        // 爆符連鎖（blastchain）は爆発フラグ付きで生成
        const isBlastchain = entry.weaponId === "blastchain";
        state.projectiles.push({
          x: p.x + vx * (p.r + 10),
          y: p.y + vy * (p.r + 10),
          vx: vx * (ws.projSpeed * 0.85),
          vy: vy * (ws.projSpeed * 0.85),
          r: isBlastchain ? 13 : 10,
          dmg: Math.round(ws.dmg * 0.95),
          pierce: ws.pierce ?? 0,
          life: isBlastchain ? 1.8 : 1.2,
          kind: isBlastchain ? "blastchain" : "ofuda",
          homing: ws.homing ?? 0,
          rot: Math.atan2(vy, vx),
          spin: (Math.random() * 2 - 1) * 0.18,
          blastRadius: scaleRange(state, ws.blastRadius ?? 0),
          blastDmg: ws.blastDmg ?? 0,
          chainCount: ws.chainCount ?? 0,
          chainRange: scaleRange(state, ws.chainRange ?? 0),
          chainRadius: scaleRange(state, ws.chainRadius ?? 0),
          chainBlastDmg: ws.chainBlastDmg ?? 0,
          chainFalloff: ws.chainFalloff ?? 0.82,
        });
      }
    }
  }
}

function getProjectileAngleOffsets(weaponId, multi, spread) {
  if (multi <= 1) return [0];

  // 起爆札は偶数枚でも中央に1枚通して、狙った敵を抜けにくくする。
  if (weaponId === "ofuda") {
    const offsets = [0];
    for (let step = 1; offsets.length < multi; step++) {
      offsets.push(-spread * step);
      if (offsets.length < multi) offsets.push(spread * step);
    }
    return offsets;
  }

  const offsets = [];
  for (let i = 0; i < multi; i++) {
    offsets.push((i - (multi - 1) / 2) * spread);
  }
  return offsets;
}

export function weaponStats(def, level) {
  const lv = Math.max(1, level);
  const stats = { ...def.base };
  for (let i = 1; i < lv; i++) {
    for (const [k, v] of Object.entries(def.scale ?? {})) {
      if (k === "orbitCount" || k === "count" || k === "chainCount" || k === "multi") {
        stats[k] = (stats[k] ?? 0) + 1;
      } else {
        stats[k] = (stats[k] ?? 1) * v;
      }
    }
  }
  return stats;
}

function scaleDamage(state, dmg) {
  return Math.round(dmg * getPlayerDamageMultiplier(state));
}

function scaleAttackInterval(state, interval) {
  return interval / Math.max(0.1, getPlayerAttackSpeedMultiplier(state));
}

function scaleRange(state, value) {
  return value * getPlayerRangeMultiplier(state);
}

function orbitTick(state, dt) {
  const p = state.player;
  if (!p.weapons) return;

  const entry = findOwned(p, "reppufuda") ?? findOwned(p, "orbit");
  if (!entry) return; // blossomstormはsakuranamiTickで別処理

  const def = getWeapon(entry.weaponId);
  if (!def) return;
  const ws = weaponStats(def, entry.level);

  state._orbitAngle =
    ((state._orbitAngle ?? 0) + ws.orbitSpeed * dt) % (Math.PI * 2);

  const count = Math.round(ws.orbitCount ?? 2);
  const r = scaleRange(state, ws.orbitRadius ?? 60);
  const orbitSizeMul = 1 + (getPlayerRangeMultiplier(state) - 1) * 0.45;
  const centerYOffset = ORBIT_CENTER_Y_OFFSET;
  const hitCD = Array.isArray(state._orbitHitCD) ? state._orbitHitCD : [];

  for (let i = 0; i < count; i++) {
    const ang = state._orbitAngle + ((Math.PI * 2) / count) * i;
    const ox = p.x + Math.cos(ang) * r;
    const oy = p.y + centerYOffset + Math.sin(ang) * r;
    const orbHitCD = hitCD[i] instanceof WeakMap ? hitCD[i] : new WeakMap();
    hitCD[i] = orbHitCD;

    for (const e of state.enemies) {
      if ((orbHitCD.get(e) ?? 0) > 0) continue;
      if (Math.hypot(e.x - ox, e.y - oy) < e.r + 16 * orbitSizeMul) {
        const dmg = applyPriorityTargetDamageBonus(state, e, scaleDamage(state, ws.dmg));
        recordEnemyDamage(state, entry.weaponId, e, dmg);
        e.hp -= dmg;
        if (!e.isBoss) {
          e.knock = Math.min(180, (e.knock || 0) + 80);
        }
        orbHitCD.set(e, ws.hitInterval ?? 0.18);
        state.fx.push({ kind: "burst", t: 0, dur: 0.18, x: ox, y: oy });
        state.fx.push({
          kind: "dmg",
          x: e.x,
          y: e.y - (e.r || 12),
          text: String(dmg),
          t: 0,
          dur: 0.55,
          vy: -38,
          jitter: 0,
        });
      }
    }
  }

  for (const orbHitCD of hitCD) {
    if (!(orbHitCD instanceof WeakMap)) continue;
    for (const e of state.enemies) {
      const remain = orbHitCD.get(e);
      if (typeof remain !== "number") continue;
      const next = remain - dt;
      if (next > 0) orbHitCD.set(e, next);
      else orbHitCD.delete(e);
    }
  }
  state._orbitHitCD = hitCD;
  state._orbitInfo = {
    count,
    r,
    sizeMul: orbitSizeMul,
    angle: state._orbitAngle,
    centerYOffset,
    speedMul: entry.weaponId === "reppufuda" ? 1.35 : 1,
    isRetsusen: entry.weaponId === "reppufuda",
  };
}

function thunderTick(state, dt) {
  const p = state.player;
  if (!p.weapons) return;

  const entry = findOwned(p, "thunder");
  if (!entry) return;

  const def = getWeapon("thunder");
  if (!def) return;

  const ws = weaponStats(def, entry.level);
  const cdKey = "_fireCD_thunder";
  p[cdKey] = (p[cdKey] ?? 0) - dt;
  if (p[cdKey] > 0) return;

  p[cdKey] += scaleAttackInterval(state, ws.interval ?? 1.2);

  const targetRange = scaleRange(state, ws.targetRange ?? 460);
  const targets = nearestEnemiesInRange(
    state,
    Math.max(1, Math.round(ws.count ?? 1)),
    targetRange,
  );
  if (targets.length === 0) return;

  const radius = scaleRange(state, ws.radius ?? 28);
  const radiusSq = radius * radius;
  const baseDmg = scaleDamage(state, ws.dmg);
  const chainCount = Math.max(0, Math.round(ws.chainCount ?? 0));
  const chainRange = scaleRange(state, ws.chainRange ?? 0);
  const chainFalloff = ws.chainFalloff ?? 0.7;
  for (const target of targets) {
    let hitCount = 0;
    const directHits = [];

    for (const e of state.enemies) {
      const dx = e.x - target.x;
      const dy = e.y - target.y;
      if (dx * dx + dy * dy > radiusSq) continue;

      dealThunderDamage(state, e, baseDmg, "thunder");
      directHits.push(e);
      hitCount += 1;
    }

    if (hitCount > 0) {
      const chainedEnemies = new Set(directHits);
      state.fx.push({
        kind: "thunder",
        t: 0,
        dur: 0.16,
        x: target.x,
        y: target.y,
        radius,
        height: ws.height ?? 170,
      });
      state.fx.push({
        kind: "burst",
        t: 0,
        dur: 0.2,
        x: target.x,
        y: target.y,
      });

      for (const source of directHits) {
        chainThunder(state, source, {
          chainCount,
          chainRange,
          chainFalloff,
          baseDmg,
          sourceId: "thunder",
          blocked: chainedEnemies,
        });
      }
    }
  }
}

function slashTick(state, dt) {
  const p = state.player;
  if (!p.weapons) return;

  const entry = findOwned(p, "reppuzan") ?? findOwned(p, "slash");
  if (!entry) return;

  const def = getWeapon(entry.weaponId);
  if (!def) return;

  const ws = weaponStats(def, entry.level);
  const cdKey = "_fireCD_slash";
  p[cdKey] = (p[cdKey] ?? 0) - dt;
  if (p[cdKey] > 0) return;

  const nearest = nearestEnemy(state);
  const facingAngle = nearest
    ? Math.atan2(
        nearest.y - (p.y + PLAYER_CENTER_Y_OFFSET),
        nearest.x - p.x,
      )
    : p.facing < 0
      ? Math.PI
      : 0;
  p[cdKey] += scaleAttackInterval(state, ws.interval ?? 0.7);

  const multi = Math.max(1, Math.round(ws.multi ?? 1));
  const spread = entry.weaponId === "reppuzan" ? 0.18 : 0.12;
  const offsets = getProjectileAngleOffsets(entry.weaponId, multi, spread);

  for (const offset of offsets) {
    const angle = facingAngle + offset;
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const originX = p.x + vx * (p.r + 18);
    const originY = p.y + PLAYER_CENTER_Y_OFFSET + vy * (p.r + 18);
    const speed = ws.projSpeed ?? 720;

    state.projectiles.push({
      x: originX,
      y: originY,
      vx: vx * speed,
      vy: vy * speed,
      r: scaleRange(state, ws.r ?? 18),
      dmg: Math.round(ws.dmg ?? 36),
      pierce: ws.pierce ?? 1,
      life: ws.life ?? 0.62,
      kind: entry.weaponId === "reppuzan" ? "reppuzanSlash" : "slash",
      knock: ws.knock ?? 70,
      rot: angle,
      lifeSteal: ws.lifeSteal ?? 0,
    });
  }
}

function chainThunder(state, source, config) {
  const { chainCount, chainRange, chainFalloff, baseDmg, blocked } = config;
  if (chainCount <= 0 || chainRange <= 0) return;

  const visited = new Set(blocked ?? []);
  visited.add(source);
  let current = source;
  let stepDmg = baseDmg;

  for (let i = 0; i < chainCount; i++) {
    stepDmg = Math.max(1, Math.round(stepDmg * chainFalloff));
    const next = nearestChainEnemy(state, current, visited, chainRange);
    if (!next) break;

    visited.add(next);
    blocked?.add(next);
    dealThunderDamage(state, next, stepDmg, config.sourceId ?? "thunder");
    state.fx.push({
      kind: "thunderChain",
      t: 0,
      dur: 0.12,
      fromX: current.x,
      fromY: current.y,
      toX: next.x,
      toY: next.y,
    });
    state.fx.push({
      kind: "spark",
      t: 0,
      dur: 0.12,
      x: next.x,
      y: next.y,
    });
    current = next;
  }
}

function nearestChainEnemy(state, from, visited, range) {
  let best = null;
  let bestD = range * range;
  for (const e of state.enemies) {
    if (visited.has(e) || e.hp <= 0) continue;
    const d = dist2(from.x, from.y, e.x, e.y);
    if (d <= bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function dealThunderDamage(state, enemy, dmg, sourceId = "thunder") {
  dmg = applyPriorityTargetDamageBonus(state, enemy, dmg);
  recordEnemyDamage(state, sourceId, enemy, dmg);
  enemy.hp -= dmg;
  state.fx.push({
    kind: "dmg",
    x: enemy.x,
    y: enemy.y - (enemy.r || 12),
    text: String(dmg),
    t: 0,
    dur: 0.55,
    vy: -38,
    jitter: 0,
  });
}

function dealAreaThunderDamage(state, centerX, centerY, radius, dmg, sourceId = "thunder") {
  const rr = radius * radius;
  for (const e of state.enemies) {
    const dx = e.x - centerX;
    const dy = e.y - centerY;
    if (dx * dx + dy * dy <= rr) {
      dealThunderDamage(state, e, dmg, sourceId);
    }
  }
}

function ofudaMaybe(state, hud, audio, dt) {
  const p = state.player;
  if (!p.ofudaRate || p.ofudaRate <= 0) return;

  state._ofudaCD = (state._ofudaCD ?? 0) - dt;
  if (state._ofudaCD <= 0) {
    state._ofudaCD += 1 / p.ofudaRate;
    ofudaPulse(state, audio);
  }
}

function ofudaPulse(state, audio) {
  const p = state.player;
  const R = 125;
  for (const e of state.enemies) {
    if (Math.hypot(e.x - p.x, e.y - p.y) <= R) {
      const dmg = applyPriorityTargetDamageBonus(state, e, scaleDamage(state, p.dmg * 0.75));
      recordEnemyDamage(state, "ofuda", e, dmg);
      e.hp -= dmg;
      e.knock = Math.min(180, e.knock + 110);
      if (e.hp <= 0) e._killedByOfuda = true;
    }
  }
}

function auraTick(state, dt) {
  const p = state.player;

  const entry = findOwned(p, "hannekekkai") ?? findOwned(p, "aura");
  let dps;
  let radius;
  let pulseInterval = 0;
  let pulseRadius = 0;
  let pulseDmg = 0;
  let pulseKnock = 0;
  if (entry) {
    const def = getWeapon(entry.weaponId);
    const ws = weaponStats(def, entry.level);
    dps = ws.dps;
    radius = scaleRange(state, ws.radius);
    pulseInterval = ws.pulseInterval ?? 0;
    pulseRadius = scaleRange(state, ws.pulseRadius ?? 0);
    pulseDmg = ws.pulseDmg ?? 0;
    pulseKnock = ws.pulseKnock ?? 0;
  } else if (state.upgrades?.aura) {
    dps = state.upgrades.aura.dps ?? 15;
    radius = state.upgrades.aura.r ?? 90;
  } else {
    return;
  }

  const centerX = p.x;
  const centerY = p.y + ORBIT_CENTER_Y_OFFSET;
  const rr = radius * radius;
  for (const e of state.enemies) {
    const dx = e.x - centerX;
    const dy = e.y - centerY;
    if (dx * dx + dy * dy <= rr) {
      const dmg = applyPriorityTargetDamageBonus(state, e, dps * getPlayerDamageMultiplier(state) * dt);
      recordEnemyDamage(state, entry?.weaponId ?? "aura", e, dmg);
      e.hp -= dmg;
    }
  }

  state._auraFxT = (state._auraFxT ?? 0) - dt;
  if (state._auraFxT <= 0) {
    state._auraFxT = 0.06;
    state.fx.push({
      kind: "ring",
      t: 0,
      dur: 0.12,
      R: radius,
      x: centerX,
      y: centerY,
      color: entry?.weaponId === "hannekekkai" ? "#ff3b3b" : undefined,
      alphaMul: entry?.weaponId === "hannekekkai" ? 1.25 : undefined,
    });
  }

  if (pulseInterval > 0 && pulseRadius > 0 && pulseDmg > 0) {
    state._auraPulseCD = (state._auraPulseCD ?? 0) - dt;
    if (state._auraPulseCD <= 0) {
      state._auraPulseCD += pulseInterval;
      const pulseRR = pulseRadius * pulseRadius;
      for (const e of state.enemies) {
        const dx = e.x - centerX;
        const dy = e.y - centerY;
        if (dx * dx + dy * dy <= pulseRR) {
          const dmg = applyPriorityTargetDamageBonus(state, e, scaleDamage(state, pulseDmg));
          recordEnemyDamage(state, entry?.weaponId ?? "aura", e, dmg);
          e.hp -= dmg;
          if (!e.isBoss) {
            e.knock = Math.min(220, (e.knock || 0) + pulseKnock);
          }
        }
      }
      state.fx.push({
        kind: "ring",
        t: 0,
        dur: 0.24,
        R: pulseRadius,
        x: centerX,
        y: centerY,
        color: "#ff2222",
        alphaMul: 1.4,
      });
      state.fx.push({
        kind: "burst",
        t: 0,
        dur: 0.18,
        x: centerX,
        y: centerY,
        color: "#ff4a4a",
        alphaMul: 1.3,
      });
    }
  } else {
    state._auraPulseCD = 0;
  }
}

function nearestEnemy(state) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    const d = dist2(state.player.x, state.player.y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function nearestEnemies(state, count) {
  return state.enemies
    .slice()
    .sort(
      (a, b) =>
        dist2(state.player.x, state.player.y, a.x, a.y) -
        dist2(state.player.x, state.player.y, b.x, b.y),
    )
    .slice(0, count);
}

function nearestEnemiesInRange(state, count, range) {
  const centerY = state.player.y + PLAYER_CENTER_Y_OFFSET;
  const rangeSq = range * range;
  return state.enemies
    .filter((e) => dist2(state.player.x, centerY, e.x, e.y) <= rangeSq)
    .sort(
      (a, b) =>
        dist2(state.player.x, centerY, a.x, a.y) -
        dist2(state.player.x, centerY, b.x, b.y),
    )
    .slice(0, count);
}

function spawnPetals(state, x, y, amount = 6, dirX = 0, dirY = 0) {
  for (let i = 0; i < amount; i++) {
    const a = (Math.random() * 2 - 1) * Math.PI;
    const sp = 50 + Math.random() * 150;
    state.petals.push({
      x,
      y,
      vx: Math.cos(a) * sp + dirX * 0.25,
      vy: Math.sin(a) * sp + dirY * 0.25,
      r: 1.6 + Math.random() * 1.6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() * 2 - 1) * 10,
      life: 0.35 + Math.random() * 0.4,
      t: 0,
    });
  }
}

// ============================================================
// 進化武器ティック
// ============================================================

// --- 大幣（おおぬさ）: ranged扱い、shootAllで処理 ---
// shootAllは既存のrangedループで大幣も処理する。
// 爆発（blastRadius）はprojectiles.jsのヒット時に起動するため、
// ここではプロジェクタイルに blastDef を埋め込む。
// （shootAllのrangedループ内で大幣専用フラグを付ける）

// --- 桜嵐（blossomstorm）: orbit系の拡張ティック ---
export function sakuranamiTick(state, dt) {
  const p = state.player;
  const entry = findOwned(p, "blossomstorm");
  if (!entry) return;

  const def = getWeapon("blossomstorm");
  const ws = def.base;
  const orbitVisualAngle = state._orbitAngle ?? 0;
  const baseOrbitEntry = findOwned(p, "reppufuda") ?? findOwned(p, "orbit");
  const baseOrbitDef = baseOrbitEntry ? getWeapon(baseOrbitEntry.weaponId) : null;
  const baseOrbitStats = baseOrbitDef ? weaponStats(baseOrbitDef, baseOrbitEntry.level) : null;
  state._orbitInfo = baseOrbitStats
    ? {
        count: Math.round(baseOrbitStats.orbitCount ?? 3),
        r: scaleRange(state, baseOrbitStats.orbitRadius ?? 68),
        sizeMul: 1 + (getPlayerRangeMultiplier(state) - 1) * 0.45,
        angle: orbitVisualAngle,
        centerYOffset: ORBIT_CENTER_Y_OFFSET,
        speedMul: 1,
        isSakura: true,
      }
    : null;

  state._sakuraBurstCD = (state._sakuraBurstCD ?? 0) - dt;
  if (state._sakuraBurstCD > 0) return;

  const spiralInterval = scaleAttackInterval(state, ws.spiralInterval ?? 0.1);
  state._sakuraBurstCD += spiralInterval;
  state._sakuraAngle = ((state._sakuraAngle ?? 0) + (ws.spiralTurnSpeed ?? 8.4) * spiralInterval) % (Math.PI * 2);

  const arms = ws.spiralArms ?? 2;
  const baseAngle = state._sakuraAngle ?? 0;
  for (let i = 0; i < arms; i++) {
    const ang = baseAngle + ((Math.PI * 2) / arms) * i;
    const outwardX = Math.cos(ang);
    const outwardY = Math.sin(ang);
    const tangentX = -outwardY;
    const tangentY = outwardX;
    const speed = ws.projSpeed ?? 350;
    const drift = scaleRange(state, ws.radialDrift ?? 32);
    const spawnR = p.r + 8;
    const jitter = 0.94 + Math.random() * 0.12;
    const vx = (outwardX * speed + tangentX * drift) * jitter;
    const vy = (outwardY * speed + tangentY * drift) * jitter;
    const life =
      (ws.lifeMin ?? 0.82) +
      Math.random() * Math.max(0.01, (ws.lifeMax ?? 0.98) - (ws.lifeMin ?? 0.82));
    const radialSpeed = Math.max(180, speed * 0.95) * jitter;

    state.projectiles.push({
      x: p.x + outwardX * spawnR,
      y: p.y + outwardY * spawnR,
      vx,
      vy,
      r: 5.5,
      dmg: ws.dmg,
      life,
      kind: "sakuraPetal",
      homing: ws.homing ?? 0.03,
      knock: ws.knock ?? 32,
      rot: Math.atan2(vy, vx),
      spin: (Math.random() * 2 - 1) * 0.9,
      sakuraAngle: ang,
      sakuraRadius: spawnR,
      sakuraRadialSpeed: radialSpeed,
      sakuraTurnSpeed: (ws.spiralTurnSpeed ?? 8.4) * (1.75 + Math.random() * 0.2),
      sakuraDir: i % 2 === 0 ? 1 : -1,
    });

    spawnPetals(
      state,
      p.x + outwardX * (p.r + 6),
      p.y + outwardY * (p.r + 6),
      2,
      vx * 0.25,
      vy * 0.25,
    );
  }
}

// --- 雷雨結界（raiukekkai）: 画面内全域に高頻度落雷 ---
export function raiukkekkaiTick(state, dt) {
  const p = state.player;
  const entry = findOwned(p, "raiukekkai");
  if (!entry) return;

  const def = getWeapon("raiukekkai");
  const ws = def.base;

  // 継続ダメージ（近接オーラ：狭い範囲のみ、おまけ程度）
  const centerX = p.x;
  const centerY = p.y + ORBIT_CENTER_Y_OFFSET;
  const auraRadius = scaleRange(state, ws.auraRadius);
  const auraRR = auraRadius * auraRadius;
  for (const e of state.enemies) {
    const dx = e.x - centerX;
    const dy = e.y - centerY;
    if (dx * dx + dy * dy <= auraRR) {
      const dmg = applyPriorityTargetDamageBonus(state, e, ws.dps * getPlayerDamageMultiplier(state) * dt);
      recordEnemyDamage(state, "raiukekkai", e, dmg);
      e.hp -= dmg;
      e._shocked = Math.min((e._shocked ?? 0) + dt * 1.5, ws.shockDuration);
    }
  }

  // 近接オーラの補助リング描画は出さない
  state._auraFxT = 0;

  // ★ 落雷ストライク：プレイヤー周囲の可視範囲内からランダム選択
  state._raiuCD = (state._raiuCD ?? 0) - dt;
  if (state._raiuCD <= 0) {
    state._raiuCD = scaleAttackInterval(state, ws.strikeInterval);

    if (state.enemies.length === 0) return;

    const strikeRange = scaleRange(state, ws.strikeRange ?? 460);
    const strikeRangeSq = strikeRange * strikeRange;
    const pool = state.enemies.filter((e) => {
      const dx = e.x - centerX;
      const dy = e.y - centerY;
      return dx * dx + dy * dy <= strikeRangeSq;
    });
    if (pool.length === 0) return;

    // 可視範囲内の敵からstrikeCount体をランダムに選ぶ（重複なし）
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const targets = pool.slice(0, ws.strikeCount);

    for (const e of targets) {
      // 感電中は2倍ダメージ（爽快感アップ）
      const shocked = (e._shocked ?? 0) > 0;
      const bonus = shocked ? 1.25 : 1.0;
      const dmg = scaleDamage(state, ws.strikeDmg * bonus);
      const displayDmg = applyPriorityTargetDamageBonus(state, e, dmg);

      // 範囲ダメージ
      dealAreaThunderDamage(state, e.x, e.y, scaleRange(state, ws.strikeRadius), dmg, "raiukekkai");

      e._shocked = ws.shockDuration; // 落雷で感電を更新

      // 落雷エフェクト（高さを大きく）
      state.fx.push({
        kind: "thunder",
        t: 0,
        dur: 0.18,
        x: e.x,
        y: e.y,
        radius: scaleRange(state, ws.strikeRadius),
        height: 200,
        variant: "shiden",
      });
      // 感電中なら追加チェーン演出
      if (shocked) {
        state.fx.push({ kind: "burst", t: 0, dur: 0.22, x: e.x, y: e.y });
        state.fx.push({ kind: "spark", t: 0, dur: 0.18, x: e.x, y: e.y });
      }
      state.fx.push({
        kind: "dmg",
        x: e.x,
        y: e.y - (e.r ?? 12),
        text: shocked ? `⚡${displayDmg}` : String(displayDmg),
        t: 0,
        dur: 0.6,
        vy: -45,
        jitter: 0,
      });

      // 遷移ダメージ（連鎖）
      chainThunder(state, e, {
        chainCount: ws.chainCount,
        chainRange: scaleRange(state, ws.chainRange),
        chainFalloff: ws.chainFalloff,
        baseDmg: dmg,
        sourceId: "raiukekkai",
        blocked: new Set([e]), // メインターゲットをブロック
      });
    }
  }

  // 感電タイマー減算
  for (const e of state.enemies) {
    if ((e._shocked ?? 0) > 0) {
      e._shocked = Math.max(0, e._shocked - dt);
    }
  }
}

