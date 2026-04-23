// 武器定義一覧
// weaponType は武器処理の分類に使う

import { getHero, getUniqueEvolutionWeaponIds } from "./heroes.js";

export const WEAPONS = [
  {
    weaponId: "ofuda",
    name: "起爆札",
    desc: "起爆札を放ち、命中時に爆ぜて周囲を巻き込む。",
    weaponType: "ranged",
    maxLevel: 5,
    base: {
      dmg: 22,
      fireRate: 1.05,
      projSpeed: 620,
      pierce: 0,
      multi: 1,
      homing: 0,
      blastRadius: 56,
      blastDmg: 18,
    },
    scale: {
      dmg: 1.22,
      fireRate: 1.08,
      multi: 1,
      blastRadius: 1.08,
      blastDmg: 1.18,
    },
  },
  {
    weaponId: "petal",
    name: "花びら",
    desc: "花びらを放って敵を切り裂く。",
    weaponType: "ranged",
    maxLevel: 5,
    base: {
      dmg: 8,
      fireRate: 2.75,
      projSpeed: 650,
      pierce: 0,
      multi: 1,
      homing: 0.26,
      life: 1.78,
      returnAfter: 0.54,
    },
    scale: { dmg: 1.24, fireRate: 1.16, multi: 1 },
  },
  {
    weaponId: "orbit",
    name: "霊晶",
    desc: "霊晶がプレイヤーの周囲を巡って敵に触れる。",
    weaponType: "orbit",
    maxLevel: 5,
    base: {
      dmg: 10,
      orbitCount: 2,
      orbitRadius: 82,
      orbitSpeed: 2.32,
      hitInterval: 0.15,
    },
    scale: { dmg: 1.14, orbitCount: 1, orbitRadius: 1.03 },
  },
  {
    weaponId: "slash",
    name: "斬撃",
    desc: "前方を扇状に切り払い、範囲内の敵と遠距離弾を斬り払う。",
    weaponType: "special",
    maxLevel: 5,
    base: {
      dmg: 42,
      interval: 0.9,
      range: 122,
      angleDeg: 82,
      pierce: 1,
      multi: 1,
      knock: 70,
    },
    scale: {
      dmg: 1.35,
      interval: 0.93,
      range: 1.08,
      angleDeg: 1.04,
      pierce: 1,
    },
  },
  {
    weaponId: "thunder",
    name: "落雷",
    desc: "視界内の敵を狙って頭上に雷を落とし、近くの敵へ電撃が連鎖する。",
    weaponType: "special",
    maxLevel: 5,
    base: {
      dmg: 32,
      interval: 1.35,
      targetRange: 420,
      radius: 24,
      height: 170,
      count: 1,
      chainCount: 1,
      chainRange: 120,
      chainFalloff: 0.78,
    },
    scale: {
      dmg: 1.25,
      radius: 1.15,
      count: 1,
      interval: 0.94,
      chainCount: 1,
      chainRange: 1.05,
      chainFalloff: 0.94,
    },
  },

  // ==============================
  // 進化武器定義
  // 基本武器Lv5と対応ステータスLv1以上で解放
  // ==============================
  {
    weaponId: "blastchain",
    name: "爆符連鎖",
    desc: "【進化】起爆札＋護符Lv1。起爆札Lv5の扇状同時発射を引き継ぎ、命中時の爆発が近くの敵へ連鎖して連続で爆ぜる。",
    weaponType: "ranged",
    isEvolved: true,
    evolveWeaponId: "ofuda",
    requiredStatKey: "hpMax",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 74,
      fireRate: 1.45,
      projSpeed: 620,
      pierce: 1,
      multi: 4,
      homing: 0,
      blastRadius: 72,
      blastDmg: 32,
      chainCount: 1,
      chainRange: 92,
      chainRadius: 50,
      chainBlastDmg: 20,
      chainFalloff: 0.68,
    },
    scale: {},
  },
  {
    weaponId: "senrenfuda",
    name: "千連札",
    desc: "【進化】起爆札＋護符Lv2。札の数と貫通力を増し、広い扇状に連続で撃ち出して敵陣を押し込む共通進化。",
    weaponType: "ranged",
    isEvolved: true,
    evolveWeaponId: "ofuda",
    requiredStatKey: "hpMax",
    requiredStatLevel: 2,
    maxLevel: 1,
    base: {
      dmg: 58,
      fireRate: 1.32,
      projSpeed: 660,
      pierce: 2,
      multi: 3,
      homing: 0.06,
      blastRadius: 64,
      blastDmg: 24,
    },
    scale: {},
  },
  {
    weaponId: "blossomstorm",
    name: "桜嵐",
    desc: "【進化】花びら＋神速Lv1。自らを中心に二重螺旋の桜吹雪を巻き起こし、外へ広がる花弁で敵を切り裂く。",
    weaponType: "orbit",
    isEvolved: true,
    evolveWeaponId: "petal",
    requiredStatKey: "aspd",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 20,
      spiralInterval: 0.085,
      spiralArms: 4,
      spiralTurnSpeed: 8.8,
      projSpeed: 440,
      radialDrift: 50,
      homing: 0.025,
      lifeMin: 0.86,
      lifeMax: 1.02,
      knock: 36,
      petalTrail: true,
    },
    scale: {},
  },
  {
    weaponId: "fujinranbu",
    name: "藤迅乱舞",
    desc: "【進化】花びら＋神速Lv2。花弁の数と追尾力を高め、往復しながら周囲を切り裂く共通進化。",
    weaponType: "ranged",
    isEvolved: true,
    evolveWeaponId: "petal",
    requiredStatKey: "aspd",
    requiredStatLevel: 2,
    maxLevel: 1,
    base: {
      dmg: 15,
      fireRate: 3.35,
      projSpeed: 700,
      pierce: 1,
      multi: 4,
      homing: 0.34,
      life: 1.96,
      returnAfter: 0.6,
    },
    scale: {},
  },
  {
    weaponId: "raiukekkai",
    name: "紫電天雷",
    desc: "【進化】落雷＋拡界Lv1。視界内の敵にランダムで頻繁に落雷し、範囲ダメージを与えつつ感電が敵間に連鎖する。",
    weaponType: "area",
    isEvolved: true,
    evolveWeaponId: "thunder",
    requiredStatKey: "area",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dps: 10, // 近接オーラの継続ダメージ
      auraRadius: 90, // 近接オーラの表示半径
      strikeInterval: 0.22, // 落雷発生間隔
      strikeDmg: 36, // 落雷1発のダメージ
      strikeRadius: 42, // 落雷の範囲ダメージ半径
      strikeRange: 420, // 落雷対象として選ばれる範囲
      strikeCount: 4, // 同時に落とす雷の本数
      chainCount: 5, // 連鎖する最大回数
      chainRange: 110, // 雷が連鎖する距離
      chainFalloff: 0.36, // 連鎖ダメージ減衰
      shockDuration: 1.5, // 感電状態の持続時間
    },
    scale: {},
  },
  {
    weaponId: "raijinpa",
    name: "雷迅波",
    desc: "【進化】落雷＋拡界Lv2。狙える範囲と落雷本数を増やし、電撃の連鎖で一帯を薙ぐ共通進化。",
    weaponType: "special",
    isEvolved: true,
    evolveWeaponId: "thunder",
    requiredStatKey: "area",
    requiredStatLevel: 2,
    maxLevel: 1,
    base: {
      dmg: 46,
      interval: 0.92,
      targetRange: 520,
      radius: 34,
      height: 182,
      count: 3,
      chainCount: 3,
      chainRange: 144,
      chainFalloff: 0.8,
    },
    scale: {},
  },
  {
    weaponId: "reppufuda",
    name: "翆玉",
    desc: "【進化】霊晶＋引寄せLv1。翆玉が危険な速度で周囲を巡り、近づく敵を切り刻む。",
    weaponType: "orbit",
    isEvolved: true,
    evolveWeaponId: "orbit",
    requiredStatKey: "magnet",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 17,
      orbitCount: 6,
      orbitRadius: 88,
      orbitSpeed: 5.45,
      hitInterval: 0.1,
    },
    scale: {},
  },
  {
    weaponId: "hannekekkai",
    name: "反禍結界",
    desc: "【進化】霊晶＋引寄せLv2。自身を中心に退魔結界を張り、近づく敵を削りつつ周期的な衝撃波で押し返す共通進化。",
    weaponType: "area",
    isEvolved: true,
    evolveWeaponId: "orbit",
    requiredStatKey: "magnet",
    requiredStatLevel: 2,
    maxLevel: 1,
    base: {
      dps: 24,
      radius: 102,
      pulseInterval: 1.7,
      pulseRadius: 136,
      pulseDmg: 34,
      pulseKnock: 96,
    },
    scale: {},
  },
  {
    weaponId: "reppuzan",
    name: "烈風斬",
    desc: "【進化】斬撃＋呪力Lv1。巨大な烈風で広範囲を切り裂き、遠距離弾をまとめて斬り払う。",
    weaponType: "special",
    isEvolved: true,
    evolveWeaponId: "slash",
    requiredStatKey: "atk",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 74,
      interval: 0.58,
      range: 178,
      angleDeg: 118,
      pierce: 8,
      multi: 2,
      knock: 110,
    },
    scale: {},
  },
  {
    weaponId: "mikazukizan",
    name: "三日月斬",
    desc: "【進化】斬撃＋呪力Lv2。半月状の斬波を前方へ重ねて放ち、広めの射程で敵と弾をまとめて切り払う共通進化。",
    weaponType: "special",
    isEvolved: true,
    evolveWeaponId: "slash",
    requiredStatKey: "atk",
    requiredStatLevel: 2,
    maxLevel: 1,
    base: {
      dmg: 58,
      interval: 0.7,
      range: 154,
      angleDeg: 102,
      pierce: 4,
      multi: 2,
      knock: 88,
    },
    scale: {},
  },
];

