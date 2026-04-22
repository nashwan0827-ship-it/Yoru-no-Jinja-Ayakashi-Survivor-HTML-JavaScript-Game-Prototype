import { clamp } from "../core/utils.js";
import {
  STAGE1_LEAF_DECALS,
  STAGE1_LANTERN_OBJECTS,
  STAGE1_ROCK_OBJECTS,
  STAGE1_TORII_OBJECTS,
  STAGE1_TORII_STONE_DECALS,
  STAGE2_LEAF_DECALS,
  STAGE2_LANTERN_OBJECTS,
  STAGE2_ROCK_OBJECTS,
  STAGE2_TORII_OBJECTS,
  STAGE2_TORII_STONE_DECALS,
  STAGE3_LEAF_DECALS,
  STAGE3_LANTERN_OBJECTS,
  STAGE3_ROCK_OBJECTS,
  STAGE3_TORII_OBJECTS,
  STAGE3_TORII_STONE_DECALS,
} from "../data/stageObjects.js";
import {
  drawTileImage,
  octaveTileNoise,
  tileHash,
  toScreen,
} from "./renderUtils.js";

export function drawMapBoundary(ctx, W, H, cam, state) {
  const map = state.map;
  if (!map || map.enabled === false) return;

  const [sx, sy] = toScreen(cam, W, H, map.centerX, map.centerY);
  const radius = map.radius;
  const ringWidth = map.ringWidth ?? 24;
  const playerDx = state.player.x - map.centerX;
  const playerDy = state.player.y - map.centerY;
  const playerDist = Math.hypot(playerDx, playerDy);
  const slowRadius = map.slowRadius ?? radius * 0.85;
  const proximity = clamp((playerDist - slowRadius) / Math.max(1, radius - slowRadius), 0, 1);

  ctx.save();
  ctx.globalAlpha = 0.06 + proximity * 0.12;
  ctx.strokeStyle = "rgba(170, 235, 255, 0.9)";
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.arc(sx, sy, radius - ringWidth * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.08 + proximity * 0.14;
  const glow = ctx.createRadialGradient(
    sx,
    sy,
    Math.max(0, radius - ringWidth * 3),
    sx,
    sy,
    radius + ringWidth * 2,
  );
  glow.addColorStop(0, "rgba(120, 200, 255, 0)");
  glow.addColorStop(0.82, "rgba(120, 200, 255, 0)");
  glow.addColorStop(0.94, "rgba(145, 225, 255, 0.38)");
  glow.addColorStop(1, "rgba(170, 240, 255, 0.78)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, radius + ringWidth * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawStageObjects(ctx, W, H, cam, assets, state) {
  const decor = getStageDecor(state.stage);
  if (!decor) return;

  const tiles = assets.stage1Tiles?.();
  if (tiles?.stone1 && tiles?.stone2) {
    for (const obj of decor.stoneDecals) {
      drawStageObjectImage(ctx, W, H, cam, obj.tile === 2 ? tiles.stone2 : tiles.stone1, obj, {
        baseSize: 128,
        anchorY: 0.5,
        alpha: obj.alpha ?? 0.55,
        rotation: obj.rot ?? 0,
      });
    }
  }

  const leavesImg = assets.autumnLeavesReady?.() ? assets.autumnLeavesImg?.() : null;
  if (leavesImg) {
    for (const obj of decor.leaves) {
      drawStageObjectImage(ctx, W, H, cam, leavesImg, obj, {
        baseSize: 180,
        anchorY: 0.5,
        alpha: obj.alpha ?? 0.65,
        rotation: obj.rot ?? 0,
      });
    }
  }

  const rocksImg = assets.mossyRocksReady?.() ? assets.mossyRocksImg?.() : null;
  if (rocksImg) {
    for (const obj of decor.rocks) {
      drawStageObjectImage(ctx, W, H, cam, rocksImg, obj, {
        baseSize: 230,
        anchorY: 0.7,
      });
    }
  }

  const lanternImg = assets.mossyLanternReady?.() ? assets.mossyLanternImg?.() : null;
  if (lanternImg) {
    for (const obj of decor.lanterns) {
      drawStageObjectImage(ctx, W, H, cam, lanternImg, obj, {
        baseSize: 240,
        anchorY: 0.88,
      });
    }
  }

  const toriiImg = assets.toriiWeatheredReady?.() ? assets.toriiWeatheredImg?.() : null;
  if (!toriiImg) return;

  for (const obj of decor.torii) {
    drawStageObjectImage(ctx, W, H, cam, toriiImg, obj, {
      baseSize: 320,
      anchorY: 0.78,
    });
  }
}

function getStageDecor(stage) {
  if (stage === 1) {
    return {
      leaves: STAGE1_LEAF_DECALS,
      rocks: STAGE1_ROCK_OBJECTS,
      lanterns: STAGE1_LANTERN_OBJECTS,
      torii: STAGE1_TORII_OBJECTS,
      stoneDecals: STAGE1_TORII_STONE_DECALS,
    };
  }

  if (stage === 2) {
    return {
      leaves: STAGE2_LEAF_DECALS,
      rocks: STAGE2_ROCK_OBJECTS,
      lanterns: STAGE2_LANTERN_OBJECTS,
      torii: STAGE2_TORII_OBJECTS,
      stoneDecals: STAGE2_TORII_STONE_DECALS,
    };
  }

  if (stage === 3) {
    return {
      leaves: STAGE3_LEAF_DECALS,
      rocks: STAGE3_ROCK_OBJECTS,
      lanterns: STAGE3_LANTERN_OBJECTS,
      torii: STAGE3_TORII_OBJECTS,
      stoneDecals: STAGE3_TORII_STONE_DECALS,
    };
  }

  return null;
}

export function drawBackground(ctx, W, H, cam, assets, state) {
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  if (state.stage === 1 && assets.stage1TilesReady?.()) {
    drawStage1TilemapBackground(ctx, W, H, cam, assets);
    return;
  }

  if (state.stage === 2 && assets.stage1TilesReady?.()) {
    drawStage2TilemapBackground(ctx, W, H, cam, assets);
    return;
  }

  if (state.stage === 3 && assets.stage1TilesReady?.()) {
    drawStage3TilemapBackground(ctx, W, H, cam, assets);
    return;
  }

  ctx.fillStyle = "#0a0a18";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "12px system-ui";
  ctx.fillText("stage tilemap を読み込めませんでした", 14, H - 14);
}

function drawStageObjectImage(ctx, W, H, cam, img, obj, options = {}) {
  const baseSize = options.baseSize ?? 240;
  const dw = baseSize * obj.scale;
  const dh = baseSize * obj.scale;
  const [sx, sy] = toScreen(cam, W, H, obj.x, obj.y);
  const x = sx - dw * 0.5;
  const y = sy - dh * (options.anchorY ?? 0.75);
  if (x > W + 80 || x + dw < -80 || y > H + 80 || y + dh < -80) return;

  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  if (options.rotation) {
    ctx.translate(sx, sy);
    ctx.rotate(options.rotation);
    ctx.drawImage(img, -dw * 0.5, -dh * (options.anchorY ?? 0.75), dw, dh);
  } else {
    ctx.drawImage(img, x, y, dw, dh);
  }
  ctx.restore();
}

function drawStage1TilemapBackground(ctx, W, H, cam, assets) {
  const tiles = assets.stage1Tiles?.();
  if (!tiles?.ground1 || !tiles?.ground2) return;

  const tileSize = 96;
  const startX = Math.floor((cam.x - W / 2) / tileSize) - 2;
  const endX = Math.floor((cam.x + W / 2) / tileSize) + 2;
  const startY = Math.floor((cam.y - H / 2) / tileSize) - 2;
  const endY = Math.floor((cam.y + H / 2) / tileSize) + 2;

  ctx.save();
  ctx.fillStyle = "#111720";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      const sx = tx * tileSize - cam.x + W / 2;
      const sy = ty * tileSize - cam.y + H / 2;
      const rot = Math.floor(tileHash(tx + 17, ty - 11) * 4);
      const tile = tiles.ground1;

      drawTileImage(ctx, tile, sx, sy, tileSize, rot);

      const hollow = 1 - octaveTileNoise(tx - 55, ty + 21, 0.26, 3, 0.5);
      const shadowAlpha = clamp((hollow - 0.66) * 0.18, 0, 0.08);
      if (tiles.shadow1 && shadowAlpha > 0.01) {
        ctx.globalAlpha = shadowAlpha;
        drawTileImage(ctx, tiles.shadow1, sx, sy, tileSize, Math.floor(tileHash(tx - 12, ty + 44) * 4));
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.restore();
}

function drawStage2TilemapBackground(ctx, W, H, cam, assets) {
  const tiles = assets.stage1Tiles?.();
  if (!tiles?.stone1 || !tiles?.stone2) return;

  const tileSize = 96;
  const startX = Math.floor((cam.x - W / 2) / tileSize) - 2;
  const endX = Math.floor((cam.x + W / 2) / tileSize) + 2;
  const startY = Math.floor((cam.y - H / 2) / tileSize) - 2;
  const endY = Math.floor((cam.y + H / 2) / tileSize) + 2;

  ctx.save();
  ctx.fillStyle = "#121821";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      const sx = tx * tileSize - cam.x + W / 2;
      const sy = ty * tileSize - cam.y + H / 2;
      const wear = octaveTileNoise(tx + 13, ty - 31, 0.18, 3, 0.55);
      const crack = tileHash(tx + 83, ty - 57);
      let rot = 0;
      let tile = tiles.stone1;

      if (tiles.ground2 && wear > 0.84 && crack < 0.34) {
        tile = tiles.ground2;
        rot = Math.floor(tileHash(tx - 37, ty + 19) * 4);
      } else if (crack < 0.16) {
        tile = tiles.stone2;
      }

      drawTileImage(ctx, tile, sx, sy, tileSize, rot);

      const hollow = 1 - octaveTileNoise(tx - 55, ty + 21, 0.26, 3, 0.5);
      const shadowAlpha = clamp((hollow - 0.58) * 0.22 + 0.03, 0, 0.12);
      if (tiles.shadow1 && shadowAlpha > 0.01) {
        ctx.globalAlpha = shadowAlpha;
        drawTileImage(ctx, tiles.shadow1, sx, sy, tileSize, Math.floor(tileHash(tx - 12, ty + 44) * 4));
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.restore();
}

function drawStage3TilemapBackground(ctx, W, H, cam, assets) {
  const tiles = assets.stage1Tiles?.();
  if (!tiles?.stone1 || !tiles?.stone2) return;

  const tileSize = 96;
  const startX = Math.floor((cam.x - W / 2) / tileSize) - 2;
  const endX = Math.floor((cam.x + W / 2) / tileSize) + 2;
  const startY = Math.floor((cam.y - H / 2) / tileSize) - 2;
  const endY = Math.floor((cam.y + H / 2) / tileSize) + 2;

  ctx.save();
  ctx.fillStyle = "#10131a";
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;

  for (let ty = startY; ty <= endY; ty++) {
    for (let tx = startX; tx <= endX; tx++) {
      const sx = tx * tileSize - cam.x + W / 2;
      const sy = ty * tileSize - cam.y + H / 2;
      const ruin = octaveTileNoise(tx + 41, ty - 17, 0.2, 4, 0.52);
      const chip = tileHash(tx - 91, ty + 63);
      let rot = Math.floor(tileHash(tx + 27, ty - 35) * 4);
      let tile = tiles.stone1;

      if (chip < 0.38 || ruin > 0.7) {
        tile = tiles.stone2;
      }
      if (tiles.ground2 && ruin > 0.88 && chip < 0.32) {
        tile = tiles.ground2;
        rot = Math.floor(tileHash(tx - 57, ty + 29) * 4);
      }

      drawTileImage(ctx, tile, sx, sy, tileSize, rot);

      const shadowNoise = 1 - octaveTileNoise(tx - 21, ty + 77, 0.23, 3, 0.56);
      const shadowAlpha = clamp((shadowNoise - 0.52) * 0.24 + 0.04, 0, 0.15);
      if (tiles.shadow1 && shadowAlpha > 0.01) {
        ctx.globalAlpha = shadowAlpha;
        drawTileImage(ctx, tiles.shadow1, sx, sy, tileSize, Math.floor(tileHash(tx + 8, ty - 72) * 4));
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.restore();
}
