import {
  ITEM_DEFS,
  pickLevelUpOptions,
  pickBossRewardOption,
  rollBossRewardCount,
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
  const titleEl = refs.panel?.querySelector("h2");
  const defaultTitle = titleEl?.textContent ?? "";

  function show() {
    state.pausedForChoice = true;
    refs.panel.style.display = "block";
    refs.choicesEl.innerHTML = "";
    if (titleEl) titleEl.textContent = defaultTitle;

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
    if (titleEl) titleEl.textContent = "選択";

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

  function showBossRewardSlot(onDone) {
    const rewardCount = rollBossRewardCount();
    const spinResults = [];
    let evolutionUsed = false;

    state.pausedForChoice = true;
    refs.panel.style.display = "block";
    refs.choicesEl.innerHTML = "";
    if (titleEl) titleEl.textContent = "ボス討伐報酬";
    if (audio?.SE) audio.SE.levelUp();

    const wrap = document.createElement("div");
    wrap.className = "bossRewardSlot";
    wrap.innerHTML = [
      `<div class="bossRewardCount">強化回数抽選中...</div>`,
      `<div class="bossRewardReels"></div>`,
      `<div class="bossRewardHint">所持中の武器・装備がランダムで強化される。</div>`,
    ].join("");
    refs.choicesEl.appendChild(wrap);

    const countEl = wrap.querySelector(".bossRewardCount");
    const reelsEl = wrap.querySelector(".bossRewardReels");
    const hintEl = wrap.querySelector(".bossRewardHint");

    const countSequence = [1, 3, 5, 1, 3, 5, rewardCount];
    countSequence.forEach((value, idx) => {
      window.setTimeout(() => {
        if (countEl) countEl.textContent = `強化回数 +${value}`;
      }, 120 * idx);
    });

    window.setTimeout(() => {
      spinBossRewardReel(0);
    }, 120 * countSequence.length + 160);

    function spinBossRewardReel(index) {
      if (index >= rewardCount) {
        window.setTimeout(() => {
          showBossRewardResult();
        }, 360);
        return;
      }

      const opt = pickBossRewardOption(state.player, { allowEvolution: !evolutionUsed });
      if (!opt) {
        spinBossRewardReel(rewardCount);
        return;
      }

      const reel = document.createElement("div");
      reel.className = "bossRewardReel is-spinning";
      reel.innerHTML = renderBossRewardReelContent({ title: "抽選中", badge: "??", iconSrc: "" }, index);
      reelsEl?.appendChild(reel);

      const preview = getBossRewardPreviewOptions(state.player);
      for (let i = 0; i < 7; i++) {
        window.setTimeout(() => {
          const visual = preview[(Math.random() * preview.length) | 0] ?? { title: "強化", badge: "UP", iconSrc: "" };
          reel.innerHTML = renderBossRewardReelContent(visual, index);
        }, 70 * i);
      }

      window.setTimeout(() => {
        const visual = getOptionVisual(opt, state.player);
        applyOption(state, opt, hud);
        if (opt.kind === "weapon_evolve") evolutionUsed = true;
        spinResults.push(opt);

        reel.classList.remove("is-spinning");
        reel.classList.add("is-fixed");
        reel.innerHTML = renderBossRewardReelContent(visual, index);
        hud.update(state);

        window.setTimeout(() => spinBossRewardReel(index + 1), 360);
      }, 560);
    }

    function showBossRewardResult() {
      if (countEl) countEl.textContent = `強化結果 +${spinResults.length}`;
      if (hintEl) {
        hintEl.textContent = spinResults.length > 0
          ? "結果を確認したら閉じる。"
          : "強化できる対象がなかった。";
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "bossRewardContinue";
      button.textContent = "閉じる";
      wrap.appendChild(button);

      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKeyDown);
        refs.panel.style.display = "none";
        refs.choicesEl.innerHTML = "";
        if (titleEl) titleEl.textContent = defaultTitle;
        state.pausedForChoice = false;
        hud.flash(`ボス報酬: ${spinResults.length}回強化`);
        onDone?.();
      };
      const onKeyDown = (event) => {
        if (event.key !== "Enter" && event.key !== " " && event.key !== "Escape") return;
        event.preventDefault();
        close();
      };

      button.addEventListener("click", close, { once: true });
      window.addEventListener("keydown", onKeyDown);
      button.focus();
    }
  }

  return { show, showChoices, showBossRewardSlot };
}

function renderBossRewardReelContent(visual, index) {
  return [
    `<div class="bossRewardIndex">${index + 1}</div>`,
    renderIcon(visual),
    `<div class="bossRewardText">`,
    `<b>${escapeHtml(visual.title)}</b>`,
    `<small>${escapeHtml(visual.tag ?? "強化")}</small>`,
    `</div>`,
  ].join("");
}

function getBossRewardPreviewOptions(player) {
  const previews = [];
  for (const entry of player.weapons ?? []) {
    const weapon = getWeapon(entry.weaponId);
    if (!weapon) continue;
    previews.push({
      title: weapon.name,
      tag: "武器",
      iconSrc: WEAPON_ICONS[entry.weaponId] ?? "",
      badge: "WP",
    });
  }
  for (const itemKey of player.items ?? []) {
    const item = ITEM_DEFS[itemKey];
    if (!item) continue;
    const visual = ITEM_VISUALS[itemKey] ?? {};
    previews.push({
      title: item.name,
      tag: "装備",
      iconSrc: visual.src ?? "",
      badge: visual.badge ?? "UP",
    });
  }
  return previews.length > 0 ? previews : [{ title: "強化", tag: "報酬", iconSrc: "", badge: "UP" }];
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
