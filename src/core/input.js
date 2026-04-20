export function createInput(canvasApi){
  const keys = new Set();
  const isTouchLike = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const joystickUi = createJoystickUi();

  window.addEventListener("keydown", e=>{
    const k = e.key.toLowerCase();
    keys.add(k);
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
  }, {passive:false});
  window.addEventListener("keyup", e=> keys.delete(e.key.toLowerCase()));

  const pointer = { down:false, x:0, y:0 };
  const joystick = {
    active: false,
    touchId: null,
    centerX: 0,
    centerY: 0,
    knobX: 0,
    knobY: 0,
    radius: 64,
    deadzone: 16,
    activationRadius: 104,
    x: 0,
    y: 0,
  };

  function updatePointerPosition(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }

  function resetJoystick() {
    joystick.active = false;
    joystick.touchId = null;
    joystick.x = 0;
    joystick.y = 0;
    joystick.knobX = 0;
    joystick.knobY = 0;
    syncJoystickUi();
  }

  function getJoystickAnchor() {
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.round(viewport?.width ?? window.innerWidth ?? canvasApi.W));
    const height = Math.max(1, Math.round(viewport?.height ?? window.innerHeight ?? canvasApi.H));
    const edgePad = width <= 820 ? 22 : 28;
    const bottomPad = height <= 560 ? 26 : 34;
    return {
      x: edgePad + joystick.radius,
      y: height - bottomPad - joystick.radius,
    };
  }

  function syncJoystickUi() {
    if (!joystickUi) return;
    const viewportW = canvasApi.W || window.innerWidth;
    const viewportH = canvasApi.H || window.innerHeight;
    const isMobile = isTouchLike && Math.min(viewportW, viewportH) <= 900;
    joystickUi.root.classList.toggle("visible", isMobile);
    joystickUi.root.classList.toggle("active", joystick.active);
    joystickUi.root.style.left = `${joystick.centerX}px`;
    joystickUi.root.style.top = `${joystick.centerY}px`;
    joystickUi.knob.style.transform = `translate(calc(-50% + ${joystick.knobX}px), calc(-50% + ${joystick.knobY}px))`;
  }

  function updateJoystick(clientX, clientY) {
    const dx = clientX - joystick.centerX;
    const dy = clientY - joystick.centerY;
    const L = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(joystick.radius, L);
    joystick.knobX = (dx / L) * clamped;
    joystick.knobY = (dy / L) * clamped;

    if (clamped <= joystick.deadzone) {
      joystick.x = 0;
      joystick.y = 0;
      syncJoystickUi();
      return;
    }

    joystick.x = joystick.knobX / joystick.radius;
    joystick.y = joystick.knobY / joystick.radius;
    syncJoystickUi();
  }

  function shouldUseJoystick(e) {
    if (e.pointerType !== "touch" || !isTouchLike) return false;
    const anchor = getJoystickAnchor();
    const dx = e.clientX - anchor.x;
    const dy = e.clientY - anchor.y;
    return Math.hypot(dx, dy) <= joystick.activationRadius;
  }

  window.addEventListener("pointerdown", e=>{
    pointer.down=true;
    updatePointerPosition(e);
    if (shouldUseJoystick(e)) {
      e.preventDefault();
      joystick.active = true;
      joystick.touchId = e.pointerId;
      joystick.centerX = getJoystickAnchor().x;
      joystick.centerY = getJoystickAnchor().y;
      updateJoystick(e.clientX, e.clientY);
    }
  });
  window.addEventListener("pointermove", e=>{
    updatePointerPosition(e);
    if (joystick.active && e.pointerId === joystick.touchId) {
      e.preventDefault();
      updateJoystick(e.clientX, e.clientY);
    }
  }, {passive:false});
  window.addEventListener("pointerup", e=>{
    pointer.down=false;
    if (joystick.active && e.pointerId === joystick.touchId) resetJoystick();
  });
  window.addEventListener("pointercancel", e=>{
    pointer.down=false;
    if (joystick.active && e.pointerId === joystick.touchId) resetJoystick();
  });
  window.addEventListener("resize", () => {
    const anchor = getJoystickAnchor();
    joystick.centerX = anchor.x;
    joystick.centerY = anchor.y;
    syncJoystickUi();
  });
  window.visualViewport?.addEventListener("resize", () => {
    const anchor = getJoystickAnchor();
    joystick.centerX = anchor.x;
    joystick.centerY = anchor.y;
    syncJoystickUi();
  });

  {
    const anchor = getJoystickAnchor();
    joystick.centerX = anchor.x;
    joystick.centerY = anchor.y;
    syncJoystickUi();
  }

  return {
    keys,
    pointer,
    joystick,
    down: (k)=>keys.has(k),
    canvasApi,
    isTouchLike,
  };
}

function createJoystickUi() {
  const root = document.createElement("div");
  root.className = "touchJoystick";
  root.setAttribute("aria-hidden", "true");

  const base = document.createElement("div");
  base.className = "touchJoystick-base";
  const knob = document.createElement("div");
  knob.className = "touchJoystick-knob";

  root.append(base, knob);
  document.body.append(root);
  return { root, knob };
}
