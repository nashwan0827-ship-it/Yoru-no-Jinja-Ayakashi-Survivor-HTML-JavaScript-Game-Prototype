import { WEAPONS, getWeapon, getEvolutionRecipe } from "./weapons.js";

const WEAPON_LIMIT = 3;
const ITEM_LIMIT = 4;

export const ITEM_DEFS = {
  atk: {
    key: "atk",
    name: "呪力",
    desc: "与えるダメージが上がる。",
    maxLevel: 5,
    apply(player) {
      player.atkMul = (player.atkMul ?? 1) * 1.15;
      player.statLevels.atk += 1;
    },
  },
  aspd: {
    key: "aspd",
    name: "神速",
    desc: "攻撃速度が上がる。",
    maxLevel: 5,
    apply(player) {
      player.aspdMul = (player.aspdMul ?? 1) * 1.12;
      player.statLevels.aspd += 1;
    },
  },
  area: {
    key: "area",
    name: "拡界",
    desc: "攻撃範囲が広がる。",
    maxLevel: 5,
    apply(player) {
      player.areaMul = (player.areaMul ?? 1) * 1.12;
      player.statLevels.area += 1;
    },
  },
  hpMax: {
    key: "hpMax",
    name: "護符",
    desc: "最大HPが上がる。",
    maxLevel: 5,
    apply(player) {
      player.hpMax += 25;
      player.hp += 25;
      player.statLevels.hpMax += 1;
    },
  },
  magnet: {
    key: "magnet",
    name: "引寄せ",
    desc: "回収範囲が広がる。",
    maxLevel: 5,
    apply(player) {
      player.magnet = Math.round(player.magnet * 1.25);
      player.statLevels.magnet += 1;
    },
  },
  familiarBoost: {
    key: "familiarBoost",
    name: "式神強化",
    desc: "式神の攻撃力と攻撃速度、狐火の残り火ダメージが上がる。",
    maxLevel: 5,
    apply(player) {
      player.statLevels.familiarBoost = (player.statLevels.familiarBoost ?? 0) + 1;
    },
  },
};

export function initWeapons(player, startingWeaponId) {
  player.weapons = [{ weaponId: startingWeaponId, level: 1 }];
  player.weaponLimit = WEAPON_LIMIT;
  player.items = ["familiarBoost"];
  player.itemLimit = ITEM_LIMIT;
  player.statLevels ??= {};
  player.statLevels.familiarBoost = Math.max(player.statLevels.familiarBoost ?? 0, 1);
  player.discoveredWeaponIds = new Set([startingWeaponId]);
}

export function findOwned(player, weaponId) {
  return player.weapons.find((w) => w.weaponId === weaponId) || null;
}

export function upgradeWeapon(player, weaponId) {
  const entry = findOwned(player, weaponId);
  if (!entry) return;
  const def = getWeapon(weaponId);
  if (!def) return;
  entry.level = Math.min(entry.level + 1, def.maxLevel);
}

export function addWeapon(player, weaponId) {
  if (player.weapons.length >= player.weaponLimit) return false;
  if (findOwned(player, weaponId)) return false;
  player.weapons.push({ weaponId, level: 1 });
  if (!player.discoveredWeaponIds) player.discoveredWeaponIds = new Set();
  player.discoveredWeaponIds.add(weaponId);
  return true;
}

export function pickLevelUpOptions(player, n = 3) {
  const options = [];

  const evolutions = getEvolutionRecipe(player);
  for (const def of evolutions) {
    const weaponName = getWeapon(def.evolveWeaponId)?.name ?? def.evolveWeaponId;
    const itemName = ITEM_DEFS[def.requiredStatKey]?.name ?? def.requiredStatKey;
    const itemLevel = def.requiredStatLevel ?? 1;
    options.unshift({
      kind: "weapon_evolve",
      weaponId: def.weaponId,
      name: `進化 ${def.name}`,
      desc: `${weaponName} Lv5 / ${itemName} Lv${itemLevel} で進化。${def.desc}`,
      isEvolution: true,
    });
  }
  if (options.length > 0) {
    const itemOptions = makeItemOptions(player);
    shuffle(itemOptions);
    const fill = itemOptions.slice(0, Math.max(0, n - options.length));
    return [...options, ...fill].slice(0, n);
  }

  for (const entry of player.weapons) {
    const def = getWeapon(entry.weaponId);
    if (!def || entry.level >= def.maxLevel) continue;
    options.push({
      kind: "weapon_upgrade",
      weaponId: entry.weaponId,
      name: `${def.name} Lv${entry.level + 1}`,
      desc: def.desc,
    });
  }

  if (player.weapons.length < player.weaponLimit) {
    const ownedIds = new Set(player.weapons.map((w) => w.weaponId));
    const discoveredIds = player.discoveredWeaponIds ?? new Set();
    for (const def of WEAPONS) {
      if (ownedIds.has(def.weaponId)) continue;
      if (discoveredIds.has(def.weaponId)) continue;
      if (def.isEvolved) continue;
      options.push({
        kind: "weapon_new",
        weaponId: def.weaponId,
        name: `${def.name} 取得`,
        desc: def.desc,
      });
    }
  }

  options.push(...makeItemOptions(player));
  shuffle(options);
  return options.slice(0, n);
}

