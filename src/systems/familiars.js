import { getFamiliar, getFamiliarMasteryBonus } from "../data/familiars.js";
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

const DEFAULT_FAMILIAR_ID = "familiar_kodama";
const KODAMA_FAMILIAR_ID = "familiar_kodama";
const SHIKIGAMI_FAMILIAR_ID = "familiar_shikigami";
const REIRI_FAMILIAR_ID = "familiar_reiri";
const YAKYO_FAMILIAR_ID = "familiar_yakyo";
const FAMILIAR_MAX_EVOLUTION_LEVEL = 5;

export function stepFamiliars(state, hud, audio, dt) {
  state.activeFamiliars ??= [];
  ensureActiveFamiliars(state);
  updateFamiliarAirstrikes(state, hud, audio);
  updateFamiliarStrikeHazards(state, hud, audio);
  updateYakyoSlowAura(state, dt);
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
  const mastery = getFamiliarMasteryBonus(state.familiarProgress, def.id);
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
    pickupRadius: (def.pickupRadius ?? 42) + mastery.pickupBonus,
    magnetRadius: (def.magnetRadius ?? 115) + mastery.magnetBonus,
    bobSeed: Math.random() * Math.PI * 2,
    speedMul: rand(def.speedMinMul ?? 0.8, def.speedMaxMul ?? 1.2) * mastery.moveMul,
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
    if (!enemy || enemy.hp <= 0 || hitSet.has(enemy)) continue;
    const dx = enemy.x - familiar.x;
    const dy = enemy.y - familiar.y;
    if (dx * dx + dy * dy > radiusSq) continue;

    hitSet.add(enemy);
    performChargeAttack(state, hud, audio, familiar, def, tackle, enemy);
  }

  if (progress >= 1) {
    familiar.tackle = null;
    familiar.retargetTimer = 0;
  }
  return true;
}

function performChargeAttack(state, hud, audio, familiar, def, tackle, target) {
  const evolutionLevel = getFamiliarEvolutionLevel(state, familiar, def);
  const config = getReiriEvolutionConfig(evolutionLevel);
  const mainDamage = Math.max(1, Math.round((tackle.damage ?? getFamiliarDamage(state, def)) * config.damageMul));
  const sourceId = familiar.id ?? REIRI_FAMILIAR_ID;

  applyChargeDamage(state, hud, audio, target, mainDamage, sourceId, {
    knock: config.mainKnock,
    stunDuration: config.stunMainOnly ? config.stunDuration : 0,
    popupVy: -34,
  });

  state.fx.push({
    kind: "ring",
    x: target.x,
    y: target.y,
    R: config.hitRingRadius,
    t: 0,
    dur: 0.16,
    color: config.color,
    alphaMul: config.hitAlphaMul,
  });

  if (config.impactBurstRadius > 0) {
    state.fx.push({
      kind: "burst",
      x: target.x,
      y: target.y,
      t: 0,
      dur: 0.18,
      color: config.color,
      alphaMul: config.hitAlphaMul,
      radius: config.impactBurstRadius,
    });
  }

  if (config.areaRadius > 0 && config.areaDamageMul > 0) {
    applyChargeAreaDamage(state, hud, audio, target, sourceId, mainDamage, config);
  }
}

function applyChargeAreaDamage(state, hud, audio, target, sourceId, mainDamage, config) {
  const radiusSq = config.areaRadius * config.areaRadius;
  const areaDamage = Math.max(1, Math.round(mainDamage * config.areaDamageMul));

  state.fx.push({
    kind: "ring",
    x: target.x,
    y: target.y,
    R: config.areaRadius,
    t: 0,
    dur: config.shockwave ? 0.28 : 0.2,
    color: config.color,
    alphaMul: config.areaAlphaMul,
  });
  state.fx.push({
    kind: "burst",
    x: target.x,
    y: target.y,
    t: 0,
    dur: config.shockwave ? 0.26 : 0.2,
    color: config.color,
    alphaMul: config.areaAlphaMul,
    radius: config.areaRadius,
  });

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (!enemy || enemy === target || enemy.hp <= 0) continue;

    const dx = enemy.x - target.x;
    const dy = enemy.y - target.y;
    if (dx * dx + dy * dy > radiusSq) continue;

    applyChargeDamage(state, hud, audio, enemy, areaDamage, sourceId, {
      knock: config.areaKnock,
      stunDuration: config.stunArea ? config.stunDuration : 0,
      popupVy: -28,
    });
  }

  if (config.stunArea && target.hp > 0) {
    applyEnemyStun(target, config.stunDuration);
  }
}

