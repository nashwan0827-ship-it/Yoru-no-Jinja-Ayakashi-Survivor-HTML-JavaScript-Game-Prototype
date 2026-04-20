// 武器定義一覧
// weaponType は武器処理の分類に使う

export const WEAPONS = [
  {
    weaponId: "ofuda",
    name: "起爆札",
    desc: "起爆札を放ち、命中時に爆ぜて周囲を巻き込む。",
    weaponType: "ranged",
    maxLevel: 5,
    base: {
      dmg: 25,
      fireRate: 1.15,
      projSpeed: 620,
      pierce: 0,
      multi: 1,
      homing: 0,
      blastRadius: 64,
      blastDmg: 24,
    },
    scale: { dmg: 1.28, fireRate: 1.1, multi: 1, blastRadius: 1.12, blastDmg: 1.26 },
  },
  {
    weaponId: "petal",
    name: "花びら",
    desc: "花びらを放って敵を切り裂く。",
    weaponType: "ranged",
    maxLevel: 5,
    base: {
      dmg: 8,
      fireRate: 3,
      projSpeed: 640,
      pierce: 0,
      multi: 1,
      homing: 0.28,
    },
    scale: { dmg: 1.3, fireRate: 1.25 },
  },
  {
    weaponId: "orbit",
    name: "霊晶",
    desc: "霊晶がプレイヤーの周囲を巡って敵に触れる。",
    weaponType: "orbit",
    maxLevel: 5,
    base: { dmg: 10, orbitCount: 2, orbitRadius: 68, orbitSpeed: 2.2, hitInterval: 0.18 },
    scale: { dmg: 1.15, orbitCount: 1 },
  },
  {
    weaponId: "slash",
    name: "斬撃",
    desc: "狙った敵へ飛ぶ斬撃を放ち、直線上の敵を切り裂く。",
    weaponType: "special",
    maxLevel: 5,
    base: {
      dmg: 42,
      interval: 0.9,
      projSpeed: 760,
      life: 0.62,
      r: 28,
      pierce: 1,
      multi: 1,
      knock: 70,
    },
    scale: {
      dmg: 1.35,
      interval: 0.93,
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
    requiredHeroId: 1,
    requiredStatKey: "hpMax",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 96,
      fireRate: 1.7,
      projSpeed: 620,
      pierce: 1,
      multi: 5,
      homing: 0,
      blastRadius: 84,
      blastDmg: 44,
      chainCount: 1,
      chainRange: 106,
      chainRadius: 62,
      chainBlastDmg: 28,
      chainFalloff: 0.78,
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
    requiredHeroId: 2,
    requiredStatKey: "aspd",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 20,
      spiralInterval: 0.08,
      spiralArms: 3,
      spiralTurnSpeed: 8.4,
      projSpeed: 420,
      radialDrift: 46,
      homing: 0.03,
      lifeMin: 0.82,
      lifeMax: 0.98,
      knock: 42,
      petalTrail: true,
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
    requiredHeroId: 3,
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
    weaponId: "reppufuda",
    name: "翆玉",
    desc: "【進化】霊晶＋引寄せLv1。翆玉が危険な速度で周囲を巡り、近づく敵を切り刻む。",
    weaponType: "orbit",
    isEvolved: true,
    evolveWeaponId: "orbit",
    requiredHeroId: 5,
    requiredStatKey: "magnet",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 15,
      orbitCount: 6,
      orbitRadius: 68,
      orbitSpeed: 5.2,
      hitInterval: 0.12,
    },
    scale: {},
  },
  {
    weaponId: "reppuzan",
    name: "烈風斬",
    desc: "【進化】斬撃＋呪力Lv1。大きな烈風の刃を放ち、敵を貫きながら命を吸い上げる。",
    weaponType: "special",
    isEvolved: true,
    evolveWeaponId: "slash",
    requiredHeroId: 4,
    requiredStatKey: "atk",
    requiredStatLevel: 1,
    maxLevel: 1,
    base: {
      dmg: 74,
      interval: 0.58,
      projSpeed: 880,
      life: 0.78,
      r: 40,
      pierce: 6,
      multi: 2,
      knock: 110,
      lifeSteal: 2,
    },
    scale: {},
  },
];

export function getWeapon(weaponId) {
  return WEAPONS.find((w) => w.weaponId === weaponId) || null;
}

// 進化条件を満たした武器を列挙
export function getEvolutionRecipe(player) {
  const ownedIds = new Set(player.weapons.map((w) => w.weaponId));
  const results = [];
  for (const w of WEAPONS) {
    if (!w.isEvolved) continue;
    if (ownedIds.has(w.weaponId)) continue; // 既に所持している進化武器は除外
    const baseWeaponId = w.evolveWeaponId;
    const heroId = w.requiredHeroId ?? null;
    const statKey = w.requiredStatKey;
    const statLevel = w.requiredStatLevel ?? 1;
    const ent = player.weapons.find((e) => e.weaponId === baseWeaponId);
    const def = WEAPONS.find((d) => d.weaponId === baseWeaponId);
    if (!ent || !def || !statKey) continue;
    if (
      (heroId == null || player.heroId === heroId) &&
      ent.level >= def.maxLevel &&
      (player.statLevels?.[statKey] ?? 0) >= statLevel
    ) {
      results.push(w);
    }
  }
  return results;
}
