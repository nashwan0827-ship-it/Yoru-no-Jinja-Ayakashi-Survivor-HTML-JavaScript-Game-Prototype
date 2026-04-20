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
      earlyTankWave: 5,
      earlyBoarWave: 4,
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
    waveSeconds: 42,
    entrySpawnCount: 16,
    bossWaves: [5, 10],
    enemy: {
      hpMul: 1.28,
      speedMul: 1.08,
      dmgMul: 1.15,
      spawnBatchMul: 1.18,
      spawnIntervalMul: 0.86,
      elapsedStepMul: 0.9,
      earlyFastWave: 2,
      earlyTankWave: 4,
      earlyBoarWave: 3,
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

export function getWaveProfile(stageId, wave) {
  const stage = getStage(stageId);
  const base = BASE_WAVE_PROFILES[wave] || bossOnlyProfile();
  if (isBossWave(stageId, wave)) return { ...base };

  const enemy = stage.enemy;
  return {
    ...base,
    baseInterval: base.baseInterval * enemy.spawnIntervalMul,
    minInterval: base.minInterval * enemy.spawnIntervalMul,
    batchBase: Math.max(1, Math.round(base.batchBase * enemy.spawnBatchMul)),
    batchRamp: Math.max(1, Math.round(base.batchRamp * enemy.spawnBatchMul)),
    batchCap: Math.max(1, Math.round(base.batchCap * enemy.spawnBatchMul)),
    elapsedStep: Math.max(10, Math.round(base.elapsedStep * enemy.elapsedStepMul)),
    entryBurst: Math.max(1, Math.round(base.entryBurst * enemy.spawnBatchMul)),
  };
}

export function getEnemyTemplate(stageId, wave = 1) {
  const stage = getStage(stageId);
  const enemy = stage.enemy;
  const pool = [];

  pool.push(scaleEnemy(enemy, {
    w: wave <= 2 ? 58 : wave <= 4 ? 40 : 22,
    type: 0,
    r: 18,
    hp: wave <= 2 ? 24 : wave <= 4 ? 32 : 40,
    spd: wave <= 2 ? 96 : 102,
    dmg: 18,
    color: "#c86cff",
  }));
  pool.push(scaleEnemy(enemy, {
    w: wave <= 2 ? 16 : wave <= 4 ? 24 : 28,
    type: 1,
    r: 18,
    hp: wave <= 2 ? 46 : wave <= 4 ? 60 : 76,
    spd: wave <= 2 ? 52 : 58,
    dmg: 14,
    color: "#ffb14a",
  }));

  if (wave >= enemy.earlyFastWave) {
    pool.push(scaleEnemy(enemy, {
      w: wave <= 4 ? 10 : wave <= 8 ? 16 : 22,
      type: 4,
      r: 9,
      hp: wave <= 4 ? 14 : wave <= 8 ? 20 : 26,
      spd: wave <= 4 ? 178 : 188,
      dmg: wave <= 4 ? 12 : 14,
      color: "#88eeff",
    }));
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
    }));
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
    }));
  }

  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= t.w;
    if (r <= 0) return t;
  }
  return pool[0];
}

export function getBossConfig(stageId, wave) {
  const stage = getStage(stageId);
  const lastBossWave = stage.bossWaves[stage.bossWaves.length - 1];
  return stage.bosses[wave] || stage.bosses[lastBossWave];
}

function scaleEnemy(enemy, template) {
  return {
    ...template,
    hp: Math.round(template.hp * enemy.hpMul),
    spd: Math.round(template.spd * enemy.speedMul),
    dmg: Math.round(template.dmg * enemy.dmgMul),
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
