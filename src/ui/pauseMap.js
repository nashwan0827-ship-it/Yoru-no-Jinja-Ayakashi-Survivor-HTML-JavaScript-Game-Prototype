export function createPausePanel(refs, state, renderDamageBreakdown) {
  return {
    show() {
      if (refs.pausePanel) refs.pausePanel.style.display = "block";
      this.render();
    },
    hide() {
      if (refs.pausePanel) refs.pausePanel.style.display = "none";
    },
    render() {
      drawPauseMap(refs, state);
      renderDamageBreakdown(document.getElementById("pauseDamageBreakdown"));
    },
  };
}

function drawPauseMap(refs, state) {
  const canvas = refs.pauseMapCanvas;
  const panel = refs.pausePanel;
  if (!canvas || !panel || panel.style.display === "none") return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const nextW = Math.max(1, Math.floor(rect.width * dpr));
  const nextH = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== nextW || canvas.height !== nextH) {
    canvas.width = nextW;
    canvas.height = nextH;
  }

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = rect.width;
  const H = rect.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(7, 10, 18, 0.96)";
  ctx.fillRect(0, 0, W, H);

  if (state.ui?.showMiniMap === false) {
    ctx.fillStyle = "rgba(235, 240, 255, 0.82)";
    ctx.font = "13px system-ui";
    ctx.fillText("\u30dd\u30fc\u30ba\u30de\u30c3\u30d7\u306f\u8a2d\u5b9a\u3067\u975e\u8868\u793a\u3067\u3059", 16, 28);
    ctx.restore();
    return;
  }

  const map = state.map;
  if (!map) {
    ctx.fillStyle = "rgba(235, 240, 255, 0.82)";
    ctx.font = "13px system-ui";
    ctx.fillText("\u30de\u30c3\u30d7\u60c5\u5831\u306a\u3057", 16, 28);
    ctx.restore();
    return;
  }

  const pad = 28;
  const cx = W * 0.5;
  const cy = H * 0.5;
  const mapR = Math.max(1, map.radius);
  const drawR = Math.max(1, Math.min(W, H) * 0.5 - pad);
  const toMap = (wx, wy) => {
    const dx = (wx - map.centerX) / mapR;
    const dy = (wy - map.centerY) / mapR;
    return [cx + dx * drawR, cy + dy * drawR];
  };

  const gridStep = drawR / 4;
  ctx.strokeStyle = "rgba(180, 210, 235, 0.08)";
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * gridStep, cy - drawR);
    ctx.lineTo(cx + i * gridStep, cy + drawR);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - drawR, cy + i * gridStep);
    ctx.lineTo(cx + drawR, cy + i * gridStep);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(120, 190, 230, 0.055)";
  ctx.beginPath();
  ctx.arc(cx, cy, drawR, 0, Math.PI * 2);
  ctx.fill();

  if (map.slowRadius) {
    ctx.strokeStyle = "rgba(255, 220, 170, 0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, drawR * (map.slowRadius / mapR), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(170, 230, 255, 0.62)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, drawR, 0, Math.PI * 2);
  ctx.stroke();

  for (const d of state.drops) {
    const [mx, my] = toMap(d.x, d.y);
    const isChest = d.kind === "chest";
    ctx.fillStyle = isChest ? "rgba(255, 220, 110, 0.95)" : "rgba(110, 235, 255, 0.88)";
    ctx.fillRect(mx - (isChest ? 3 : 2), my - (isChest ? 3 : 2), isChest ? 6 : 4, isChest ? 6 : 4);
  }

  for (const e of state.enemies) {
    const [mx, my] = toMap(e.x, e.y);
    ctx.fillStyle = e.isBoss ? "rgba(255, 85, 135, 0.98)" : "rgba(255, 150, 95, 0.78)";
    ctx.beginPath();
    ctx.arc(mx, my, e.isBoss ? 6 : 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const [px, py] = toMap(state.player.x, state.player.y);
  ctx.fillStyle = "rgba(248, 255, 255, 1)";
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(80, 230, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(230, 238, 255, 0.78)";
  ctx.font = "12px system-ui";
  ctx.fillText(`\u6575 ${state.enemies.length}`, 14, H - 16);
  ctx.fillText(`\u970a\u529b ${state.drops.length}`, 84, H - 16);
  ctx.restore();
}
