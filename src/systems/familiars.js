import { getFamiliar } from "../data/familiars.js";
import { killEnemy } from "./enemies.js";
import { recordEnemyDamage } from "./damageStats.js";
import { getPlayerDamageMultiplier } from "./player.js";
import { PLAYER_CENTER_Y_OFFSET } from "../state/combatOffsets.js";
import {
  PRIORITY_TARGET_FAMILIAR_ID,
  applyPriorityTargetDamageBonus,
  clearPriorityTarget,
  updatePriorityTarget,
} from "./priorityTarget.js";

const DEFAULT_FAMILIAR_ID = "familiar_shikigami";

export function stepFamiliars(state, hud, audio, dt) {
  state.activeFamiliars ??= [];
  ensureActiveFamiliars(state);
  updateFamiliarAirstrikes(state, hud, audio);
  updateFamiliarStrikeHazards(state, hud, audio);
  if (!hasPriorityTargetSupportFamiliar(state)) {
    clearPriorityTarget(state);
  }

  for (let i = state.activeFamiliars.length - 1; i >= 0; i--) {
    const familiar = state.activeFamiliars[i];
    const def = getFamiliar(familiar.id);
    if (!def) {
      state.activeFamiliars.splice(i, 1);
      continue;
    }

    updatePriorityTarget(state, familiar, def, dt);
    if (updateFamiliarTackle(state, hud, audio, familiar, def, dt)) continue;
    updateFamiliarMovement(state, familiar, def, dt);
    updateFamiliarAttack(state, hud, audio, familiar, def, dt);
  }
}

function ensureActiveFamiliars(state) {
  const progress = state.familiarProgress;
  const equippedId =
    progress?.equippedFamiliarId === undefined
      ? DEFAULT_FAMILIAR_ID
      : progress.equippedFamiliarId;
  if (!equippedId) {
    state.activeFamiliars.length = 0;
    return;
  }

  const unlocked = progress?.unlockedFamiliars;
  if (!unlocked?.includes(equippedId)) {
    state.activeFamiliars.length = 0;
    return;
  }

  const def = getFamiliar(equippedId);
  if (!def) {
    state.activeFamiliars.length = 0;
    return;
  }

  const maxCount = getFamiliarMaxCount(state, def, progress);
  const currentCount = state.activeFamiliars.filter((familiar) => familiar.id === equippedId).length;
  for (let i = currentCount; i < maxCount; i++) {
    state.activeFamiliars.push(createRuntimeFamiliar(state, def, i));
  }

  let keptCount = 0;
  for (let i = state.activeFamiliars.length - 1; i >= 0; i--) {
    const familiar = state.activeFamiliars[i];
    if (familiar.id !== equippedId) {
      state.activeFamiliars.splice(i, 1);
      continue;
    }

    keptCount += 1;
    if (keptCount > maxCount) {
      state.activeFamiliars.splice(i, 1);
    }
  }
}

function hasPriorityTargetSupportFamiliar(state) {
  return (state.activeFamiliars ?? []).some((familiar) => {
    const def = getFamiliar(familiar.id);
    return def?.id === PRIORITY_TARGET_FAMILIAR_ID && def.attackStyle === "priority_target_support";
  });
}

function createRuntimeFamiliar(state, def, index) {
  const p = state.player;
  const angle = (Math.PI * 2 * (index + 0.2)) / Math.max(1, def.maxCount ?? 1);
  const radius = (def.followRadius ?? 150) * 0.58;
  const x = p.x + Math.cos(angle) * radius;
  const y = p.y + PLAYER_CENTER_Y_OFFSET + Math.sin(angle) * radius;

  return {
    id: def.id,
    x,
    y,
    targetX: x,
    targetY: y,
    retargetTimer: 0,
    attackTimer: 0.25,
    slotIndex: index,
    orbitAngle: angle,
    targetScanTimer: 0,
    pickupRadius: def.pickupRadius ?? 42,
    magnetRadius: def.magnetRadius ?? 115,
    bobSeed: Math.random() * Math.PI * 2,
    speedMul: rand(def.speedMinMul ?? 0.8, def.speedMaxMul ?? 1.2),
  };
}