export function rollBossRewardCount() {
  const r = Math.random();
  if (r < 0.1) return 5;
  if (r < 0.4) return 3;
  return 1;
}

export function pickBossRewardOption(player, { allowEvolution = true } = {}) {
  const options = [];

  if (allowEvolution) {
    const evolutions = getEvolutionRecipe(player);
    for (const def of evolutions) {
      const weaponName = getWeapon(def.evolveWeaponId)?.name ?? def.evolveWeaponId;
      const itemName = ITEM_DEFS[def.requiredStatKey]?.name ?? def.requiredStatKey;
      const itemLevel = def.requiredStatLevel ?? 1;
      options.push({
        kind: "weapon_evolve",
        weaponId: def.weaponId,
        name: `進化 ${def.name}`,
        desc: `${weaponName} Lv5 / ${itemName} Lv${itemLevel} で進化。${def.desc}`,
        isEvolution: true,
      });
    }
  }

  for (const entry of player.weapons ?? []) {
    const def = getWeapon(entry.weaponId);
    if (!def || def.isEvolved || entry.level >= def.maxLevel) continue;
    options.push({
      kind: "weapon_upgrade",
      weaponId: entry.weaponId,
      name: `${def.name} Lv${entry.level + 1}`,
      desc: def.desc,
    });
  }

  for (const itemKey of player.items ?? []) {
    const item = ITEM_DEFS[itemKey];
    if (!item) continue;
    const currentLevel = player.statLevels?.[item.key] ?? 0;
    if (currentLevel >= item.maxLevel) continue;
    options.push({
      kind: "stat",
      name: `${item.name} Lv${currentLevel + 1}`,
      desc: item.desc,
      itemKey: item.key,
      apply() {
        item.apply(player);
      },
    });
  }

  if (options.length <= 0) return null;
  return options[(Math.random() * options.length) | 0];
}

function makeItemOptions(player) {
  const options = [];
  const owned = new Set(player.items ?? []);
  const itemLimit = player.itemLimit ?? ITEM_LIMIT;

  for (const item of Object.values(ITEM_DEFS)) {
    const currentLevel = player.statLevels?.[item.key] ?? 0;
    if (currentLevel >= item.maxLevel) continue;

    const isOwned = owned.has(item.key);
    if (!isOwned && owned.size >= itemLimit) continue;

    options.push({
      kind: "stat",
      name: isOwned ? `${item.name} Lv${currentLevel + 1}` : `${item.name} 取得`,
      desc: isOwned ? item.desc : `${item.desc} アイテム枠を1つ使う。`,
      apply() {
        if (!player.items) player.items = [];
        if (!owned.has(item.key)) {
          if (player.items.length >= itemLimit) return;
          player.items.push(item.key);
        }
        item.apply(player);
      },
    });
  }

  return options;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function applyEvolution(player, evolvedWeaponId) {
  const def = getWeapon(evolvedWeaponId);
  if (!def || !def.isEvolved) return false;

  const baseWeapon = player.weapons.find((w) => w.weaponId === def.evolveWeaponId);
  const baseDef = getWeapon(def.evolveWeaponId);
  if (!baseWeapon || !baseDef) return false;
  if (baseWeapon.level < baseDef.maxLevel) return false;
  if ((player.statLevels?.[def.requiredStatKey] ?? 0) < (def.requiredStatLevel ?? 1)) {
    return false;
  }

  const idx = player.weapons.findIndex((w) => w.weaponId === def.evolveWeaponId);
  if (idx === -1) return false;

  player.weapons.splice(idx, 1);
  player.weapons.push({ weaponId: evolvedWeaponId, level: 1 });
  return true;
}