function applyChargeDamage(state, hud, audio, enemy, baseDamage, sourceId, options = {}) {
  if (!enemy || enemy.hp <= 0) return;

  const damage = applyPriorityTargetDamageBonus(state, enemy, baseDamage);
  recordEnemyDamage(state, sourceId, enemy, damage);
  enemy.hp -= damage;

  if (!enemy.isBoss) {
    enemy.knock = Math.min(240, (enemy.knock || 0) + (options.knock ?? 0));
    applyEnemyStun(enemy, options.stunDuration ?? 0);
  }

  state.fx.push({
    kind: "dmg",
    x: enemy.x,
    y: enemy.y - (enemy.r || 12),
    text: String(damage),
    t: 0,
    dur: 0.42,
    vy: options.popupVy ?? -34,
    jitter: 0,
  });

  if (enemy.hp <= 0) {
    killEnemy(state, hud, audio, enemy, false);
    const index = state.enemies.indexOf(enemy);
    if (index >= 0) state.enemies.splice(index, 1);
  }
}

function applyEnemyStun(enemy, duration) {
  if (!enemy || enemy.isBoss || duration <= 0) return;
  enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, duration);
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

  if (def.id === SHIKIGAMI_FAMILIAR_ID) {
    fireShikigamiFoxfire(state, hud, audio, familiar, def, target);
    return;
  }

  if (def.id === KODAMA_FAMILIAR_ID) {
    fireKodamaProjectile(state, familiar, def, target);
    return;
  }

  const isKodama = def.id === KODAMA_FAMILIAR_ID;
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
    travelEnd: isKodama ? 0.52 : 0.32,
    hazardStart: isKodama ? 999 : 0.32,
    hazardRadius: isKodama ? 0 : 34,
    hazardDamage: isKodama ? 0 : getFamiliarHazardDamage(state, damage),
    hazardHitSet: new WeakSet(),
    visual: isKodama ? "spiritOrb" : "familiarStrike",
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
    target.knock = Math.min(80, (target.knock || 0) + (isKodama ? 8 : 28));
  }

  if (target.hp <= 0) {
    killEnemy(state, hud, audio, target, false);
    const index = state.enemies.indexOf(target);
    if (index >= 0) state.enemies.splice(index, 1);
  }
}

