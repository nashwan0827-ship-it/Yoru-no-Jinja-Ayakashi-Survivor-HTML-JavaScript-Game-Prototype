import { createCanvas } from "./core/canvas.js";
import { createCamera } from "./core/camera.js";
import { createInput } from "./core/input.js";
import { createAssets } from "./core/assets.js";
import { createAudio } from "./core/audio.js";
import { loadPrefs } from "./core/save.js";
import { savePrefs } from "./core/save.js";

import {
  createGameState,
  applyHeroStats,
  applyStageSettings,
  resetBattleSceneState,
} from "./state/gameState.js";
import { createRefs } from "./state/refs.js";

import { initTitleUI } from "./ui/title.js";
import { createHUD } from "./ui/hud.js";
import { createLevelupPanel } from "./ui/levelupPanel.js";

import { stepSpawns, forceSpawnBoss, forceAdvanceWave } from "./systems/spawns.js";
import { stepPlayer } from "./systems/player.js";
import { stepFamiliars } from "./systems/familiars.js";
import { stepProjectiles } from "./systems/projectiles.js";
import { stepEnemies } from "./systems/enemies.js";
import { stepDrops, grantLevelUp } from "./systems/drops.js";
import { stepFx } from "./systems/fx.js";

import { renderWorld } from "./render/world.js";
import { clamp } from "./core/utils.js";
import { DEBUG_KEYS } from "./debug/config.js";
import { getNextStageId, getStage, getStageClearText } from "./data/stages.js";
import { getWeapon } from "./data/weapons.js";
import { getFamiliar } from "./data/familiars.js";

const BATTLE_RUNTIME_SELECTOR = '[data-battle-runtime="true"]';

// =========================
// Boot
// =========================
const refs = createRefs();
const canvasApi = createCanvas(refs.canvas);
const cam = createCamera(canvasApi);
const input = createInput(canvasApi);

const assets = createAssets();
const audio = createAudio();
const state = createGameState();
const savedPrefs = loadPrefs();
state.selectedHeroId = savedPrefs.selectedHeroId;
state.selectedStageId = savedPrefs.selectedStageId;
state.unlockedStageMax = savedPrefs.unlockedStageMax;
state.ui.showLoadoutPanels = savedPrefs.showLoadoutPanels;
state.ui.showEnemyHpBars = savedPrefs.showEnemyHpBars;
state.ui.showMiniMap = savedPrefs.showMiniMap;
state.familiarProgress = {
  unlockedFamiliars: savedPrefs.unlockedFamiliars,
  equippedFamiliarId: savedPrefs.equippedFamiliarId,
  familiarLevel: savedPrefs.familiarLevel,
  familiarCountBonus: savedPrefs.familiarCountBonus,
};

const hud = createHUD(refs);
const levelup = createLevelupPanel(refs, state, hud, audio);

const battleRuntime = {
  frameId: 0,
  timeouts: new Set(),
  intervals: new Set(),
};

// =========================
// Pause Panel
// =========================
const pausePanel = {
  show() {
    if (refs.pausePanel) refs.pausePanel.style.display = "block";
    drawPauseMap();
    renderDamageBreakdown(document.getElementById("pauseDamageBreakdown"));
  },
  hide() {
    if (refs.pausePanel) refs.pausePanel.style.display = "none";
  },
};

