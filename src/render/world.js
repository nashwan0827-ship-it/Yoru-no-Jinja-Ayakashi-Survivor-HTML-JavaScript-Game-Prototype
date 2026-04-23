// ワールド描画全体を管理する
import { clamp } from "../core/utils.js";
import { drawOni } from "./primitives.js";
import {
  drawBackground,
  drawMapBoundary,
  drawStageObjects,
} from "./background.js";
import { drawHero } from "./hero.js";
import { toScreen } from "./renderUtils.js";
import {
  drawBossBar,
  drawBossWarning,
  drawStageClearCoda,
} from "./uiOverlays.js";
import { PLAYER_CENTER_Y_OFFSET } from "../state/combatOffsets.js";
import {
  STAGE1_TORII_OBJECTS,
  getToriiCollisionRects,
} from "../data/stageObjects.js";

export function renderWorld(canvasApi, cam, assets, state) {
  const ctx = canvasApi.ctx;
  const W = canvasApi.W;
  const H = canvasApi.H;

  cam.follow(state.player);

  drawBackground(ctx, W, H, cam, assets, state);
  drawMapBoundary(ctx, W, H, cam, state);
  drawStageObjects(ctx, W, H, cam, assets, state);
  drawDrops(ctx, W, H, cam, assets, state);

  for (const e of state.enemies) {
    drawEnemy(ctx, W, H, cam, assets, state, e);
  }

  drawPriorityTargetMark(ctx, W, H, cam, state);
  drawFamiliars(ctx, W, H, cam, assets, state);
  drawProjectiles(ctx, W, H, cam, assets, state);
  drawHostileProjectiles(ctx, W, H, cam, state);
  drawFx(ctx, W, H, cam, assets, state);
  drawHero(ctx, W, H, cam, assets, state);

  drawOrbit(ctx, W, H, cam, assets, state);
  drawBossBar(ctx, W, H, state);
  drawRaiuVisual(ctx, W, H, cam, state);
  drawBossWarning(ctx, W, H, state);
  drawStageClearCoda(ctx, W, H, state);

  if (state.debug?.enabled && state.debug?.showHitboxes) {
    drawDebugHitboxes(ctx, W, H, cam, state);
  }
  if (state.debug?.enabled && state.debug?.showHud) {
    drawDebugHud(ctx, W, H, state);
  }
}

function drawRaiuVisual(ctx, W, H, cam, state) {
  return;
}

function drawFamiliars(ctx, W, H, cam, assets, state) {
  const familiars = state.activeFamiliars ?? [];
  for (const familiar of familiars) {
    const [sx, sy] = toScreen(cam, W, H, familiar.x, familiar.y);
    const bob = Math.sin((state.timeSurvived ?? 0) * 5 + (familiar.bobSeed ?? 0)) * 3;

    if (drawFamiliarSprite(ctx, assets, state, familiar, sx, sy + bob)) {
      continue;
    }

    drawKodamaFamiliar(ctx, sx, sy + bob, state, familiar);
  }
}

