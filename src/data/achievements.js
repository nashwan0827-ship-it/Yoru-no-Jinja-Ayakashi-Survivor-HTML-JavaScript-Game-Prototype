export const KILL_MILESTONE_REWARDS = [
  { kills: 100, soulShards: 5 },
  { kills: 500, soulShards: 10 },
  { kills: 1000, soulShards: 20 },
];

export const STAGE_FIRST_CLEAR_REWARDS = {
  1: 500,
  2: 500,
  3: 500,
};

export function createDefaultAchievementProgress() {
  return {
    totalKills: 0,
    rewardedKillMilestones: [],
    clearedStageIds: [],
  };
}

export function getPendingKillMilestoneRewards(progress, totalKills) {
  const unlocked = new Set(progress?.rewardedKillMilestones ?? []);
  return KILL_MILESTONE_REWARDS.filter(
    (entry) => totalKills >= entry.kills && !unlocked.has(entry.kills),
  );
}

export function getStageFirstClearReward(stageId, progress) {
  const id = Math.max(1, Math.floor(Number(stageId) || 0));
  const cleared = new Set(progress?.clearedStageIds ?? []);
  if (cleared.has(id)) return 0;
  return Math.max(0, Math.floor(STAGE_FIRST_CLEAR_REWARDS[id] ?? 0));
}