function drawPauseMap() {
  const canvas = refs.pauseMapCanvas;
  const panel = refs.pausePanel;
  if (!canvas || !panel || panel.style.display === "none") return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const nextW = Math.max(1, Math.floor(rect.width * dpr));
  const nextH = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width;
  const H = rect.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(7, 10, 18, 0.96)";
  ctx.fillRect(0, 0, W, H);

  if (state.ui?.showMiniMap === false) {
    ctx.fillStyle = "rgba(235, 240, 255, 0.82)";
    ctx.font = "13px system-ui";
    ctx.fillText("ポーズマップは設定で非表示です", 16, 28);
    ctx.restore();
    return;
  }

  const map = state.map;
  if (!map) {
    ctx.fillStyle = "rgba(235, 240, 255, 0.82)";
    ctx.font = "13px system-ui";
    ctx.fillText("マップ情報なし", 16, 28);
    ctx.restore();
    return;
  }

  const pad = 28;
  const cx = W * 0.5;
  const cy = H * 0.5;
  const mapR = Math.max(1, map.radius);
  const drawR = Math.max(1, Math.min(W, H) * 0.5 - pad);
  const toMap = (wx, wy) => {
    const dx = (wx - map.centerX) / mapR;
    const dy = (wy - map.centerY) / mapR;
    return [cx + dx * drawR, cy + dy * drawR];
  };

  const gridStep = drawR / 4;
  ctx.strokeStyle = "rgba(180, 210, 235, 0.08)";
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * gridStep, cy - drawR);
    ctx.lineTo(cx + i * gridStep, cy + drawR);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - drawR, cy + i * gridStep);
    ctx.lineTo(cx + drawR, cy + i * gridStep);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(120, 190, 230, 0.055)";
  ctx.beginPath();
  ctx.arc(cx, cy, drawR, 0, Math.PI * 2);
  ctx.fill();

  if (map.slowRadius) {
    ctx.strokeStyle = "rgba(255, 220, 170, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, drawR * (map.slowRadius / mapR), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(170, 230, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, drawR, 0, Math.PI * 2);
  ctx.stroke();

  for (const d of state.drops) {
    const [mx, my] = toMap(d.x, d.y);
    const isChest = d.kind === "chest";
    ctx.fillStyle = isChest ? "rgba(255, 220, 110, 0.95)" : "rgba(110, 235, 255, 0.88)";
    ctx.fillRect(mx - (isChest ? 3 : 2), my - (isChest ? 3 : 2), isChest ? 6 : 4, isChest ? 6 : 4);
  }

  for (const e of state.enemies) {
    const [mx, my] = toMap(e.x, e.y);
    ctx.fillStyle = e.isBoss ? "rgba(255, 85, 135, 0.98)" : "rgba(255, 150, 95, 0.78)";
    ctx.beginPath();
    ctx.arc(mx, my, e.isBoss ? 6 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const [px, py] = toMap(state.player.x, state.player.y);
  ctx.fillStyle = "rgba(248, 255, 255, 1)";
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(80, 230, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(230, 238, 255, 0.78)";
  ctx.font = "12px system-ui";
  ctx.fillText(`敵 ${state.enemies.length}`, 14, H - 16);
  ctx.fillText(`霊力 ${state.drops.length}`, 84, H - 16);
  ctx.restore();
}

// =========================
// Runtime cleanup helpers
// =========================
function scheduleBattleTimeout(cb, delay = 0) {
  const id = setTimeout(() => {
    battleRuntime.timeouts.delete(id);
    cb();
  }, delay);
  battleRuntime.timeouts.add(id);
  return id;
}

function clearBattleTimers() {
  for (const id of battleRuntime.timeouts) {
    clearTimeout(id);
  }
  battleRuntime.timeouts.clear();

  for (const id of battleRuntime.intervals) {
    clearInterval(id);
  }
  battleRuntime.intervals.clear();
}

function stopMainLoop() {
  if (battleRuntime.frameId) {
    cancelAnimationFrame(battleRuntime.frameId);
    battleRuntime.frameId = 0;
  }
}

function queueNextFrame() {
  battleRuntime.frameId = requestAnimationFrame(tick);
}

function ensureMainLoopRunning() {
  if (battleRuntime.frameId) return;
  last = performance.now();
  queueNextFrame();
}

function cleanupBattleScene() {
  stopMainLoop();
  clearBattleTimers();
  hud.reset?.();
  pausePanel.hide();
  hideResultScreens();

  if (refs.panel) refs.panel.style.display = "none";
  if (refs.choicesEl) refs.choicesEl.replaceChildren();

  document
    .querySelectorAll(BATTLE_RUNTIME_SELECTOR)
    .forEach((el) => el.remove());
}

function clearBattleRuntime(options) {
  cleanupBattleScene();
  resetBattleSceneState(state, options);
  canvasApi.ctx.clearRect(0, 0, canvasApi.W, canvasApi.H);
}

function toggleLoadoutPanels() {
  state.ui.showLoadoutPanels = !state.ui.showLoadoutPanels;
  savePrefs({ showLoadoutPanels: state.ui.showLoadoutPanels });
  hud.flash(state.ui.showLoadoutPanels ? "装備パネル表示" : "装備パネル非表示");
}

function toggleEnemyHpBars() {
  state.ui.showEnemyHpBars = !state.ui.showEnemyHpBars;
  savePrefs({ showEnemyHpBars: state.ui.showEnemyHpBars });
  hud.flash(state.ui.showEnemyHpBars ? "敵HPバー表示" : "敵HPバー非表示");
}

function queueFreshBattleStart() {
  backToTitle();
  scheduleBattleTimeout(() => startGame(), 80);
}

// =========================
// Title UI wiring
// =========================
initTitleUI(
  refs,
  state,
  assets,
  audio,
  (heroId) => {
    state.selectedHeroId = heroId;
    assets.loadHero(heroId);
  },
  () => startGame(),
);

// =========================
// Assets preload
// =========================
(async function bootstrap() {
  await assets.preload();
  hud.flash("主人公を選んで開始");
})();

// =========================
// Audio unlock + Title BGM
// =========================
let audioUnlocked = false;

window.addEventListener(
  "pointerdown",
  async () => {
    try {
      if (audio.unlock) await audio.unlock();
      audioUnlocked = true;

      if (!state.started) {
        playTitleBgm();
      }
    } catch (e) {
      console.warn("[audio] unlock failed:", e);
    }
  },
  { passive: true },
);

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "m") {
    if (audio.toggleMute) audio.toggleMute();
  }
});