function drawKodamaFamiliar(ctx, sx, sy, state, familiar) {
  const t = state.timeSurvived ?? 0;
  const pulse = 1 + Math.sin(t * 6.2 + (familiar.bobSeed ?? 0)) * 0.08;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = 0.92;

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
  glow.addColorStop(0, "rgba(240, 255, 255, 0.72)");
  glow.addColorStop(0.45, "rgba(105, 244, 255, 0.24)");
  glow.addColorStop(1, "rgba(105, 244, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(235, 255, 252, 0.96)";
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.bezierCurveTo(10, -8, 11, 5, 3, 14);
  ctx.quadraticCurveTo(0, 10, -4, 14);
  ctx.bezierCurveTo(-12, 5, -10, -8, 0, -13);
  ctx.fill();

  ctx.fillStyle = "rgba(70, 165, 185, 0.74)";
  ctx.fillRect(-5, -3, 3, 3);
  ctx.fillRect(3, -3, 3, 3);
  ctx.fillRect(-2, 4, 4, 2);

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "rgba(120, 245, 255, 0.88)";
  ctx.beginPath();
  ctx.arc(15, -10, 2.4, 0, Math.PI * 2);
  ctx.arc(-13, 7, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPriorityTargetMark(ctx, W, H, cam, state) {
  const enemy = state.priorityTarget?.enemy;
  if (!enemy || enemy.hp <= 0) return;

  const [sx, sy] = toScreen(cam, W, H, enemy.x, enemy.y);
  const radius = Math.max(10, (enemy.r ?? 12) + 8);
  const t = state.timeSurvived ?? 0;
  const pulse = 1 + Math.sin(t * 7) * 0.08;

  ctx.save();
  ctx.translate(sx, sy - radius * 0.35);
  ctx.scale(pulse, pulse);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "rgba(255, 224, 100, 0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(255, 238, 150, 0.38)";
  ctx.beginPath();
  ctx.arc(0, -radius - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFamiliarSprite(ctx, assets, state, familiar, sx, sy) {
  const isShikigami = familiar.id === "familiar_shikigami";
  const isTanuki = familiar.id === "familiar_reiri";
  const isYakyo = familiar.id === "familiar_yakyo";
  if (!isShikigami && !isTanuki && !isYakyo) return false;
  const img = isYakyo
    ? assets.yakyoOwlFamiliarImg?.()
    : isTanuki
      ? assets.reiriTanukiFamiliarImg?.()
      : assets.shikigamiFamiliarImg?.();
  const ready = isYakyo
    ? assets.yakyoOwlFamiliarReady?.() && !!img
    : isTanuki
      ? assets.reiriTanukiFamiliarReady?.() && !!img
      : assets.shikigamiFamiliarReady?.() && !!img;
  if (!ready) return false;

  const cols = isYakyo
    ? assets.YAKYO_OWL_FAMILIAR_COLS?.() ?? 4
    : isTanuki
      ? assets.REIRI_TANUKI_FAMILIAR_COLS?.() ?? 4
      : assets.SHIKIGAMI_FAMILIAR_COLS?.() ?? 4;
  const rows = isYakyo
    ? assets.YAKYO_OWL_FAMILIAR_ROWS?.() ?? 2
    : isTanuki
      ? assets.REIRI_TANUKI_FAMILIAR_ROWS?.() ?? 2
      : assets.SHIKIGAMI_FAMILIAR_ROWS?.() ?? 2;
  const fw = isYakyo
    ? assets.YAKYO_OWL_FAMILIAR_FW?.() || Math.floor(img.width / cols)
    : isTanuki
      ? assets.REIRI_TANUKI_FAMILIAR_FW?.() || Math.floor(img.width / cols)
      : assets.SHIKIGAMI_FAMILIAR_FW?.() || Math.floor(img.width / cols);
  const fh = isYakyo
    ? assets.YAKYO_OWL_FAMILIAR_FH?.() || Math.floor(img.height / rows)
    : isTanuki
      ? assets.REIRI_TANUKI_FAMILIAR_FH?.() || Math.floor(img.height / rows)
      : assets.SHIKIGAMI_FAMILIAR_FH?.() || Math.floor(img.height / rows);
  if (!fw || !fh) return false;

  const movingLeft = (familiar.targetX ?? familiar.x) < familiar.x - 6;
  const movingRight = (familiar.targetX ?? familiar.x) > familiar.x + 6;
  const tackling = !!familiar.tackle;
  const t = state.timeSurvived ?? 0;
  let frame = Math.floor(t * 5) % 2;

  if (tackling && isTanuki) {
    frame = Math.floor(t * 12) % 2 === 0 ? 5 : 6;
  } else if (movingLeft) {
    frame = frame === 0 ? 2 : 3;
  } else if (movingRight) {
    frame = frame === 0 ? 2 : 3;
  } else {
    frame = frame === 0 ? 0 : 1;
  }

  const srcX = (frame % cols) * fw;
  const srcY = Math.floor(frame / cols) * fh;
  const dh = isYakyo ? 60 : isTanuki ? 58 : 54;
  const dw = dh * (fw / fh);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(sx, sy - dh * 0.82);
  if (movingLeft) ctx.scale(-1, 1);
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, 0, dw, dh);
  ctx.restore();
  return true;
}

function drawEnemy(ctx, W, H, cam, assets, state, e) {
  const [sx, sy] = toScreen(cam, W, H, e.x, e.y);
  const alpha = getEnemyLifetimeAlpha(state, e);

  ctx.save();
  ctx.globalAlpha *= alpha;

  if (e.type === 0) {
    drawEnemyOniRedSprite(ctx, assets, state, e, sx, sy);
  } else if (e.type === 1 || e.type === 2 || e.type === 3) {
    drawEnemy2Sprite(ctx, assets, state, e, sx, sy);
  } else if (e.type === 6) {
    drawBoarYokaiSprite(ctx, assets, state, e, sx, sy);
  } else if (e.type === 4) {
    drawFastEnemySprite(ctx, assets, state, e, sx, sy);
  } else if (e.type === 5) {
    drawTankEnemySprite(ctx, assets, state, e, sx, sy);
  } else if (e.type === 7 || e.type === 8) {
    drawKageboshiSprite(ctx, assets, state, e, sx, sy);
  } else {
    ctx.fillStyle = e.color || "#6ae0ff";
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0b0a12";
    ctx.fillRect(sx - 5, sy - 4, 4, 4);
    ctx.fillRect(sx + 1, sy - 4, 4, 4);
  }

  ctx.restore();

  if (e.isBoss) {
    drawBossIntent(ctx, state, e, sx, sy);
  }

  if (state.ui?.showEnemyHpBars !== false) {
    const w = 26;
    const h = 4;
    const pct = clamp(e.hp / e.hpMax, 0, 1);
    const barY = sy + e.r + 8;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx - w / 2, barY, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(sx - w / 2, barY, w * pct, h);
    ctx.restore();
  }
}

function drawBossIntent(ctx, state, e, sx, sy) {
  const pulse = 0.72 + 0.28 * Math.sin(state.timeSurvived * 8);

  if (e.bossPhase >= 1) {
    ctx.save();
    ctx.globalAlpha = 0.12 * pulse;
    ctx.strokeStyle = "rgba(255,120,120,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, e.r + 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (e.bossState === "beamAim") {
    const dirX = e.bossBeamDirX ?? 1;
    const dirY = e.bossBeamDirY ?? 0;
    const beamLen = e.bossBeamDrawLength ?? 380;
    const beamWidth = e.bossBeamDrawWidth ?? 26;
    const startX = sx + dirX * (e.r * 0.6);
    const startY = sy + dirY * (e.r * 0.6);
    const endX = startX + dirX * beamLen;
    const endY = startY + dirY * beamLen;
    const total = Math.max(0.001, e.bossBeamAimTotal ?? 0.64);
    const progress = clamp(1 - (e.bossTimer ?? 0) / total, 0, 1);
    const warnColor =
      e.bossPhase >= 1 ? "rgba(255,95,170,0.95)" : "rgba(130,225,255,0.95)";

    ctx.save();
    ctx.lineCap = "round";
    ctx.globalCompositeOperation = "screen";

    ctx.globalAlpha = 0.12 + progress * 0.22 + 0.05 * pulse;
    ctx.strokeStyle = warnColor;
    ctx.lineWidth = Math.max(3, beamWidth * (0.18 + progress * 0.18));
    ctx.setLineDash([18, 10]);
    ctx.lineDashOffset = -state.timeSurvived * 60;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = 0.2 + progress * 0.5;
    ctx.fillStyle = warnColor;
    ctx.beginPath();
    ctx.arc(startX, startY, 8 + progress * 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  if (e.bossState === "beamFire") {
    const dirX = e.bossBeamDirX ?? 1;
    const dirY = e.bossBeamDirY ?? 0;
    const beamLen = e.bossBeamDrawLength ?? 380;
    const beamWidth = e.bossBeamDrawWidth ?? 26;
    const startX = sx + dirX * (e.r * 0.6);
    const startY = sy + dirY * (e.r * 0.6);
    const endX = startX + dirX * beamLen;
    const endY = startY + dirY * beamLen;

    ctx.save();
    ctx.lineCap = "round";

    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.2 + 0.08 * pulse;
    ctx.strokeStyle =
      e.bossPhase >= 1 ? "rgba(255,110,180,0.92)" : "rgba(170,235,255,0.92)";
    ctx.lineWidth = beamWidth * 2.15;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.globalAlpha = 0.95;
    ctx.strokeStyle =
      e.bossPhase >= 1 ? "rgba(255,215,240,0.98)" : "rgba(245,255,255,0.98)";
    ctx.lineWidth = beamWidth;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = "rgba(255,255,255,0.98)";
    ctx.lineWidth = Math.max(3, beamWidth * 0.36);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.restore();
  }
}

function getEnemyLifetimeAlpha(state, e) {
  if (e.isBoss || !Number.isFinite(e.lifeTime)) return 1;
  const remaining = (e.lifeTime ?? 0) - (e.age ?? 0);
  if (remaining >= 3) return 1;

  const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(state.timeSurvived * 20));
  return Math.max(0.28, blink);
}

function drawEnemy2Sprite(ctx, assets, state, e, sx, sy) {
  const img = e.isBoss ? assets.bossImg() : assets.enemy2Img();
  const ready = e.isBoss
    ? assets.bossReady() && !!img
    : assets.enemy2Ready() && !!img;
  if (!ready) {
    ctx.fillStyle = e.isBoss ? "#b9a7ff" : "#6ae0ff";
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const cols = 4;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);

  const fps = 10;
  const fi = Math.floor(state.timeSurvived * fps) % (cols * rows);
  const col = fi % cols;
  const row = Math.floor(fi / cols);

  const srcX = col * fw;
  const srcY = row * fh;

  // ボス時は大きく、type:1 は少しだけ大きく表示する
  const ENEMY2_H = e.isBoss ? 150 : e.type === 1 ? 82 : 74;
  const scale = ENEMY2_H / fh;
  const dw = fw * scale;
  const dh = fh * scale;

  const face = e.face || 1;

  ctx.save();
  ctx.translate(sx, sy + e.r + 10);
  ctx.scale(face, 1);
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();
}

function drawEnemyOniRedSprite(ctx, assets, state, e, sx, sy) {
  const img = assets.enemyOniRedImg();
  const ready = assets.enemyOniRedReady() && !!img;
  if (!ready) {
    ctx.fillStyle = e.color || "#c86cff";
    ctx.beginPath();
    ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const cols = 4;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);

  const fps = 8;
  const frameCount = cols * rows;
  const fi = Math.floor(state.timeSurvived * fps) % frameCount;
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;

  const oniH = 74;
  const scale = oniH / fh;
  const dw = fw * scale;
  const dh = fh * scale;
  const face = e.face || 1;

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, sy + e.r * 0.96, e.r * 0.78, e.r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy + e.r + 3);
  ctx.scale(face, 1);
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();
}

function drawBoarYokaiSprite(ctx, assets, state, e, sx, sy) {
  const img = assets.enemyBoarImg();
  const ready = assets.enemyBoarReady() && !!img;
  if (!ready) {
    ctx.save();
    ctx.fillStyle = "#8b5740";
    ctx.beginPath();
    ctx.ellipse(sx, sy, e.r * 1.2, e.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const cols = 4;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);

  const animSpeed =
    e.boarState === "rush" ? 16 : e.boarState === "charge" ? 5 : 8;
  const frameCount = cols * rows;
  const fi = Math.floor(state.timeSurvived * animSpeed) % frameCount;
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;

  const baseH = 64;
  const chargeScale = e.boarState === "charge" ? 0.95 : 1;
  const rushStretch = 1;
  const scale = (baseH / fh) * chargeScale;
  const dw = fw * scale * rushStretch;
  const dh = fh * scale;
  const face = e.face || 1;
  const chargeFlash =
    e.boarState === "charge"
      ? 0.74 + Math.abs(Math.sin((e.boarTimer || 0) * 18)) * 0.26
      : 1;

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, sy + e.r * 0.95, e.r * 1.1, e.r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy + e.r + 6);
  ctx.scale(face, 1);
  ctx.globalAlpha = chargeFlash;
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();
}

function drawFastEnemySprite(ctx, assets, state, e, sx, sy) {
  const img = assets.enemyFastImg();
  const ready = assets.enemyFastReady() && !!img;
  if (!ready) {
    drawOnibi(ctx, state, e, sx, sy);
    return;
  }

  const cols = 4;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);

  const fps = 12;
  const fi = Math.floor(state.timeSurvived * fps) % (cols * rows);
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;

  const hover = Math.sin(state.timeSurvived * 9 + e.x * 0.01) * 4;
  const bodyH = 68;
  const scale = bodyH / fh;
  const dw = fw * scale;
  const dh = fh * scale;
  const face = e.face || 1;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, sy + e.r * 1.35, e.r * 1.15, e.r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy + e.r + 14 + hover);
  ctx.scale(face, 1);
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();
}

function drawTankEnemySprite(ctx, assets, state, e, sx, sy) {
  const img = assets.enemyTankImg();
  const ready = assets.enemyTankReady() && !!img;
  if (!ready) {
    drawIwaYokai(ctx, e, sx, sy);
    return;
  }

  const cols = 4;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);

  const fps = 7;
  const fi = Math.floor(state.timeSurvived * fps) % (cols * rows);
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;

  const bodyH = 112;
  const scale = bodyH / fh;
  const dw = fw * scale;
  const dh = fh * scale;
  const face = e.face || 1;

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, sy + e.r * 1.05, e.r * 1.12, e.r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy + e.r + 8);
  ctx.scale(face, 1);
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();
}

