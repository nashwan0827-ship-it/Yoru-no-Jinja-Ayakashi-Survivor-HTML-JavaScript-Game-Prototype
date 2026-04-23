import { clamp } from "../core/utils.js";
import { getWeapon } from "../data/weapons.js";
import { getStage } from "../data/stages.js";
import { PATHS } from "../../paths.js";

const ITEM_LABELS = {
  atk: "\u546a\u529b",
  aspd: "\u795e\u901f",
  area: "\u62e1\u754c",
  hpMax: "\u8b77\u7b26",
  magnet: "\u5f15\u5bc4\u305b",
  familiarBoost: "\u5f0f\u795e\u5f37\u5316",
};

const WEAPON_ICONS = {
  ofuda: PATHS.ofudaIcon,
  petal: PATHS.petalIcon,
  orbit: PATHS.orbitIcon,
  slash: PATHS.slashIcon,
  thunder: PATHS.thunderIcon,
  blastchain: PATHS.ofudaIcon,
  senrenfuda: PATHS.ofudaIcon,
  blossomstorm: PATHS.petalIcon,
  fujinranbu: PATHS.petalIcon,
  raiukekkai: PATHS.thunderIcon,
  raijinpa: PATHS.thunderIcon,
  reppufuda: PATHS.orbitIcon,
  hannekekkai: PATHS.orbitIcon,
  reppuzan: PATHS.slashIcon,
  mikazukizan: PATHS.slashIcon,
};

const ITEM_ICONS = {
  atk: PATHS.juryokuIcon,
  aspd: PATHS.aspdIcon,
  area: PATHS.areaIcon,
  hpMax: PATHS.hpMaxIcon,
  magnet: PATHS.magnetIcon,
  familiarBoost: PATHS.shikigamiBoostIcon,
};