function updateFamiliarTackle(state, hud, audio, familiar, def, dt) {
  const tackle = familiar.tackle;
  if (!tackle) return false;

  tackle.t += dt;
  const progress = Math.min(1, tackle.t / Math.max(0.001, tackle.dur));
  const eased = 1 - (1 - progress) * (1 - progress);
  familiar.x = tackle.startX + (tackle.endX - tackle.startX) * eased;
  familiar.y = tackle.startY + (tackle.endY - tackle.startY) * eased;
  familiar.targetX = tackle.endX;
  familiar.targetY = tackle.endY;

  const hitSet = tackle.hitSet ?? new WeakSet();
  tackle.hitSet = hitSet;
  const radiusSq = (tackle.radius ?? 30) ** 2;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.hp <= 0 || hitSet.has(enemy)) continue;
    const dx = enemy.x - familiar.x;
    const dy = enemy.y - familiar.y;
    if (dx * dx + dy * dy > radiusSq) continue;

    hitSet.add(enemy);
    const damage = applyPriorityTargetDamageBonus(state, enemy, tackle.damage);
    recordEnemyDamage(state, familiar.id, enemy, damage);
    enemy.hp -= damage;
    if (!enemy.isBoss) {
      enemy.knock = Math.min(180, (enemy.knock || 0) + (def.tackleKnock ?? 120));
    }
    state.fx.push({
      kind: "dmg",
      x: enemy.x,
      y: enemy.y - (enemy.r || 12),
      text: String(damage),
      t: 0,
      dur: 0.42,
      vy: -34,
      jitter: 0,
    });
    state.fx.push({
      kind: "ring",
      x: enemy.x,
      y: enemy.y,
      R: 24,
      t: 0,
      dur: 0.16,
      color: "#ffd49c",
      alphaMul: 1.1,
    });

    if (enemy.hp <= 0) {
      killEnemy(state, hud, audio, enemy, false);
      state.enemies.splice(i, 1);
    }
  }

  if (progress >= 1) {
    familiar.tackle = null;
    familiar.retargetTimer = 0;
  }
  return true;
}

function updateFamiliarMovement(state, familiar, def, dt) {
  if (def.moveStyle === "free_fly_near_player") {
    updateFamiliarFreeFlightMovement(state, familiar, def, dt);
    return;
  }

  if (def.moveStyle === "orbit_above_player") {
    updateFamiliarOrbitMovement(state, familiar, def, dt);
    return;
  }

  const p = state.player;
  const anchorX = p.x;
  const anchorY = p.y + PLAYER_CENTER_Y_OFFSET;
  const dx = anchorX - familiar.x;
  const dy = anchorY - familiar.y;
  const dist = Math.hypot(dx, dy);

  familiar.retargetTimer -= dt;
  if (dist > (def.returnRadius ?? 250)) {
    familiar.targetX = anchorX + dx * -0.18;
    familiar.targetY = anchorY + dy * -0.18;
    familiar.retargetTimer = Math.min(familiar.retargetTimer, 0.18);
  } else if (familiar.retargetTimer <= 0) {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(34, def.followRadius ?? 150);
    familiar.targetX = anchorX + Math.cos(angle) * radius;
    familiar.targetY = anchorY + Math.sin(angle) * radius;
    familiar.retargetTimer = def.retargetInterval ?? 0.8;
  }

  const toTargetX = familiar.targetX - familiar.x;
  const toTargetY = familiar.targetY - familiar.y;
  const targetDist = Math.hypot(toTargetX, toTargetY);
  if (targetDist <= 2) return;

  const baseSpeed = (p.speed ?? 220) * (familiar.speedMul ?? 1);
  const drift = Math.sin((state.timeSurvived ?? 0) * 4.2 + familiar.bobSeed) * 0.12;
  const nx = toTargetX / targetDist;
  const ny = toTargetY / targetDist;
  const sideX = -ny * drift;
  const sideY = nx * drift;
  const step = Math.min(targetDist, baseSpeed * dt);

  familiar.x += (nx + sideX) * step;
  familiar.y += (ny + sideY) * step;
}