function handleDebugKeydown(e) {
  const key = e.key.toLowerCase();

  if (key === DEBUG_KEYS.toggleDebug) {
    e.preventDefault();
    state.debug.enabled = !state.debug.enabled;
    hud.flash(`Debug ${state.debug.enabled ? "ON" : "OFF"}`);
    return true;
  }

  if (!state.debug.enabled) return false;

  if (key === DEBUG_KEYS.toggleHud) {
    e.preventDefault();
    state.debug.showHud = !state.debug.showHud;
    hud.flash(`Debug HUD ${state.debug.showHud ? "ON" : "OFF"}`);
    return true;
  }

  if (key === DEBUG_KEYS.toggleHitboxes) {
    e.preventDefault();
    state.debug.showHitboxes = !state.debug.showHitboxes;
    hud.flash(`Hitbox ${state.debug.showHitboxes ? "ON" : "OFF"}`);
    return true;
  }

  if (key === DEBUG_KEYS.toggleInvincible) {
    e.preventDefault();
    state.debug.invincible = !state.debug.invincible;
    hud.flash(`Invincible ${state.debug.invincible ? "ON" : "OFF"}`);
    return true;
  }

  if (key === DEBUG_KEYS.levelUp) {
    e.preventDefault();
    const ok = grantLevelUp(state, audio, levelup);
    hud.flash(ok ? `Debug: level ${state.player.level}` : "Debug: level up skipped");
    return true;
  }

  if (key === DEBUG_KEYS.forceBoss) {
    e.preventDefault();
    const ok = forceSpawnBoss(state, hud, audio);
    hud.flash(ok ? "Debug: boss forced" : "Debug: boss spawn skipped");
    return true;
  }

  if (key === DEBUG_KEYS.advanceWave) {
    e.preventDefault();
    const ok = forceAdvanceWave(state, hud, audio);
    hud.flash(ok ? `Debug: wave ${state.wave}` : "Debug: wave advance skipped");
    return true;
  }

  return false;
}

// =========================
// Start / Back to Title
// =========================
function startGame() {
  if (state.started && !state.gameEnded) return;

  clearBattleRuntime();
  const selectedStageId = state.selectedStageId || 1;
  applyHeroStats(state, state.selectedHeroId);
  state.stage = selectedStageId;
  applyStageSettings(state);

  state.started = true;
  state.pausedForChoice = false;
  state.gameEnded = false;

  if (refs.titleScreen) refs.titleScreen.style.display = "none";

  state.spawn.spawnEnemyRing(getStage(state.stage).entrySpawnCount);

  playGameBgm();
  hud.flash(getStage(state.stage).introText);
  ensureMainLoopRunning();
}

