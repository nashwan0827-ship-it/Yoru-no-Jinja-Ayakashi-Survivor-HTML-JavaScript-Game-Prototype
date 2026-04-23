import { HEROES } from "../data/heroes.js";
import { PATHS } from "../../paths.js";
import { STAGE_DIFFICULTIES, STAGES, getStageDifficulty } from "../data/stages.js";
import { loadPrefs, resetPrefs, savePrefsFromState } from "../core/save.js";
import {
  PERMANENT_UPGRADE_MAX_LEVEL,
  PERMANENT_UPGRADES,
  getPermanentUpgradeCost,
  getPermanentUpgradeLevel,
} from "../data/permanentUpgrades.js";
import {
  FAMILIAR_MASTERY_MAX_LEVEL,
  FAMILIARS,
  getFamiliarMasteryBonus,
} from "../data/familiars.js";
import {
  KILL_MILESTONE_REWARDS,
  STAGE_FIRST_CLEAR_REWARDS,
} from "../data/achievements.js";

export function initTitleUI(refs, state, assets, audio, onSelectHero, onStart) {
  const prefs = state.prefs ?? loadPrefs();
  state.prefs = prefs;
  const configOverlay = document.getElementById("configOverlay");
  const openConfigBtn = document.getElementById("openConfigBtn");
  const closeConfigBtn = document.getElementById("closeConfigBtn");
  const resetSaveBtn = document.getElementById("resetSaveBtn");
  const resetSaveWarning = document.getElementById("resetSaveWarning");
  const familiarOverlay = document.getElementById("familiarOverlay");
  const openFamiliarBtn = document.getElementById("openFamiliarBtn");
  const closeFamiliarBtn = document.getElementById("closeFamiliarBtn");
  const familiarChoices = document.getElementById("familiarChoices");
  const permanentOverlay = document.getElementById("permanentOverlay");
  const openPermanentBtn = document.getElementById("openPermanentBtn");
  const closePermanentBtn = document.getElementById("closePermanentBtn");
  const permanentChoices = document.getElementById("permanentChoices");
  const achievementOverlay = document.getElementById("achievementOverlay");
  const openAchievementBtn = document.getElementById("openAchievementBtn");
  const closeAchievementBtn = document.getElementById("closeAchievementBtn");
  const achievementChoices = document.getElementById("achievementChoices");
  const confirmOverlay = document.getElementById("confirmOverlay");
  const closeConfirmBtn = document.getElementById("closeConfirmBtn");
  const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");
  const acceptConfirmBtn = document.getElementById("acceptConfirmBtn");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmText = document.getElementById("confirmText");
  const confirmCostText = document.getElementById("confirmCostText");
  const titleSoulShards = document.getElementById("titleSoulShards");
  const familiarSoulShards = document.getElementById("familiarSoulShards");
  const permanentSoulShards = document.getElementById("permanentSoulShards");
  const achievementSoulShards = document.getElementById("achievementSoulShards");
  const b1 = refs.heroBtn1;
  const b2 = refs.heroBtn2;
  const b3 = refs.heroBtn3;
  const b4 = refs.heroBtn4;
  const b5 = refs.heroBtn5;
  const s1 = refs.stageBtn1;
  const s2 = refs.stageBtn2;
  const s3 = refs.stageBtn3;
  const intro = refs.titleIntro;
  const introStartBtn = refs.introStartBtn;
  const startBtn = refs.startBtn;
  const heroButtons = [b1, b2, b3, b4, b5].filter(Boolean);
  const stageButtons = [s1, s2, s3].filter(Boolean);
  const difficultyButtons = Array.from(document.querySelectorAll(".difficultyBtn"));
  let introActive = !!intro;
  let resetConfirmTimer = 0;
  let confirmAction = null;

  hydrateHeroCards(heroButtons);
  hydrateDifficultyButtons(difficultyButtons);
  refreshSoulShardDisplays();

  function refreshSoulShardDisplays() {
    const latestPrefs = loadPrefs();
    const amount = Math.max(0, Math.floor(state.soulShards ?? latestPrefs.soulShards ?? 0));
    state.soulShards = amount;
    const text = `\u9b42\u7247 ${amount.toLocaleString()}`;
    if (titleSoulShards) titleSoulShards.textContent = amount.toLocaleString();
    if (familiarSoulShards) familiarSoulShards.textContent = text;
    if (permanentSoulShards) permanentSoulShards.textContent = text;
    if (achievementSoulShards) achievementSoulShards.textContent = text;
  }

  function getUnlockedHeroSet() {
    const latestPrefs = loadPrefs();
    const ids = Array.isArray(state.unlockedHeroIds)
      ? state.unlockedHeroIds
      : latestPrefs.unlockedHeroIds ?? [1];
    return new Set([1, ...ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)]);
  }

  function isHeroUnlocked(id) {
    return getUnlockedHeroSet().has(id);
  }

  function getHeroUnlockCost(id) {
    const hero = HEROES.find((entry) => entry.id === id);
    return Math.max(0, Math.floor(hero?.unlockCost ?? 0));
  }

  function refreshHeroLocks() {
    const unlockedSet = getUnlockedHeroSet();
    const soulShards = Math.max(0, Math.floor(state.soulShards ?? loadPrefs().soulShards ?? 0));
    heroButtons.forEach((btn, index) => {
      const hero = HEROES[index];
      if (!btn || !hero) return;

      const unlocked = unlockedSet.has(hero.id);
      const cost = getHeroUnlockCost(hero.id);
      const affordable = soulShards >= cost;
      btn.classList.toggle("is-locked", !unlocked);
      btn.classList.toggle("is-affordable", !unlocked && affordable);
      btn.setAttribute("aria-disabled", unlocked ? "false" : "true");

      let costEl = btn.querySelector(".heroUnlockCost");
      if (!costEl) {
        costEl = document.createElement("div");
        costEl.className = "heroUnlockCost";
        btn.querySelector(".hero-info")?.appendChild(costEl);
      }
      costEl.textContent = !unlocked
        ? affordable
          ? `${cost.toLocaleString()} \u3067\u89e3\u653e`
          : `${cost.toLocaleString()} \u5fc5\u8981`
        : "";
    });
  }

  function unlockHero(id) {
    const cost = getHeroUnlockCost(id);
    if (cost <= 0 || isHeroUnlocked(id)) return true;

    refreshSoulShardDisplays();
    const current = Math.max(0, Math.floor(state.soulShards ?? 0));
    if (current < cost) {
      const btn = heroButtons[id - 1];
      const costEl = btn?.querySelector(".heroUnlockCost");
      if (costEl) {
        costEl.textContent = `\u9b42\u7247\u304c\u3042\u3068${(cost - current).toLocaleString()}\u5fc5\u8981`;
      }
      return false;
    }

    const hero = HEROES.find((entry) => entry.id === id);
    openSpendConfirm({
      title: "主人公の解放",
      text: `${hero?.name ?? "主人公"}を開放しますか？`,
      cost,
      onConfirm: () => completeHeroUnlock(id, cost),
    });
    return false;
  }

  function completeHeroUnlock(id, cost) {
    refreshSoulShardDisplays();
    const current = Math.max(0, Math.floor(state.soulShards ?? 0));
    if (current < cost) return false;
    const unlockedHeroIds = [...getUnlockedHeroSet(), id].sort((a, b) => a - b);
    state.soulShards = current - cost;
    state.unlockedHeroIds = unlockedHeroIds;
    savePrefsFromState(state, {
      soulShards: state.soulShards,
      unlockedHeroIds,
      selectedHeroId: id,
    });
    window.dispatchEvent(new CustomEvent("soul-shards-changed"));
    refreshHeroLocks();
    return true;
  }

  function openConfig() {
    if (!configOverlay) return;
    dismissIntro();
    configOverlay.classList.add("is-open");
    configOverlay.setAttribute("aria-hidden", "false");
  }

  function closeConfig() {
    if (!configOverlay) return;
    configOverlay.classList.remove("is-open");
    configOverlay.setAttribute("aria-hidden", "true");
    resetResetSaveButton();
  }

  function resetResetSaveButton() {
    window.clearTimeout(resetConfirmTimer);
    resetConfirmTimer = 0;
    if (!resetSaveBtn) return;
    resetSaveBtn.classList.remove("is-confirming");
    resetSaveBtn.textContent = "\u30c7\u30fc\u30bf\u524a\u9664";
    resetSaveWarning?.classList.remove("is-visible");
  }

  function handleResetSaveClick() {
    if (!resetSaveBtn) return;

    if (!resetSaveBtn.classList.contains("is-confirming")) {
      resetSaveBtn.classList.add("is-confirming");
      resetSaveBtn.textContent = "\u3082\u3046\u4e00\u5ea6\u62bc\u3059\u3068\u524a\u9664";
      resetSaveWarning?.classList.add("is-visible");
      window.clearTimeout(resetConfirmTimer);
      resetConfirmTimer = window.setTimeout(() => resetResetSaveButton(), 2600);
      return;
    }

    resetPrefs();
    window.location.reload();
  }

  function openFamiliarPanel() {
    if (!familiarOverlay) return;
    dismissIntro();
    refreshSoulShardDisplays();
    renderFamiliarChoices();
    familiarOverlay.classList.add("is-open");
    familiarOverlay.setAttribute("aria-hidden", "false");
  }

  function closeFamiliarPanel() {
    if (!familiarOverlay) return;
    familiarOverlay.classList.remove("is-open");
    familiarOverlay.setAttribute("aria-hidden", "true");
  }

  function openPermanentPanel() {
    if (!permanentOverlay) return;
    dismissIntro();
    refreshSoulShardDisplays();
    renderPermanentChoices();
    permanentOverlay.classList.add("is-open");
    permanentOverlay.setAttribute("aria-hidden", "false");
  }

  function closePermanentPanel() {
    if (!permanentOverlay) return;
    permanentOverlay.classList.remove("is-open");
    permanentOverlay.setAttribute("aria-hidden", "true");
  }

  function openAchievementPanel() {
    if (!achievementOverlay) return;
    dismissIntro();
    refreshSoulShardDisplays();
    renderAchievementChoices();
    achievementOverlay.classList.add("is-open");
    achievementOverlay.setAttribute("aria-hidden", "false");
  }

  function closeAchievementPanel() {
    if (!achievementOverlay) return;
    achievementOverlay.classList.remove("is-open");
    achievementOverlay.setAttribute("aria-hidden", "true");
  }

  function openSpendConfirm({ title, text, cost, onConfirm }) {
    if (!confirmOverlay) {
      onConfirm?.();
      return;
    }
    dismissIntro();
    confirmAction = typeof onConfirm === "function" ? onConfirm : null;
    if (confirmTitle) confirmTitle.textContent = title ?? "確認";
    if (confirmText) confirmText.textContent = text ?? "この操作を実行しますか？";
    if (confirmCostText) confirmCostText.textContent = `魂片 ${Math.max(0, Math.floor(cost ?? 0)).toLocaleString()}`;
    confirmOverlay.classList.add("is-open");
    confirmOverlay.setAttribute("aria-hidden", "false");
  }

  function closeSpendConfirm() {
    if (!confirmOverlay) return;
    confirmOverlay.classList.remove("is-open");
    confirmOverlay.setAttribute("aria-hidden", "true");
    confirmAction = null;
  }

  function acceptSpendConfirm() {
    const action = confirmAction;
    closeSpendConfirm();
    action?.();
  }

  function getPermanentProgress() {
    const latestPrefs = loadPrefs();
    return state.permanentUpgrades ?? latestPrefs.permanentUpgrades ?? {};
  }

  function renderPermanentChoices() {
    if (!permanentChoices) return;

    const progress = getPermanentProgress();
    const soulShards = Math.max(0, Math.floor(state.soulShards ?? loadPrefs().soulShards ?? 0));
    permanentChoices.innerHTML = PERMANENT_UPGRADES.map((upgrade) => {
      const level = getPermanentUpgradeLevel(progress, upgrade.key);
      const cost = getPermanentUpgradeCost(progress, upgrade.key);
      const isMax = level >= PERMANENT_UPGRADE_MAX_LEVEL;
      const affordable = cost != null && soulShards >= cost;
      const buttonLabel = isMax
        ? "MAX"
        : affordable
          ? `${cost.toLocaleString()}\u3067\u5f37\u5316`
          : `${cost.toLocaleString()}\u5fc5\u8981`;
      const disabled = isMax || !affordable ? " disabled" : "";
      const nextLevel = Math.min(PERMANENT_UPGRADE_MAX_LEVEL, level + 1);
      const effectText = isMax
        ? `Lv${level} / ${upgrade.format(level)}`
        : `Lv${level} \u2192 Lv${nextLevel} / ${upgrade.format(nextLevel)}`;
      return [
        `<div class="permanentCard${isMax ? " is-max" : ""}" data-upgrade-key="${escapeHtml(upgrade.key)}">`,
        `<div class="permanentInfo">`,
        `<b>${escapeHtml(upgrade.name)}</b>`,
        `<small>${escapeHtml(upgrade.desc)}</small>`,
        `<small>${escapeHtml(effectText)}</small>`,
        `</div>`,
        `<button class="permanentUpgradeBtn" type="button"${disabled}>${buttonLabel}</button>`,
        `</div>`,
      ].join("");
    }).join("");

    permanentChoices.querySelectorAll(".permanentCard").forEach((card) => {
      const button = card.querySelector(".permanentUpgradeBtn");
      button?.addEventListener("click", () => {
        const key = card.getAttribute("data-upgrade-key");
        if (!key) return;
        buyPermanentUpgrade(key);
      });
    });
  }

  function buyPermanentUpgrade(key) {
    const progress = getPermanentProgress();
    const cost = getPermanentUpgradeCost(progress, key);
    if (cost == null) return false;

    refreshSoulShardDisplays();
    const current = Math.max(0, Math.floor(state.soulShards ?? 0));
    if (current < cost) return false;

    const upgrade = PERMANENT_UPGRADES.find((entry) => entry.key === key);
    openSpendConfirm({
      title: "恒久強化",
      text: `${upgrade?.name ?? "強化"}を購入しますか？`,
      cost,
      onConfirm: () => completePermanentUpgrade(key, cost),
    });
    return false;
  }

  function completePermanentUpgrade(key, cost) {
    const progress = getPermanentProgress();
    refreshSoulShardDisplays();
    const current = Math.max(0, Math.floor(state.soulShards ?? 0));
    if (current < cost) return false;
    const nextProgress = {
      ...progress,
      [key]: getPermanentUpgradeLevel(progress, key) + 1,
    };
    state.soulShards = current - cost;
    state.permanentUpgrades = nextProgress;
    savePrefsFromState(state, {
      soulShards: state.soulShards,
      permanentUpgrades: nextProgress,
    });
    window.dispatchEvent(new CustomEvent("soul-shards-changed"));
    renderPermanentChoices();
    return true;
  }

  function getFamiliarProgress() {
    const progress = state.familiarProgress ?? {};
    const unlocked = Array.isArray(progress.unlockedFamiliars)
      ? progress.unlockedFamiliars
      : prefs.unlockedFamiliars ?? [];
    return {
      unlockedFamiliars: unlocked,
      equippedFamiliarId: progress.equippedFamiliarId ?? prefs.equippedFamiliarId ?? null,
      familiarLevel: progress.familiarLevel ?? prefs.familiarLevel ?? {},
      familiarMastery: progress.familiarMastery ?? prefs.familiarMastery ?? {},
      familiarCountBonus: progress.familiarCountBonus ?? prefs.familiarCountBonus ?? 0,
    };
  }

  function renderFamiliarChoices() {
    if (!familiarChoices) return;

    const progress = getFamiliarProgress();
    const unlockedSet = new Set(progress.unlockedFamiliars);
    const soulShards = Math.max(0, Math.floor(state.soulShards ?? loadPrefs().soulShards ?? 0));
    familiarChoices.innerHTML = FAMILIARS.map((familiar) => {
      const unlocked = unlockedSet.has(familiar.id);
      const equipped = progress.equippedFamiliarId === familiar.id;
      const unlockCost = getFamiliarUnlockCost(familiar);
      const affordable = soulShards >= unlockCost;
      const cardClass = [
        "familiarCard",
        equipped ? "is-equipped" : "",
        unlocked ? "" : "is-locked",
        !unlocked && affordable ? "is-affordable" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const buttonLabel = !unlocked
        ? affordable
          ? `${unlockCost.toLocaleString()}\u3067\u89e3\u653e`
          : `${unlockCost.toLocaleString()}\u5fc5\u8981`
        : equipped ? "\u88c5\u5099\u4e2d" : "\u88c5\u5099";
      const disabled = equipped || (!unlocked && !affordable) ? " disabled" : "";
      const mastery = getFamiliarMasteryBonus(progress, familiar.id);
      const masteryText = mastery.level >= FAMILIAR_MASTERY_MAX_LEVEL
        ? `\u719f\u7df4Lv${mastery.level} MAX`
        : `\u719f\u7df4Lv${mastery.level} ${mastery.xp}/${mastery.xpToNext}`;
      const bonusText = `\u706b\u529b+${formatPercentBonus(mastery.damageMul)} \u5c04\u7a0b+${formatPercentBonus(mastery.rangeMul)}`;
      return [
        `<div class="${cardClass}" data-familiar-id="${escapeHtml(familiar.id)}">`,
        renderFamiliarPortrait(familiar),
        `<div class="familiarInfo">`,
        `<b>${escapeHtml(familiar.name)}</b>`,
        `<small>${escapeHtml(familiar.category ?? "\u5f0f\u795e")} / ${escapeHtml(getFamiliarSummary(familiar))}</small>`,
        `<small>${escapeHtml(masteryText)} / ${escapeHtml(bonusText)}</small>`,
        `</div>`,
        `<button class="familiarEquipBtn" type="button"${disabled}>${buttonLabel}</button>`,
        `</div>`,
      ].join("");
    }).join("");

    familiarChoices.querySelectorAll(".familiarCard").forEach((card) => {
      const button = card.querySelector(".familiarEquipBtn");
      button?.addEventListener("click", () => {
        const familiarId = card.getAttribute("data-familiar-id");
        if (!familiarId) return;
        if (!unlockedSet.has(familiarId)) {
          if (!unlockFamiliar(familiarId, progress)) return;
          return;
        }
        state.familiarProgress = {
          ...progress,
          equippedFamiliarId: familiarId,
        };
        savePrefsFromState(state);
        renderFamiliarChoices();
      });
    });
  }

  function getFamiliarUnlockCost(familiar) {
    return Math.max(0, Math.floor(familiar?.unlockCost ?? 0));
  }

  function unlockFamiliar(familiarId, progress) {
    const familiar = FAMILIARS.find((entry) => entry.id === familiarId);
    if (!familiar) return false;

    refreshSoulShardDisplays();
    const cost = getFamiliarUnlockCost(familiar);
    const current = Math.max(0, Math.floor(state.soulShards ?? 0));
    if (current < cost) return false;

    openSpendConfirm({
      title: "式神の解放",
      text: `${familiar.name}を開放しますか？`,
      cost,
      onConfirm: () => completeFamiliarUnlock(familiarId, progress, cost),
    });
    return false;
  }

  function completeFamiliarUnlock(familiarId, progress, cost) {
    refreshSoulShardDisplays();
    const current = Math.max(0, Math.floor(state.soulShards ?? 0));
    if (current < cost) return false;
    const unlockedFamiliars = [...new Set([...(progress.unlockedFamiliars ?? []), familiarId])];
    state.soulShards = current - cost;
    state.familiarProgress = {
      ...progress,
      unlockedFamiliars,
      equippedFamiliarId: familiarId,
    };
    savePrefsFromState(state, {
      soulShards: state.soulShards,
      ...state.familiarProgress,
    });
    window.dispatchEvent(new CustomEvent("soul-shards-changed"));
    renderFamiliarChoices();
    return true;
  }

  function getAchievementProgress() {
    const latestPrefs = loadPrefs();
    return state.achievementProgress ?? latestPrefs.achievementProgress ?? {
      totalKills: 0,
      rewardedKillMilestones: [],
      clearedStageIds: [],
    };
  }

  function renderAchievementChoices() {
    if (!achievementChoices) return;

    const progress = getAchievementProgress();
    const totalKills = Math.max(0, Math.floor(progress.totalKills ?? 0));
    const rewardedKillMilestones = new Set(progress.rewardedKillMilestones ?? []);
    const clearedStageIds = new Set(progress.clearedStageIds ?? []);

    const killCards = KILL_MILESTONE_REWARDS.map((entry) => {
      const complete = rewardedKillMilestones.has(entry.kills);
      const progressValue = Math.min(entry.kills, totalKills);
      return renderAchievementCard({
        title: `累計${entry.kills.toLocaleString()}体撃破`,
        desc: `妖を累計${entry.kills.toLocaleString()}体倒す`,
        reward: `魂片+${entry.soulShards}`,
        complete,
        progressValue,
        progressMax: entry.kills,
        progressLabel: `${progressValue.toLocaleString()} / ${entry.kills.toLocaleString()}`,
      });
    });

    const stageCards = Object.entries(STAGE_FIRST_CLEAR_REWARDS).map(([stageId, reward]) => {
      const stageNumber = Number(stageId);
      const stage = STAGES.find((entry) => entry.id === stageNumber);
      const complete = clearedStageIds.has(stageNumber);
      return renderAchievementCard({
        title: `${stage?.name ?? `第${stageNumber}幕`} 初回クリア`,
        desc: `${stage?.name ?? `第${stageNumber}幕`}を初めてクリアする`,
        reward: `魂片+${Number(reward).toLocaleString()}`,
        complete,
        progressValue: complete ? 1 : 0,
        progressMax: 1,
        progressLabel: complete ? "達成済み" : "未達成",
      });
    });

    achievementChoices.innerHTML = [...killCards, ...stageCards].join("");
  }

  function hideIntro() {
    if (!intro || !introActive) return;

    introActive = false;
    refs.titleScreen?.classList.remove("op-active");
    intro.classList.add("leave");

    window.setTimeout(() => {
      intro.hidden = true;
      intro.style.display = "none";
    }, 760);
  }

  function dismissIntro() {
    if (introActive) hideIntro();
  }

  function setActive(id, { force = false } = {}) {
    if (introActive && !force) return;
    if (!isHeroUnlocked(id) && !unlockHero(id)) return;
    state.selectedHeroId = id;
    heroButtons.forEach((btn, index) => {
      btn.classList.toggle("active", id === index + 1);
    });
    savePrefsFromState(state, { selectedHeroId: id });
    onSelectHero(id);
  }

  function setActiveStage(id, { force = false } = {}) {
    if (introActive && !force) return;
    const stage = STAGES.find((entry) => entry.id === id) || STAGES[0];
    if (stage.id > (state.unlockedStageMax || 1)) return;
    state.selectedStageId = stage.id;
    stageButtons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.stageId) === stage.id);
    });
    savePrefsFromState(state, { selectedStageId: stage.id });
    refreshDifficultyLocks();
  }

  function setActiveDifficulty(id, { force = false } = {}) {
    if (introActive && !force) return;
    const difficulty = getStageDifficulty(id);
    if (!isDifficultyUnlocked(state.selectedStageId || 1, difficulty.id)) return;
    state.selectedDifficultyId = difficulty.id;
    difficultyButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.difficultyId === difficulty.id);
    });
    savePrefsFromState(state, { selectedDifficultyId: difficulty.id });
  }

  function refreshStageLocks() {
    const unlockedStageMax = state.unlockedStageMax || 1;
    stageButtons.forEach((btn) => {
      const stageId = Number(btn.dataset.stageId);
      const locked = stageId > unlockedStageMax;
      btn.classList.toggle("stageBtn--locked", locked);
      btn.setAttribute("aria-disabled", locked ? "true" : "false");
      btn.tabIndex = locked ? -1 : 0;
    });

    if ((state.selectedStageId || 1) > unlockedStageMax) {
      setActiveStage(unlockedStageMax, { force: true });
    }
    refreshDifficultyLocks();
  }

  function getUnlockedDifficultySet(stageId) {
    const latestPrefs = loadPrefs();
    const unlockedMap = state.unlockedDifficulties ?? latestPrefs.unlockedDifficulties ?? {};
    const ids = Array.isArray(unlockedMap[stageId]) ? unlockedMap[stageId] : ["easy"];
    return new Set(["easy", ...ids]);
  }

  function isDifficultyUnlocked(stageId, difficultyId) {
    return getUnlockedDifficultySet(stageId).has(difficultyId);
  }

  function refreshDifficultyLocks() {
    const stageId = state.selectedStageId || 1;
    const unlocked = getUnlockedDifficultySet(stageId);
    difficultyButtons.forEach((btn) => {
      const difficultyId = btn.dataset.difficultyId;
      const locked = !unlocked.has(difficultyId);
      btn.classList.toggle("difficultyBtn--locked", locked);
      btn.setAttribute("aria-disabled", locked ? "true" : "false");
      btn.tabIndex = locked ? -1 : 0;
    });

    if (!unlocked.has(state.selectedDifficultyId || "easy")) {
      const fallback = STAGE_DIFFICULTIES.find((difficulty) => unlocked.has(difficulty.id)) ?? STAGE_DIFFICULTIES[0];
      setActiveDifficulty(fallback.id, { force: true });
    }
  }

  if (!isHeroUnlocked(state.selectedHeroId || 1)) {
    state.selectedHeroId = 1;
    savePrefsFromState(state, { selectedHeroId: 1 });
  }
  refreshHeroLocks();
  setActive(state.selectedHeroId || 1, { force: true });
  refreshStageLocks();
  setActiveStage(state.selectedStageId || prefs.selectedStageId || 1, { force: true });
  refreshDifficultyLocks();
  setActiveDifficulty(state.selectedDifficultyId || prefs.selectedDifficultyId || "easy", { force: true });

  if (introActive) {
    refs.titleScreen?.classList.add("op-active");
    intro.hidden = false;
    intro.style.display = "flex";
  }

  b1.addEventListener("click", () => setActive(1));
  b2.addEventListener("click", () => setActive(2));
  b3?.addEventListener("click", () => setActive(3));
  b4?.addEventListener("click", () => setActive(4));
  b5?.addEventListener("click", () => setActive(5));
  stageButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveStage(Number(btn.dataset.stageId)));
  });
  difficultyButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveDifficulty(btn.dataset.difficultyId));
  });
  window.addEventListener("stage-unlocks-changed", () => refreshStageLocks());
  window.addEventListener("difficulty-unlocks-changed", () => refreshDifficultyLocks());
  window.addEventListener("soul-shards-changed", () => {
    refreshSoulShardDisplays();
    refreshHeroLocks();
    if (permanentOverlay?.classList.contains("is-open")) {
      renderPermanentChoices();
    }
    if (achievementOverlay?.classList.contains("is-open")) {
      renderAchievementChoices();
    }
  });
  introStartBtn?.addEventListener("click", () => hideIntro());
  openConfigBtn?.addEventListener("click", () => openConfig());
  closeConfigBtn?.addEventListener("click", () => closeConfig());
  resetSaveBtn?.addEventListener("click", () => handleResetSaveClick());
  openFamiliarBtn?.addEventListener("click", () => openFamiliarPanel());
  closeFamiliarBtn?.addEventListener("click", () => closeFamiliarPanel());
  openPermanentBtn?.addEventListener("click", () => openPermanentPanel());
  closePermanentBtn?.addEventListener("click", () => closePermanentPanel());
  openAchievementBtn?.addEventListener("click", () => openAchievementPanel());
  closeAchievementBtn?.addEventListener("click", () => closeAchievementPanel());
  closeConfirmBtn?.addEventListener("click", () => closeSpendConfirm());
  cancelConfirmBtn?.addEventListener("click", () => closeSpendConfirm());
  acceptConfirmBtn?.addEventListener("click", () => acceptSpendConfirm());
  configOverlay?.addEventListener("click", (e) => {
    if (e.target === configOverlay) closeConfig();
  });
  familiarOverlay?.addEventListener("click", (e) => {
    if (e.target === familiarOverlay) closeFamiliarPanel();
  });
  permanentOverlay?.addEventListener("click", (e) => {
    if (e.target === permanentOverlay) closePermanentPanel();
  });
  achievementOverlay?.addEventListener("click", (e) => {
    if (e.target === achievementOverlay) closeAchievementPanel();
  });
  confirmOverlay?.addEventListener("click", (e) => {
    if (e.target === confirmOverlay) closeSpendConfirm();
  });

  window.addEventListener("keydown", (e) => {
    if (state.started) return;
    if (e.key === "Escape" && confirmOverlay?.classList.contains("is-open")) {
      e.preventDefault();
      closeSpendConfirm();
      return;
    }
    if (e.key === "Escape" && familiarOverlay?.classList.contains("is-open")) {
      e.preventDefault();
      closeFamiliarPanel();
      return;
    }
    if (e.key === "Escape" && permanentOverlay?.classList.contains("is-open")) {
      e.preventDefault();
      closePermanentPanel();
      return;
    }
    if (e.key === "Escape" && achievementOverlay?.classList.contains("is-open")) {
      e.preventDefault();
      closeAchievementPanel();
      return;
    }
    if (e.key === "Escape" && configOverlay?.classList.contains("is-open")) {
      e.preventDefault();
      closeConfig();
      return;
    }
    if (introActive) return;
    if (e.key === "1") setActive(1);
    if (e.key === "2") setActive(2);
    if (e.key === "3") setActive(3);
    if (e.key === "4") setActive(4);
    if (e.key === "5") setActive(5);
    if (e.key.toLowerCase() === "q") setActiveStage(1);
    if (e.key.toLowerCase() === "w") setActiveStage(2);
  });

  startBtn.addEventListener("click", () => onStart());

  window.addEventListener(
    "keydown",
    (e) => {
      if (state.started) return;
      if (introActive && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        hideIntro();
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onStart();
      }
    },
    { passive: false },
  );

  const bgmSlider = refs.bgmVolume;
  const seSlider = refs.seVolume;
  const loadoutToggle = document.getElementById("cfgLoadoutPanels");
  const enemyHpToggle = document.getElementById("cfgEnemyHpBars");
  const miniMapToggle = document.getElementById("cfgMiniMap");
  if (bgmSlider && seSlider) {
    bgmSlider.value = String(prefs.bgmVolume);
    seSlider.value = String(prefs.seVolume);
    audio.setVolumes({
      titleVol: prefs.bgmVolume,
      gameVol: prefs.bgmVolume,
      seVol: prefs.seVolume,
    });

    bgmSlider.addEventListener("input", (e) => {
      const vol = parseFloat(e.target.value);
      audio.setVolumes({ titleVol: vol, gameVol: vol });
      savePrefsFromState(state, { bgmVolume: vol });
    });
    seSlider.addEventListener("input", (e) => {
      const vol = parseFloat(e.target.value);
      audio.setVolumes({ seVol: vol });
      savePrefsFromState(state, { seVolume: vol });
    });
  }

  bindConfigToggle(loadoutToggle, prefs.showLoadoutPanels, (checked) => {
    state.ui.showLoadoutPanels = checked;
    savePrefsFromState(state, { showLoadoutPanels: checked });
  });
  bindConfigToggle(enemyHpToggle, prefs.showEnemyHpBars, (checked) => {
    state.ui.showEnemyHpBars = checked;
    savePrefsFromState(state, { showEnemyHpBars: checked });
  });
  bindConfigToggle(miniMapToggle, prefs.showMiniMap, (checked) => {
    state.ui.showMiniMap = checked;
    savePrefsFromState(state, { showMiniMap: checked });
  });

  spawnPetals();
}

