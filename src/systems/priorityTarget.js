export const PRIORITY_TARGET_FAMILIAR_ID = "familiar_yakyo";

export function clearPriorityTarget(state) {
  state.priorityTarget = null;
}

export function isPriorityTarget(state, enemy) {
  const target = state.priorityTarget?.enemy ?? null;
  return !!target && target === enemy && target.hp > 0;
}

export function applyPriorityTargetDamageBonus(state, enemy, damage) {
  if (!isPriorityTarget(state, enemy)) return damage;
  const multiplier = state.priorityTarget?.damageMultiplier ?? 1.2;
  const boosted = damage * multiplier;
  return Number.isInteger(damage) ? Math.round(boosted) : boosted;
}

export function updatePriorityTarget(state, familiar, def, dt) {
  if (def.attackStyle !== "priority_target_support") return;
  if (def.id !== PRIORITY_TARGET_FAMILIAR_ID) return;

  familiar.targetScanTimer = (familiar.targetScanTimer ?? 0) - dt;
  if (familiar.targetScanTimer > 0 && isPriorityTarget(state, state.priorityTarget?.enemy)) {
    return;
  }

  familiar.targetScanTimer = def.targetUpdateInterval ?? 0.5;
  const player = state.player;
  const rangeSq = (def.priorityTargetRange ?? 500) ** 2;
  let best = null;
  let bestDistSq = Infinity;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > rangeSq || distSq >= bestDistSq) continue;
    best = enemy;
    bestDistSq = distSq;
  }

  state.priorityTarget = best
    ? {
        enemy: best,
        damageMultiplier: getPriorityTargetDamageMultiplier(state, def),
      }
    : null;
}

function getPriorityTargetDamageMultiplier(state, def) {
  const boostLevel = Math.max(0, state.player?.statLevels?.familiarBoost ?? 0);
  const activeCount = (state.activeFamiliars ?? []).filter(
    (familiar) => familiar.id === PRIORITY_TARGET_FAMILIAR_ID,
  ).length;
  const countBonus = Math.max(0, activeCount - 1) * (def.priorityDamageCountBonus ?? 0);
  const levelBonus = boostLevel * (def.priorityDamageLevelBonus ?? 0);
  const multiplier = (def.priorityDamageMultiplier ?? 1.2) + levelBonus + countBonus;
  return Math.min(def.priorityDamageMaxMultiplier ?? Infinity, multiplier);
}
