const BASE_WAVE_PROFILES = {
  1: {
    baseInterval: 4.4,
    minInterval: 2.93,
    timeDecay: 0.0015,
    batchBase: 2,
    batchRamp: 1,
    batchCap: 4,
    elapsedStep: 40,
    entryBurst: 3,
  },
  2: {
    baseInterval: 2.2,
    minInterval: 1.47,
    timeDecay: 0.0015,
    batchBase: 4,
    batchRamp: 1,
    batchCap: 8,
    elapsedStep: 40,
    entryBurst: 6,
  },
  3: {
    baseInterval: 2.15,
    minInterval: 1.35,
    timeDecay: 0.0016,
    batchBase: 5,
    batchRamp: 1,
    batchCap: 9,
    elapsedStep: 40,
    entryBurst: 7,
  },
  4: {
    baseInterval: 1.9,
    minInterval: 1.18,
    timeDecay: 0.0019,
    batchBase: 6,
    batchRamp: 1,
    batchCap: 11,
    elapsedStep: 38,
    entryBurst: 8,
  },
  5: bossOnlyProfile(),
  6: {
    baseInterval: 1.9,
    minInterval: 1.12,
    timeDecay: 0.0018,
    batchBase: 6,
    batchRamp: 1,
    batchCap: 11,
    elapsedStep: 38,
    entryBurst: 8,
  },
  7: {
    baseInterval: 1.62,
    minInterval: 0.96,
    timeDecay: 0.0022,
    batchBase: 8,
    batchRamp: 1,
    batchCap: 14,
    elapsedStep: 34,
    entryBurst: 9,
  },
  8: {
    baseInterval: 1.46,
    minInterval: 0.86,
    timeDecay: 0.0025,
    batchBase: 9,
    batchRamp: 2,
    batchCap: 16,
    elapsedStep: 30,
    entryBurst: 10,
  },
  9: {
    baseInterval: 1.28,
    minInterval: 0.74,
    timeDecay: 0.0028,
    batchBase: 11,
    batchRamp: 2,
    batchCap: 19,
    elapsedStep: 26,
    entryBurst: 12,
  },
  10: bossOnlyProfile(),
};

export const STAGE_DIFFICULTIES = [
  { id: "easy", name: "Easy", statMul: 1 },
  { id: "normal", name: "Normal", statMul: 2 },
  { id: "hard", name: "Hard", statMul: 3 },
];

export function getStageDifficulty(id) {
  return STAGE_DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? STAGE_DIFFICULTIES[0];
}

export function getNextStageDifficultyId(id) {
  const currentIndex = STAGE_DIFFICULTIES.findIndex((difficulty) => difficulty.id === id);
  if (currentIndex < 0) return STAGE_DIFFICULTIES[1]?.id ?? null;
  return STAGE_DIFFICULTIES[currentIndex + 1]?.id ?? null;
}

function getStageDifficultyStatMultiplier(stageId, difficultyId) {
  return getStageDifficulty(difficultyId).statMul;
}

