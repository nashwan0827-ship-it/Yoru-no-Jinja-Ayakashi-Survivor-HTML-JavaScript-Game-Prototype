export const FAMILIARS = [
  {
    id: "familiar_shikigami",
    category: "仲間",
    name: "霊狐",
    sprite: "shikigamiFamiliar",
    unlockedByDefault: true,
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
    category: "仲間",
    name: "鈍狸",
    sprite: "reiriTanukiFamiliar",
    unlockedByDefault: true,
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
    category: "仲間",
    name: "夜梟",
    sprite: "yakyoOwlFamiliar",
    unlockedByDefault: true,
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
