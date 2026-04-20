export function createCanvas(canvas){
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  function syncViewportState() {
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.round(viewport?.width ?? window.innerWidth));
    const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
    const isTouchLike = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const isMobileViewport = isTouchLike && Math.min(width, height) <= 900;
    const isLandscape = width > height;

    document.documentElement.style.setProperty("--app-vh", `${height * 0.01}px`);
    document.body.classList.toggle("mobile-device", isMobileViewport);
    document.body.classList.toggle("mobile-landscape", isMobileViewport && isLandscape);
  }

  const api = {
    canvas,
    ctx,
    W: 0,
    H: 0,
    DPR: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
    resize(){
      const viewport = window.visualViewport;
      api.W = Math.max(1, Math.round(viewport?.width ?? window.innerWidth));
      api.H = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
      canvas.width  = Math.floor(api.W * api.DPR);
      canvas.height = Math.floor(api.H * api.DPR);
      canvas.style.width = api.W + "px";
      canvas.style.height = api.H + "px";
      ctx.setTransform(api.DPR,0,0,api.DPR,0,0);
      syncViewportState();
    },
  };

  window.addEventListener("resize", ()=>api.resize());
  window.addEventListener("orientationchange", ()=>api.resize());
  window.visualViewport?.addEventListener("resize", ()=>api.resize());
  api.resize();
  return api;
}