export const STAGES = [
  {
    id: 1,
    name: "\u7b2c\u4e00\u5e55",
    introText: "\u7b2c\u4e00\u5e55 \u958b\u59cb",
    waveMax: 10,
    waveSeconds: 45,
    entrySpawnCount: 9,
    bossWaves: [5, 10],
    enemy: {
      hpMul: 1,
      speedMul: 1,
      dmgMul: 1,
      spawnBatchMul: 0.78,
      spawnIntervalMul: 1.14,
      elapsedStepMul: 1,
      earlyFastWave: 3,
      earlyTankWave: 999,
      earlyBoarWave: 4,
      earlyKageboshiWave: 6,
      kageboshiWeightBase: 3,
      kageboshiWeightRamp: 0.5,
      kageboshiWeightMax: 5,
    },
    bosses: {
      5: {
        name: "\uff08\u3069\u306b\u3083\uff1f\uff09",
        hp: 3200,
        spd: 74,
        dmg: 24,
      },
      10: {
        name: "\uff08\u3069\u306b\u3083\uff1f\uff09",
        hp: 12400,
        spd: 82,
        dmg: 96,
      },
    },
    clear: {
      codaText: "\u3053\u306e\u591c\u3092\u4e57\u308a\u8d8a\u3048\u305f",
      codaSubText: "\u675f\u306e\u9593\u306e\u9759\u5bc2\u304c\u8a2a\u308c\u308b\u2026",
      resultTitle: "\u3069\u306b\u3083\u3092\u7953\u3063\u305f\uff01",
      resultSubText: "\u591c\u306f\u518d\u3073\u9759\u5bc2\u306b\u5305\u307e\u308c\u305f\u2026",
    },
  },
  {
    id: 2,
    name: "\u7b2c\u4e8c\u5e55",
    introText: "\u7b2c\u4e8c\u5e55 \u958b\u59cb",
    waveMax: 10,
    waveSeconds: 45,
    entrySpawnCount: 16,
    bossWaves: [5, 10],
    enemy: {
      hpMul: 1.28,
      speedMul: 1.08,
      dmgMul: 1.15,
      spawnBatchMul: 1.07,
      spawnIntervalMul: 0.95,
      elapsedStepMul: 1,
      earlyFastWave: 2,
      earlyTankWave: 999,
      earlyBoarWave: 3,
      earlyKageboshiWave: 3,
      kageboshiWeightBase: 2,
      kageboshiWeightRamp: 1,
      kageboshiWeightMax: 8,
      waveSpawnTuning: {
        1: { batchMul: 1.35, intervalMul: 0.88, entryMul: 1.5 },
        2: { batchMul: 0.9, intervalMul: 1.08, entryMul: 0.9 },
        3: { batchMul: 0.96, intervalMul: 1.04, entryMul: 0.95 },
        7: { batchMul: 1.08, intervalMul: 0.98, entryMul: 1.05 },
        8: { batchMul: 1.14, intervalMul: 0.97, entryMul: 1.05 },
        9: { batchMul: 1.12, intervalMul: 0.98, entryMul: 1.05 },
      },
    },
    bosses: {
      5: {
        name: "\u798d\u3069\u306b\u3083",
        hp: 5600,
        spd: 84,
        dmg: 38,
      },
      10: {
        name: "\u5927\u798d\u3069\u306b\u3083",
        hp: 18800,
        spd: 92,
        dmg: 112,
      },
    },
    clear: {
      codaText: "\u6df1\u304d\u591c\u3092\u7953\u3044\u5207\u3063\u305f",
      codaSubText: "\u9060\u304f\u3001\u591c\u660e\u3051\u306e\u6c17\u914d\u304c\u5dee\u3059\u2026",
      resultTitle: "\u7b2c\u4e8c\u5e55 \u7953\u3044\u5b8c\u4e86",
      resultSubText: "\u5996\u6c17\u306f\u671d\u9744\u306e\u4e2d\u3078\u6d88\u3048\u3066\u3044\u3063\u305f\u2026",
    },
  },
  {
    id: 3,
    name: "\u7b2c\u4e09\u5e55",
    introText: "\u7b2c\u4e09\u5e55 \u958b\u59cb",
    waveMax: 10,
    waveSeconds: 45,
    entrySpawnCount: 18,
    bossWaves: [5, 10],
    enemy: {
      hpMul: 1.48,
      speedMul: 1.12,
      dmgMul: 1.24,
      spawnBatchMul: 1.1,
      spawnIntervalMul: 0.94,
      elapsedStepMul: 1,
      earlyFastWave: 2,
      earlyTankWave: 999,
      earlyBoarWave: 2,
      earlyKageboshiWave: 2,
      kageboshiWeightBase: 3,
      kageboshiWeightRamp: 1,
      kageboshiWeightMax: 10,
      earlyKageboshiRedWave: 6,
      kageboshiRedWeightBase: 1,
      kageboshiRedWeightRamp: 1,
      kageboshiRedWeightMax: 4,
      waveSpawnTuning: {
        1: { batchMul: 0.95, intervalMul: 1.05, entryMul: 0.95 },
        2: { batchMul: 0.98, intervalMul: 1.02, entryMul: 1 },
        3: { batchMul: 1, intervalMul: 1, entryMul: 1 },
        7: { batchMul: 1.04, intervalMul: 0.98, entryMul: 1.03 },
        8: { batchMul: 1.06, intervalMul: 0.97, entryMul: 1.04 },
        9: { batchMul: 1.08, intervalMul: 0.96, entryMul: 1.05 },
      },
    },
    bosses: {
      5: {
        name: "\u5f71\u798d\u3069\u306b\u3083",
        hp: 7600,
        spd: 90,
        dmg: 46,
      },
      10: {
        name: "\u5927\u5f71\u798d\u3069\u306b\u3083",
        hp: 24600,
        spd: 98,
        dmg: 132,
      },
    },
    clear: {
      codaText: "\u77f3\u7573\u306e\u95c7\u3092\u629c\u3051\u305f",
      codaSubText: "\u8db3\u5143\u306e\u51b7\u305f\u3055\u304c\u3001\u591c\u306e\u6df1\u3055\u3092\u544a\u3052\u308b\u2026",
      resultTitle: "\u7b2c\u4e09\u5e55 \u7953\u3044\u5b8c\u4e86",
      resultSubText: "\u7d05\u3044\u5f71\u306f\u77f3\u306e\u9699\u9593\u3078\u6d88\u3048\u305f\u2026",
    },
  },
];