function hydrateHeroCards(heroButtons) {
  const statRanges = buildStatRanges(HEROES);
  const heroSprites = [PATHS.hero1, PATHS.hero2, PATHS.hero3, PATHS.hero4, PATHS.hero5];

  heroButtons.forEach((btn, index) => {
    const hero = HEROES[index];
    if (!btn || !hero) return;

    const iconEl = btn.querySelector(".hero-icon");
    if (iconEl) {
      iconEl.classList.add("hero-icon--sprite");
      iconEl.textContent = "";
      iconEl.style.setProperty("--hero-sprite", `url("${heroSprites[index] ?? PATHS.hero1}")`);
    }

    const statsEl = btn.querySelector(".hero-stats");
    if (statsEl) {
      statsEl.innerHTML = renderHeroStats(hero.stats, statRanges);
    }
  });
}

function hydrateDifficultyButtons(difficultyButtons) {
  difficultyButtons.forEach((btn) => {
    const difficultyId = btn.dataset.difficultyId;
    const difficulty = STAGE_DIFFICULTIES.find((entry) => entry.id === difficultyId);
    if (!difficulty) return;

    const intensity = Math.max(1, Math.min(3, Math.round(difficulty.statMul)));
    const meter = Array.from({ length: 3 }, (_, index) =>
      `<span class="difficultyPip${index < intensity ? " is-on" : ""}"></span>`
    ).join("");
    const summary = getDifficultySummary(difficulty.id, difficulty.statMul);

    btn.innerHTML = [
      `<div class="difficultyHead">`,
      `<b>${escapeHtml(difficulty.name)}</b>`,
      `<span class="difficultyScale">敵強度 x${difficulty.statMul}</span>`,
      `</div>`,
      `<div class="difficultyMeter" aria-hidden="true">${meter}</div>`,
      `<small>${escapeHtml(summary)}</small>`,
    ].join("");
  });
}