function backToTitle() {
  cleanupBattleScene();
  applyHeroStats(state, state.selectedHeroId);

  if (refs.titleScreen) refs.titleScreen.style.display = "flex";

  if (audioUnlocked) playTitleBgm();
  hud.flash("主人公を選んで開始");
  ensureMainLoopRunning();
}

// =========================
// Pause
// =========================
function togglePause() {
  if (!state.started) return;
  if (state.gameEnded) return;

  const next = !state.pausedForChoice;
  state.pausedForChoice = next;

  if (next) {
    pausePanel.show();
    hud.flash("一時停止");
  } else {
    pausePanel.hide();
    hud.flash("再開");
  }
}

window.addEventListener(
  "keydown",
  (e) => {
    if (handleDebugKeydown(e)) return;

    const k = e.key.toLowerCase();

    if (k === "escape") {
      e.preventDefault();
      togglePause();
    }

    if (k === "h") {
      e.preventDefault();
      toggleLoadoutPanels();
    }

    if (k === "b") {
      e.preventDefault();
      toggleEnemyHpBars();
    }

    if (k === "t") {
      e.preventDefault();
      backToTitle();
    }
  },
  { passive: false },
);

if (refs.btnResume) {
  refs.btnResume.addEventListener("click", () => togglePause());
}
if (refs.toggleLoadoutBtn) {
  refs.toggleLoadoutBtn.addEventListener("click", () => toggleLoadoutPanels());
}
if (refs.btnRestart) {
  refs.btnRestart.addEventListener("click", () => {
    queueFreshBattleStart();
  });
}
if (refs.btnToTitle) {
  refs.btnToTitle.addEventListener("click", () => {
    backToTitle();
  });
}

// =========================
// BGM helpers
// =========================
function playTitleBgm() {
  if (audio.playTitle) audio.playTitle();
  else if (audio.startTitle) audio.startTitle();
  else if (audio.startBGM) audio.startBGM();
}

function playGameBgm() {
  if (audio.playGame) audio.playGame();
  else if (audio.startGame) audio.startGame();
  else if (audio.startBGM) audio.startBGM();
}

// =========================
// Result Screens
// =========================
const gameOverScreen = document.getElementById("gameOverScreen");
const gameClearScreen = document.getElementById("gameClearScreen");
const HIGH_SCORE_STORAGE_KEY = "ayakasi_v8_high_score";

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
    // 保存不可の環境ではそのまま続行
  }
  return best;
}

function getDamageSourceName(sourceId) {
  if (!sourceId) return "不明";
  const weapon = getWeapon(sourceId);
  if (weapon) return weapon.name;
  const familiar = getFamiliar(sourceId);
  if (familiar) return familiar.name;
  return sourceId;
}

