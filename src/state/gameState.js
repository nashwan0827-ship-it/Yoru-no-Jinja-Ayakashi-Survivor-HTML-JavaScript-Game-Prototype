import { HEROES } from "../data/heroes.js";
import { initWeapons } from "../data/upgrades.js";
import { getPermanentUpgradeBonuses } from "../data/permanentUpgrades.js";
import { getStage } from "../data/stages.js";
import { clamp } from "../core/utils.js";
import { createDebugState } from "../debug/config.js";
import {
  getDefaultEquippedFamiliarId,
  getDefaultUnlockedFamiliarIds,
} from "../data/familiars.js";
import { createDefaultAchievementProgress } from "../data/achievements.js";

const TRANSIENT_PLAYER_KEYS = ["ofudaRate"];

export function createGameState() {
  const state = {
    stage: 1, // 現在のステージ番号
    stageTime: 45, // ステージ進行時間の基準値
    started: false,
    pausedForChoice: false,
    gameEnded: false,

    selectedHeroId: 1,
    selectedStageId: 1,
    selectedDifficultyId: "easy",
    unlockedStageMax: 1,
    unlockedDifficulties: { 1: ["easy"], 2: ["easy"], 3: ["easy"] },
    soulShards: 0,
    runSoulShards: 0,
    unlockedHeroIds: [1],
    permanentUpgrades: {},
    familiarProgress: {
      unlockedFamiliars: getDefaultUnlockedFamiliarIds(),
      equippedFamiliarId: getDefaultEquippedFamiliarId(),
      familiarLevel: {},
      familiarMastery: {},
      familiarCountBonus: 0,
    },
    achievementProgress: createDefaultAchievementProgress(),

    // ボス出現状態
    bossActive: false,
    nextBossAt: 500, // ボス出現用の内部しきい値
    bossCount: 0, // 出現済みボスの累計数

    // プレイヤー基本状態
    player: {
      x: 0,
      y: 0,
      r: 14,
      hp: 120,
      hpMax: 120,
      speed: 220,
      iFrames: 0,

      magnet: 130,
      regen: 0, // 持続回復量（毎秒）
      baseRegen: 0,
      xpGainMul: 1,
      atkMul: 1,
      aspdMul: 1,
      areaMul: 1,
      xp: 0,
      level: 1,
      xpToNext: 40,
      heroId: 1,

      moving: false,
      facing: 1,

      // 武器とアイテムの所持状態
      weapons: [], // [{ weaponId, level }]
      items: ["familiarBoost"],
      discoveredWeaponIds: new Set(),
      weaponLimit: 3,
      itemLimit: 4,
      statLevels: { atk: 0, aspd: 0, area: 0, hpMax: 0, magnet: 0, familiarBoost: 1 }, // スタット強化レベル
    },

    timeSurvived: 0,
    kills: 0,
    wave: 1,
    waveMax: 10, // 1ステージ内の最大ウェーブ数
    nextWaveTime: 45, // 45秒ごとにウェーブ進行
    score: 0,

    enemies: [],
    activeFamiliars: [],
    projectiles: [],
    hostileProjectiles: [],
    drops: [],
    fx: [],
    petals: [],
    upgrades: {},
    damageStats: {},
    priorityTarget: null,

    hitStop: 0,
    debug: createDebugState(),
    bossWarning: null,
    stageClearCoda: null,
    map: {
      enabled: true,
      centerX: 0,
      centerY: 0,
      radius: 4200,
      slowRadius: 3600,
      ringWidth: 24,
    },
    ui: {
      showLoadoutPanels: true,
      showEnemyHpBars: false,
      showMiniMap: true,
    },

    // 内部クールダウン
    _fireCD: 0,
    _ofudaCD: 0,
    _spawnTimer: 0,
    _lastSavedAchievementTotalKills: 0,
  };

  state.player.x = 0;
  state.player.y = 0;
  state.boss = {
    nextAtKills: 50,
    alive: false,
    _prevActive: false,
  };

  return state;
}

export function applyHeroStats(state, heroId) {
  const hero = HEROES.find((h) => h.id === heroId) || HEROES[0];
  const s = hero.stats;
  const p = state.player;

  // 主人公の基本ステータスを反映
  p.hpMax = s.hp;
  p.hp = s.hp;
  p.speed = s.speed;
  p.magnet = s.magnet;
  p.heroId = hero.id;
  p.baseRegen = s.regen ?? 0;
  p.regen = p.baseRegen;

  p.xp = 0;
  p.level = 1;
  p.xpToNext = 40;

  // 初期武器を設定して戦闘状態を初期化
  initWeapons(p, hero.startingWeaponId);
  resetBattleSceneState(state);
  applyPermanentUpgrades(state);
}

