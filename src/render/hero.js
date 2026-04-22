import { clamp } from "../core/utils.js";
import { toScreen } from "./renderUtils.js";

const HERO_OPAQUE_CACHE = new WeakMap();
const HERO_VISIBLE_HEIGHT = 50;

export function drawHero(ctx, W, H, cam, assets, state) {
  const p = state.player;
  const [sx, sy] = toScreen(cam, W, H, p.x, p.y);

  const img = assets.heroImg();
  const ready = assets.heroReady() && !!img;
  const facing = p.facing || 1;

  if (!ready) {
    ctx.fillStyle = "#b07cff";
    ctx.fillRect(sx - 10, sy - 18, 20, 36);
    ctx.fillStyle = "#0b0a12";
    ctx.fillRect(sx - 5, sy - 7, 4, 4);
    ctx.fillRect(sx + 1, sy - 7, 4, 4);

    if (assets.heroError && assets.heroError()) {
      ctx.fillStyle = "rgba(255,120,120,.95)";
      ctx.font = "12px system-ui";
      const src = assets.heroSrc ? assets.heroSrc() : "";
      ctx.fillText(`hero load failed: ${src}`, 14, 24);
    }
    return;
  }

  const cols = 5;
  const rows = 2;
  const fw = Math.floor(img.width / cols);
  const fh = Math.floor(img.height / rows);

  const fps = 10;
  const idx = p.moving
    ? Math.floor(state.timeSurvived * fps) % (cols * rows)
    : 0;
  const col = idx % cols;
  const row = Math.floor(idx / cols);

  const srcX = col * fw;
  const srcY = row * fh;

  const visual = getHeroVisualMetrics(img, cols, rows, fw, fh);
  const scale = clamp(HERO_VISIBLE_HEIGHT / visual.opaqueH, 0.48, 1.02);
  const dw = fw * scale;
  const dh = fh * scale;

  ctx.save();
  ctx.translate(sx, sy + 18);
  ctx.scale(facing, 1);
  ctx.drawImage(img, srcX, srcY, fw, fh, -dw / 2, -dh, dw, dh);
  ctx.restore();

  if (p.iFrames > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "#ffb14a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy - 10, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function getHeroVisualMetrics(img, cols, rows, fw, fh) {
  const cached = HERO_OPAQUE_CACHE.get(img);
  if (cached) return cached;

  const fallback = { opaqueH: fh * 0.62 };
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;

    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
    let totalH = 0;
    let measured = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let minY = fh;
        let maxY = -1;
        const startX = col * fw;
        const startY = row * fh;

        for (let y = 0; y < fh; y++) {
          for (let x = 0; x < fw; x++) {
            const alphaIndex = ((startY + y) * img.width + startX + x) * 4 + 3;
            if (pixels[alphaIndex] <= 8) continue;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        if (maxY < 0) continue;
        totalH += maxY - minY + 1;
        measured++;
      }
    }

    const metrics = {
      opaqueH: measured > 0 ? totalH / measured : fallback.opaqueH,
    };
    HERO_OPAQUE_CACHE.set(img, metrics);
    return metrics;
  } catch {
    HERO_OPAQUE_CACHE.set(img, fallback);
    return fallback;
  }
}