function fireShikigamiFoxfire(state, hud, audio, familiar, def, target) {
  const evolutionLevel = getFamiliarEvolutionLevel(state, familiar, def);
  const config = getShikigamiEvolutionConfig(evolutionLevel);
  const baseDamage = Math.round(getFamiliarDamage(state, def) * config.damageMul);
  const targets = findFamiliarTargets(state, familiar, def, config.targetCount ?? config.shots ?? 1);
  if (targets.length <= 0 && target?.hp > 0) {
    targets.push(target);
  }
  const offsets = getMultiTargetLaneOffsets(targets.length);

  for (let i = 0; i < targets.length; i++) {
    const currentTarget = targets[i];
    const laneOffset = offsets[i] ?? 0;
    const directDamage = currentTarget.hp > 0
      ? applyPriorityTargetDamageBonus(state, currentTarget, baseDamage)
      : 0;

    if (directDamage > 0) {
      recordEnemyDamage(state, familiar.id, currentTarget, directDamage);
      currentTarget.hp -= directDamage;
      state.fx.push({
        kind: "dmg",
        x: currentTarget.x + laneOffset * 0.25,
        y: currentTarget.y - (currentTarget.r || 12),
        text: String(directDamage),
        t: 0,
        dur: 0.45,
        vy: -32,
        jitter: 0,
      });
    }

    state.fx.push({
      kind: "familiarStrike",
      fromX: familiar.x,
      fromY: familiar.y,
      toX: currentTarget.x,
      toY: currentTarget.y,
      t: 0,
      dur: config.duration,
      sourceId: familiar.id,
      travelEnd: 0.32,
      hazardStart: 0.32,
      hazardRadius: config.hazardRadius,
      hazardDamage: Math.max(0, Math.round(baseDamage * config.hazardDamageMul)),
      hazardHitSet: new WeakSet([currentTarget]),
      hazardTriggered: false,
      burnDamage: Math.max(0, Math.round(baseDamage * config.burnDamageMul)),
      burnTickInterval: config.burnTickInterval,
      burnDuration: config.burnDuration,
      burnTickMap: new WeakMap(),
      evolutionLevel,
      projectileScale: config.projectileScale,
      laneOffset,
      fireballPrefab: config.flameVariant === "blue" ? "Fireball_Blue" : "Fireball_Red",
      flameVariant: config.flameVariant,
      impactColor: config.impactColor,
      impactAlphaMul: config.impactAlphaMul,
    });

    state.fx.push({
      kind: "ring",
      x: currentTarget.x,
      y: currentTarget.y,
      R: config.hitRingRadius,
      t: 0,
      dur: 0.16,
      color: config.impactColor,
      alphaMul: config.hitRingAlphaMul,
    });
    state.fx.push({
      kind: "spark",
      x: currentTarget.x,
      y: currentTarget.y,
      t: 0,
      dur: 0.14,
    });

    if (!currentTarget.isBoss) {
      currentTarget.knock = Math.min(100, (currentTarget.knock || 0) + config.knock);
    }

    if (currentTarget.hp <= 0) {
      killEnemy(state, hud, audio, currentTarget, false);
      const index = state.enemies.indexOf(currentTarget);
      if (index >= 0) state.enemies.splice(index, 1);
    }
  }
}

function getMultiTargetLaneOffsets(count) {
  if (count <= 1) return [0];
  const spacing = 14;
  const center = (count - 1) * 0.5;
  return Array.from({ length: count }, (_, index) => (index - center) * spacing);
}

function startFamiliarAirstrike(state, familiar, def, target) {
  const evolutionLevel = getFamiliarEvolutionLevel(state, familiar, def);
  const config = getYakyoEvolutionConfig(evolutionLevel);
  const damage = Math.max(1, Math.round(getFamiliarDamage(state, def) * config.damageMul));
  const radius = config.radius;
  const delay = def.id === YAKYO_FAMILIAR_ID ? 0.14 : def.airstrikeDelay ?? 0.52;
  const targets = def.id === YAKYO_FAMILIAR_ID
    ? findFamiliarTargets(state, familiar, def, config.targetCount ?? 1)
    : [target];
  if (targets.length <= 0 && target?.hp > 0) targets.push(target);

  for (const currentTarget of targets) {
    state.fx.push({
      kind: "yakyoAirstrike",
      sourceId: familiar.id,
      evolutionLevel,
      fromX: familiar.x,
      fromY: familiar.y - 70,
      x: currentTarget.x,
      y: currentTarget.y,
      primaryTarget: currentTarget,
      radius,
      damage,
      areaDamageMul: config.areaDamageMul,
      slowMultiplier: config.slowMultiplier,
      slowDuration: config.slowDuration,
      freezeChance: config.freezeChance,
      freezeDuration: config.freezeDuration,
      t: 0,
      dur: delay + 0.34,
      impactAt: delay,
      detonated: false,
      color: config.color,
    });
  }
}

