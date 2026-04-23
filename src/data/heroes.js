// =============================================
// キャラクターデータ
// キャラクター = 初期武器 + 基本ステータスのみ
// 武器リストやキャラクター固有処理は別ファイルに持たせない
// =============================================

export const HEROES = [
  {
    id: 1,
    name: "巫女・鈴音",
    unlockCost: 0,
    startingWeaponId: "ofuda", // 初期武器IDのみ定義
    uniqueEvolutionWeaponId: "blastchain",
    stats: {
      hp: 95,
      speed: 220,
      magnet: 100,
      regen: 1,
    },
  },
  {
    id: 2,
    name: "花人・舞桜",
    unlockCost: 500,
    startingWeaponId: "petal", // 初期武器IDのみ定義
    uniqueEvolutionWeaponId: "blossomstorm",
    stats: {
      hp: 112,
      speed: 244,
      magnet: 110,
      regen: 1,
    },
  },
  {
    id: 3,
    name: "雷狐・雷霞",
    unlockCost: 1500,
    startingWeaponId: "thunder",
    uniqueEvolutionWeaponId: "raiukekkai",
    stats: {
      hp: 110,
      speed: 228,
      magnet: 100,
      regen: 1,
    },
  },
  {
    id: 4,
    name: "霊刃・刹那",
    unlockCost: 2000,
    startingWeaponId: "slash",
    uniqueEvolutionWeaponId: "reppuzan",
    stats: {
      hp: 155,
      speed: 215,
      magnet: 100,
      regen: 2,
    },
  },
  {
    id: 5,
    name: "翠玉・若葉",
    unlockCost: 2500,
    startingWeaponId: "orbit",
    uniqueEvolutionWeaponId: "reppufuda",
    stats: {
      hp: 170,
      speed: 206,
      magnet: 100,
      regen: 3,
    },
  },
];

export function getDefaultUnlockedHeroIds() {
  return HEROES.filter((hero) => (hero.unlockCost ?? 0) <= 0).map((hero) => hero.id);
}

export function getHero(heroId) {
  return HEROES.find((hero) => hero.id === heroId) ?? null;
}

export function getUniqueEvolutionWeaponIds() {
  return HEROES
    .map((hero) => hero.uniqueEvolutionWeaponId)
    .filter((weaponId) => typeof weaponId === "string" && weaponId.length > 0);
}
