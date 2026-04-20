import { clamp } from "../core/utils.js";
import { getWeapon } from "../data/weapons.js";
import { getStage } from "../data/stages.js";
import { PATHS } from "../../paths.js";

const ITEM_LABELS = {
  atk: "呪力",
  aspd: "神速",
  area: "拡界",
  hpMax: "護符",
  magnet: "引寄せ",
  familiarBoost: "式神強化",
};

const WEAPON_ICONS = {
  ofuda: PATHS.ofudaIcon,
  petal: PATHS.petalIcon,
  orbit: PATHS.orbitIcon,
  slash: PATHS.slashIcon,
  thunder: PATHS.thunderIcon,
  blastchain: PATHS.ofudaIcon,
  blossomstorm: PATHS.petalIcon,
  raiukekkai: PATHS.thunderIcon,
  reppufuda: PATHS.orbitIcon,
  reppuzan: PATHS.slashIcon,
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
    for(let i=0;i<3;i++){
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
            `<div class="weaponSlotText">空き</div>`+
            `<div class="weaponSlotLv">-</div>`+
          `</div>`
        );
      }
    }

    refs.weaponsPanel.innerHTML =
      `<div class="weaponSlotsTitle">武器</div>`+
      lines.join("");
    cache.weaponsSnapshot = snapshot;
  }

  function renderItemSlots(items, statLevels){
    if (!refs.itemsPanel) return;

    const snapshot = getItemSnapshot(items, statLevels);
    if (cache.itemsSnapshot === snapshot) return;

    const lines = [];
    for(let i=0;i<3;i++){
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
            `<div class="weaponSlotText">空き</div>`+
            `<div class="weaponSlotLv">-</div>`+
          `</div>`
        );
      }
    }

    refs.itemsPanel.innerHTML =
      `<div class="weaponSlotsTitle">装備</div>`+
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
    cache.hpText = null;
    cache.hpWidth = null;
    cache.xpWidth = null;
    cache.weaponsDisplay = null;
    cache.itemsDisplay = null;
    cache.weaponsSnapshot = null;
    cache.itemsSnapshot = null;
  }

  function update(state){
    const scoreText = `スコア: ${Math.floor(state.score).toLocaleString()}`;
    const timeText = `時間: ${formatTime(state.timeSurvived)}`;
    const killsText = `キル: ${state.kills}`;
    const waveText = `${getStage(state.stage).name} / ウェーブ: ${state.wave}`;

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
      `Lv.${p.level} / 磁石: ${Math.round(p.magnet)}<br>`+
      `敵: ${state.enemies.length}`;
    if (cache.statsHtml !== statsHtml) {
      setHTML(refs.uiStats, statsHtml);
      cache.statsHtml = statsHtml;
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
