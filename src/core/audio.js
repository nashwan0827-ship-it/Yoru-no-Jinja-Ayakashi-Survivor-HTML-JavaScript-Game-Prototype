import { PATHS } from "../../paths.js";

export function createAudio() {
  let title = null;
  let game = null;
  let warningSe = null;
  let current = null; // "title" | "game"
  let muted = false;
  let unlocked = false;
  let seVolume = 0;
  let audioContext = null;
  let warningStopTimer = 0;

  function ensure() {
    if (title && game && warningSe) return;

    title = new Audio(PATHS.titleBgm);
    title.loop = true;
    title.volume = 0;
    title.preload = "auto";
    title.muted = muted;

    game = new Audio(PATHS.gameBgm);
    game.loop = true;
    game.volume = 0;
    game.preload = "auto";
    game.muted = muted;

    warningSe = new Audio(PATHS.warningSe);
    warningSe.preload = "auto";
    warningSe.volume = seVolume;
    warningSe.muted = muted;

    title.addEventListener("error", () =>
      console.error("[audio] title bgm load failed:", PATHS.titleBgm),
    );
    game.addEventListener("error", () =>
      console.error("[audio] game bgm load failed:", PATHS.gameBgm),
    );
    warningSe.addEventListener("error", () =>
      console.error("[audio] warning se load failed:", PATHS.warningSe),
    );
  }

  // 自動再生制限を突破（最初のユーザー操作で呼ぶ）
  async function unlock() {
    ensure();
    if (unlocked) return true;

    const titleVolume = title.volume;
    try {
      // 一瞬だけ再生→即停止（許可を得る）
      title.volume = 0.0001;
      await title.play();
      title.pause();
      title.currentTime = 0;
      title.volume = titleVolume;

      unlocked = true;
      return true;
    } catch (e) {
      title.volume = titleVolume;
      // ここで落とさない
      console.warn("[audio] unlock blocked:", e?.message || e);
      unlocked = false;
      return false;
    }
  }

  function stopWarningSe() {
    ensure();
    if (!warningSe) return;
    warningSe.pause();
    warningSe.currentTime = 0;
    warningSe.loop = false;
    if (warningStopTimer) {
      clearTimeout(warningStopTimer);
      warningStopTimer = 0;
    }
  }

  function stopAll() {
    ensure();
    [title, game, warningSe].forEach((a) => {
      if (!a) return;
      a.pause();
      a.currentTime = 0;
      a.loop = false;
    });
    stopWarningSe();
    current = null;
  }

  async function playTitle() {
    ensure();
    await unlock();
    if (current === "title") return;

    if (game) {
      game.pause();
      game.currentTime = 0;
    }
    current = "title";
    title.muted = muted;
    title.play().catch(() => {});
  }

  async function playGame() {
    ensure();
    await unlock();
    if (current === "game") return;

    if (title) {
      title.pause();
      title.currentTime = 0;
    }
    current = "game";
    game.muted = muted;
    game.play().catch(() => {});
  }

  function toggleMute() {
    muted = !muted;
    if (title) title.muted = muted;
    if (game) game.muted = muted;
    if (warningSe) warningSe.muted = muted;
  }

  function setVolumes({ titleVol, gameVol, seVol } = {}) {
    ensure();
    if (typeof titleVol === "number")
      title.volume = Math.max(0, Math.min(1, titleVol));
    if (typeof gameVol === "number")
      game.volume = Math.max(0, Math.min(1, gameVol));
    if (typeof seVol === "number") seVolume = Math.max(0, Math.min(1, seVol));
    if (warningSe) warningSe.volume = seVolume;
  }

  // SE互換（Web Audio APIで生成）
  const SE = {
    hit() {
    },
    levelUp() {
      if (muted) return;
      playTone(600, 0.2, seVolume);
      setTimeout(() => playTone(800, 0.2, seVolume), 100);
    },
    warning() {
      if (muted) return;
      ensure();
      if (!warningSe) return;
      stopWarningSe();
      warningSe.volume = seVolume;
      warningSe.loop = true;
      warningSe.play().catch(() => {});
      warningStopTimer = setTimeout(() => {
        stopWarningSe();
      }, 3000);
    },
    stopWarning() {
      stopWarningSe();
    },
    pickup() {
    },
    kill() {
    },
    shoot() {
    },
  };

  function playTone(frequency, duration, volume, type = "sine") {
    if (!audioContext)
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration,
    );
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  return {
    unlock,
    playTitle,
    playGame,
    stopAll,
    toggleMute,
    setVolumes,
    SE,
  };
}