function getDifficultySummary(difficultyId, statMul) {
  if (difficultyId === "hard") {
    return `敵ステータス${statMul}倍。恒久強化と進化構成を前提にした高難度。`;
  }
  if (difficultyId === "normal") {
    return `敵ステータス${statMul}倍。進化選択と立ち回りの安定感が求められる。`;
  }
  return `敵ステータス${statMul}倍。基本ルールを掴みやすい標準難度。`;
}

function buildStatRanges(heroes) {
  const keys = ["hp", "speed", "magnet", "regen"];
  const ranges = {};
  keys.forEach((key) => {
    const values = heroes.map((hero) => hero.stats?.[key] ?? 0);
    ranges[key] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });
  return ranges;
}

function renderHeroStats(stats, ranges) {
  return [
    renderStatRow("HP", stats.hp, ranges.hp),
    renderStatRow("\u901f", stats.speed, ranges.speed),
  ].join("");
}

function renderStatRow(label, value, range) {
  const pct = normalizeStat(value, range);
  return [
    `<div class="stat">`,
    `<span class="stat-label">${label}</span>`,
    `<span class="stat-bar"><span class="stat-fill" style="width:${pct}%"></span></span>`,
    `<span class="stat-value">${value}</span>`,
    `</div>`,
  ].join("");
}

