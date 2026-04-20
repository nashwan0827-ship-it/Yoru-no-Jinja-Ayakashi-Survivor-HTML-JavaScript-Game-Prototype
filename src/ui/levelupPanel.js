import {
  ITEM_DEFS,
  pickLevelUpOptions,
  upgradeWeapon,
  addWeapon,
  applyEvolution,
} from "../data/upgrades.js";
import { getWeapon } from "../data/weapons.js";
import { PATHS } from "../../paths.js";

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

const ITEM_VISUALS = {
  atk: { src: PATHS.juryokuIcon, badge: "ATK" },
  aspd: { src: PATHS.aspdIcon, badge: "SPD" },
  area: { src: PATHS.areaIcon, badge: "AREA" },
  hpMax: { src: PATHS.hpMaxIcon, badge: "HP" },
  magnet: { src: PATHS.magnetIcon, badge: "MAG" },
  familiarBoost: { src: PATHS.shikigamiBoostIcon, badge: "式" },
};

export function createLevelupPanel(refs, state, hud, audio) {
  function show() {
    state.pausedForChoice = true;
    refs.panel.style.display = "block";
    refs.choicesEl.innerHTML = "";

    if (audio?.SE) audio.SE.levelUp();

    const options = pickLevelUpOptions(state.player, 3);
    options.forEach((opt) => {
      const div = buildOptionCard(opt, state.player);
      div.addEventListener("click", () => {
        applyOption(state, opt, hud);
        refs.panel.style.display = "none";
        state.pausedForChoice = false;
        hud.flash(opt.isEvolution ? `進化: ${opt.name}` : `獲得: ${opt.name}`);
      });
      refs.choicesEl.appendChild(div);
    });
  }

  function showChoices(choices, onPick) {
    state.pausedForChoice = true;
    refs.panel.style.display = "block";
    refs.choicesEl.innerHTML = "";

    choices.forEach((choice, idx) => {
      const div = buildCustomChoiceCard(choice);
      div.addEventListener("click", () => {
        if (onPick) onPick(idx, choice);
        refs.panel.style.display = "none";
        state.pausedForChoice = false;
        hud.flash(`選択: ${choice.title}`);
      });
      refs.choicesEl.appendChild(div);
    });
  }

  return { show, showChoices };
}

function buildOptionCard(opt, player) {
  const visual = getOptionVisual(opt, player);
  const div = document.createElement("div");
  div.className = `choice ${visual.kindClass}${opt.isEvolution ? " choice--evolve" : ""}`;
  div.innerHTML = [
    `<div class="choiceCardTop">`,
    renderIcon(visual),
    `<div class="choiceCardHeader">`,
    `<span class="choiceTag">${escapeHtml(visual.tag)}</span>`,
    `<b>${escapeHtml(visual.title)}</b>`,
    `</div>`,
    `</div>`,
    visual.recipeHtml ?? "",
    `<small>${escapeHtml(visual.summary)}</small>`,
  ].join("");
  return div;
}

function buildCustomChoiceCard(choice) {
  const div = document.createElement("div");
  div.className = "choice";
  div.innerHTML = [
    `<div class="choiceCardTop">`,
    `<div class="choiceIcon choiceIcon--badge"><span>選</span></div>`,
    `<div class="choiceCardHeader">`,
    `<span class="choiceTag">選択</span>`,
    `<b>${escapeHtml(choice.title ?? "報酬")}</b>`,
    `</div>`,
    `</div>`,
    `<small>${escapeHtml(choice.desc ?? "")}</small>`,
  ].join("");
  return div;
}

