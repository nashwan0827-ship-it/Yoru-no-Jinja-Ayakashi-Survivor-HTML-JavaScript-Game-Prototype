export const PERMANENT_UPGRADE_MAX_LEVEL = 5;

const STANDARD_COSTS = [300, 600, 1000, 1500, 2200];
const POWER_COSTS = [500, 900, 1400, 2000, 2800];
const DAMAGE_PER_LEVEL = 0.06;
const ATTACK_SPEED_PER_LEVEL = 0.06;
const FAMILIAR_PER_LEVEL = 0.05;

export const PERMANENT_UPGRADES = [
  {
    key: "hp",
    name: "\u4f53\u529b\u4fee\u7df4",
    desc: "\u6700\u5927HP\u304c\u5c11\u3057\u5897\u3048\u308b",
    costs: STANDARD_COSTS,
    format: (level) => `+${level * 4}%`,
  },
  {
    key: "speed",
    name: "\u811a\u529b\u4fee\u7df4",
    desc: "\u79fb\u52d5\u901f\u5ea6\u304c\u5c11\u3057\u4e0a\u304c\u308b",
    costs: STANDARD_COSTS,
    format: (level) => `+${level * 2}%`,
  },
  {
    key: "magnet",
    name: "\u970a\u529b\u611f\u77e5",
    desc: "\u56de\u53ce\u7bc4\u56f2\u304c\u5e83\u304c\u308b",
    costs: [250, 500, 900, 1300, 1900],
    format: (level) => `+${level * 5}%`,
  },
  {
    key: "damage",
    name: "\u546a\u529b\u7814\u78e8",
    desc: "\u4e0e\u3048\u308b\u30c0\u30e1\u30fc\u30b8\u304c\u5c11\u3057\u4e0a\u304c\u308b",
    costs: POWER_COSTS,
    format: (level) => `+${Math.round(level * DAMAGE_PER_LEVEL * 100)}%`,
  },
  {
    key: "attackSpeed",
    name: "\u795e\u901f\u7948\u9858",
    desc: "\u653b\u6483\u9593\u9694\u304c\u5c11\u3057\u77ed\u304f\u306a\u308b",
    costs: POWER_COSTS,
    format: (level) => `+${Math.round(level * ATTACK_SPEED_PER_LEVEL * 100)}%`,
  },
  {
    key: "familiar",
    name: "\u5f0f\u795e\u5951\u7d04",
    desc: "\u5f0f\u795e\u306e\u706b\u529b\u3068\u653b\u6483\u901f\u5ea6\u304c\u5c11\u3057\u4e0a\u304c\u308b",
    costs: POWER_COSTS,
    format: (level) => `+${Math.round(level * FAMILIAR_PER_LEVEL * 100)}%`,
  },
];

export function getPermanentUpgrade(key) {
  return PERMANENT_UPGRADES.find((upgrade) => upgrade.key === key) ?? null;
}

export function getPermanentUpgradeLevel(progress, key) {
  const raw = progress?.[key];
  const level = Math.floor(Number(raw) || 0);
  return Math.max(0, Math.min(PERMANENT_UPGRADE_MAX_LEVEL, level));
}

export function getPermanentUpgradeCost(progress, key) {
  const upgrade = getPermanentUpgrade(key);
  if (!upgrade) return null;
  const level = getPermanentUpgradeLevel(progress, key);
  if (level >= PERMANENT_UPGRADE_MAX_LEVEL) return null;
  return upgrade.costs[level] ?? null;
}

export function sanitizePermanentUpgrades(value, fallback = {}) {
  const result = {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  for (const upgrade of PERMANENT_UPGRADES) {
    result[upgrade.key] = getPermanentUpgradeLevel(source, upgrade.key);
  }
  return result;
}

export function getPermanentUpgradeBonuses(progress) {
  const hp = getPermanentUpgradeLevel(progress, "hp");
  const speed = getPermanentUpgradeLevel(progress, "speed");
  const magnet = getPermanentUpgradeLevel(progress, "magnet");
  const damage = getPermanentUpgradeLevel(progress, "damage");
  const attackSpeed = getPermanentUpgradeLevel(progress, "attackSpeed");
  const familiar = getPermanentUpgradeLevel(progress, "familiar");

  return {
    hpMul: 1 + hp * 0.04,
    speedMul: 1 + speed * 0.02,
    magnetMul: 1 + magnet * 0.05,
    damageMul: 1 + damage * DAMAGE_PER_LEVEL,
    attackSpeedMul: 1 + attackSpeed * ATTACK_SPEED_PER_LEVEL,
    familiarDamageMul: 1 + familiar * FAMILIAR_PER_LEVEL,
    familiarAttackSpeedMul: 1 + familiar * FAMILIAR_PER_LEVEL,
  };
}
