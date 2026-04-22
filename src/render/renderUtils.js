export function toScreen(cam, W, H, wx, wy) {
  return [wx - cam.x + W / 2, wy - cam.y + H / 2];
}

export function drawTileImage(ctx, img, x, y, size, quarterTurns = 0) {
  if (!quarterTurns) {
    ctx.drawImage(img, x, y, size, size);
    return;
  }

  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(quarterTurns * Math.PI * 0.5);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

export function tileHash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function smoothTileNoise(x, y, scale = 1) {
  const sx = x * scale;
  const sy = y * scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const fx = sx - x0;
  const fy = sy - y0;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = tileHash(x0, y0);
  const b = tileHash(x0 + 1, y0);
  const c = tileHash(x0, y0 + 1);
  const d = tileHash(x0 + 1, y0 + 1);
  const x1 = a + (b - a) * u;
  const x2 = c + (d - c) * u;
  return x1 + (x2 - x1) * v;
}

export function octaveTileNoise(x, y, scale = 1, octaves = 3, persistence = 0.5) {
  let value = 0;
  let amplitude = 1;
  let max = 0;
  let frequency = scale;
  for (let i = 0; i < octaves; i++) {
    value += smoothTileNoise(x, y, frequency) * amplitude;
    max += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  return max > 0 ? value / max : 0;
}