function drawKageboshiSprite(ctx, assets, state, e, sx, sy) {
  const isRed = e.type === 8;
  const img = isRed ? assets.enemyKageboshiRedImg?.() : assets.enemyKageboshiImg?.();
  const ready = isRed
    ? assets.enemyKageboshiRedReady?.() && !!img
    : assets.enemyKageboshiReady?.() && !!img;
  if (!ready) {
    ctx.save();
    ctx.fillStyle = e.color || "#7050d8";
    ctx.beginPath();
    ctx.arc(sx, sy, e.r || 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const cols = isRed ? assets.ENEMY_KAGEBOSHI_RED_COLS?.() ?? 4 : assets.ENEMY_KAGEBOSHI_COLS?.() ?? 4;
  const rows = isRed ? assets.ENEMY_KAGEBOSHI_RED_ROWS?.() ?? 2 : assets.ENEMY_KAGEBOSHI_ROWS?.() ?? 2;
  const fw = (isRed ? assets.ENEMY_KAGEBOSHI_RED_FW?.() : assets.ENEMY_KAGEBOSHI_FW?.()) || Math.floor(img.width / cols);
  const fh = (isRed ? assets.ENEMY_KAGEBOSHI_RED_FH?.() : assets.ENEMY_KAGEBOSHI_FH?.()) || Math.floor(img.height / rows);
  const frameCount = cols * rows;
  const fps = 7;
  const fi = Math.floor(state.timeSurvived * fps) % frameCount;
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;

  const hover = Math.sin(state.timeSurvived * 5.5 + e.x * 0.01) * 3;
  const targetH = 128;
  const scale = targetH / fh;
  const dw = fw * scale;
  const dh = fh * scale;
  const face = e.face || 1;
  const radius = e.r || 18;

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, sy + radius * 1.1, radius * 0.9, radius * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(sx, sy + radius + 6 + hover);
  ctx.scale(face, 1);
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();
}

// 鬼火の描画
function drawOnibi(ctx, state, e, sx, sy) {
  const pulse = 0.85 + 0.15 * Math.sin(state.timeSurvived * 8 + e.x * 0.01);
  const r = e.r * pulse;

  // 外側の淡い発光
  ctx.save();
  ctx.globalAlpha = 0.18;
  const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.8);
  grd.addColorStop(0, "#88eeff");
  grd.addColorStop(1, "rgba(80,220,255,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 本体の炎
  ctx.save();
  ctx.globalAlpha = 0.9;
  const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, "#88eeff");
  g.addColorStop(1, "rgba(40,160,220,0.6)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 岩妖怪の描画
function drawIwaYokai(ctx, e, sx, sy) {
  const r = e.r;
  const sides = 7;
  // 位置ベースの疑似乱数で形を少しだけ崩す
  const seed = (e.x * 0.01 + e.y * 0.007) % 1;

  // 影
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(sx, sy + r * 0.7, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 本体の岩シルエット
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const ang = ((Math.PI * 2) / sides) * i - Math.PI / 2;
    const jitter = 1 + 0.22 * Math.sin(i * 2.3 + seed * 6.28);
    const px = sx + Math.cos(ang) * r * jitter;
    const py = sy + Math.sin(ang) * r * jitter;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // 石らしい色のグラデーション
  const sg = ctx.createRadialGradient(
    sx - r * 0.2,
    sy - r * 0.3,
    0,
    sx,
    sy,
    r * 1.1,
  );
  sg.addColorStop(0, "#d0c898");
  sg.addColorStop(0.5, "#8c8060");
  sg.addColorStop(1, "#4a4030");
  ctx.fillStyle = sg;
  ctx.fill();

  // 輪郭線
  ctx.strokeStyle = "rgba(30,20,10,0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 表面のひび
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#2a1e10";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - r * 0.1, sy - r * 0.5);
  ctx.lineTo(sx + r * 0.15, sy);
  ctx.lineTo(sx - r * 0.05, sy + r * 0.4);
  ctx.moveTo(sx + r * 0.2, sy - r * 0.3);
  ctx.lineTo(sx + r * 0.4, sy + r * 0.2);
  ctx.stroke();
  ctx.restore();

  // 目の発光
  ctx.save();
  ctx.fillStyle = "rgba(255,80,20,0.85)";
  ctx.beginPath();
  ctx.arc(sx - r * 0.28, sy - r * 0.1, r * 0.13, 0, Math.PI * 2);
  ctx.arc(sx + r * 0.28, sy - r * 0.1, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 経験値ドロップの描画
function drawDrops(ctx, W, H, cam, assets, state) {
  for (const d of state.drops) {
    const [sx, sy] = toScreen(cam, W, H, d.x, d.y);
    if (d.kind === "soulShard") {
      drawSoulShardDrop(ctx, assets, sx, sy, d);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#b7a6ff";
    ctx.beginPath();
    ctx.arc(sx, sy, (d.r || 6) + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSoulShardDrop(ctx, assets, sx, sy, d) {
  const img = assets.soulShardIconImg?.();
  const ready = assets.soulShardIconReady?.() && !!img;
  const size = Math.max(18, (d.r || 7) * 3.6);

  ctx.save();
  ctx.globalAlpha = 0.95;
  if (ready) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx - size / 2, sy - size / 2, size, size);
  } else {
    ctx.fillStyle = "#69f4ff";
    ctx.beginPath();
    ctx.arc(sx, sy, (d.r || 7) + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawProjectiles(ctx, W, H, cam, assets, state) {
  for (const p of state.projectiles) {
    const [sx, sy] = toScreen(cam, W, H, p.x, p.y);

    if (p.kind === "ofuda") {
      drawOfudaSprite(ctx, assets, p, sx, sy, 32, 0.98);
      continue;
    }

    if (p.kind === "blastchain") {
      drawOfudaSprite(ctx, assets, p, sx, sy, 36, 0.98);
      continue;
    }

    if (p.kind === "sakuraPetal") {
      drawPetalSprite(ctx, assets, p, sx, sy, 24, 0.98);
      continue;
    }

    if (p.kind === "petal") {
      drawPetalSprite(ctx, assets, p, sx, sy, 22, 0.98);
      continue;
    }

    if (p.kind === "slash" || p.kind === "reppuzanSlash") {
      drawSlashProjectile(ctx, assets, p, sx, sy);
      continue;
    }

    if (p.kind === "kodamaOrb") {
      drawKodamaProjectile(ctx, state, p, sx, sy);
      continue;
    }

    // 汎用弾の描画
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#dcdcdc";
    ctx.beginPath();
    ctx.arc(sx, sy, p.r || 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawKodamaProjectile(ctx, state, p, sx, sy) {
  const t = state.timeSurvived ?? 0;
  const pulse = 0.88 + 0.12 * Math.sin(t * 8 + (p.age ?? 0) * 18);
  const radius = (p.r ?? 7) * pulse;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.86;
  const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, radius * 3.4);
  glow.addColorStop(0, "rgba(245,255,255,0.98)");
  glow.addColorStop(0.35, "rgba(118,245,255,0.62)");
  glow.addColorStop(1, "rgba(118,245,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, radius * 3.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(232, 255, 255, 0.96)";
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "rgba(154, 255, 255, 0.86)";
  ctx.beginPath();
  ctx.arc(sx + radius * 0.2, sy - radius * 0.2, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHostileProjectiles(ctx, W, H, cam, state) {
  const shots = state.hostileProjectiles ?? [];
  for (const shot of shots) {
    const [sx, sy] = toScreen(cam, W, H, shot.x, shot.y);
    const angle = Math.atan2(shot.vy || 0, shot.vx || 1);
    const pulse = 0.78 + 0.22 * Math.sin((state.timeSurvived ?? 0) * 10 + (shot.age ?? 0) * 14);
    const color = shot.color ?? "#99ecff";

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = "screen";

    ctx.globalAlpha = 0.22 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, (shot.r ?? 11) * 2.2, (shot.r ?? 11) * 1.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.78;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, (shot.r ?? 11) * 1.25, (shot.r ?? 11) * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.ellipse((shot.r ?? 11) * 0.28, 0, (shot.r ?? 11) * 0.42, (shot.r ?? 11) * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSlashProjectile(ctx, assets, p, sx, sy) {
  const img = assets.slashFxImg?.();
  const ready = assets.slashFxReady?.() && !!img;
  const isReppuzan = p.kind === "reppuzanSlash";
  const slashH = isReppuzan ? 118 : 82;
  const alpha = isReppuzan ? 0.98 : 0.92;

  if (!ready) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.rot || 0);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = isReppuzan ? "rgba(190,245,255,0.96)" : "rgba(255,236,185,0.95)";
    ctx.lineWidth = isReppuzan ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(-slashH * 0.48, 0);
    ctx.quadraticCurveTo(0, -slashH * 0.18, slashH * 0.5, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const cols = assets.SLASH_FX_COLS?.() ?? 4;
  const rows = assets.SLASH_FX_ROWS?.() ?? 2;
  const fw = assets.SLASH_FX_FW?.() || Math.floor(img.width / cols);
  const fh = assets.SLASH_FX_FH?.() || Math.floor(img.height / rows);
  const frameCount = cols * rows;
  const progress = Math.min(0.999, (p.age ?? 0) / Math.max(0.001, p.life + (p.age ?? 0)));
  const fi = Math.min(frameCount - 1, Math.floor(progress * frameCount));
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;
  const scale = slashH / fh;
  const dw = fw * scale;
  const dh = fh * scale;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate((p.rot || 0) + Math.PI * 0.12);
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw * 0.48, -dh * 0.5, dw, dh);
  ctx.restore();
}

function drawPetalSprite(ctx, assets, p, sx, sy, petalH, alpha) {
  const img = assets.petalFxImg?.();
  const ready = assets.petalFxReady?.() && !!img;
  if (!ready) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.rot || 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,170,210,0.96)";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.bezierCurveTo(5, -6, 7, -1, 0, 7);
    ctx.bezierCurveTo(-7, -1, -5, -6, 0, -7);
    ctx.fill();
    ctx.restore();
    return;
  }

  const cols = 4;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  const angleNorm =
    (((p.rot || 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const baseIndex =
    Math.floor((angleNorm / (Math.PI * 2)) * (cols * rows)) % (cols * rows);
  const flutter =
    Math.floor(
      (performance.now ? performance.now() : 0) /
        Math.max(80, 260 - speed * 0.15),
    ) % 2;
  const fi = (baseIndex + flutter) % (cols * rows);
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const trimRight = 8;
  const trimBottom = 8;
  const srcX = col * fw;
  const srcY = row * fh;
  const srcW = Math.max(1, fw - trimRight);
  const srcH = Math.max(1, fh - trimBottom);
  const scale = petalH / fh;
  const dw = fw * scale;
  const dh = fh * scale;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(p.rot || 0);
  ctx.globalAlpha = 0.18 * alpha;
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(dw, dh) * 0.62);
  glow.addColorStop(0, "rgba(255,220,235,0.95)");
  glow.addColorStop(0.55, "rgba(255,185,220,0.42)");
  glow.addColorStop(1, "rgba(255,170,210,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(dw, dh) * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, srcX, srcY, srcW, srcH, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawOfudaSprite(ctx, assets, p, sx, sy, ofudaH, alpha) {
  const img = assets.ofudaFxImg?.();
  const ready = assets.ofudaFxReady?.() && !!img;
  if (!ready) {
    const w = 10;
    const h = 22;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.rot || 0);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f6eddc";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "rgba(40,24,18,0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = "#c92e44";
    ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w - 4, 4);
    ctx.fillStyle = "rgba(30,10,10,0.72)";
    ctx.fillRect(-1, -h / 2 + 9, 2, 10);
    ctx.restore();
    return;
  }

  const cols = assets.OFUDA_FX_COLS?.() ?? 4;
  const rows = assets.OFUDA_FX_ROWS?.() ?? 2;
  const fw = assets.OFUDA_FX_FW?.() || Math.floor(img.width / cols);
  const fh = assets.OFUDA_FX_FH?.() || Math.floor(img.height / rows);
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  const angleNorm =
    (((p.rot || 0) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const baseIndex =
    Math.floor((angleNorm / (Math.PI * 2)) * (cols * rows)) % (cols * rows);
  const flutter =
    Math.floor(
      (performance.now ? performance.now() : 0) /
        Math.max(80, 260 - speed * 0.15),
    ) % 2;
  const fi = (baseIndex + flutter) % (cols * rows);
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;
  const scale = ofudaH / fh;
  const dw = fw * scale;
  const dh = fh * scale;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(p.rot || 0);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawFx(ctx, W, H, cam, assets, state) {
  for (const f of state.fx) {
    const a = 1 - f.t / f.dur;

    if (f.kind === "screenFlash") {
      ctx.save();
      ctx.globalAlpha = Math.max(0, a) * (f.alphaMul ?? 0.6);
      ctx.fillStyle = f.color || "#fff4ee";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else if (f.kind === "familiarStrike") {
      const [fromX, fromY] = toScreen(cam, W, H, f.fromX, f.fromY);
      const [toX, toY] = toScreen(cam, W, H, f.toX, f.toY);
      const progress = Math.min(
        0.999,
        Math.max(0, f.t / Math.max(0.001, f.dur)),
      );
      const pulse = Math.sin((1 - a) * Math.PI);
      const useBlue = f.fireballPrefab === "Fireball_Blue" || f.flameVariant === "blue";
      const img = useBlue
        ? assets.shikigamiFoxfireBlueFxImg?.()
        : assets.shikigamiFoxfireFxImg?.();
      const ready = useBlue
        ? assets.shikigamiFoxfireBlueFxReady?.() && !!img
        : assets.shikigamiFoxfireFxReady?.() && !!img;

      const startX = fromX;
      const startY = fromY - 16;
      const travelProgress = Math.min(1, progress / (f.travelEnd ?? 0.7));
      const flyT = 1 - Math.pow(1 - travelProgress, 2.2);
      const angle = Math.atan2(toY - startY, toX - startX);
      const laneOffset = f.laneOffset ?? 0;
      const sideX = -Math.sin(angle) * laneOffset;
      const sideY = Math.cos(angle) * laneOffset;
      const fx = startX + (toX - startX) * flyT + sideX * (1 - travelProgress * 0.45);
      const fy = startY + (toY - startY) * flyT + sideY * (1 - travelProgress * 0.45) - Math.sin(travelProgress * Math.PI) * 18;

      if (f.visual === "spiritOrb") {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.82 * a;

        const radius = 5.5 + pulse * 3;
        const glow = ctx.createRadialGradient(fx, fy, 1, fx, fy, radius * 3.2);
        glow.addColorStop(0, "rgba(245, 255, 255, 0.98)");
        glow.addColorStop(0.36, "rgba(118, 245, 255, 0.62)");
        glow.addColorStop(1, "rgba(118, 245, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fx, fy, radius * 3.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.95 * a;
        ctx.fillStyle = "rgba(238, 255, 252, 0.96)";
        ctx.beginPath();
        ctx.arc(fx, fy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.5 * a;
        ctx.fillStyle = "rgba(120, 245, 255, 0.82)";
        ctx.beginPath();
        ctx.arc(fx - 8, fy + 5, 2, 0, Math.PI * 2);
        ctx.arc(fx + 9, fy - 6, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      if (ready) {
        const cols = useBlue
          ? assets.SHIKIGAMI_FOXFIRE_BLUE_FX_COLS?.() ?? 4
          : assets.SHIKIGAMI_FOXFIRE_FX_COLS?.() ?? 4;
        const rows = useBlue
          ? assets.SHIKIGAMI_FOXFIRE_BLUE_FX_ROWS?.() ?? 2
          : assets.SHIKIGAMI_FOXFIRE_FX_ROWS?.() ?? 2;
        const fw = useBlue
          ? assets.SHIKIGAMI_FOXFIRE_BLUE_FX_FW?.() || Math.floor(img.width / cols)
          : assets.SHIKIGAMI_FOXFIRE_FX_FW?.() || Math.floor(img.width / cols);
        const fh = useBlue
          ? assets.SHIKIGAMI_FOXFIRE_BLUE_FX_FH?.() || Math.floor(img.height / rows)
          : assets.SHIKIGAMI_FOXFIRE_FX_FH?.() || Math.floor(img.height / rows);
        const frameCount = cols * rows;
        const fi = Math.min(frameCount - 1, Math.floor(progress * frameCount));
        const srcX = (fi % cols) * fw;
        const srcY = Math.floor(fi / cols) * fh;
        const dh = 54 * (f.projectileScale ?? 1) * (0.92 + pulse * 0.12);
        const dw = dh * (fw / fh);

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.95 * a;
        ctx.imageSmoothingEnabled = false;
        ctx.translate(fx, fy);
        ctx.rotate(angle * 0.08);
        ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh * 0.72, dw, dh);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = 0.6 * a;
        ctx.fillStyle = useBlue ? "rgba(135, 220, 255, 0.95)" : "rgba(255, 130, 70, 0.95)";
        ctx.beginPath();
        ctx.arc(fx, fy, (7 + pulse * 4) * (f.projectileScale ?? 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (f.kind === "yakyoAirstrike") {
      const [toX, toY] = toScreen(cam, W, H, f.x, f.y);
      const impactAt = Math.max(0.001, f.impactAt ?? 0.52);
      const progress = clamp(f.t / impactAt, 0, 1);
      const color = f.color ?? "#ffe68a";
      const iceImg = assets.yakyoIceFxImg?.();
      const iceReady = assets.yakyoIceFxReady?.() && !!iceImg;

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      if (!f.detonated) {
        if (iceReady) {
          drawYakyoIceSprite(ctx, assets, iceImg, toX, toY, progress, 44 + progress * 16, 0, 0.72);
        } else {
          ctx.globalAlpha = 0.36 + progress * 0.36;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(toX, toY, 10 + progress * 12, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (iceReady) {
        const burstProgress = clamp((f.t - impactAt) / Math.max(0.001, f.dur - impactAt), 0, 1);
        drawYakyoIceSprite(ctx, assets, iceImg, toX, toY, burstProgress, Math.max(62, (f.radius ?? 48) * 1.9), 4, Math.max(0, a));
      }
      ctx.restore();
    } else if (f.kind === "familiarTackle") {
      const [fromX, fromY] = toScreen(cam, W, H, f.fromX, f.fromY);
      const [toX, toY] = toScreen(cam, W, H, f.toX, f.toY);
      const progress = Math.min(1, f.t / Math.max(0.001, f.dur));
      const a2 = Math.max(0, 1 - progress);
      const midX = fromX + (toX - fromX) * progress;
      const midY = fromY + (toY - fromY) * progress;

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.42 * a2;
      ctx.strokeStyle = "rgba(255, 208, 140, 0.85)";
      ctx.lineWidth = 8 * a2 + 2;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY - 10);
      ctx.lineTo(midX, midY - 10);
      ctx.stroke();

      ctx.globalAlpha = 0.5 * a2;
      ctx.fillStyle = "rgba(255, 235, 190, 0.9)";
      ctx.beginPath();
      ctx.arc(midX, midY - 10, 8 + progress * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === "spark") {
      const [sx, sy] = toScreen(cam, W, H, f.x, f.y);
      ctx.save();
      ctx.globalAlpha = 0.25 * a;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === "dmg") {
      const [sx, sy] = toScreen(cam, W, H, f.x, f.y);
      const vy = typeof f.vy === "number" ? f.vy : -38;
      const y = sy + vy * f.t;

      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.font =
        "bold 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.strokeText(String(f.text ?? ""), sx, y);

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(String(f.text ?? ""), sx, y);
      ctx.restore();
    } else if (f.kind === "hit") {
      const [sx, sy] = toScreen(cam, W, H, f.x, f.y);
      ctx.save();
      ctx.globalAlpha = 0.25 * a;
      ctx.strokeStyle = "#ff5b7f";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "burst") {
      const [sx, sy] = toScreen(cam, W, H, f.x, f.y);
      if (f.sprite === "ofudaExplosion") {
        drawOfudaExplosionSprite(ctx, assets, sx, sy, f);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = 0.35 * a * (f.alphaMul ?? 1);
      ctx.fillStyle = f.color || "#ffd6f2";
      ctx.beginPath();
      ctx.arc(sx, sy, (f.radius ?? 26) * (1 - a * 0.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === "ring") {
      const [sx, sy] = toScreen(
        cam,
        W,
        H,
        f.x ?? state.player.x,
        f.y ?? state.player.y,
      );
      ctx.save();
      ctx.globalAlpha = 0.22 * a * (f.alphaMul ?? 1);
      ctx.strokeStyle = f.color || "#ffb14a";
      ctx.lineWidth = 3;
      const R = f.R || 125;
      ctx.beginPath();
      ctx.arc(sx, sy, R * (1 + (1 - a) * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "thunder") {
      const [sx, sy] = toScreen(cam, W, H, f.x, f.y);
      const radius = f.radius || 28;
      const height = f.height || 170;
      const isShiden = f.variant === "shiden";
      const img = assets.thunderFxImg?.();
      const ready = assets.thunderFxReady?.() && !!img;

      if (ready) {
        const cols = assets.THUNDER_FX_COLS?.() ?? 4;
        const rows = assets.THUNDER_FX_ROWS?.() ?? 2;
        const fw = assets.THUNDER_FX_FW?.() || Math.floor(img.width / cols);
        const fh = assets.THUNDER_FX_FH?.() || Math.floor(img.height / rows);
        const frameCount = cols * rows;
        const progress = Math.min(
          0.999,
          Math.max(0, f.t / Math.max(0.001, f.dur)),
        );
        const fi = Math.min(frameCount - 1, Math.floor(progress * frameCount));
        const col = fi % cols;
        const row = Math.floor(fi / cols);
        const srcX = col * fw;
        const srcY = row * fh;

        const targetH = Math.max(height * 1.1, radius * 5.5);
        const scale = targetH / fh;
        const dw = fw * scale;
        const dh = fh * scale;

        ctx.save();
        ctx.translate(sx, sy - dh * 0.48);
        if (isShiden) {
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = 0.22 * a;
          const glow = ctx.createRadialGradient(
            0,
            dh * 0.42,
            0,
            0,
            dh * 0.42,
            Math.max(dw, dh) * 0.55,
          );
          glow.addColorStop(0, "rgba(215,150,255,0.85)");
          glow.addColorStop(0.55, "rgba(165,95,255,0.42)");
          glow.addColorStop(1, "rgba(165,95,255,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, dh * 0.42, Math.max(dw, dh) * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 0.96 * a;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, 0, dw, dh);
        ctx.restore();
      } else {
        ctx.save();
        ctx.globalAlpha = 0.9 * a;
        ctx.strokeStyle = isShiden
          ? "rgba(215,180,255,0.95)"
          : "rgba(210,245,255,0.95)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy - height);
        ctx.lineTo(sx + 4, sy - height * 0.65);
        ctx.lineTo(sx - 10, sy - height * 0.3);
        ctx.lineTo(sx + 8, sy);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = 0.28 * a;
      const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 1.8);
      if (isShiden) {
        grd.addColorStop(0, "rgba(245,220,255,1)");
        grd.addColorStop(0.45, "rgba(185,120,255,0.88)");
        grd.addColorStop(1, "rgba(185,120,255,0)");
      } else {
        grd.addColorStop(0, "rgba(230,245,255,1)");
        grd.addColorStop(0.45, "rgba(120,220,255,0.85)");
        grd.addColorStop(1, "rgba(120,220,255,0)");
      }
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === "thunderChain") {
      const [fromX, fromY] = toScreen(cam, W, H, f.fromX, f.fromY);
      const [toX, toY] = toScreen(cam, W, H, f.toX, f.toY);
      const midX = (fromX + toX) * 0.5;
      const midY = (fromY + toY) * 0.5 - 10;

      ctx.save();
      ctx.globalAlpha = 0.9 * a;
      ctx.strokeStyle = "rgba(180,240,255,0.95)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(midX - 6, midY - 4);
      ctx.lineTo(midX + 5, midY + 5);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.restore();
    } else if (f.kind === "slashArc") {
      const [sx, sy] = toScreen(cam, W, H, f.x, f.y);
      const img = assets.slashFxImg?.();
      const ready = assets.slashFxReady?.() && !!img;
      const isReppuzan = !!f.reppuzan;
      if (ready) {
        const cols = 4;
        const rows = 2;
        const fw = Math.floor(img.width / cols);
        const fh = Math.floor(img.height / rows);
        const frameCount = cols * rows;
        const progress = Math.min(
          0.999,
          Math.max(0, f.t / Math.max(0.001, f.dur)),
        );
        const fi = Math.min(frameCount - 1, Math.floor(progress * frameCount));
        const col = fi % cols;
        const row = Math.floor(fi / cols);
        const srcX = col * fw;
        const srcY = row * fh;
        const angle = f.angle ?? 0;
        const slashH = (f.range ?? 80) * (isReppuzan ? 2.15 : 1.9);
        const scale = slashH / fh;
        const dw = fw * scale;
        const dh = fh * scale;

        ctx.save();
        ctx.globalCompositeOperation = isReppuzan ? "screen" : "source-over";
        ctx.translate(sx, sy);
        ctx.rotate(angle + Math.PI * 0.15);
        ctx.globalAlpha = (isReppuzan ? 0.88 : 0.95) * a;
        ctx.drawImage(img, srcX, srcY, fw, fh, -dw * 0.18, -dh * 0.52, dw, dh);
        ctx.restore();
      } else {
        const range = f.range ?? 80;
        const halfAngle = ((f.angleDeg ?? 110) * Math.PI) / 360;
        const centerAngle = f.angle ?? 0;
        const start = centerAngle - halfAngle;
        const end = centerAngle + halfAngle;
        const outerR = range;
        const innerR = Math.max(18, outerR - 24);

        ctx.save();
        ctx.globalAlpha = 0.42 * a;
        const grad = ctx.createRadialGradient(
          sx,
          sy,
          innerR * 0.6,
          sx,
          sy,
          outerR,
        );
        grad.addColorStop(0, "rgba(255,245,220,0.05)");
        grad.addColorStop(0.55, isReppuzan ? "rgba(160,235,255,0.24)" : "rgba(255,210,130,0.22)");
        grad.addColorStop(1, isReppuzan ? "rgba(80,210,255,0.42)" : "rgba(255,120,60,0.38)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, outerR * (0.94 + (1 - a) * 0.08), start, end);
        ctx.arc(sx, sy, innerR * (0.98 + (1 - a) * 0.05), end, start, true);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.86 * a;
        ctx.strokeStyle = isReppuzan ? "rgba(190,245,255,0.96)" : "rgba(255,236,185,0.95)";
        ctx.lineWidth = isReppuzan ? 4 : 3;
        ctx.beginPath();
        ctx.arc(sx, sy, outerR * (0.94 + (1 - a) * 0.08), start, end);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function drawOfudaExplosionSprite(ctx, assets, sx, sy, f) {
  const img = assets.ofudaExplosionFxImg?.();
  const ready = assets.ofudaExplosionFxReady?.() && !!img;
  const alpha = Math.max(0, 1 - f.t / f.dur) * (f.alphaMul ?? 1);
  if (!ready) {
    ctx.save();
    ctx.globalAlpha = 0.35 * alpha;
    ctx.fillStyle = f.color || "#ffd6f2";
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const cols = 4;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);
  const frameCount = cols * rows;
  const progress = Math.min(0.999, Math.max(0, f.t / Math.max(0.001, f.dur)));
  const frame = Math.min(frameCount - 1, Math.floor(progress * frameCount));
  const col = frame % cols;
  const row = Math.floor(frame / cols);
  const srcX = col * fw;
  const srcY = row * fh;

  const baseSize = Math.max(54, (f.radius ?? 60) * 1.9);
  const scale = baseSize / Math.max(fw, fh);
  const dw = fw * scale;
  const dh = fh * scale;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawYakyoIceSprite(ctx, assets, img, sx, sy, progress, targetH, startFrame = 0, alpha = 1) {
  const cols = assets.YAKYO_ICE_FX_COLS?.() ?? 4;
  const rows = assets.YAKYO_ICE_FX_ROWS?.() ?? 2;
  const fw = assets.YAKYO_ICE_FX_FW?.() || Math.floor(img.width / cols);
  const fh = assets.YAKYO_ICE_FX_FH?.() || Math.floor(img.height / rows);
  const frameCount = cols * rows;
  const localFrames = Math.max(1, frameCount - startFrame);
  const frame = Math.min(frameCount - 1, startFrame + Math.floor(clamp(progress, 0, 0.999) * localFrames));
  const srcX = (frame % cols) * fw;
  const srcY = Math.floor(frame / cols) * fh;
  const scale = targetH / fh;
  const dw = fw * scale;
  const dh = fh * scale;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.92 * alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// 周回武器の描画
function drawOrbit(ctx, W, H, cam, assets, state) {
  const info = state._orbitInfo;
  if (!info) return;
  const p = state.player;
  const centerYOffset = info.centerYOffset ?? 0;
  const [px, py] = toScreen(cam, W, H, p.x, p.y + centerYOffset);

  for (let i = 0; i < info.count; i++) {
    const ang = info.angle + ((Math.PI * 2) / info.count) * i;
    const sx = px + Math.cos(ang) * info.r;
    const sy = py + Math.sin(ang) * info.r;
    const speedMul = info.speedMul ?? 1;
    const sizeMul = info.sizeMul ?? 1;
    const isRetsusen = info.isRetsusen === true;
    const img = assets.orbitFxImg?.();
    const orbitReady = assets.orbitFxReady?.() && !!img;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(
      ang +
        Math.PI / 2 +
        Math.sin(state.timeSurvived * (8 * speedMul) + i) * 0.18,
    );

    if (orbitReady) {
      drawOrbitTalismanSprite(
        ctx,
        assets,
        state,
        speedMul,
        sizeMul,
        isRetsusen,
      );
    } else {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = isRetsusen
        ? "rgba(255, 88, 88, 0.9)"
        : "rgba(255, 210, 140, 0.9)";
      ctx.beginPath();
      ctx.ellipse(
        -8 * sizeMul,
        0,
        8 * sizeMul,
        14 * sizeMul,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.globalAlpha = 0.22;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18 * sizeMul);
      glow.addColorStop(
        0,
        isRetsusen ? "rgba(255,180,180,0.92)" : "rgba(255,245,210,0.9)",
      );
      glow.addColorStop(
        1,
        isRetsusen ? "rgba(255,180,180,0)" : "rgba(255,245,210,0)",
      );
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 18 * sizeMul, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.98;
      ctx.fillStyle = isRetsusen
        ? "rgba(255,170,170,1)"
        : "rgba(255,245,220,1)";
      ctx.fillRect(-6 * sizeMul, -13 * sizeMul, 12 * sizeMul, 26 * sizeMul);
      ctx.strokeStyle = isRetsusen
        ? "rgba(110,20,20,0.38)"
        : "rgba(60,30,20,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-6 * sizeMul, -13 * sizeMul, 12 * sizeMul, 26 * sizeMul);

      ctx.fillStyle = isRetsusen
        ? "rgba(150, 0, 10, 0.96)"
        : "rgba(205,35,55,0.92)";
      ctx.fillRect(-4 * sizeMul, -10 * sizeMul, 8 * sizeMul, 4 * sizeMul);
      ctx.fillRect(-1 * sizeMul, -3 * sizeMul, 2 * sizeMul, 12 * sizeMul);

      ctx.strokeStyle = isRetsusen
        ? "rgba(130,30,20,0.2)"
        : "rgba(120,70,40,0.18)";
      ctx.beginPath();
      ctx.moveTo(-3 * sizeMul, 3 * sizeMul);
      ctx.lineTo(3 * sizeMul, 3 * sizeMul);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawOrbitTalismanSprite(
  ctx,
  assets,
  state,
  speedMul,
  sizeMul,
  isRetsusen,
) {
  const img = assets.orbitFxImg?.();
  if (!img) return;

  const cols = assets.ORBIT_FX_COLS?.() ?? 4;
  const rows = assets.ORBIT_FX_ROWS?.() ?? 2;
  const fw = assets.ORBIT_FX_FW?.() || Math.floor(img.width / cols);
  const fh = assets.ORBIT_FX_FH?.() || Math.floor(img.height / rows);
  const frameCount = cols * rows;
  const fi = Math.floor(state.timeSurvived * 10) % frameCount;
  const col = fi % cols;
  const row = Math.floor(fi / cols);
  const srcX = col * fw;
  const srcY = row * fh;
  const talismanH = 34 * sizeMul;
  const scale = talismanH / fh;
  const dw = fw * scale;
  const dh = fh * scale;

  if (isRetsusen) {
    const pulse = 0.88 + Math.sin(state.timeSurvived * (7.5 * speedMul)) * 0.12;
    const glowR = Math.max(dw, dh) * (0.72 + pulse * 0.18);
    const glow = ctx.createRadialGradient(0, 0, glowR * 0.12, 0, 0, glowR);
    glow.addColorStop(0, "rgba(210,255,235,0.75)");
    glow.addColorStop(0.45, "rgba(120,255,190,0.42)");
    glow.addColorStop(1, "rgba(120,255,190,0)");
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.98;
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh / 2, dw, dh);

  if (isRetsusen) {
    const innerGlow = ctx.createRadialGradient(
      0,
      0,
      0,
      0,
      0,
      Math.max(dw, dh) * 0.46,
    );
    innerGlow.addColorStop(0, "rgba(225, 255, 240, 0.22)");
    innerGlow.addColorStop(0.55, "rgba(120, 255, 185, 0.14)");
    innerGlow.addColorStop(1, "rgba(120, 255, 185, 0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(dw, dh) * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "rgba(180, 255, 220, 0.82)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(dw, dh) * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDebugHitboxes(ctx, W, H, cam, state) {
  ctx.save();

  const p = state.player;
  const [px, py] = toScreen(cam, W, H, p.x, p.y + PLAYER_CENTER_Y_OFFSET);
  ctx.strokeStyle = "rgba(80,220,120,0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, p.r, 0, Math.PI * 2);
  ctx.stroke();

  for (const e of state.enemies) {
    const [sx, sy] = toScreen(cam, W, H, e.x, e.y);
    ctx.strokeStyle = e.isBoss
      ? "rgba(255,70,70,0.95)"
      : "rgba(255,190,70,0.9)";
    ctx.lineWidth = e.isBoss ? 3 : 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, e.r || 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const proj of state.projectiles) {
    const [sx, sy] = toScreen(cam, W, H, proj.x, proj.y);
    ctx.strokeStyle = "rgba(120,220,255,0.9)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, proj.r || 6, 0, Math.PI * 2);
    ctx.stroke();

    if ((proj.blastRadius ?? 0) > 0) {
      ctx.strokeStyle = "rgba(120,220,255,0.35)";
      ctx.beginPath();
      ctx.arc(sx, sy, proj.blastRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (state.stage === 1) {
    ctx.strokeStyle = "rgba(120,220,255,0.8)";
    ctx.lineWidth = 1.5;
    for (const obj of STAGE1_TORII_OBJECTS) {
      for (const rect of getToriiCollisionRects(obj)) {
        const [sx, sy] = toScreen(cam, W, H, rect.x, rect.y);
        ctx.strokeRect(sx, sy, rect.w, rect.h);
      }
    }
  }

  const auraRadius = getDebugAuraRadius(state);
  if (auraRadius > 0) {
    const [sx, sy] = toScreen(cam, W, H, p.x, p.y + PLAYER_CENTER_Y_OFFSET);
    ctx.strokeStyle = "rgba(150,120,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, auraRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawDebugHud(ctx, W, H, state) {
  const panelWidth = 220;
  const panelHeight = 240;
  const panelX = W - panelWidth - 12;
  const panelY = 12;
  const lines = [
    "[DEBUG]",
    `stage: ${state.stage}`,
    `wave: ${state.wave}`,
    `time: ${state.timeSurvived.toFixed(1)}`,
    `enemies: ${state.enemies.length}`,
    `projectiles: ${state.projectiles.length}`,
    `boss active: ${state.bossActive ? "ON" : "OFF"}`,
    `player hp: ${Math.ceil(state.player.hp)} / ${state.player.hpMax}`,
    `player lv: ${state.player.level}`,
    `enemy hp bar: ${state.ui?.showEnemyHpBars !== false ? "ON" : "OFF"}`,
    `hitboxes: ${state.debug.showHitboxes ? "ON" : "OFF"}`,
    `invincible: ${state.debug.invincible ? "ON" : "OFF"}`,
  ];

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.58)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

  ctx.fillStyle = "#dff6ff";
  ctx.font = "12px ui-monospace, Menlo, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  lines.forEach((line, idx) => {
    ctx.fillText(line, panelX + 10, panelY + 10 + idx * 16);
  });

  ctx.fillStyle = "rgba(220,220,220,0.9)";
  ctx.fillText("B enemy HP  F1 debug  F2 hud", panelX + 10, panelY + 174);
  ctx.fillText(
    "F3 hitbox  F4 invincible  F5 level+1",
    panelX + 10,
    panelY + 190,
  );
  ctx.fillText("F6 force boss  F7 wave+1", panelX + 10, panelY + 206);
  ctx.restore();
}

function getDebugAuraRadius(state) {
  const auraWeapon = state.player.weapons?.find((w) => w.weaponId === "aura");
  if (auraWeapon) {
    return 80 * Math.pow(1.08, Math.max(0, auraWeapon.level - 1));
  }
  if (state.player.weapons?.some((w) => w.weaponId === "hannekekkai")) {
    return 102;
  }
  if (state.player.weapons?.some((w) => w.weaponId === "raiukekkai")) {
    return 90;
  }
  if (state.upgrades?.aura) {
    return state.upgrades.aura.r ?? 90;
  }
  return 0;
}
