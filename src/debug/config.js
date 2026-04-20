export const DEBUG_DEFAULTS = {
  enabled: false,
  showHud: true,
  showHitboxes: false,
  invincible: false,
};

export const DEBUG_KEYS = {
  toggleDebug: "f1",
  toggleHud: "f2",
  toggleHitboxes: "f3",
  toggleInvincible: "f4",
  levelUp: "f5",
  forceBoss: "f6",
  advanceWave: "f7",
};

export function createDebugState() {
  return { ...DEBUG_DEFAULTS };
}
