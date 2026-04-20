export function createRefs() {
  const canvas = document.getElementById("c");

  return {
    canvas,

    uiStats: document.getElementById("stats"),
    uiScore: document.getElementById("score"),
    uiTime: document.getElementById("time"),
    uiKills: document.getElementById("kills"),
    uiWave: document.getElementById("wave"),
    weaponsPanel: document.getElementById("weaponsPanel"),
    itemsPanel: document.getElementById("itemsPanel"),
    toggleLoadoutBtn: document.getElementById("toggleLoadoutBtn"),
    xpFill: document.getElementById("xpFill"),
    hpText: document.getElementById("hpText"),
    hpFill: document.getElementById("hpFill"),
    msg: document.getElementById("msg"),

    panel: document.getElementById("lvlPanel"),
    choicesEl: document.getElementById("choices"),
    pausePanel: document.getElementById("pausePanel"),
    pauseMapCanvas: document.getElementById("pauseMapCanvas"),
    btnResume: document.getElementById("btnResume"),
    btnRestart: document.getElementById("btnRestart"),
    btnToTitle: document.getElementById("btnToTitle"),

    titleScreen: document.getElementById("titleScreen"),
    titleIntro: document.getElementById("titleIntro"),
    introStartBtn: document.getElementById("introStartBtn"),
    startBtn: document.getElementById("startBtn"),
    heroBtn1: document.getElementById("heroBtn1"),
    heroBtn2: document.getElementById("heroBtn2"),
    heroBtn3: document.getElementById("heroBtn3"),
    heroBtn4: document.getElementById("heroBtn4"),
    heroBtn5: document.getElementById("heroBtn5"),
    stageBtn1: document.getElementById("stageBtn1"),
    stageBtn2: document.getElementById("stageBtn2"),
    bgmVolume: document.getElementById("bgmVolume"),
    seVolume: document.getElementById("seVolume"),
  };
}
