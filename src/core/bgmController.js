export function createBgmController(audio, state) {
  let audioUnlocked = false;

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

  return {
    get audioUnlocked() {
      return audioUnlocked;
    },
    playTitleBgm,
    playGameBgm,
  };
}