export function getStage(stageId) {
  return STAGES.find((stage) => stage.id === stageId) || STAGES[0];
}

export function getNextStageId(stageId) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === stageId);
  const next = STAGES[currentIndex + 1];
  return next ? next.id : null;
}

export function getStageClearText(stageId) {
  return getStage(stageId).clear;
}

export function isBossWave(stageId, wave) {
  return getStage(stageId).bossWaves.includes(wave);
}

export const ENEMY_TYPE_KAGEBOSHI = 7;
export const ENEMY_TYPE_KAGEBOSHI_RED = 8;

export const KAGEBOSHI_ENEMY_TEMPLATE = {
  id: "kageboshi",
  name: "影法師",
  role: "ranged",
  type: ENEMY_TYPE_KAGEBOSHI,
  r: 18,
  hp: 72,
  spd: 72,
  dmg: 16,
  color: "#7050d8",
  preferredRange: 310,
  attackRange: 460,
  projectileSpeed: 235,
  projectileRadius: 10,
  projectileColor: "#8c65ff",
  attackInterval: 1.05,
};

export const KAGEBOSHI_RED_ENEMY_TEMPLATE = {
  ...KAGEBOSHI_ENEMY_TEMPLATE,
  id: "kageboshi_red",
  name: "紅影法師",
  type: ENEMY_TYPE_KAGEBOSHI_RED,
  r: 20,
  hp: 128,
  spd: 78,
  dmg: 22,
  color: "#b84a5a",
  preferredRange: 330,
  attackRange: 500,
  projectileSpeed: 340,
  projectileRadius: 11,
  projectileDamage: 18,
  projectileColor: "#ff4f7c",
  attackInterval: 0.98,
};

export function getKageboshiEnemyTemplate(stageId, difficultyId = "easy") {
  const stage = getStage(stageId);
  return scaleEnemy(stage.enemy, KAGEBOSHI_ENEMY_TEMPLATE, getStageDifficultyStatMultiplier(stageId, difficultyId));
}

export function getKageboshiRedEnemyTemplate(stageId, difficultyId = "easy") {
  const stage = getStage(stageId);
  return scaleEnemy(stage.enemy, KAGEBOSHI_RED_ENEMY_TEMPLATE, getStageDifficultyStatMultiplier(stageId, difficultyId));
}

export function getWaveProfile(stageId, wave) {
  const stage = getStage(stageId);
  const base = BASE_WAVE_PROFILES[wave] || bossOnlyProfile();
  if (isBossWave(stageId, wave)) return { ...base };

  const enemy = stage.enemy;
  const tuning = enemy.waveSpawnTuning?.[wave] ?? {};
  return {
    ...base,
    baseInterval: base.baseInterval * enemy.spawnIntervalMul * (tuning.intervalMul ?? 1),
    minInterval: base.minInterval * enemy.spawnIntervalMul * (tuning.intervalMul ?? 1),
    batchBase: Math.max(1, Math.round(base.batchBase * enemy.spawnBatchMul * (tuning.batchMul ?? 1))),
    batchRamp: Math.max(1, Math.round(base.batchRamp * enemy.spawnBatchMul * (tuning.batchMul ?? 1))),
    batchCap: Math.max(1, Math.round(base.batchCap * enemy.spawnBatchMul * (tuning.batchMul ?? 1))),
    elapsedStep: Math.max(10, Math.round(base.elapsedStep * enemy.elapsedStepMul)),
    entryBurst: Math.max(1, Math.round(base.entryBurst * enemy.spawnBatchMul * (tuning.entryMul ?? 1))),
  };
}

