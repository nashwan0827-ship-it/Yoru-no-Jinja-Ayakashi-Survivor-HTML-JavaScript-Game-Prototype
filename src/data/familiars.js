export const FAMILIARS = [
  {
    id: "familiar_kodama",
    category: "\u5f0f\u795e",
    name: "\u5c0f\u970a",
    unlockCost: 0,
    unlockedByDefault: true,
    maxCount: 1,
    moveStyle: "wander_near_player",
    attackStyle: "nearby_auto_strike",
    baseDamage: 8,
    attackInterval: 1.2,
    attackRange: 210,
    playerAnchorRange: 300,
    pickupRadius: 34,
    magnetRadius: 90,
    followRadius: 120,
    returnRadius: 210,
    retargetInterval: 0.95,
    speedMinMul: 0.72,
    speedMaxMul: 1.02,
  },
  {
    id: "familiar_shikigami",
    category: "\u5f0f\u795e",
    name: "\u970a\u72d0",
    unlockCost: 800,
    sprite: "shikigamiFamiliar",
    unlockedByDefault: false,
    maxCount: 1,
    moveStyle: "wander_near_player",
    attackStyle: "nearby_auto_strike",
    baseDamage: 18,
    attackInterval: 0.8,
    attackRange: 260,
    playerAnchorRange: 380,
    pickupRadius: 42,
    magnetRadius: 115,
    followRadius: 150,
    returnRadius: 250,
    retargetInterval: 0.8,
    speedMinMul: 0.8,
    speedMaxMul: 1.2,
  },
  {
    id: "familiar_reiri",
    category: "\u5f0f\u795e",
    name: "\u72f8",
    unlockCost: 1000,
    sprite: "reiriTanukiFamiliar",
    unlockedByDefault: false,
    maxCount: 3,
    moveStyle: "wander_near_player",
    attackStyle: "tackle",
    baseDamage: 32,
    attackInterval: 0.95,
    attackRange: 225,
    playerAnchorRange: 350,
    tackleDuration: 0.34,
    tackleOvershoot: 26,
    tackleRadius: 34,
    pickupRadius: 42,
    magnetRadius: 115,
    followRadius: 145,
    returnRadius: 250,
    retargetInterval: 0.8,
    speedMinMul: 0.85,
    speedMaxMul: 1.15,
  },
  {
    id: "familiar_yakyo",
    category: "\u5f0f\u795e",
    name: "\u689f",
    unlockCost: 1200,
    sprite: "yakyoOwlFamiliar",
    unlockedByDefault: false,
    maxCount: 1,
    moveStyle: "free_fly_near_player",
    attackStyle: "airstrike",
    baseDamage: 34,
    attackInterval: 1.35,
    attackRange: 560,
    playerAnchorRange: 620,
    airstrikeDelay: 0.52,
    airstrikeRadius: 58,
    followRadius: 240,
    returnRadius: 360,
    retargetInterval: 0.75,
    freeFlightMinRadius: 80,
    freeFlightVerticalBias: -96,
    bobAmplitude: 10,
    pickupRadius: 42,
    magnetRadius: 115,
  },
];

export function getFamiliar(id) {
  return FAMILIARS.find((familiar) => familiar.id === id) ?? null;
}

export function getDefaultUnlockedFamiliarIds() {
  return FAMILIARS.filter((familiar) => familiar.unlockedByDefault).map(
    (familiar) => familiar.id,
  );
}

export function getDefaultEquippedFamiliarId() {
  return getDefaultUnlockedFamiliarIds()[0] ?? null;
}

export const FAMILIAR_MASTERY_MAX_LEVEL = 10;

export function getFamiliarMastery(progress, familiarId) {
  const raw = progress?.familiarMastery?.[familiarId];
  const level = Math.max(1, Math.min(FAMILIAR_MASTERY_MAX_LEVEL, Math.floor(Number(raw?.level) || 1)));
  const xp = Math.max(0, Math.floor(Number(raw?.xp) || 0));
  return { level, xp };
}

export function getFamiliarMasteryXpToNext(level) {
  const lv = Math.max(1, Math.min(FAMILIAR_MASTERY_MAX_LEVEL, Math.floor(level)));
  if (lv >= FAMILIAR_MASTERY_MAX_LEVEL) return 0;
  return 28 + lv * 12;
}

export function getFamiliarMasteryBonus(progress, familiarId) {
  const mastery = getFamiliarMastery(progress, familiarId);
  const rank = Math.max(0, mastery.level - 1);
  return {
    level: mastery.level,
    xp: mastery.xp,
    xpToNext: getFamiliarMasteryXpToNext(mastery.level),
    damageMul: 1 + rank * 0.008,
    attackIntervalMul: Math.max(0.94, 1 - rank * 0.004),
    rangeMul: 1 + rank * 0.005,
    moveMul: 1 + rank * 0.006,
    pickupBonus: rank * 0.75,
    magnetBonus: rank * 1.25,
  };
}

export function grantFamiliarMasteryXp(progress, familiarId, amount) {
  if (!familiarId || amount <= 0) {
    return { progress, levelUps: 0, mastery: getFamiliarMastery(progress, familiarId) };
  }

  const current = getFamiliarMastery(progress, familiarId);
  let level = current.level;
  let xp = current.xp + Math.max(0, Math.floor(amount));
  let levelUps = 0;

  while (level < FAMILIAR_MASTERY_MAX_LEVEL) {
    const need = getFamiliarMasteryXpToNext(level);
    if (xp < need) break;
    xp -= need;
    level += 1;
    levelUps += 1;
  }

  if (level >= FAMILIAR_MASTERY_MAX_LEVEL) {
    level = FAMILIAR_MASTERY_MAX_LEVEL;
    xp = 0;
  }

  const nextProgress = {
    ...(progress ?? {}),
    familiarMastery: {
      ...(progress?.familiarMastery ?? {}),
      [familiarId]: { level, xp },
    },
  };

  return {
    progress: nextProgress,
    levelUps,
    mastery: { level, xp },
  };
}