function normalizeStat(value, range) {
  if (!range || range.max <= range.min) return 100;
  const pct = ((value - range.min) / (range.max - range.min)) * 100;
  return Math.max(18, Math.min(100, Math.round(pct)));
}

function bindConfigToggle(el, initialValue, onChange) {
  if (!el) return;
  el.checked = !!initialValue;
  onChange?.(!!initialValue);
  el.addEventListener("change", () => {
    onChange?.(!!el.checked);
  });
}

function renderAchievementCard({
  title,
  desc,
  reward,
  complete,
  progressValue,
  progressMax,
  progressLabel,
}) {
  const safeMax = Math.max(1, Math.floor(progressMax ?? 1));
  const safeValue = Math.max(0, Math.floor(progressValue ?? 0));
  const pct = Math.max(0, Math.min(100, Math.round((safeValue / safeMax) * 100)));
  return [
    `<div class="achievementCard ${complete ? "is-complete" : "is-pending"}">`,
    `<div class="achievementHead">`,
    `<div class="achievementInfo">`,
    `<b>${escapeHtml(title)}</b>`,
    `<small>${escapeHtml(desc)}</small>`,
    `<small>${escapeHtml(reward)}</small>`,
    `</div>`,
    `<span class="achievementBadge">${complete ? "達成済み" : "進行中"}</span>`,
    `</div>`,
    `<div class="achievementProgressRow">`,
    `<div class="achievementProgress"><div class="achievementProgressFill" style="width:${pct}%"></div></div>`,
    `<div class="achievementProgressText">${escapeHtml(progressLabel)}</div>`,
    `</div>`,
    `</div>`,
  ].join("");
}