export function getWeapon(weaponId) {
  return WEAPONS.find((w) => w.weaponId === weaponId) || null;
}

export function getEvolvedWeapons() {
  return WEAPONS.filter((w) => w.isEvolved);
}

export function getEvolutionWeaponsForBase(baseWeaponId) {
  return getEvolvedWeapons().filter((w) => w.evolveWeaponId === baseWeaponId);
}

// 進化条件を満たした武器を列挙
export function getEvolutionRecipe(player) {
  const ownedIds = new Set(player.weapons.map((w) => w.weaponId));
  const hero = getHero(player.heroId);
  const uniqueEvolutionWeaponId = hero?.uniqueEvolutionWeaponId ?? null;
  const uniqueEvolutionWeaponIds = new Set(getUniqueEvolutionWeaponIds());
  const results = [];
  for (const w of getEvolvedWeapons()) {
    if (ownedIds.has(w.weaponId)) continue; // 既に所持している進化武器は除外
    if (
      uniqueEvolutionWeaponIds.has(w.weaponId) &&
      w.weaponId !== uniqueEvolutionWeaponId
    ) {
      continue;
    }
    const baseWeaponId = w.evolveWeaponId;
    const statKey = w.requiredStatKey;
    const statLevel = w.requiredStatLevel ?? 1;
    const ent = player.weapons.find((e) => e.weaponId === baseWeaponId);
    const def = WEAPONS.find((d) => d.weaponId === baseWeaponId);
    if (!ent || !def || !statKey) continue;
    if (
      ent.level >= def.maxLevel &&
      (player.statLevels?.[statKey] ?? 0) >= statLevel
    ) {
      results.push({
        ...w,
        isUniqueEvolution: w.weaponId === uniqueEvolutionWeaponId,
      });
    }
  }
  return results;
}