function updateFamiliarFreeFlightMovement(state, familiar, def, dt) {
  const p = state.player;
  const anchorX = p.x;
  const anchorY = p.y + PLAYER_CENTER_Y_OFFSET + (def.freeFlightVerticalBias ?? -90);
  const dx = anchorX - familiar.x;
  const dy = anchorY - familiar.y;
  const dist = Math.hypot(dx, dy);

  familiar.retargetTimer -= dt;
  if (dist > (def.returnRadius ?? 360)) {
    familiar.targetX = anchorX + dx * -0.12;
    familiar.targetY = anchorY + dy * -0.12;
    familiar.retargetTimer = Math.min(familiar.retargetTimer, 0.16);
  } else if (familiar.retargetTimer <= 0) {
    const slotOffset = (familiar.slotIndex ?? 0) * 1.9;
    const angle = rand(0, Math.PI * 2) + slotOffset;
    const radius = rand(def.freeFlightMinRadius ?? 80, def.followRadius ?? 240);
    familiar.targetX = anchorX + Math.cos(angle) * radius;
    familiar.targetY = anchorY + Math.sin(angle) * radius * 0.65;
    familiar.retargetTimer = rand(
      (def.retargetInterval ?? 0.75) * 0.75,
      (def.retargetInterval ?? 0.75) * 1.35,
    );
  }

  const toTargetX = familiar.targetX - familiar.x;
  const toTargetY = familiar.targetY - familiar.y;
  const targetDist = Math.hypot(toTargetX, toTargetY);
  if (targetDist <= 2) return;

  const speed = (p.speed ?? 220) * (familiar.speedMul ?? 1) * 1.08;
  const nx = toTargetX / targetDist;
  const ny = toTargetY / targetDist;
  const flutter = Math.sin((state.timeSurvived ?? 0) * 5.4 + (familiar.bobSeed ?? 0)) * 0.16;
  const step = Math.min(targetDist, speed * dt);

  familiar.x += (nx - ny * flutter) * step;
  familiar.y += (ny + nx * flutter) * step;
}

function updateFamiliarOrbitMovement(state, familiar, def, dt) {
  const p = state.player;
  const radius = def.followRadius ?? 140;
  const period = Math.max(0.1, def.orbitPeriod ?? 2.5);
  const bob = Math.sin((state.timeSurvived ?? 0) * 5.2 + (familiar.bobSeed ?? 0)) * (def.bobAmplitude ?? 10);

  familiar.orbitAngle = (familiar.orbitAngle ?? 0) + (Math.PI * 2 * dt) / period;
  familiar.x = p.x + Math.cos(familiar.orbitAngle) * radius;
  familiar.y = p.y + PLAYER_CENTER_Y_OFFSET - 92 + Math.sin(familiar.orbitAngle) * 22 + bob;
  familiar.targetX = familiar.x;
  familiar.targetY = familiar.y;
}

function updateFamiliarAttack(state, hud, audio, familiar, def, dt) {
  if (def.attackStyle === "priority_target_support") return;

  familiar.attackTimer -= dt;
  if (familiar.attackTimer > 0) return;

  const target = findFamiliarTarget(state, familiar, def);
  if (!target) {
    familiar.attackTimer = Math.max(familiar.attackTimer, 0.08);
    return;
  }

  familiar.attackTimer = getFamiliarAttackInterval(state, def);
  if (def.attackStyle === "airstrike") {
    startFamiliarAirstrike(state, familiar, def, target);
    return;
  }

  if (def.attackStyle === "tackle") {
    startFamiliarTackle(state, familiar, def, target);
    return;
  }

  const damage = applyPriorityTargetDamageBonus(state, target, getFamiliarDamage(state, def));
  recordEnemyDamage(state, familiar.id, target, damage);
  target.hp -= damage;

  const strikeFx = {
    kind: "familiarStrike",
    fromX: familiar.x,
    fromY: familiar.y,
    toX: target.x,
    toY: target.y,
    t: 0,
    dur: 1.45,
    sourceId: familiar.id,
    travelEnd: 0.32,
    hazardStart: 0.32,
    hazardRadius: 34,
    hazardDamage: getFamiliarHazardDamage(state, damage),
    hazardHitSet: new WeakSet(),
  };
  strikeFx.hazardHitSet.add(target);
  state.fx.push(strikeFx);
  state.fx.push({
    kind: "ring",
    x: target.x,
    y: target.y,
    R: 18,
    t: 0,
    dur: 0.16,
    color: "#bcefff",
    alphaMul: 1.15,
  });
  state.fx.push({
    kind: "dmg",
    x: target.x,
    y: target.y - (target.r || 12),
    text: String(damage),
    t: 0,
    dur: 0.45,
    vy: -32,
    jitter: 0,
  });
  state.fx.push({
    kind: "spark",
    x: target.x,
    y: target.y,
    t: 0,
    dur: 0.14,
  });

  if (!target.isBoss) {
    target.knock = Math.min(80, (target.knock || 0) + 28);
  }

  if (target.hp <= 0) {
    killEnemy(state, hud, audio, target, false);
    const index = state.enemies.indexOf(target);
    if (index >= 0) state.enemies.splice(index, 1);
  }
}

