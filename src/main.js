import { createCanvas } from "./core/canvas.js";
import { createCamera } from "./core/camera.js";
import { createInput } from "./core/input.js";
import { createAssets } from "./core/assets.js";
import { createAudio } from "./core/audio.js";
import { createBgmController } from "./core/bgmController.js";
import { loadPrefs } from "./core/save.js";
import { savePrefsFromState } from "./core/save.js";

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
import { createPausePanel } from "./ui/pauseMap.js";
import { createResultScreens } from "./ui/resultScreen.js";

import {
  stepSpawns,
  spawnEnemyRing,
  forceSpawnBoss,
  forceAdvanceWave,
} from "./systems/spawns.js";
import { stepPlayer } from "./systems/player.js";
import { stepFamiliars } from "./systems/familiars.js";
import { stepProjectiles } from "./systems/projectiles.js";
import { stepEnemies } from "./systems/enemies.js";
import { stepDrops, grantLevelUp } from "./systems/drops.js";
import { stepFx } from "./systems/fx.js";

import { renderWorld } from "./render/world.js";
import { clamp } from "./core/utils.js";
import { DEBUG_KEYS } from "./debug/config.js";
import { getStage } from "./data/stages.js";

const BATTLE_RUNTIME_SELECTOR = '[data-battle-runtime="true"]';
const MAX_DT = 1 / 30;

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
state.prefs = savedPrefs;
state.selectedHeroId = savedPrefs.selectedHeroId;
state.selectedStageId = savedPrefs.selectedStageId;
state.selectedDifficultyId = savedPrefs.selectedDifficultyId;
state.unlockedStageMax = savedPrefs.unlockedStageMax;
state.unlockedDifficulties = savedPrefs.unlockedDifficulties;
state.soulShards = savedPrefs.soulShards;
state.unlockedHeroIds = savedPrefs.unlockedHeroIds;
state.permanentUpgrades = savedPrefs.permanentUpgrades;
state.ui.showLoadoutPanels = savedPrefs.showLoadoutPanels;
state.ui.showEnemyHpBars = savedPrefs.showEnemyHpBars;
state.ui.showMiniMap = savedPrefs.showMiniMap;
state.familiarProgress = {
  unlockedFamiliars: savedPrefs.unlockedFamiliars,
  equippedFamiliarId: savedPrefs.equippedFamiliarId,
  familiarLevel: savedPrefs.familiarLevel,
  familiarMastery: savedPrefs.familiarMastery,
  familiarCountBonus: savedPrefs.familiarCountBonus,
};

const hud = createHUD(refs);
const levelup = createLevelupPanel(refs, state, hud, audio);
const bgm = createBgmController(audio, state);

const battleRuntime = {
  frameId: 0,
  timeouts: new Set(),
  intervals: new Set(),
};

let resultScreens;
const pausePanel = createPausePanel(refs, state, (el) => resultScreens?.renderDamageBreakdown(el));

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
  resultScreens?.hide();

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
  savePrefsFromState(state, { showLoadoutPanels: state.ui.showLoadoutPanels });
  hud.flash(state.ui.showLoadoutPanels ? "装備パネル表示" : "装備パネル非表示");
}

function toggleEnemyHpBars() {
  state.ui.showEnemyHpBars = !state.ui.showEnemyHpBars;
  savePrefsFromState(state, { showEnemyHpBars: state.ui.showEnemyHpBars });
  hud.flash(state.ui.showEnemyHpBars ? "敵HPバー表示" : "敵HPバー非表示");
}

function queueFreshBattleStart() {
  backToTitle();
  scheduleBattleTimeout(() => startGame(), 80);
}

resultScreens = createResultScreens({
  state,
  refs,
  audio,
  pausePanel,
  onRetry: queueFreshBattleStart,
  onTitle: backToTitle,
  onClear: () => resultScreens.showGameClear(),
});

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

  spawnEnemyRing(state, getStage(state.stage).entrySpawnCount);

  bgm.playGameBgm();
  hud.flash(getStage(state.stage).introText);
  ensureMainLoopRunning();
}

function backToTitle() {
  cleanupBattleScene();
  const latestPrefs = state.prefs ?? savedPrefs;
  state.soulShards = latestPrefs.soulShards;
  state.permanentUpgrades = latestPrefs.permanentUpgrades;
  applyHeroStats(state, state.selectedHeroId);

  if (refs.titleScreen) refs.titleScreen.style.display = "flex";
  window.dispatchEvent(new CustomEvent("soul-shards-changed"));

  if (bgm.audioUnlocked) bgm.playTitleBgm();
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
// Main Loop
// =========================
let last = performance.now();
function tick(now) {
  battleRuntime.frameId = 0;

  const dtRaw = (now - last) / 1000;
  last = now;
  const dt = clamp(dtRaw, 0, MAX_DT);

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
    pausePanel.render();
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
      resultScreens.showGameOver();
    }

    if (state._shouldStageClear) {
      state._shouldStageClear = false;
      resultScreens.startStageClearCoda();
    }
  }

  cam.follow(state.player);
  renderWorld(canvasApi, cam, assets, state);
  hud.update(state);

  queueNextFrame();
}

ensureMainLoopRunning();