function startFamiliarTackle(state, familiar, def, target) {
  const evolutionLevel = getFamiliarEvolutionLevel(state, familiar, def);
  const config = def.id === REIRI_FAMILIAR_ID
    ? getReiriEvolutionConfig(evolutionLevel)
    : getReiriEvolutionConfig(1);
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
    dur: (def.tackleDuration ?? 0.36) / (config.chargeSpeedMul ?? 1),
    radius: config.hitRadius ?? def.tackleRadius ?? 30,
    damage,
    evolutionLevel,
    hitSet: new WeakSet(),
  };

  state.fx.push({
    kind: "familiarTackle",
    fromX: familiar.x,
    fromY: familiar.y,
    toX: target.x,
    toY: target.y,
    t: 0,
    dur: familiar.tackle.dur,
  });
}

function fireKodamaProjectile(state, familiar, def, target) {
  if (!target || target.hp <= 0) return;

  const dx = target.x - familiar.x;
  const dy = target.y - familiar.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = def.projectileSpeed ?? 360;
  const nx = dx / dist;
  const ny = dy / dist;

  state.projectiles.push({
    kind: "kodamaOrb",
    x: familiar.x + nx * 10,
    y: familiar.y + ny * 10,
    vx: nx * speed,
    vy: ny * speed,
    rot: Math.atan2(ny, nx),
    life: def.projectileLife ?? 0.9,
    r: def.projectileRadius ?? 7,
    dmg: getFamiliarDamage(state, def),
    pierce: 0,
    damageSource: familiar.id ?? KODAMA_FAMILIAR_ID,
  });
}

function getFamiliarBoostLevel(state) {
  return Math.max(0, state.player?.statLevels?.familiarBoost ?? 0);
}

function getFamiliarEvolutionLevel(state, familiar, def) {
  const progressLevel = state.familiarProgress?.familiarLevel?.[familiar.id];
  const rawLevel =
    familiar.evolutionLevel ??
    def.evolutionLevel ??
    progressLevel ??
    getFamiliarBoostLevel(state) + 1;
  const level = Number(rawLevel);
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(FAMILIAR_MAX_EVOLUTION_LEVEL, Math.floor(level)));
}

function getShikigamiEvolutionConfig(evolutionLevel) {
  switch (evolutionLevel) {
    case 2:
      return {
        shots: 1,
        targetCount: 1,
        damageMul: 1.22,
        projectileScale: 1.16,
        hazardRadius: 0,
        hazardDamageMul: 0,
        burnDamageMul: 0,
        burnTickInterval: 0,
        burnDuration: 0,
        duration: 1.25,
        hitRingRadius: 22,
        hitRingAlphaMul: 1.15,
        impactAlphaMul: 1.2,
        impactColor: "#ff8a4a",
        flameVariant: "red",
        knock: 32,
      };
    case 3:
      return {
        shots: 2,
        targetCount: 2,
        damageMul: 1,
        projectileScale: 1.08,
        hazardRadius: 0,
        hazardDamageMul: 0,
        burnDamageMul: 0,
        burnTickInterval: 0,
        burnDuration: 0,
        duration: 1.25,
        hitRingRadius: 22,
        hitRingAlphaMul: 1.2,
        impactAlphaMul: 1.25,
        impactColor: "#ff8a4a",
        flameVariant: "red",
        knock: 36,
      };
    case 4:
      return {
        shots: 1,
        targetCount: 3,
        damageMul: 1.1,
        projectileScale: 1.14,
        hazardRadius: 46,
        hazardDamageMul: 0.42,
        burnDamageMul: 0,
        burnTickInterval: 0,
        burnDuration: 0,
        duration: 1.35,
        hitRingRadius: 30,
        hitRingAlphaMul: 1.35,
        impactAlphaMul: 1.45,
        impactColor: "#ff7a32",
        flameVariant: "red",
        knock: 44,
      };
    case 5:
      return {
        shots: 1,
        targetCount: 4,
        damageMul: 1.28,
        projectileScale: 1.3,
        hazardRadius: 68,
        hazardDamageMul: 0.58,
        burnDamageMul: 0.18,
        burnTickInterval: 0.42,
        burnDuration: 1.3,
        duration: 1.62,
        hitRingRadius: 42,
        hitRingAlphaMul: 1.6,
        impactAlphaMul: 1.75,
        impactColor: "#78dcff",
        flameVariant: "blue",
        knock: 54,
      };
    default:
      return {
        shots: 1,
        targetCount: 1,
        damageMul: 1,
        projectileScale: 1,
        hazardRadius: 0,
        hazardDamageMul: 0,
        burnDamageMul: 0,
        burnTickInterval: 0,
        burnDuration: 0,
        duration: 1.2,
        hitRingRadius: 18,
        hitRingAlphaMul: 1.15,
        impactAlphaMul: 1.1,
        impactColor: "#ff9a4a",
        flameVariant: "red",
        knock: 28,
      };
  }
}

