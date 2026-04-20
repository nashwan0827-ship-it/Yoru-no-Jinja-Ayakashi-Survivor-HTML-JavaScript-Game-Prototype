import { HEROES } from "../data/heroes.js";
import { initWeapons } from "../data/upgrades.js";
import { getEnemyTemplate, getStage } from "../data/stages.js";
import { clamp, rand } from "../core/utils.js";
import { createDebugState } from "../debug/config.js";
import { PLAYER_CENTER_Y_OFFSET } from "./combatOffsets.js";
import {
  getDefaultEquippedFamiliarId,
  getDefaultUnlockedFamiliarIds,
} from "../data/familiars.js";

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
    unlockedStageMax: 1,
    familiarProgress: {
      unlockedFamiliars: getDefaultUnlockedFamiliarIds(),
      equippedFamiliarId: getDefaultEquippedFamiliarId(),
      familiarLevel: {},
      familiarCountBonus: 0,
    },

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
      items: [],
      discoveredWeaponIds: new Set(),
      weaponLimit: 3,
      itemLimit: 3,
      statLevels: { atk: 0, aspd: 0, area: 0, hpMax: 0, magnet: 0, familiarBoost: 0 }, // スタット強化レベル
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

    spawn: {
      enemyTemplate: (wave) => getEnemyTemplate(state.stage, wave),
      spawnEnemyRing: (count) => spawnEnemyRing(state, count),
      hasBossAlive: () => state.enemies.some((e) => e.isBoss),
    },
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
    // 進行状況を初期状態へ戻す
    state.timeSurvived = 0;
    state.kills = 0;
    state.score = 0;
    p.items = [];
    p.statLevels = { atk: 0, aspd: 0, area: 0, hpMax: 0, magnet: 0, familiarBoost: 0 };
    p.regen = p.baseRegen ?? 0;
    p.xpGainMul = 1;
    p.atkMul = 1;
    p.aspdMul = 1;
    p.areaMul = 1;
  }

  // 戦場上のエンティティを全消去
  state.enemies.length = 0;
  state.activeFamiliars.length = 0;
  state.projectiles.length = 0;
  state.hostileProjectiles.length = 0;
  state.drops.length = 0;
  state.fx.length = 0;
  state.petals.length = 0;
  state.damageStats = {};
  state.priorityTarget = null;

  // 一時状態と内部タイマーを初期化
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

  // プレイヤー座標と向きを初期位置へ戻す
  p.x = 0;
  p.y = 0;
  p.iFrames = 0;
  p.moving = false;
  p.facing = 1;

  if (!preserveProgress) {
    p.xp = 0;
    p.level = 1;
    p.xpToNext = 40;
  }

  for (const key of Object.keys(p)) {
    if (key.startsWith("_fireCD_")) {
      delete p[key];
    }
  }
  for (const key of TRANSIENT_PLAYER_KEYS) {
    delete p[key];
  }
}

export function applyStageSettings(state) {
  const stage = getStage(state.stage);
  state.stageTime = stage.waveSeconds;
  state.wave = 1;
  state.waveMax = stage.waveMax;
  state.nextWaveTime = stage.waveSeconds;
}

function spawnEnemyRing(state, count) {
  const p = state.player;
  let fastPackSpawned = false;

  for (let i = 0; i < count; i++) {
    const t = getEnemyTemplate(state.stage, state.wave);

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
  if (!map) return true;

  const dx = x - map.centerX;
  const dy = y - map.centerY;
  const maxR = Math.max(0, map.radius - margin);
  return dx * dx + dy * dy <= maxR * maxR;
}

function clampPointInsideMap(state, x, y, margin = 0) {
  const map = state.map;
  if (!map) return { x, y };

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
