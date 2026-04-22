import { clamp } from "../core/utils.js";

export function drawBossBar(ctx, W, H, state) {
  const boss = state.enemies.find((e) => e.isBoss);
  if (!boss) return;

  const barWidth = Math.min(600, W * 0.7);
  const barHeight = 18;
  const x = (W - barWidth) / 2;
  const topReserved = W <= 820 ? 76 : 66;
  const y = topReserved;

  const pct = clamp(boss.hp / boss.hpMax, 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - 4, y - 4, barWidth + 8, barHeight + 8);

  ctx.fillStyle = "rgba(80,0,0,0.8)";
  ctx.fillRect(x, y, barWidth, barHeight);

  ctx.fillStyle = "rgba(220,40,40,0.95)";
  ctx.fillRect(x, y, barWidth * pct, barHeight);

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.font = "bold 14px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";

  const bossName = boss.name || boss.bossName || "BOSS";
  ctx.fillText(`${bossName}  ${Math.floor(boss.hp)} / ${boss.hpMax}`, W / 2, y - 8);
  ctx.restore();
}

export function drawBossWarning(ctx, W, H, state) {
  const warning = state.bossWarning;
  if (!warning?.active) return;

  const progress = clamp(warning.t / warning.dur, 0, 1);
  const fadeIn = clamp(progress / 0.18, 0, 1);
  const fadeOut = clamp((1 - progress) / 0.24, 0, 1);
  const alpha = Math.min(fadeIn, fadeOut);
  const pulse = 0.72 + Math.abs(Math.sin(progress * Math.PI * 8)) * 0.28;

  ctx.save();
  ctx.globalAlpha = 0.32 * alpha;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  const bandH = 92;
  const bandY = H * 0.5 - bandH * 0.5;
  ctx.globalAlpha = 0.18 * alpha * pulse;
  ctx.fillStyle = "#7a0000";
  ctx.fillRect(0, bandY, W, bandH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  ctx.globalAlpha = alpha;
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(20,0,0,0.9)";
  ctx.font = "bold 44px ui-sans-serif, system-ui, sans-serif";
  ctx.strokeText(warning.text, W * 0.5, H * 0.5 - 8);
  ctx.fillStyle = `rgba(255,${Math.round(180 + 40 * pulse)},${Math.round(180 + 20 * pulse)},1)`;
  ctx.fillText(warning.text, W * 0.5, H * 0.5 - 8);

  ctx.globalAlpha = 0.88 * alpha;
  ctx.font = "bold 16px ui-monospace, Menlo, Consolas, monospace";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(20,0,0,0.85)";
  ctx.strokeText(warning.subText, W * 0.5, H * 0.5 + 26);
  ctx.fillStyle = "rgba(255,235,235,0.98)";
  ctx.fillText(warning.subText, W * 0.5, H * 0.5 + 26);
  ctx.restore();
}

export function drawStageClearCoda(ctx, W, H, state) {
  const coda = state.stageClearCoda;
  if (!coda?.active) return;

  const progress = clamp(coda.t / coda.dur, 0, 1);
  const fadeIn = clamp(progress / 0.22, 0, 1);
  const fadeOut = clamp((1 - progress) / 0.3, 0, 1);
  const alpha = Math.min(fadeIn, fadeOut);
  const glow = 0.82 + Math.sin(progress * Math.PI) * 0.18;

  ctx.save();
  ctx.globalAlpha = 0.34 * alpha;
  ctx.fillStyle = "#04060c";
  ctx.fillRect(0, 0, W, H);

  const centerX = W * 0.5;
  const centerY = H * 0.42;
  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 180);
  grad.addColorStop(0, `rgba(240,248,255,${0.12 * alpha})`);
  grad.addColorStop(0.45, `rgba(170,205,230,${0.08 * alpha})`);
  grad.addColorStop(1, "rgba(170,205,230,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  ctx.globalAlpha = alpha;
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(10, 12, 20, 0.9)";
  ctx.font = "bold 38px 'Shippori Mincho', 'Noto Serif JP', serif";
  ctx.strokeText(coda.text, centerX, centerY - 10);
  ctx.fillStyle = `rgba(${Math.round(232 * glow)},${Math.round(240 * glow)},255,1)`;
  ctx.fillText(coda.text, centerX, centerY - 10);

  ctx.globalAlpha = 0.9 * alpha;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(10, 12, 20, 0.85)";
  ctx.font = "bold 16px 'Shippori Mincho', 'Noto Serif JP', serif";
  ctx.strokeText(coda.subText, centerX, centerY + 30);
  ctx.fillStyle = "rgba(225,235,245,0.98)";
  ctx.fillText(coda.subText, centerX, centerY + 30);

  ctx.globalAlpha = 0.16 * alpha;
  ctx.strokeStyle = "rgba(210, 230, 255, 0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY + 2, 88 + progress * 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