function getYakyoEvolutionConfig(evolutionLevel) {
  switch (evolutionLevel) {
    case 2:
      return {
        targetCount: 1,
        attackIntervalMul: 0.95,
        damageMul: 0.78,
        radius: 44,
        areaDamageMul: 0.42,
        slowMultiplier: 0.72,
        slowDuration: 1.2,
        freezeChance: 0,
        freezeDuration: 0,
        attackRangeMul: 1.14,
        auraRadius: 0,
        auraSlowMultiplier: 1,
        color: "#a8efff",
      };
    case 3:
      return {
        targetCount: 2,
        attackIntervalMul: 0.94,
        damageMul: 0.84,
        radius: 54,
        areaDamageMul: 0.5,
        slowMultiplier: 0.68,
        slowDuration: 1.3,
        freezeChance: 0,
        freezeDuration: 0,
        attackRangeMul: 1.14,
        auraRadius: 0,
        auraSlowMultiplier: 1,
        color: "#8ee6ff",
      };
    case 4:
      return {
        targetCount: 2,
        attackIntervalMul: 0.9,
        damageMul: 0.9,
        radius: 60,
        areaDamageMul: 0.56,
        slowMultiplier: 0.6,
        slowDuration: 1.45,
        freezeChance: 0.16,
        freezeDuration: 0.5,
        attackRangeMul: 1.18,
        auraRadius: 0,
        auraSlowMultiplier: 1,
        color: "#79dcff",
      };
    case 5:
      return {
        targetCount: 2,
        attackIntervalMul: 0.86,
        damageMul: 1,
        radius: 68,
        areaDamageMul: 0.66,
        slowMultiplier: 0.56,
        slowDuration: 1.65,
        freezeChance: 0.26,
        freezeDuration: 0.65,
        attackRangeMul: 1.22,
        auraRadius: 120,
        auraSlowMultiplier: 0.78,
        color: "#b8f7ff",
      };
    default:
      return {
        targetCount: 1,
        attackIntervalMul: 1,
        damageMul: 0.68,
        radius: 36,
        areaDamageMul: 0.34,
        slowMultiplier: 0.86,
        slowDuration: 1,
        freezeChance: 0,
        freezeDuration: 0,
        attackRangeMul: 1,
        auraRadius: 0,
        auraSlowMultiplier: 1,
        color: "#bcefff",
      };
  }
}