export function getEnemyTemplate(stageId, wave = 1, difficultyId = "easy") {
  const stage = getStage(stageId);
  const enemy = stage.enemy;
  const difficultyMul = getStageDifficultyStatMultiplier(stageId, difficultyId);
  const pool = [];

  pool.push(scaleEnemy(enemy, {
    w: wave <= 2 ? 58 : wave <= 4 ? 40 : 22,
    type: 0,
    r: 18,
    hp: wave <= 2 ? 24 : wave <= 4 ? 32 : 40,
    spd: wave <= 2 ? 96 : 102,
    dmg: 18,
    color: "#c86cff",
  }, difficultyMul));
  pool.push(scaleEnemy(enemy, {
    w: wave <= 2 ? 16 : wave <= 4 ? 24 : 28,
    type: 1,
    r: 18,
    hp: wave <= 2 ? 46 : wave <= 4 ? 60 : 76,
    spd: wave <= 2 ? 52 : 58,
    dmg: 14,
    color: "#ffb14a",
  }, difficultyMul));

  if (wave >= enemy.earlyFastWave) {
    pool.push(scaleEnemy(enemy, {
      w: wave <= 4 ? 10 : wave <= 8 ? 16 : 22,
      type: 4,
      r: 9,
      hp: wave <= 4 ? 14 : wave <= 8 ? 20 : 26,
      spd: wave <= 4 ? 178 : 188,
      dmg: wave <= 4 ? 12 : 14,
      color: "#88eeff",
    }, difficultyMul));
  }

  if (wave >= enemy.earlyTankWave) {
    pool.push(scaleEnemy(enemy, {
      w: wave <= 8 ? 5 : 9,
      type: 5,
      r: 22,
      hp: wave <= 8 ? 240 : 320,
      spd: wave <= 8 ? 38 : 42,
      dmg: wave <= 8 ? 20 : 26,
      color: "#aaa080",
      noKnock: true,
    }, difficultyMul));
  }

  if (wave >= enemy.earlyBoarWave) {
    pool.push(scaleEnemy(enemy, {
      w: wave <= 6 ? 3 : wave <= 8 ? 5 : 7,
      type: 6,
      r: 24,
      hp: wave <= 6 ? 68 : wave <= 8 ? 86 : 108,
      spd: wave <= 6 ? 60 : 66,
      dmg: wave <= 6 ? 20 : 26,
      color: "#8b5740",
    }, difficultyMul));
  }

  const kageboshiStartWave = enemy.earlyKageboshiWave ?? 999;
  if (wave >= kageboshiStartWave) {
    const kageboshiWeight = Math.min(
      enemy.kageboshiWeightMax ?? 5,
      Math.round((enemy.kageboshiWeightBase ?? 3) + (wave - kageboshiStartWave) * (enemy.kageboshiWeightRamp ?? 0.5))
    );
    pool.push(scaleEnemy(enemy, {
      ...KAGEBOSHI_ENEMY_TEMPLATE,
      w: Math.max(1, kageboshiWeight),
    }, difficultyMul));
  }

  const kageboshiRedStartWave = enemy.earlyKageboshiRedWave ?? 999;
  if (wave >= kageboshiRedStartWave) {
    const kageboshiRedWeight = Math.min(
      enemy.kageboshiRedWeightMax ?? 4,
      Math.round((enemy.kageboshiRedWeightBase ?? 1) + (wave - kageboshiRedStartWave) * (enemy.kageboshiRedWeightRamp ?? 1))
    );
    pool.push(scaleEnemy(enemy, {
      ...KAGEBOSHI_RED_ENEMY_TEMPLATE,
      w: Math.max(1, kageboshiRedWeight),
    }, difficultyMul));
  }

  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= t.w;
    if (r <= 0) return t;
  }
  return pool[0];
}

export function getBossConfig(stageId, wave, difficultyId = "easy") {
  const stage = getStage(stageId);
  const lastBossWave = stage.bossWaves[stage.bossWaves.length - 1];
  const boss = stage.bosses[wave] || stage.bosses[lastBossWave];
  const difficultyMul = getStageDifficultyStatMultiplier(stageId, difficultyId);
  return {
    ...boss,
    hp: Math.round(boss.hp * difficultyMul),
    spd: Math.round(boss.spd * difficultyMul),
    dmg: Math.round(boss.dmg * difficultyMul),
  };
}

function scaleEnemy(enemy, template, difficultyMul = 1) {
  return {
    ...template,
    hp: Math.round(template.hp * enemy.hpMul * difficultyMul),
    spd: Math.round(template.spd * enemy.speedMul * difficultyMul),
    dmg: Math.round(template.dmg * enemy.dmgMul * difficultyMul),
  };
}

function bossOnlyProfile() {
  return {
    baseInterval: 99,
    minInterval: 99,
    timeDecay: 0,
    batchBase: 0,
    batchRamp: 0,
    batchCap: 0,
    elapsedStep: 999,
    entryBurst: 0,
  };
}
