export const FAMILIAR_DAMAGE_ID = "familiar_shikigami";

const PROJECTILE_DAMAGE_SOURCE = {
  ofuda: "ofuda",
  petal: "petal",
  blastchain: "blastchain",
  sakuraPetal: "blossomstorm",
  slash: "slash",
  reppuzanSlash: "reppuzan",
};

export function recordDamage(state, sourceId, amount) {
  const value = Number(amount);
  if (!sourceId || !Number.isFinite(value) || value <= 0) return;

  state.damageStats ??= {};
  state.damageStats[sourceId] = (state.damageStats[sourceId] ?? 0) + value;
}

export function recordEnemyDamage(state, sourceId, enemy, amount) {
  if (!enemy) return;
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return;
  recordDamage(state, sourceId, Math.min(Math.max(0, enemy.hp ?? value), value));
}

export function getProjectileDamageSource(projectile) {
  return projectile?.damageSource ?? PROJECTILE_DAMAGE_SOURCE[projectile?.kind] ?? projectile?.kind ?? null;
}