function getOptionVisual(opt, player) {
  if (opt.kind === "weapon_evolve") {
    const weapon = getWeapon(opt.weaponId);
    return {
      tag: "進化",
      title: weapon?.name ?? opt.name,
      summary: shortDesc(weapon?.desc ?? opt.desc, 38),
      kindClass: "choice--weapon",
      iconSrc: WEAPON_ICONS[opt.weaponId] ?? "",
      badge: "EV",
    };
  }

  if (opt.kind === "weapon_upgrade" || opt.kind === "weapon_new") {
    const weapon = getWeapon(opt.weaponId);
    const linkedItem = findEvolutionRequirementForWeapon(opt.weaponId);
    const owned = player.weapons.find((entry) => entry.weaponId === opt.weaponId);
    const nextLevel = opt.kind === "weapon_upgrade" ? (owned?.level ?? 0) + 1 : 1;
    return {
      tag: opt.kind === "weapon_upgrade" ? `武器 Lv${nextLevel}` : "武器 NEW",
      title: weapon?.name ?? opt.name,
      summary: shortDesc(weapon?.desc ?? opt.desc, 38),
      kindClass: "choice--weapon",
      iconSrc: WEAPON_ICONS[opt.weaponId] ?? "",
      badge: "WP",
      recipeHtml: renderLinkedItemHint(linkedItem),
    };
  }

  if (opt.kind === "stat") {
    const item = findItemDefByName(opt.name);
    const key = item?.key ?? "";
    const visual = ITEM_VISUALS[key] ?? {};
    const currentLevel = player.statLevels?.[key] ?? 0;
    const nextLevel = currentLevel + 1;
    const isNew = opt.name.includes("取得");
    return {
      tag: isNew ? "強化 NEW" : `強化 Lv${nextLevel}`,
      title: item?.name ?? opt.name,
      summary: shortDesc(item?.desc ?? opt.desc, 34),
      kindClass: "choice--item",
      iconSrc: visual.src ?? "",
      badge: visual.badge ?? "UP",
    };
  }

  return {
    tag: "選択",
    title: opt.name ?? "不明",
    summary: shortDesc(opt.desc ?? "", 36),
    kindClass: "",
    iconSrc: "",
    badge: "SEL",
  };
}

function renderIcon({ iconSrc, badge }) {
  if (iconSrc) {
    return `<div class="choiceIcon choiceIcon--image" style="background-image:url('${iconSrc}')"></div>`;
  }
  return `<div class="choiceIcon choiceIcon--badge"><span>${escapeHtml(badge)}</span></div>`;
}

function renderLinkedItemHint(requiredItem) {
  if (!requiredItem) return "";

  const itemIcon = renderRecipeChip({
    iconSrc: ITEM_VISUALS[requiredItem.key]?.src ?? "",
    badge: ITEM_VISUALS[requiredItem.key]?.badge ?? "UP",
    label: requiredItem.name,
  });

  return [
    `<div class="choiceRecipe choiceRecipe--hint" aria-hidden="true">`,
    `<span class="choiceRecipeLead">連</span>`,
    itemIcon,
    `</div>`,
  ].join("");
}

function renderRecipeChip({ iconSrc, badge, label }) {
  const content = iconSrc
    ? `<span class="choiceRecipeIcon choiceRecipeIcon--image" style="background-image:url('${iconSrc}')"></span>`
    : `<span class="choiceRecipeIcon choiceRecipeIcon--badge">${escapeHtml(badge)}</span>`;
  return `<span class="choiceRecipeChip" title="${escapeHtml(label)}">${content}</span>`;
}

function shortDesc(text, maxLength = 36) {
  const clean = String(text ?? "")
    .replace(/【進化】/g, "")
    .replace(/Lv\d+/g, "")
    .replace(/。/g, "。 ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}…`;
}

function findItemDefByName(name) {
  return Object.values(ITEM_DEFS).find((item) => name.startsWith(item.name)) ?? null;
}

function findEvolutionRequirementForWeapon(weaponId) {
  const evolvedWeapon = ["blastchain", "blossomstorm", "raiukekkai", "reppufuda", "reppuzan"]
    .map((id) => getWeapon(id))
    .find((weapon) => weapon?.evolveWeaponId === weaponId);
  if (!evolvedWeapon?.requiredStatKey) return null;
  return ITEM_DEFS[evolvedWeapon.requiredStatKey] ?? null;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyOption(state, opt, hud) {
  const p = state.player;

  if (opt.kind === "weapon_evolve") {
    const ok = applyEvolution(p, opt.weaponId);
    if (!ok) hud.flash("進化条件を満たしていません");
  } else if (opt.kind === "weapon_upgrade") {
    upgradeWeapon(p, opt.weaponId);
  } else if (opt.kind === "weapon_new") {
    const ok = addWeapon(p, opt.weaponId);
    if (!ok) hud.flash("武器スロットがいっぱいです");
  } else if (opt.kind === "stat") {
    if (typeof opt.apply === "function") opt.apply();
  }
}
