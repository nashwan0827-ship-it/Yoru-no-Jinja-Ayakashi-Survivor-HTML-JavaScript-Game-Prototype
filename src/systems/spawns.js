import {
  getEnemyTemplate,
  getBossConfig,
  getWaveProfile,
  isBossWave,
} from "../data/stages.js";
import { rand } from "../core/utils.js";
import { PLAYER_CENTER_Y_OFFSET } from "../state/combatOffsets.js";

export function stepSpawns(state, hud, audio, dt, levelupPanel) {
  state.bossActive = state.enemies.some((e) => e.isBoss);

  if (state.boss == null) {
    state.boss = {
      nextAtKills: 50,
      alive: false,
      _prevActive: false,
    };
  }

  if (state._bossDefeatedPending) {
    state._bossDefeatedPending = false;
    state.boss.alive = false;
    state.bossCount = (state.bossCount || 0) + 1;
    state.bossWarning = null;
    onBossDefeated(state, hud, audio, levelupPanel);
    state.boss._prevActive = state.bossActive;
    return;
  }

  state.boss._prevActive = state.bossActive;

  if (state.bossWarning?.active) {
    state.bossWarning.t += dt;
    if (state.bossWarning.t >= state.bossWarning.dur) {
      const pendingWave = state.bossWarning.wave;
      state.bossWarning = null;
      if (
        pendingWave === state.wave &&
        isBossWave(state.stage, state.wave) &&
        !state.boss.alive &&
        !state.bossActive
      ) {
        spawnBoss(state, hud, audio);
        state.boss.alive = true;
        state.boss._prevActive = true;
      }
    }
    return;
  }

  if (state.bossActive) {
    state.nextWaveTime += dt;
    return;
  }

  while (
    state.timeSurvived >= state.nextWaveTime &&
    state.wave < state.waveMax
  ) {
    state.nextWaveTime += state.stageTime;
    advanceWave(state, hud, audio);

    if (
      state.bossActive ||
      state._shouldStageClear ||
      state.bossWarning?.active
    ) {
      state.boss._prevActive = state.bossActive;
      return;
    }
  }

  if (isBossWave(state.stage, state.wave) && !state.boss.alive) {
    startBossWarning(state, audio);
    return;
  }

  state._spawnTimer -= dt;

  const profile = getWaveProfile(state.stage, state.wave);
  const baseInterval = Math.max(
    profile.minInterval,
    profile.baseInterval - state.timeSurvived * profile.timeDecay,
  );

  if (state._spawnTimer <= 0) {
    state._spawnTimer = baseInterval;
    const elapsedBoost = Math.floor(state.timeSurvived / profile.elapsedStep);
    const batch = Math.min(
      profile.batchBase + elapsedBoost * profile.batchRamp,
      profile.batchCap,
    );
    spawnEnemyRing(state, batch);
  }
}

export function spawnEnemyRing(state, count) {
  const p = state.player;
  let fastPackSpawned = false;

  for (let i = 0; i < count; i++) {
    const t = getEnemyTemplate(state.stage, state.wave, state.selectedDifficultyId);

    if (t.type === 4) {
      if (!fastPackSpawned) {
        spawnFastRushPack(state, t);
        fastPackSpawned = true;
      }
      continue;
    }

    if (t.type === 6) {
      spawnBoarRushPack(state, t);
      continue;
    }

    const d = rand(320, 560);
    const spawnPos = findSpawnAroundPlayer(state, p.x, p.y, d, 40);
    state.enemies.push({
      x: spawnPos.x,
      y: spawnPos.y,
      type: t.type,
      r: t.r,
      hp: t.hp + Math.floor(state.wave * 4),
      hpMax: t.hp + Math.floor(state.wave * 4),
      spd: t.spd + state.wave * 1.5,
      dmg: t.dmg,
      color: t.color,
      name: t.name,
      role: t.role,
      preferredRange: t.preferredRange,
      attackRange: t.attackRange,
      attackInterval: t.attackInterval,
      projectileSpeed: t.projectileSpeed,
      projectileRadius: t.projectileRadius,
      projectileDamage: t.projectileDamage,
      projectileColor: t.projectileColor,
      knock: 0,
      noKnock: t.noKnock || false,
      face: 1,
      isBoss: false,
      bossPhase: 0,
      age: 0,
      lifeTime: getEnemyLifeTime(t.type),
    });
  }
}

export function forceSpawnBoss(state, hud, audio) {
  if (state.bossActive || state.enemies.some((e) => e.isBoss)) return false;
  if (state.boss == null) {
    state.boss = {
      nextAtKills: 50,
      alive: false,
      _prevActive: false,
    };
  }

  state._bossDefeatedPending = false;
  state.bossWarning = null;
  spawnBoss(state, hud, audio);
  state.boss.alive = true;
  state.boss._prevActive = true;
  return true;
}