function applyPermanentUpgrades(state) {
  const p = state.player;
  const bonuses = getPermanentUpgradeBonuses(state.permanentUpgrades);

  const hpMax = Math.round(p.hpMax * bonuses.hpMul);
  p.hpMax = hpMax;
  p.hp = hpMax;
  p.speed = Math.round(p.speed * bonuses.speedMul);
  p.magnet = Math.round(p.magnet * bonuses.magnetMul);
  p.atkMul = (p.atkMul ?? 1) * bonuses.damageMul;
  p.aspdMul = (p.aspdMul ?? 1) * bonuses.attackSpeedMul;
  p.permanentFamiliarDamageMul = bonuses.familiarDamageMul;
  p.permanentFamiliarAttackSpeedMul = bonuses.familiarAttackSpeedMul;
}

export function resetBattleSceneState(
  state,
  { preserveProgress = false, preserveUpgrades = false } = {},
) {
  const p = state.player;

  if (!preserveProgress) {
    state.stage = 1;
  }

  applyStageSettings(state);

  // 戦闘進行フラグを初期化
  state.started = false;
  state.pausedForChoice = false;
  state.gameEnded = false;

  if (!preserveProgress) {
    resetBattleProgress(state, p);
  }

  clearBattleEntities(state);
  resetBattleRuntimeState(state, preserveProgress, preserveUpgrades);
  resetPlayerSceneState(p);

  if (!preserveProgress) {
    resetPlayerProgress(p);
  }

  clearPlayerTransientState(p);
}

function resetBattleProgress(state, player) {
  state.timeSurvived = 0;
  state.kills = 0;
  state.score = 0;
  state.runSoulShards = 0;

  player.items = ["familiarBoost"];
  player.itemLimit = 4;
  player.statLevels = { atk: 0, aspd: 0, area: 0, hpMax: 0, magnet: 0, familiarBoost: 1 };
  player.regen = player.baseRegen ?? 0;
  player.xpGainMul = 1;
  player.atkMul = 1;
  player.aspdMul = 1;
  player.areaMul = 1;
}

function clearBattleEntities(state) {
  state.enemies.length = 0;
  state.activeFamiliars.length = 0;
  state.projectiles.length = 0;
  state.hostileProjectiles.length = 0;
  state.drops.length = 0;
  state.fx.length = 0;
  state.petals.length = 0;
  state.damageStats = {};
  state.priorityTarget = null;
}

function resetBattleRuntimeState(state, preserveProgress, preserveUpgrades) {
  state.hitStop = 0;
  state.bossActive = false;
  state.nextBossAt = 500;
  state.bossCount = preserveProgress ? state.bossCount || 0 : 0;
  state.boss = {
    nextAtKills: preserveProgress ? state.kills + 50 : 50,
    alive: false,
    _prevActive: false,
  };

  if (!preserveUpgrades) {
    state.upgrades = {};
  }

  state._fireCD = 0;
  state._ofudaCD = 0;
  state._spawnTimer = 0;
  state._shouldGameOver = false;
  state._shouldStageClear = false;
  state._bossDefeatedPending = false;
  state._lastDefeatedBossName = "";
  state.bossWarning = null;
  state.stageClearCoda = null;
  state._orbitAngle = 0;
  state._orbitInfo = null;
  state._orbitHitCD = {};
  state._auraFxT = 0;
  state._barrierFxCD = 0;
}

function resetPlayerSceneState(player) {
  player.x = 0;
  player.y = 0;
  player.iFrames = 0;
  player.moving = false;
  player.facing = 1;
}

function resetPlayerProgress(player) {
  player.xp = 0;
  player.level = 1;
  player.xpToNext = 40;
}

function clearPlayerTransientState(player) {
  for (const key of Object.keys(player)) {
    if (key.startsWith("_fireCD_")) {
      delete player[key];
    }
  }
  for (const key of TRANSIENT_PLAYER_KEYS) {
    delete player[key];
  }
}

export function applyStageSettings(state) {
  const stage = getStage(state.stage);
  state.stageTime = stage.waveSeconds;
  state.wave = 1;
  state.waveMax = stage.waveMax;
  state.nextWaveTime = stage.waveSeconds;
}
