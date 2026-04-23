import { savePrefs } from "../core/save.js";
import { getNextStageDifficultyId, getNextStageId, getStage, getStageClearText } from "../data/stages.js";
import { getFamiliar, grantFamiliarMasteryXp } from "../data/familiars.js";
import { getWeapon } from "../data/weapons.js";

const HIGH_SCORE_STORAGE_KEY = "ayakasi_v8_high_score";

export function createResultScreens({ state, refs, audio, pausePanel, onRetry, onTitle }) {
  const gameOverScreen = document.getElementById("gameOverScreen");
  const gameClearScreen = document.getElementById("gameClearScreen");

  function showGameOver() {
    state.gameEnded = true;
    state.pausedForChoice = false;
    state.activeFamiliars.length = 0;
    audio?.SE?.stopWarning?.();
    pausePanel.hide();
    if (refs.panel) refs.panel.style.display = "none";

    document.getElementById("goTime").textContent = formatTime(state.timeSurvived);
    document.getElementById("goKills").textContent = state.kills;
    document.getElementById("goLevel").textContent = state.player.level;
    const scoreText = Math.floor(state.score).toLocaleString();
    const bestText = updateHighScore(state.score).toLocaleString();
    document.getElementById("goScore").textContent = scoreText;
    document.getElementById("goBestScore").textContent = bestText;
    renderDamageBreakdown(document.getElementById("goDamageBreakdown"), state);

    gameOverScreen.style.display = "flex";
  }

  function showGameClear() {
    const clearText = getStageClearText(state.stage);
    const unlockedStageId = unlockNextStageAfterClear();
    const unlockedDifficultyId = unlockNextDifficultyAfterClear();
    const familiarMasteryResult = grantEquippedFamiliarMasteryAfterClear();

    state.gameEnded = true;
    state.pausedForChoice = false;
    state.stageClearCoda = null;
    state.activeFamiliars.length = 0;
    audio?.SE?.stopWarning?.();
    pausePanel.hide();
    if (refs.panel) refs.panel.style.display = "none";

    document.getElementById("gcTime").textContent = formatTime(state.timeSurvived);
    document.getElementById("gcKills").textContent = state.kills;
    document.getElementById("gcLevel").textContent = state.player.level;
    const scoreText = Math.floor(state.score).toLocaleString();
    const bestText = updateHighScore(state.score).toLocaleString();
    document.getElementById("gcScore").textContent = scoreText;
    document.getElementById("gcBestScore").textContent = bestText;
    renderDamageBreakdown(document.getElementById("gcDamageBreakdown"), state);

    const titleEl = gameClearScreen.querySelector(".resultTitle");
    const subEl = gameClearScreen.querySelector(".resultSub");
    if (titleEl) titleEl.textContent = clearText.resultTitle;
    if (subEl) {
      let unlockText = clearText.resultSubText;
      if (unlockedStageId) {
        unlockText += ` ${getStage(unlockedStageId).name}\u304c\u89e3\u653e\u3055\u308c\u305f\u3002`;
      }
      if (unlockedDifficultyId) {
        unlockText += ` ${getStage(state.stage).name} ${getStageDifficultyLabel(unlockedDifficultyId)}\u304c\u89e3\u653e\u3055\u308c\u305f\u3002`;
      }
      const soulShardText = (state.runSoulShards ?? 0) > 0
        ? ` \u9b42\u7247+${state.runSoulShards}\u3002`
        : "";
      subEl.textContent = familiarMasteryResult
        ? `${unlockText} ${familiarMasteryResult.name} \u719f\u7df4\u5ea6+${familiarMasteryResult.xp}${familiarMasteryResult.levelUps > 0 ? ` Lv${familiarMasteryResult.level}` : ""}\u3002`
        : `${unlockText}${soulShardText}`;
      if (familiarMasteryResult && soulShardText) {
        subEl.textContent += soulShardText;
      }
    }

    gameClearScreen.style.display = "flex";
  }

  function hide() {
    gameOverScreen.style.display = "none";
    gameClearScreen.style.display = "none";
  }

  function grantEquippedFamiliarMasteryAfterClear() {
    const progress = state.familiarProgress ?? {};
    const familiarId = progress.equippedFamiliarId;
    const familiar = getFamiliar(familiarId);
    if (!familiar) return null;

    const xp = 16 + Math.max(1, state.stage) * 4;
    const result = grantFamiliarMasteryXp(progress, familiarId, xp);
    state.familiarProgress = result.progress;
    savePrefs(state.familiarProgress);
    return {
      name: familiar.name,
      xp,
      level: result.mastery.level,
      levelUps: result.levelUps,
    };
  }

  function unlockNextStageAfterClear() {
    const nextStageId = getNextStageId(state.stage);
    if (!nextStageId || nextStageId <= (state.unlockedStageMax || 1)) return null;

    state.unlockedStageMax = nextStageId;
    state.selectedStageId = nextStageId;
    savePrefs({
      unlockedStageMax: state.unlockedStageMax,
      selectedStageId: state.selectedStageId,
    });
    window.dispatchEvent(new CustomEvent("stage-unlocks-changed"));
    return nextStageId;
  }

  function unlockNextDifficultyAfterClear() {
    const nextDifficultyId = getNextStageDifficultyId(state.selectedDifficultyId);
    if (!nextDifficultyId) return null;

    const stageId = state.stage;
    const current = state.unlockedDifficulties ?? {};
    const unlocked = new Set(current[stageId] ?? ["easy"]);
    if (unlocked.has(nextDifficultyId)) return null;

    unlocked.add(nextDifficultyId);
    state.unlockedDifficulties = {
      ...current,
      [stageId]: [...unlocked],
    };
    savePrefs({ unlockedDifficulties: state.unlockedDifficulties });
    window.dispatchEvent(new CustomEvent("difficulty-unlocks-changed"));
    return nextDifficultyId;
  }

  document.getElementById("goRetry")?.addEventListener("click", () => onRetry());
  document.getElementById("goTitle")?.addEventListener("click", () => onTitle());
  document.getElementById("gcRetry")?.addEventListener("click", () => onRetry());
  document.getElementById("gcTitle")?.addEventListener("click", () => onTitle());

  return {
    showGameOver,
    showGameClear,
    hide,
    renderDamageBreakdown: (el) => renderDamageBreakdown(el, state),
  };
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getSavedHighScore() {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
    const value = Number(raw ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function updateHighScore(score) {
  const current = Math.max(0, Math.floor(score));
  const best = Math.max(current, getSavedHighScore());
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(best));
  } catch {
    // Ignore storage failures.
  }
  return best;
}

function getDamageSourceName(sourceId) {
  if (!sourceId) return "\u4e0d\u660e";
  const weapon = getWeapon(sourceId);
  if (weapon) return weapon.name;
  const familiar = getFamiliar(sourceId);
  if (familiar) return familiar.name;
  return sourceId;
}

function renderDamageBreakdown(el, state) {
  if (!el) return;

  const entries = Object.entries(state.damageStats ?? {})
    .map(([sourceId, value]) => ({
      sourceId,
      name: getDamageSourceName(sourceId),
      value: Math.max(0, Math.round(value)),
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  if (entries.length === 0) {
    el.innerHTML = `<div class="damageEmpty">\u307e\u3060\u30c0\u30e1\u30fc\u30b8\u8a18\u9332\u306a\u3057</div>`;
    return;
  }

  const max = Math.max(1, entries[0].value);
  el.innerHTML = entries
    .slice(0, 8)
    .map((entry) => {
      const pct = Math.max(2, Math.round((entry.value / max) * 100));
      return [
        `<div class="damageRow">`,
        `<div class="damageName">${escapeHtml(entry.name)}</div>`,
        `<div class="damageBar"><div class="damageBarFill" style="width:${pct}%"></div></div>`,
        `<div class="damageValue">${entry.value.toLocaleString()}</div>`,
        `</div>`,
      ].join("");
    })
    .join("");
}

function getStageDifficultyLabel(difficultyId) {
  if (difficultyId === "normal") return "Normal";
  if (difficultyId === "hard") return "Hard";
  return "Easy";
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