function renderFamiliarPortrait(familiar) {
  if (familiar?.id === "familiar_kodama") {
    return `<div class="familiarPortrait familiarPortrait--kodama" aria-hidden="true"></div>`;
  }
  const portrait = getFamiliarPortrait(familiar);
  if (!portrait) {
    return `<div class="familiarPortrait familiarPortrait--text">\u5f0f</div>`;
  }
  const style = [
    `--familiar-sprite:url("${portrait.src}")`,
    `--portrait-x:${portrait.x}`,
    `--portrait-y:${portrait.y}`,
    `--portrait-scale:${portrait.scale}`,
  ].join(";");
  return `<div class="familiarPortrait familiarPortrait--sprite" style='${style}'></div>`;
}

function getFamiliarPortrait(familiar) {
  if (familiar?.id === "familiar_yakyo") {
    return { src: PATHS.yakyoOwlFamiliar, x: "51%", y: "25%", scale: 2.2 };
  }
  if (familiar?.id === "familiar_reiri") {
    return { src: PATHS.reiriTanukiFamiliar, x: "51%", y: "25%", scale: 2.15 };
  }
  if (familiar?.id === "familiar_shikigami") {
    return { src: PATHS.shikigamiFamiliar, x: "49%", y: "36%", scale: 1.65 };
  }
  return null;
}

