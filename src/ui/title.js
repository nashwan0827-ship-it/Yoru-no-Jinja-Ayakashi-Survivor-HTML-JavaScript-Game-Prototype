import { HEROES } from "../data/heroes.js";
import { PATHS } from "../../paths.js";
import { STAGES } from "../data/stages.js";
import { loadPrefs, savePrefs } from "../core/save.js";
import { FAMILIARS } from "../data/familiars.js";

export function initTitleUI(refs, state, assets, audio, onSelectHero, onStart) {
  const prefs = loadPrefs();
  const configOverlay = document.getElementById("configOverlay");
  const openConfigBtn = document.getElementById("openConfigBtn");
  const closeConfigBtn = document.getElementById("closeConfigBtn");
  const familiarOverlay = document.getElementById("familiarOverlay");
  const openFamiliarBtn = document.getElementById("openFamiliarBtn");
  const closeFamiliarBtn = document.getElementById("closeFamiliarBtn");
  const familiarChoices = document.getElementById("familiarChoices");
  const b1 = refs.heroBtn1;
  const b2 = refs.heroBtn2;
  const b3 = refs.heroBtn3;
  const b4 = refs.heroBtn4;
  const b5 = refs.heroBtn5;
  const s1 = refs.stageBtn1;
  const s2 = refs.stageBtn2;
  const intro = refs.titleIntro;
  const introStartBtn = refs.introStartBtn;
  const startBtn = refs.startBtn;
  const heroButtons = [b1, b2, b3, b4, b5].filter(Boolean);
  const stageButtons = [s1, s2].filter(Boolean);
  let introActive = !!intro;

  hydrateHeroCards(heroButtons);

  function openConfig() {
    if (!configOverlay) return;
    configOverlay.classList.add("is-open");
    configOverlay.setAttribute("aria-hidden", "false");
  }

  function closeConfig() {
    if (!configOverlay) return;
    configOverlay.classList.remove("is-open");
    configOverlay.setAttribute("aria-hidden", "true");
  }

  function openFamiliarPanel() {
    if (!familiarOverlay || introActive) return;
    renderFamiliarChoices();
    familiarOverlay.classList.add("is-open");
    familiarOverlay.setAttribute("aria-hidden", "false");
  }

  function closeFamiliarPanel() {
    if (!familiarOverlay) return;
    familiarOverlay.classList.remove("is-open");
    familiarOverlay.setAttribute("aria-hidden", "true");
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
      familiarCountBonus: progress.familiarCountBonus ?? prefs.familiarCountBonus ?? 0,
    };
  }

  function renderFamiliarChoices() {
    if (!familiarChoices) return;

    const progress = getFamiliarProgress();
    const unlockedSet = new Set(progress.unlockedFamiliars);
    familiarChoices.innerHTML = FAMILIARS.map((familiar) => {
      const unlocked = unlockedSet.has(familiar.id);
      const equipped = progress.equippedFamiliarId === familiar.id;
      const cardClass = [
        "familiarCard",
        equipped ? "is-equipped" : "",
        unlocked ? "" : "is-locked",
      ]
        .filter(Boolean)
        .join(" ");
      const buttonLabel = !unlocked ? "未解放" : equipped ? "装備中" : "装備";
      const disabled = !unlocked || equipped ? " disabled" : "";
      return [
        `<div class="${cardClass}" data-familiar-id="${escapeHtml(familiar.id)}">`,
        `<div class="familiarPortrait">${escapeHtml(getFamiliarBadge(familiar))}</div>`,
        `<div class="familiarInfo">`,
        `<b>${escapeHtml(familiar.name)}</b>`,
        `<small>${escapeHtml(familiar.category ?? "仲間")} / ${escapeHtml(getFamiliarSummary(familiar))}</small>`,
        `</div>`,
        `<button class="familiarEquipBtn" type="button"${disabled}>${buttonLabel}</button>`,
        `</div>`,
      ].join("");
    }).join("");

    familiarChoices.querySelectorAll(".familiarCard").forEach((card) => {
      const button = card.querySelector(".familiarEquipBtn");
      button?.addEventListener("click", () => {
        const familiarId = card.getAttribute("data-familiar-id");
        if (!familiarId || !unlockedSet.has(familiarId)) return;
        state.familiarProgress = {
          ...progress,
          equippedFamiliarId: familiarId,
        };
        savePrefs(state.familiarProgress);
        renderFamiliarChoices();
      });
    });
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

  function setActive(id, { force = false } = {}) {
    if (introActive && !force) return;
    state.selectedHeroId = id;
    heroButtons.forEach((btn, index) => {
      btn.classList.toggle("active", id === index + 1);
    });
    savePrefs({ selectedHeroId: id });
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
    savePrefs({ selectedStageId: stage.id });
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
  }

  setActive(state.selectedHeroId || 1, { force: true });
  refreshStageLocks();
  setActiveStage(state.selectedStageId || prefs.selectedStageId || 1, { force: true });

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
  window.addEventListener("stage-unlocks-changed", () => refreshStageLocks());
  introStartBtn?.addEventListener("click", () => hideIntro());
  openConfigBtn?.addEventListener("click", () => openConfig());
  closeConfigBtn?.addEventListener("click", () => closeConfig());
  openFamiliarBtn?.addEventListener("click", () => openFamiliarPanel());
  closeFamiliarBtn?.addEventListener("click", () => closeFamiliarPanel());
  configOverlay?.addEventListener("click", (e) => {
    if (e.target === configOverlay) closeConfig();
  });
  familiarOverlay?.addEventListener("click", (e) => {
    if (e.target === familiarOverlay) closeFamiliarPanel();
  });

  window.addEventListener("keydown", (e) => {
    if (state.started) return;
    if (e.key === "Escape" && familiarOverlay?.classList.contains("is-open")) {
      e.preventDefault();
      closeFamiliarPanel();
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
      savePrefs({ bgmVolume: vol });
    });
    seSlider.addEventListener("input", (e) => {
      const vol = parseFloat(e.target.value);
      audio.setVolumes({ seVol: vol });
      savePrefs({ seVolume: vol });
    });
  }

  bindConfigToggle(loadoutToggle, prefs.showLoadoutPanels, (checked) => {
    state.ui.showLoadoutPanels = checked;
    savePrefs({ showLoadoutPanels: checked });
  });
  bindConfigToggle(enemyHpToggle, prefs.showEnemyHpBars, (checked) => {
    state.ui.showEnemyHpBars = checked;
    savePrefs({ showEnemyHpBars: checked });
  });
  bindConfigToggle(miniMapToggle, prefs.showMiniMap, (checked) => {
    state.ui.showMiniMap = checked;
    savePrefs({ showMiniMap: checked });
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
    renderStatRow("速", stats.speed, ranges.speed),
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

function getFamiliarBadge(familiar) {
  if (familiar?.id === "familiar_yakyo") return "梟";
  if (familiar?.id === "familiar_reiri") return "狸";
  if (familiar?.id === "familiar_shikigami") return "狐";
  return "式";
}

function getFamiliarSummary(familiar) {
  if (familiar?.attackStyle === "airstrike") {
    return "上空から狙いを定め、爆撃で範囲を焼く";
  }
  if (familiar?.attackStyle === "priority_target_support") {
    return "索敵で敵を示し、優先ターゲットへのダメージを高める";
  }
  if (familiar?.attackStyle === "tackle") {
    return "敵へ駆け込み、たいあたりで押し返す";
  }
  return "狐火を放ち、着弾後に火を残す";
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
