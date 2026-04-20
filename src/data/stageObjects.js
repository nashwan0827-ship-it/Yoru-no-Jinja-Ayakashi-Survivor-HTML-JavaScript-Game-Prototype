const MAP_RADIUS = 4200;
const CENTER_ZONE_MAX = 1800;
const MIDDLE_ZONE_MAX = 3200;
const OUTER_ZONE_MAX = MAP_RADIUS;
const CENTER_OPEN_RADIUS = 760;

export const STAGE1_TORII_OBJECTS = buildDecorSet({
  count: 8,
  seed: 601,
  zones: [
    { min: CENTER_ZONE_MAX, max: MIDDLE_ZONE_MAX, count: 5 },
    { min: MIDDLE_ZONE_MAX, max: OUTER_ZONE_MAX - 240, count: 3 },
  ],
  minDistance: 880,
  scaleMin: 0.58,
  scaleMax: 0.78,
  avoidTorii: false,
});

export const STAGE1_TORII_STONE_DECALS = buildToriiStoneDecals(STAGE1_TORII_OBJECTS);

const generatedDecor = buildStage1Decor();

export const STAGE1_LEAF_DECALS = generatedDecor.leaves;
export const STAGE1_ROCK_OBJECTS = generatedDecor.rocks;
export const STAGE1_LANTERN_OBJECTS = generatedDecor.lanterns;

function buildStage1Decor() {
  return {
    rocks: buildDecorSet({
      count: 160,
      seed: 101,
      zones: [
        { min: CENTER_OPEN_RADIUS, max: CENTER_ZONE_MAX, count: 18 },
        { min: CENTER_ZONE_MAX, max: MIDDLE_ZONE_MAX, count: 92 },
        { min: MIDDLE_ZONE_MAX, max: OUTER_ZONE_MAX - 180, count: 50 },
      ],
      minDistance: 185,
      scaleMin: 0.36,
      scaleMax: 0.66,
    }),
    leaves: buildDecorSet({
      count: 240,
      seed: 211,
      zones: [
        { min: CENTER_OPEN_RADIUS, max: CENTER_ZONE_MAX, count: 28 },
        { min: CENTER_ZONE_MAX, max: MIDDLE_ZONE_MAX, count: 132 },
        { min: MIDDLE_ZONE_MAX, max: OUTER_ZONE_MAX - 140, count: 80 },
      ],
      minDistance: 135,
      scaleMin: 0.22,
      scaleMax: 0.38,
      alphaMin: 0.22,
      alphaMax: 0.42,
      rotRange: 2.4,
    }),
    lanterns: buildDecorSet({
      count: 24,
      seed: 331,
      zones: [
        { min: CENTER_ZONE_MAX, max: MIDDLE_ZONE_MAX, count: 18 },
        { min: MIDDLE_ZONE_MAX, max: OUTER_ZONE_MAX - 260, count: 6 },
      ],
      minDistance: 640,
      scaleMin: 0.44,
      scaleMax: 0.62,
    }),
  };
}

function buildDecorSet(config) {
  const result = [];
  const occupied = [];
  let serial = 0;

  for (const zone of config.zones) {
    let zoneCount = 0;
    let attempts = 0;
    while (zoneCount < zone.count && attempts < zone.count * 120) {
      attempts += 1;
      serial += 1;
      const angle = stageHash(config.seed, serial, 1) * Math.PI * 2;
      const t = stageHash(config.seed, serial, 2);
      const radius = Math.sqrt(zone.min * zone.min + t * (zone.max * zone.max - zone.min * zone.min));
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (!isGoodDecorPoint(x, y, config.minDistance, occupied, config.avoidTorii !== false)) continue;

      const scaleRoll = stageHash(config.seed, serial, 3);
      const obj = {
        x: Math.round(x),
        y: Math.round(y),
        scale: round2(config.scaleMin + scaleRoll * (config.scaleMax - config.scaleMin)),
      };

      if (Number.isFinite(config.rotRange)) {
        obj.rot = round2((stageHash(config.seed, serial, 4) - 0.5) * config.rotRange);
      }
      if (Number.isFinite(config.alphaMin) && Number.isFinite(config.alphaMax)) {
        obj.alpha = round2(config.alphaMin + stageHash(config.seed, serial, 5) * (config.alphaMax - config.alphaMin));
      }

      result.push(obj);
      occupied.push({ x, y, r: config.minDistance });
      zoneCount += 1;
    }
  }

  return result.slice(0, config.count);
}

function isGoodDecorPoint(x, y, minDistance, occupied, avoidTorii = true) {
  const dist = Math.hypot(x, y);
  if (dist < CENTER_OPEN_RADIUS || dist > MAP_RADIUS - 120) return false;

  for (const item of occupied) {
    const min = Math.max(minDistance, item.r * 0.85);
    const dx = x - item.x;
    const dy = y - item.y;
    if (dx * dx + dy * dy < min * min) return false;
  }

  if (avoidTorii) {
    for (const torii of STAGE1_TORII_OBJECTS) {
      const dx = x - torii.x;
      const dy = y - torii.y;
      if (dx * dx + dy * dy < 420 * 420) return false;
    }
  }

  return true;
}

function buildToriiStoneDecals(toriiObjects) {
  const decals = [];
  toriiObjects.forEach((torii, index) => {
    if (index === 0) {
      decals.push(...buildWalkway(torii.x, torii.y, 6, 0.58));
      return;
    }

    decals.push(
      { x: torii.x, y: torii.y + 48, scale: 0.42, rot: -0.04, tile: 2, alpha: 0.32 },
      { x: torii.x - 94, y: torii.y + 132, scale: 0.3, rot: 0.08, tile: 1, alpha: 0.22 },
      { x: torii.x + 96, y: torii.y + 134, scale: 0.3, rot: -0.12, tile: 2, alpha: 0.2 },
    );
  });
  return decals;
}

function buildWalkway(cx, cy, rows, baseAlpha) {
  const decals = [];
  for (let row = 0; row < rows; row++) {
    const y = cy + 42 + row * 108;
    const alpha = baseAlpha * (1 - row / (rows + 2));
    for (let col = 0; col < 2; col++) {
      const x = cx + (col === 0 ? -64 : 64);
      decals.push({
        x,
        y,
        scale: row >= rows - 2 ? 0.42 : 0.46,
        rot: (stageHash(row, col, 71) - 0.5) * 0.03,
        tile: (row + col) % 2 === 0 ? 1 : 2,
        alpha,
      });
    }
  }
  return decals;
}

function stageHash(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function getToriiCollisionRects(obj) {
  const size = 320 * obj.scale;
  const pillarW = size * 0.13;
  const pillarH = size * 0.38;
  const beamW = size * 0.66;
  const beamH = size * 0.16;

  return [
    {
      x: obj.x - size * 0.22 - pillarW * 0.5,
      y: obj.y - size * 0.45,
      w: pillarW,
      h: pillarH,
    },
    {
      x: obj.x + size * 0.22 - pillarW * 0.5,
      y: obj.y - size * 0.45,
      w: pillarW,
      h: pillarH,
    },
    {
      x: obj.x - beamW * 0.5,
      y: obj.y - size * 0.55,
      w: beamW,
      h: beamH,
    },
  ];
}