function getFamiliarSummary(familiar) {
  if (familiar?.id === "familiar_kodama") {
    return "\u5c0f\u3055\u306a\u970a\u529b\u3067\u8fd1\u304f\u306e\u6575\u3092\u3064\u3064\u304f\u3001\u63a7\u3048\u3081\u306a\u521d\u671f\u5f0f\u795e";
  }
  if (familiar?.attackStyle === "airstrike") {
    return "\u4e0a\u7a7a\u304b\u3089\u6c37\u6280\u3092\u843d\u3068\u3057\u3001\u7bc4\u56f2\u5185\u306e\u6575\u3092\u9045\u304f\u3059\u308b";
  }
  if (familiar?.attackStyle === "priority_target_support") {
    return "\u7d22\u6575\u3067\u6575\u3092\u793a\u3057\u3001\u512a\u5148\u30bf\u30fc\u30b2\u30c3\u30c8\u3078\u306e\u30c0\u30e1\u30fc\u30b8\u3092\u9ad8\u3081\u308b";
  }
  if (familiar?.attackStyle === "tackle") {
    return "\u6575\u3078\u99c6\u3051\u8fbc\u307f\u3001\u4f53\u5f53\u305f\u308a\u3067\u62bc\u3057\u8fd4\u3059";
  }
  return "\u72d0\u706b\u3067\u6575\u3092\u72d9\u3044\u3001\u7740\u5f3e\u5f8c\u306b\u708e\u3092\u6b8b\u3059";
}

function formatPercentBonus(multiplier) {
  const pct = Math.max(0, (multiplier - 1) * 100);
  return `${Math.round(pct * 10) / 10}%`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function spawnPetals() {
  const container = document.getElementById("petalsContainer");
  if (!container) return;

  const COUNT = 24;
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement("div");
    el.className = "petal";

    const size = (Math.random() * 9 + 5).toFixed(1) + "px";
    const x = (Math.random() * 110 - 5).toFixed(1) + "%";
    const dur = (Math.random() * 8 + 7).toFixed(2) + "s";
    const delay = (Math.random() * -18).toFixed(2) + "s";
    const drift = ((Math.random() - 0.5) * 160).toFixed(0) + "px";
    const spin = ((Math.random() - 0.5) * 900).toFixed(0) + "deg";

    el.style.cssText = `--size:${size};--x:${x};--dur:${dur};--delay:${delay};--drift:${drift};--spin:${spin}`;

    container.appendChild(el);
  }
}