function getReiriEvolutionConfig(evolutionLevel) {
  switch (evolutionLevel) {
    case 2:
      return {
        attackIntervalMul: 0.94,
        damageMul: 1.38,
        mainKnock: 135,
        hitRadius: 36,
        areaRadius: 0,
        areaDamageMul: 0,
        areaKnock: 0,
        stunDuration: 0,
        stunMainOnly: false,
        stunArea: false,
        chargeSpeedMul: 1.08,
        hitRingRadius: 28,
        impactBurstRadius: 26,
        hitAlphaMul: 1.25,
        areaAlphaMul: 1,
        color: "#ffd49c",
        shockwave: false,
      };
    case 3:
      return {
        attackIntervalMul: 0.9,
        damageMul: 1.16,
        mainKnock: 125,
        hitRadius: 38,
        areaRadius: 64,
        areaDamageMul: 0.58,
        areaKnock: 68,
        stunDuration: 0,
        stunMainOnly: false,
        stunArea: false,
        chargeSpeedMul: 1.14,
        hitRingRadius: 30,
        impactBurstRadius: 34,
        hitAlphaMul: 1.3,
        areaAlphaMul: 1.25,
        color: "#ffc76f",
        shockwave: false,
      };
    case 4:
      return {
        attackIntervalMul: 0.86,
        damageMul: 1.26,
        mainKnock: 175,
        hitRadius: 40,
        areaRadius: 72,
        areaDamageMul: 0.64,
        areaKnock: 88,
        stunDuration: 0.62,
        stunMainOnly: false,
        stunArea: true,
        chargeSpeedMul: 1.28,
        hitRingRadius: 36,
        impactBurstRadius: 40,
        hitAlphaMul: 1.45,
        areaAlphaMul: 1.3,
        color: "#ffb85c",
        shockwave: false,
      };
    case 5:
      return {
        attackIntervalMul: 0.82,
        damageMul: 1.4,
        mainKnock: 220,
        hitRadius: 44,
        areaRadius: 104,
        areaDamageMul: 0.82,
        areaKnock: 145,
        stunDuration: 0.78,
        stunMainOnly: false,
        stunArea: true,
        chargeSpeedMul: 1.4,
        hitRingRadius: 44,
        impactBurstRadius: 50,
        hitAlphaMul: 1.85,
        areaAlphaMul: 1.95,
        color: "#fff0b5",
        shockwave: true,
      };
    default:
      return {
        attackIntervalMul: 1,
        damageMul: 1,
        mainKnock: 70,
        hitRadius: 34,
        areaRadius: 0,
        areaDamageMul: 0,
        areaKnock: 0,
        stunDuration: 0,
        stunMainOnly: false,
        stunArea: false,
        chargeSpeedMul: 1,
        hitRingRadius: 24,
        impactBurstRadius: 0,
        hitAlphaMul: 1.1,
        areaAlphaMul: 1,
        color: "#ffd49c",
        shockwave: false,
      };
  }
}

function getFamiliarMaxCount(state, def, progress) {
  if (def.id === REIRI_FAMILIAR_ID) {
    const evolutionLevel = getFamiliarEvolutionLevel(state, { id: def.id }, def);
    const levelCount = evolutionLevel >= 5 ? 3 : evolutionLevel >= 3 ? 2 : 1;
    return Math.max(0, Math.min(def.maxCount ?? 1, levelCount));
  }

  const boostLevel = getFamiliarBoostLevel(state);
  const boostCountBonus = Math.floor(boostLevel / 2);
  const countBonus = (progress?.familiarCountBonus ?? 0) + boostCountBonus;
  return Math.max(0, Math.min(def.maxCount ?? 1, 1 + countBonus));
}

function getFamiliarDamage(state, def) {
  const boostLevel = getFamiliarBoostLevel(state);
  const boostMul = 1 + boostLevel * 0.25;
  const mastery = getFamiliarMasteryBonus(state.familiarProgress, def.id);
  const permanentMul = state.player?.permanentFamiliarDamageMul ?? 1;
  return Math.round((def.baseDamage ?? 18) * getPlayerDamageMultiplier(state) * boostMul * mastery.damageMul * permanentMul);
}