function startFamiliarAirstrike(state, familiar, def, target) {
  const damage = getFamiliarDamage(state, def);
  const radius = def.airstrikeRadius ?? 58;
  const delay = def.airstrikeDelay ?? 0.52;
  state.fx.push({
    kind: "yakyoAirstrike",
    sourceId: familiar.id,
    fromX: familiar.x,
    fromY: familiar.y - 70,
    x: target.x,
    y: target.y,
    radius,
    damage,
    t: 0,
    dur: delay + 0.34,
    impactAt: delay,
    detonated: false,
    color: familiar.slotIndex % 2 === 0 ? "#ffe68a" : "#bcefff",
  });
}

function startFamiliarTackle(state, familiar, def, target) {
  const damage = getFamiliarDamage(state, def);
  const dx = target.x - familiar.x;
  const dy = target.y - familiar.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const overshoot = def.tackleOvershoot ?? 26;

  familiar.tackle = {
    startX: familiar.x,
    startY: familiar.y,
    endX: target.x + nx * overshoot,
    endY: target.y + ny * overshoot,
    t: 0,
    dur: def.tackleDuration ?? 0.36,
    radius: def.tackleRadius ?? 30,
    damage,
    hitSet: new WeakSet(),
  };

  state.fx.push({
    kind: "familiarTackle",
    fromX: familiar.x,
    fromY: familiar.y,
    toX: target.x,
    toY: target.y,
    t: 0,
    dur: def.tackleDuration ?? 0.36,
  });
}

function getFamiliarBoostLevel(state) {
  return Math.max(0, state.player?.statLevels?.familiarBoost ?? 0);
}

function getFamiliarMaxCount(state, def, progress) {
  const boostLevel = getFamiliarBoostLevel(state);
  const boostCountBonus = Math.floor(boostLevel / 2);
  const countBonus = (progress?.familiarCountBonus ?? 0) + boostCountBonus;
  return Math.max(0, Math.min(def.maxCount ?? 1, 1 + countBonus));
}

function getFamiliarDamage(state, def) {
  const boostLevel = getFamiliarBoostLevel(state);
  const boostMul = 1 + boostLevel * 0.25;
  return Math.round((def.baseDamage ?? 18) * getPlayerDamageMultiplier(state) * boostMul);
}

function getFamiliarAttackInterval(state, def) {
  const boostLevel = getFamiliarBoostLevel(state);
  const intervalMul = Math.max(0.55, 1 - boostLevel * 0.06);
  return (def.attackInterval ?? 0.8) * intervalMul;
}

function getFamiliarHazardDamage(state, directDamage) {
  const boostLevel = getFamiliarBoostLevel(state);
  const hazardMul = 0.35 + boostLevel * 0.06;
  return Math.max(1, Math.round(directDamage * hazardMul));
}