export function forceAdvanceWave(state, hud, audio) {
  if (state.wave >= state.waveMax) return false;
  if (state.bossActive || state.enemies.some((e) => e.isBoss)) return false;

  state._bossDefeatedPending = false;
  state.bossWarning = null;
  state.nextWaveTime = Math.max(
    state.nextWaveTime,
    state.timeSurvived + state.stageTime,
  );
  advanceWave(state, hud, audio);
  return true;
}

function onBossDefeated(state, hud, audio, levelupPanel) {
  audio?.SE?.stopWarning?.();
  const bossName = state._lastDefeatedBossName || "\u3069\u306b\u3083";
  state._lastDefeatedBossName = "";
  hud.flash(`${bossName}\u3092\u7953\u3063\u305f\uff01`);

  const finish = () => {
    if (state.wave >= state.waveMax) {
      state._shouldStageClear = true;
      return;
    }

    advanceWave(state, hud, audio);
  };

  if (state.wave < state.waveMax && levelupPanel?.showBossRewardSlot) {
    levelupPanel.showBossRewardSlot(finish);
    return;
  }

  finish();
}

function advanceWave(state, hud, audio) {
  if (state.wave >= state.waveMax) {
    state._shouldStageClear = true;
    return;
  }

  state.wave += 1;

  if (isBossWave(state.stage, state.wave)) {
    startBossWarning(state, audio);
    return;
  }

  hud.flash(`Wave ${state.wave}\uff1a\u5996\u6c17\u304c\u4e00\u6bb5\u3068\u6fc3\u304f\u306a\u308b\u2026`);
  const profile = getWaveProfile(state.stage, state.wave);
  spawnEnemyRing(state, profile.entryBurst);
}

function startBossWarning(state, audio) {
  audio?.SE?.warning?.();
  state.bossWarning = {
    active: true,
    text: "\u5f37\u6575\u51fa\u73fe",
    subText:
      state.stage >= 2
        ? "\u6fc3\u3044\u798d\u306e\u6c17\u914d\u304c\u8fd1\u3065\u304f\u2026"
        : "\u798d\u306e\u6c17\u914d\u304c\u8fd1\u3065\u304f\u2026",
    t: 0,
    dur: 3.0,
    wave: state.wave,
  };
}

function spawnBoss(state, hud, audio) {
  const p = state.player;
  const d = 700;
  const spawnPos = findSpawnAroundPlayer(state, p.x, p.y, d, 90);

  const boss = getBossConfig(state.stage, state.wave, state.selectedDifficultyId);
  const hp = boss.hp;
  const spd = boss.spd;
  const dmg = boss.dmg;
  const bossName = boss.name;
  const isMidBoss = state.wave === 5;

  state.enemies.push({
    x: spawnPos.x,
    y: spawnPos.y,
    type: 2,
    isBoss: true,
    name: bossName,
    r: 70,
    hp,
    hpMax: hp,
    spd,
    dmg,
    color: "#6ae0ff",
    knock: 0,
    face: 1,
    bossState: "idle",
    bossTimer: 0,
    bossDashCooldown: isMidBoss ? 1.9 : 1.5,
    bossShockwaveCooldown: isMidBoss ? 3.8 : 3.2,
    bossBeamCooldown: isMidBoss ? 3.4 : 2.7,
    bossHomingCooldown: isMidBoss ? 2.2 : 1.8,
    bossChargeDur: isMidBoss ? 0.82 : 0.72,
    bossChargeDurEnraged: isMidBoss ? 0.65 : 0.58,
    bossRushDur: isMidBoss ? 0.36 : 0.42,
    bossRushDurEnraged: isMidBoss ? 0.44 : 0.5,
    bossRecoverDur: isMidBoss ? 0.42 : 0.46,
    bossRecoverDurEnraged: isMidBoss ? 0.5 : 0.56,
    bossRushSpeed: isMidBoss ? spd * 4.1 : spd * 4.5,
    bossRushSpeedEnraged: isMidBoss ? spd * 4.9 : spd * 5.3,
    bossEnrageSpd: isMidBoss ? spd * 1.18 : spd * 1.22,
    bossShockwaveRadius: isMidBoss ? 106 : 122,
    bossShockwaveRadiusEnraged: isMidBoss ? 132 : 148,
    bossBeamAimDur: isMidBoss ? 0.72 : 0.64,
    bossBeamAimDurEnraged: isMidBoss ? 0.58 : 0.5,
    bossBeamFireDur: isMidBoss ? 0.18 : 0.22,
    bossBeamFireDurEnraged: isMidBoss ? 0.24 : 0.28,
    bossBeamLength: isMidBoss ? 340 : 410,
    bossBeamWidth: isMidBoss ? 18 : 22,
    bossBeamWidthEnraged: isMidBoss ? 24 : 28,
    bossHomingRange: isMidBoss ? 560 : 640,
    bossHomingSpeed: isMidBoss ? 210 : 235,
    bossHomingTurnRate: isMidBoss ? 2.1 : 2.4,
    bossHomingDamageMul: isMidBoss ? 0.38 : 0.42,
  });

  state.bossActive = true;
  hud.flash(`\u30dc\u30b9\u51fa\u73fe\uff01 ${bossName}`);
}