export function createHUD(refs){
  const cache = {
    scoreText: null,
    timeText: null,
    killsText: null,
    waveText: null,
    statsHtml: null,
    soulShardText: null,
    hpText: null,
    hpWidth: null,
    xpWidth: null,
    weaponsDisplay: null,
    itemsDisplay: null,
    weaponsSnapshot: null,
    itemsSnapshot: null,
  };

  function setText(el, value){
    if (!el || el.textContent === value) return;
    el.textContent = value;
  }

  function setHTML(el, value){
    if (!el || el.innerHTML === value) return;
    el.innerHTML = value;
  }

  function setWidth(el, value){
    if (!el || el.style.width === value) return;
    el.style.width = value;
  }

  function setDisplay(el, value){
    if (!el || el.style.display === value) return;
    el.style.display = value;
  }

  function renderSlotBox(iconSrc = ""){
    const className = iconSrc ? "weaponSlotBox weaponSlotBox--icon" : "weaponSlotBox";
    const style = iconSrc ? ` style="background-image:url('${iconSrc}')"` : "";
    return `<div class="${className}"${style} aria-hidden="true"></div>`;
  }

  function getWeaponSnapshot(weapons){
    const parts = [];
    for(let i=0;i<3;i++){
      const entry = weapons?.[i];
      parts.push(entry ? `${entry.weaponId}:${entry.level}` : "empty");
    }
    return parts.join("|");
  }

  function getItemSnapshot(items, statLevels){
    const parts = [];
    for(let i=0;i<4;i++){
      const itemKey = items?.[i];
      parts.push(itemKey ? `${itemKey}:${statLevels?.[itemKey] ?? 1}` : "empty");
    }
    return parts.join("|");
  }

  function renderWeaponSlots(weapons){
    if (!refs.weaponsPanel) return;

    const snapshot = getWeaponSnapshot(weapons);
    if (cache.weaponsSnapshot === snapshot) return;

    const lines = [];
    for(let i=0;i<3;i++){
      const entry = weapons?.[i] ?? null;
      if (entry) {
        const def = getWeapon(entry.weaponId);
        const name = def ? def.name : entry.weaponId;
        const iconSrc = WEAPON_ICONS[entry.weaponId] ?? "";
        const evolvedClass = def?.isEvolved ? " weaponSlotText--evolved" : "";
        const evolvedLvClass = def?.isEvolved ? " weaponSlotLv--evolved" : "";
        lines.push(
          `<div class="weaponSlotRow">`+
            `${renderSlotBox(iconSrc)}`+
            `<div class="weaponSlotText${evolvedClass}">${name}</div>`+
            `<div class="weaponSlotLv${evolvedLvClass}">Lv${entry.level}</div>`+
          `</div>`
        );
      } else {
        lines.push(
          `<div class="weaponSlotRow weaponSlotRow--empty">`+
            `${renderSlotBox()}`+
            `<div class="weaponSlotText">\u7a7a\u304d</div>`+
            `<div class="weaponSlotLv">-</div>`+
          `</div>`
        );
      }
    }

    refs.weaponsPanel.innerHTML =
      `<div class="weaponSlotsTitle">\u6b66\u5668</div>`+
      lines.join("");
    cache.weaponsSnapshot = snapshot;
  }

  function renderItemSlots(items, statLevels){
    if (!refs.itemsPanel) return;

    const snapshot = getItemSnapshot(items, statLevels);
    if (cache.itemsSnapshot === snapshot) return;

    const lines = [];
    for(let i=0;i<4;i++){
      const itemKey = items?.[i] ?? null;
      if (itemKey) {
        const name = ITEM_LABELS[itemKey] ?? itemKey;
        const level = statLevels?.[itemKey] ?? 1;
        const iconSrc = ITEM_ICONS[itemKey] ?? "";
        lines.push(
          `<div class="weaponSlotRow">`+
            `${renderSlotBox(iconSrc)}`+
            `<div class="weaponSlotText">${name}</div>`+
            `<div class="weaponSlotLv">Lv${level}</div>`+
          `</div>`
        );
      } else {
        lines.push(
          `<div class="weaponSlotRow weaponSlotRow--empty">`+
            `${renderSlotBox()}`+
            `<div class="weaponSlotText">\u7a7a\u304d</div>`+
            `<div class="weaponSlotLv">-</div>`+
          `</div>`
        );
      }
    }

    refs.itemsPanel.innerHTML =
      `<div class="weaponSlotsTitle">\u88c5\u5099</div>`+
      lines.join("");
    cache.itemsSnapshot = snapshot;
  }

  function formatTime(t){
    const m=Math.floor(t/60);
    const s=Math.floor(t%60);
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function flash(t){
    refs.msg.textContent = t;
    refs.msg.style.opacity = "0.95";
    clearTimeout(flash._t);
    flash._t = setTimeout(()=> refs.msg.style.opacity="0", 900);
  }

  function reset(){
    clearTimeout(flash._t);
    flash._t = 0;
    refs.msg.textContent = "";
    refs.msg.style.opacity = "0";
    cache.scoreText = null;
    cache.timeText = null;
    cache.killsText = null;
    cache.waveText = null;
    cache.statsHtml = null;
    cache.soulShardText = null;
    cache.hpText = null;
    cache.hpWidth = null;
    cache.xpWidth = null;
    cache.weaponsDisplay = null;
    cache.itemsDisplay = null;
    cache.weaponsSnapshot = null;
    cache.itemsSnapshot = null;
  }

  function update(state){
    const scoreText = `\u30b9\u30b3\u30a2: ${Math.floor(state.score).toLocaleString()}`;
    const timeText = `\u6642\u9593: ${formatTime(state.timeSurvived)}`;
    const killsText = `\u8a0e\u4f10: ${state.kills}`;
    const waveText = `${getStage(state.stage).name} / \u30a6\u30a7\u30fc\u30d6 ${state.wave}`;

    if (cache.scoreText !== scoreText) {
      setText(refs.uiScore, scoreText);
      cache.scoreText = scoreText;
    }
    if (cache.timeText !== timeText) {
      setText(refs.uiTime, timeText);
      cache.timeText = timeText;
    }
    if (cache.killsText !== killsText) {
      setText(refs.uiKills, killsText);
      cache.killsText = killsText;
    }
    if (cache.waveText !== waveText) {
      setText(refs.uiWave, waveText);
      cache.waveText = waveText;
    }

    const p = state.player;

    const statsHtml =
      `Lv.${p.level} / \u56de\u53ce: ${Math.round(p.magnet)}<br>`+
      `\u6575: ${state.enemies.length}`;
    if (cache.statsHtml !== statsHtml) {
      setHTML(refs.uiStats, statsHtml);
      cache.statsHtml = statsHtml;
    }

    const soulShardText = `\u9b42\u7247: ${Math.max(0, Math.floor(state.soulShards ?? 0)).toLocaleString()}`;
    if (cache.soulShardText !== soulShardText) {
      setText(refs.uiSoulShards, soulShardText);
      cache.soulShardText = soulShardText;
    }

    const hpText = `HP ${Math.ceil(p.hp)}/${p.hpMax}`;
    const hpWidth = `${clamp(p.hp/p.hpMax,0,1)*100}%`;
    const xpWidth = `${clamp(p.xp/p.xpToNext,0,1)*100}%`;

    if (cache.hpText !== hpText) {
      setText(refs.hpText, hpText);
      cache.hpText = hpText;
    }
    if (cache.hpWidth !== hpWidth) {
      setWidth(refs.hpFill, hpWidth);
      cache.hpWidth = hpWidth;
    }
    if (cache.xpWidth !== xpWidth) {
      setWidth(refs.xpFill, xpWidth);
      cache.xpWidth = xpWidth;
    }

    const showLoadoutPanels = state.ui?.showLoadoutPanels !== false;
    const displayValue = showLoadoutPanels ? "block" : "none";
    if (cache.weaponsDisplay !== displayValue) {
      setDisplay(refs.weaponsPanel, displayValue);
      cache.weaponsDisplay = displayValue;
    }
    if (cache.itemsDisplay !== displayValue) {
      setDisplay(refs.itemsPanel, displayValue);
      cache.itemsDisplay = displayValue;
    }
    renderWeaponSlots(p.weapons || []);
    renderItemSlots(p.items || [], p.statLevels || {});
  }

  return { flash, update, reset };
}
