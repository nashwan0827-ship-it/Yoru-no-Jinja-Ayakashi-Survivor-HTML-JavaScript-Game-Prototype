// =============================================
// キャラクターデータ
// キャラクター = 初期武器 + 基本ステータスのみ
// 武器リストやキャラクター固有処理は別ファイルに持たせない
// =============================================

export const HEROES = [
  {
    id: 1,
    name: "巫女・鈴音",
    startingWeaponId: "ofuda", // 初期武器IDのみ定義
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
    startingWeaponId: "petal", // 初期武器IDのみ定義
    stats: {
      hp: 105,
      speed: 238,
      magnet: 100,
      regen: 1,
    },
  },
  {
    id: 3,
    name: "雷狐・雷霞",
    startingWeaponId: "thunder",
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
    startingWeaponId: "slash",
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
    startingWeaponId: "orbit",
    stats: {
      hp: 170,
      speed: 200,
      magnet: 100,
      regen: 3,
    },
  },
];