function renderDamageBreakdown(el) {
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
    el.innerHTML = `<div class="damageEmpty">まだダメージ記録なし</div>`;
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

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showGameOver() {
  state.gameEnded = true;
  state.pausedForChoice = false;
  state.activeFamiliars.length = 0;
  audio?.SE?.stopWarning?.();
  pausePanel.hide();
  if (refs.panel) refs.panel.style.display = "none";

  document.getElementById("goTime").textContent = formatTime(
    state.timeSurvived,
  );
  document.getElementById("goKills").textContent = state.kills;
  document.getElementById("goLevel").textContent = state.player.level;
  const scoreText = Math.floor(state.score).toLocaleString();
  const bestText = updateHighScore(state.score).toLocaleString();
  document.getElementById("goScore").textContent = scoreText;
  document.getElementById("goBestScore").textContent = bestText;
  renderDamageBreakdown(document.getElementById("goDamageBreakdown"));

  gameOverScreen.style.display = "flex";
}

function showGameClear() {
  const clearText = getStageClearText(state.stage);
  const unlockedStageId = unlockNextStageAfterClear();

  state.gameEnded = true;
  state.pausedForChoice = false;
  state.stageClearCoda = null;
  state.activeFamiliars.length = 0;
  audio?.SE?.stopWarning?.();
  pausePanel.hide();
  if (refs.panel) refs.panel.style.display = "none";

  document.getElementById("gcTime").textContent = formatTime(
    state.timeSurvived,
  );
  document.getElementById("gcKills").textContent = state.kills;
  document.getElementById("gcLevel").textContent = state.player.level;
  const scoreText = Math.floor(state.score).toLocaleString();
  const bestText = updateHighScore(state.score).toLocaleString();
  document.getElementById("gcScore").textContent = scoreText;
  document.getElementById("gcBestScore").textContent = bestText;
  renderDamageBreakdown(document.getElementById("gcDamageBreakdown"));

  const titleEl = gameClearScreen.querySelector(".resultTitle");
  const subEl = gameClearScreen.querySelector(".resultSub");
  if (titleEl) titleEl.textContent = clearText.resultTitle;
  if (subEl) {
    subEl.textContent = unlockedStageId
      ? `${clearText.resultSubText} ${getStage(unlockedStageId).name}が解放された。`
      : clearText.resultSubText;
  }

  gameClearScreen.style.display = "flex";
}

function unlockNextStageAfterClear() {
  const nextStageId = getNextStageId(state.stage);
  if (!nextStageId || nextStageId <= (state.unlockedStageMax || 1)) return null;

  state.unlockedStageMax = nextStageId;
  savePrefs({
    unlockedStageMax: state.unlockedStageMax,
    selectedStageId: state.selectedStageId,
  });
  window.dispatchEvent(new CustomEvent("stage-unlocks-changed"));
  return nextStageId;
}

function hideResultScreens() {
  gameOverScreen.style.display = "none";
  gameClearScreen.style.display = "none";
}

function startStageClearCoda() {
  if (state.stageClearCoda?.active) return;
  const clearText = getStageClearText(state.stage);

  // クリア演出中は進行を止め、Wave10のボス再出現を防ぐ
  state.gameEnded = true;
  state.pausedForChoice = false;

  state.stageClearCoda = {
    active: true,
    text: clearText.codaText,
    subText: clearText.codaSubText,
    t: 0,
    dur: 0.95,
  };

  scheduleBattleTimeout(() => {
    if (!state.stageClearCoda?.active) return;
    showGameClear();
  }, 950);
}

document.getElementById("goRetry").addEventListener("click", () => {
  queueFreshBattleStart();
});
document.getElementById("goTitle").addEventListener("click", () => {
  backToTitle();
});

document.getElementById("gcRetry").addEventListener("click", () => {
  queueFreshBattleStart();
});
document.getElementById("gcTitle").addEventListener("click", () => {
  backToTitle();
});

// =========================
// Main Loop
// =========================
let last = performance.now();
function tick(now) {
  battleRuntime.frameId = 0;

  const dtRaw = (now - last) / 1000;
  last = now;
  const dt = clamp(dtRaw, 0, 0.033);

  if (!state.started) {
    cam.follow(state.player);
    renderWorld(canvasApi, cam, assets, state);
    hud.update(state);
    queueNextFrame();
    return;
  }

  if (state.pausedForChoice) {
    cam.follow(state.player);
    renderWorld(canvasApi, cam, assets, state);
    drawPauseMap();
    renderDamageBreakdown(document.getElementById("pauseDamageBreakdown"));
    hud.update(state);
    queueNextFrame();
    return;
  }

  if (state.stageClearCoda?.active) {
    state.stageClearCoda.t += dt;
  }

  if (!state.gameEnded) {
    state.timeSurvived += dt;
    state.score += dt * 1;

    stepSpawns(state, hud, audio, dt, levelup);
    stepPlayer(state, input, hud, audio, dt);
    stepFamiliars(state, hud, audio, dt);
    stepProjectiles(state, hud, audio, dt);
    stepEnemies(state, hud, audio, dt);
    stepDrops(state, hud, audio, levelup, dt);
    stepFx(state, dt);

    if (state._shouldGameOver) {
      state._shouldGameOver = false;
      showGameOver();
    }

    if (state._shouldStageClear) {
      state._shouldStageClear = false;
      startStageClearCoda();
    }
  }

  cam.follow(state.player);
  renderWorld(canvasApi, cam, assets, state);
  hud.update(state);

  queueNextFrame();
}

ensureMainLoopRunning();