function getFamiliarAttackInterval(state, def) {
  const boostLevel = getFamiliarBoostLevel(state);
  const intervalMul = Math.max(0.55, 1 - boostLevel * 0.06);
  const mastery = getFamiliarMasteryBonus(state.familiarProgress, def.id);
  const evolutionMul = def.id === YAKYO_FAMILIAR_ID
    ? getYakyoEvolutionConfig(getFamiliarEvolutionLevel(state, { id: def.id }, def)).attackIntervalMul ?? 1
    : def.id === REIRI_FAMILIAR_ID
      ? getReiriEvolutionConfig(getFamiliarEvolutionLevel(state, { id: def.id }, def)).attackIntervalMul ?? 1
    : 1;
  const permanentSpeedMul = state.player?.permanentFamiliarAttackSpeedMul ?? 1;
  return (def.attackInterval ?? 0.8) * intervalMul * evolutionMul * mastery.attackIntervalMul / permanentSpeedMul;
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
    const areaDamage = Math.max(1, Math.round(damage * (fx.areaDamageMul ?? 0)));
    const slowMultiplier = fx.slowMultiplier ?? 1;
    const slowDuration = fx.slowDuration ?? 0;
    const freezeChance = fx.freezeChance ?? 0;
    const freezeDuration = fx.freezeDuration ?? 0;

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (!enemy || enemy.hp <= 0) continue;
      const dx = enemy.x - fx.x;
      const dy = enemy.y - fx.y;
      const isPrimary = enemy === fx.primaryTarget;
      const inRadius = radius > 0 && dx * dx + dy * dy <= radiusSq;
      if (!isPrimary && (!inRadius || (fx.areaDamageMul ?? 0) <= 0)) continue;

      const hitDamage = isPrimary ? damage : areaDamage;
      recordEnemyDamage(state, fx.sourceId ?? YAKYO_FAMILIAR_ID, enemy, hitDamage);
      enemy.hp -= hitDamage;
      applyEnemySlow(enemy, slowMultiplier, slowDuration);
      if (freezeChance > 0 && Math.random() < freezeChance) {
        applyEnemyFreeze(enemy, freezeDuration);
      }
      if (!enemy.isBoss) {
        enemy.knock = Math.min(95, (enemy.knock || 0) + 22);
      }
      state.fx.push({
        kind: "dmg",
        x: enemy.x,
        y: enemy.y - (enemy.r || 12),
        text: String(hitDamage),
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

function updateYakyoSlowAura(state, dt) {
  const familiars = state.activeFamiliars ?? [];
  for (const familiar of familiars) {
    if (familiar.id !== YAKYO_FAMILIAR_ID) continue;

    const def = getFamiliar(familiar.id);
    const config = getYakyoEvolutionConfig(getFamiliarEvolutionLevel(state, familiar, def));
    if ((config.auraRadius ?? 0) <= 0) continue;

    const radiusSq = config.auraRadius * config.auraRadius;
    for (const enemy of state.enemies) {
      if (!enemy || enemy.hp <= 0) continue;
      const dx = enemy.x - familiar.x;
      const dy = enemy.y - familiar.y;
      if (dx * dx + dy * dy > radiusSq) continue;
      applyEnemySlow(enemy, config.auraSlowMultiplier, 0.22);
    }
  }
}

function applyEnemySlow(enemy, multiplier, duration) {
  if (!enemy || duration <= 0 || multiplier >= 1) return;
  enemy.slowMultiplier = Math.min(enemy.slowMultiplier ?? 1, multiplier);
  enemy.slowTimer = Math.max(enemy.slowTimer ?? 0, duration);
}

function applyEnemyFreeze(enemy, duration) {
  if (!enemy || enemy.isBoss || duration <= 0) return;
  enemy.freezeTimer = Math.max(enemy.freezeTimer ?? 0, duration);
}

function updateFamiliarStrikeHazards(state, hud, audio) {
  for (const fx of state.fx) {
    if (fx.kind !== "familiarStrike") continue;
    if (!fx.hazardDamage || !fx.hazardRadius) continue;

    if (fx.t < (fx.hazardStart ?? 0.7)) continue;

    const hitSet = fx.hazardHitSet ?? new WeakSet();
    fx.hazardHitSet = hitSet;
    const radiusSq = fx.hazardRadius * fx.hazardRadius;

    if (!fx.hazardTriggered) {
      fx.hazardTriggered = true;
      state.fx.push({
        kind: "burst",
        x: fx.toX,
        y: fx.toY,
        t: 0,
        dur: 0.22,
        color: fx.impactColor ?? "#ff9a4a",
        alphaMul: fx.impactAlphaMul ?? 1.2,
        radius: fx.hazardRadius,
      });
      state.fx.push({
        kind: "ring",
        x: fx.toX,
        y: fx.toY,
        R: fx.hazardRadius,
        t: 0,
        dur: 0.22,
        color: fx.impactColor ?? "#ff9a4a",
        alphaMul: fx.impactAlphaMul ?? 1.2,
      });
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      if (!enemy || enemy.hp <= 0 || hitSet.has(enemy)) continue;

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

    applyFamiliarBurnDamage(state, hud, audio, fx, radiusSq);
  }
}

function applyFamiliarBurnDamage(state, hud, audio, fx, radiusSq) {
  const burnDamage = Math.max(0, Math.round(fx.burnDamage ?? 0));
  const tickInterval = fx.burnTickInterval ?? 0;
  const burnDuration = fx.burnDuration ?? 0;
  if (burnDamage <= 0 || tickInterval <= 0 || burnDuration <= 0) return;
  if (fx.t > (fx.hazardStart ?? 0) + burnDuration) return;

  const tickMap = fx.burnTickMap ?? new WeakMap();
  fx.burnTickMap = tickMap;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (!enemy || enemy.hp <= 0) continue;

    const dx = enemy.x - fx.toX;
    const dy = enemy.y - fx.toY;
    if (dx * dx + dy * dy > radiusSq) continue;

    const nextTickAt = tickMap.get(enemy) ?? (fx.hazardStart ?? 0);
    if (fx.t + 0.0001 < nextTickAt) continue;
    tickMap.set(enemy, fx.t + tickInterval);

    const damage = applyPriorityTargetDamageBonus(state, enemy, burnDamage);
    recordEnemyDamage(state, fx.sourceId ?? SHIKIGAMI_FAMILIAR_ID, enemy, damage);
    enemy.hp -= damage;
    state.fx.push({
      kind: "dmg",
      x: enemy.x,
      y: enemy.y - (enemy.r || 12),
      text: String(damage),
      t: 0,
      dur: 0.34,
      vy: -24,
      jitter: 0,
    });

    if (enemy.hp <= 0) {
      killEnemy(state, hud, audio, enemy, false);
      state.enemies.splice(i, 1);
    }
  }
}

function findFamiliarTarget(state, familiar, def) {
  return findFamiliarTargets(state, familiar, def, 1)[0] ?? null;
}

function findFamiliarTargets(state, familiar, def, maxTargets) {
  const mastery = getFamiliarMasteryBonus(state.familiarProgress, def.id);
  const attackRangeMul = def.id === YAKYO_FAMILIAR_ID
    ? getYakyoEvolutionConfig(getFamiliarEvolutionLevel(state, familiar, def)).attackRangeMul
    : 1;
  const attackRangeSq = ((def.attackRange ?? 210) * (attackRangeMul ?? 1) * mastery.rangeMul) ** 2;
  const anchorX = state.player.x;
  const anchorY = state.player.y + PLAYER_CENTER_Y_OFFSET;
  const anchorRangeSq = (def.playerAnchorRange ?? 330) ** 2;
  const limit = Math.max(1, Math.floor(maxTargets ?? 1));
  const candidates = [];

  for (const enemy of state.enemies) {
    if (!enemy || enemy.hp <= 0) continue;

    const fx = enemy.x - familiar.x;
    const fy = enemy.y - familiar.y;
    const familiarDistSq = fx * fx + fy * fy;
    if (familiarDistSq > attackRangeSq) continue;

    const px = enemy.x - anchorX;
    const py = enemy.y - anchorY;
    if (px * px + py * py > anchorRangeSq) continue;

    candidates.push({ enemy, familiarDistSq });
  }

  candidates.sort((a, b) => a.familiarDistSq - b.familiarDistSq);
  return candidates.slice(0, limit).map((candidate) => candidate.enemy);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}