function spawnBoarRushPack(state, template) {
  const p = state.player;
  const packSize = 3;
  const angle = rand(0, Math.PI * 2);
  const dirX = Math.cos(angle + Math.PI);
  const dirY = Math.sin(angle + Math.PI);
  const sideX = -dirY;
  const sideY = dirX;
  const distance = rand(430, 590);
  const baseX = p.x - dirX * distance;
  const baseY = p.y + PLAYER_CENTER_Y_OFFSET - dirY * distance;

  for (let i = 0; i < packSize; i++) {
    const row = i - (packSize - 1) * 0.5;
    const spread = row * 46 + rand(-6, 6);
    const stagger = rand(-18, 18);
    const spawnPos = clampPointInsideMap(
      state,
      baseX + sideX * spread - dirX * stagger,
      baseY + sideY * spread - dirY * stagger,
      40,
    );
    const speed = template.spd + state.wave * 1.5;

    state.enemies.push({
      x: spawnPos.x,
      y: spawnPos.y,
      type: template.type,
      r: template.r,
      hp: template.hp + Math.floor(state.wave * 4),
      hpMax: template.hp + Math.floor(state.wave * 4),
      spd: speed,
      dmg: template.dmg,
      color: template.color,
      knock: 0,
      noKnock: false,
      face: dirX < 0 ? -1 : 1,
      isBoss: false,
      bossPhase: 0,
      age: 0,
      lifeTime: getEnemyLifeTime(template.type),
      boarState: "idle",
      boarTimer: 0,
      boarCooldown: rand(0.2, 0.55),
      boarDashDirX: dirX,
      boarDashDirY: dirY,
      boarChargeDur: rand(0.42, 0.58),
      boarRushDur: rand(0.34, 0.46),
      boarRecoverDur: rand(0.32, 0.46),
      boarRushSpeed: speed * 3.35,
      boarTriggerRange: rand(260, 340),
    });
  }
}

function spawnFastRushPack(state, template) {
  const p = state.player;
  const packSize = 6;
  const angle = rand(0, Math.PI * 2);
  const dirX = Math.cos(angle + Math.PI);
  const dirY = Math.sin(angle + Math.PI);
  const sideX = -dirY;
  const sideY = dirX;
  const distance = rand(620, 780);
  const baseX = p.x - dirX * distance;
  const baseY = p.y + PLAYER_CENTER_Y_OFFSET - dirY * distance;

  for (let i = 0; i < packSize; i++) {
    const row = i - (packSize - 1) * 0.5;
    const stagger = rand(-34, 34);
    const spread = row * 24 + rand(-8, 8);
    const spawnPos = clampPointInsideMap(
      state,
      baseX + sideX * spread - dirX * stagger,
      baseY + sideY * spread - dirY * stagger,
      40,
    );
    const speed = template.spd + state.wave * 1.5 + rand(18, 46);

    state.enemies.push({
      x: spawnPos.x,
      y: spawnPos.y,
      type: template.type,
      r: template.r,
      hp: template.hp + Math.floor(state.wave * 4),
      hpMax: template.hp + Math.floor(state.wave * 4),
      spd: speed,
      dmg: template.dmg,
      color: template.color,
      knock: 0,
      noKnock: true,
      face: dirX < 0 ? -1 : 1,
      isBoss: false,
      bossPhase: 0,
      age: 0,
      lifeTime: 3.2,
      fastRushDirX: dirX,
      fastRushDirY: dirY,
      fastRushSpeed: speed * 2.25,
    });
  }
}

function findSpawnAroundPlayer(
  state,
  centerX,
  centerY,
  distance,
  margin = 0,
  attempts = 16,
) {
  for (let i = 0; i < attempts; i++) {
    const ang = rand(0, Math.PI * 2);
    const x = centerX + Math.cos(ang) * distance;
    const y = centerY + Math.sin(ang) * distance;
    if (isPointInsideMap(state, x, y, margin)) {
      return { x, y };
    }
  }

  return clampPointInsideMap(state, centerX, centerY, margin);
}

function isPointInsideMap(state, x, y, margin = 0) {
  const map = state.map;
  if (!map || map.enabled === false) return true;

  const dx = x - map.centerX;
  const dy = y - map.centerY;
  const maxR = Math.max(0, map.radius - margin);
  return dx * dx + dy * dy <= maxR * maxR;
}

function clampPointInsideMap(state, x, y, margin = 0) {
  const map = state.map;
  if (!map || map.enabled === false) return { x, y };

  const dx = x - map.centerX;
  const dy = y - map.centerY;
  const dist = Math.hypot(dx, dy) || 1;
  const maxR = Math.max(0, map.radius - margin);
  if (dist <= maxR) return { x, y };

  const scale = maxR / dist;
  return {
    x: map.centerX + dx * scale,
    y: map.centerY + dy * scale,
  };
}

function getEnemyLifeTime(type) {
  switch (type) {
    case 4:
      return 8;
    case 5:
      return 24;
    case 6:
      return 20;
    default:
      return 18;
  }
}