function updateFamiliarAirstrikes(state, hud, audio) {
  for (const fx of state.fx) {
    if (fx.kind !== "yakyoAirstrike") continue;
    if (fx.detonated || fx.t < (fx.impactAt ?? 0.5)) continue;

    fx.detonated = true;
    const radius = fx.radius ?? 58;
    const radiusSq = radius * radius;
    const damage = Math.max(1, Math.round(fx.damage ?? 1));

    state.fx.push({
      kind: "burst",
      x: fx.x,
      y: fx.y,
      t: 0,
      dur: 0.24,
      color: fx.color ?? "#ffe68a",
      alphaMul: 1.55,
      radius,
    });
    state.fx.push({
      kind: "ring",
      x: fx.x,
      y: fx.y,
      R: radius,
      t: 0,
      dur: 0.24,
      color: fx.color ?? "#ffe68a",
      alphaMul: 1.45,
    });

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (enemy.hp <= 0) continue;
      const dx = enemy.x - fx.x;
      const dy = enemy.y - fx.y;
      if (dx * dx + dy * dy > radiusSq) continue;

      recordEnemyDamage(state, fx.sourceId ?? "familiar_yakyo", enemy, damage);
      enemy.hp -= damage;
      if (!enemy.isBoss) {
        enemy.knock = Math.min(95, (enemy.knock || 0) + 34);
      }
      state.fx.push({
        kind: "dmg",
        x: enemy.x,
        y: enemy.y - (enemy.r || 12),
        text: String(damage),
        t: 0,
        dur: 0.42,
        vy: -32,
        jitter: 0,
      });

      if (enemy.hp <= 0) {
        killEnemy(state, hud, audio, enemy, false);
        state.enemies.splice(i, 1);
      }
    }
  }
}

function updateFamiliarStrikeHazards(state, hud, audio) {
  for (const fx of state.fx) {
    if (fx.kind !== "familiarStrike") continue;
    if (!fx.hazardDamage || !fx.hazardRadius) continue;

    const progress = fx.t / Math.max(0.001, fx.dur);
    if (progress < (fx.hazardStart ?? 0.7)) continue;

    const hitSet = fx.hazardHitSet ?? new WeakSet();
    fx.hazardHitSet = hitSet;
    const radiusSq = fx.hazardRadius * fx.hazardRadius;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (enemy.hp <= 0 || hitSet.has(enemy)) continue;

      const dx = enemy.x - fx.toX;
      const dy = enemy.y - fx.toY;
      if (dx * dx + dy * dy > radiusSq) continue;

      hitSet.add(enemy);
      const damage = applyPriorityTargetDamageBonus(state, enemy, fx.hazardDamage);
      recordEnemyDamage(state, fx.sourceId ?? "familiar_shikigami", enemy, damage);
      enemy.hp -= damage;
      if (!enemy.isBoss) {
        enemy.knock = Math.min(60, (enemy.knock || 0) + 18);
      }
      state.fx.push({
        kind: "dmg",
        x: enemy.x,
        y: enemy.y - (enemy.r || 12),
        text: String(damage),
        t: 0,
        dur: 0.38,
        vy: -28,
        jitter: 0,
      });
      state.fx.push({
        kind: "spark",
        x: enemy.x,
        y: enemy.y,
        t: 0,
        dur: 0.1,
      });

      if (enemy.hp <= 0) {
        killEnemy(state, hud, audio, enemy, false);
        state.enemies.splice(i, 1);
      }
    }
  }
}

function findFamiliarTarget(state, familiar, def) {
  const attackRangeSq = (def.attackRange ?? 210) ** 2;
  const anchorX = state.player.x;
  const anchorY = state.player.y + PLAYER_CENTER_Y_OFFSET;
  const anchorRangeSq = (def.playerAnchorRange ?? 330) ** 2;
  let best = null;
  let bestDistSq = Infinity;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;

    const fx = enemy.x - familiar.x;
    const fy = enemy.y - familiar.y;
    const familiarDistSq = fx * fx + fy * fy;
    if (familiarDistSq > attackRangeSq) continue;

    const px = enemy.x - anchorX;
    const py = enemy.y - anchorY;
    if (px * px + py * py > anchorRangeSq) continue;

    if (familiarDistSq < bestDistSq) {
      best = enemy;
      bestDistSq = familiarDistSq;
    }
  }

  return best;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}
