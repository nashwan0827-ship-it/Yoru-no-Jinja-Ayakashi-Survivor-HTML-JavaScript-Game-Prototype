// 弾・投射物の挙動と当たり判定を管理する
import { killEnemy } from "./enemies.js";
import { getProjectileDamageSource, recordEnemyDamage } from "./damageStats.js";
import { getPlayerDamageMultiplier } from "./player.js";
import { applyPriorityTargetDamageBonus } from "./priorityTarget.js";
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function dist2(ax, ay, bx, by) {
  const dx = ax - bx,
    dy = ay - by;
  return dx * dx + dy * dy;
}
function len(x, y) {
  return Math.hypot(x, y);
}
function norm(x, y) {
  const l = len(x, y) || 1;
  return [x / l, y / l];
}
function rand(a, b) {
  return a + Math.random() * (b - a);
}

function nearestEnemy(state, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const e of state.enemies) {
    const d = dist2(x, y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function spawnDamagePopup(state, x, y, text) {
  state.fx.push({
    kind: "dmg",
    x,
    y,
    text: String(text),
    t: 0,
    dur: 0.55,
    vy: -38,
    jitter: 0,
  });
}

function triggerExplosion(state, centerX, centerY, radius, dmg, options = {}) {
  const {
    exclude = null,
    knock = 70,
    popupScale = 0.85,
    burstColor = null,
    alphaMul = 1,
    burstSprite = null,
    skipRing = false,
    damageSource = null,
  } = options;
  const rr = radius * radius;

  for (const be of state.enemies) {
    if (be === exclude || be.hp <= 0) continue;
    if (dist2(centerX, centerY, be.x, be.y) > rr) continue;

    const damage = applyPriorityTargetDamageBonus(state, be, dmg);
    recordEnemyDamage(state, damageSource, be, damage);
    be.hp -= damage;
    if (!be.isBoss) be.knock = Math.min(160, (be.knock || 0) + knock);
    spawnDamagePopup(state, be.x, be.y - be.r, Math.round(damage * popupScale));
  }

  state.fx.push({
    kind: "burst",
    t: 0,
    dur: 0.28,
    x: centerX,
    y: centerY,
    color: burstColor,
    alphaMul,
    sprite: burstSprite,
    radius,
  });
  if (!skipRing) {
    state.fx.push({
      kind: "ring",
      t: 0,
      dur: 0.22,
      R: radius * 0.85,
      x: centerX,
      y: centerY,
      color: burstColor,
      alphaMul,
    });
  }
}

function triggerChainExplosions(state, source, projectile) {
  const chainCount = Math.max(0, Math.round(projectile.chainCount ?? 0));
  const chainRange = projectile.chainRange ?? 0;
  const chainRadius = projectile.chainRadius ?? 0;
  let chainDmg = Math.round((projectile.chainBlastDmg ?? 0) * getPlayerDamageMultiplier(state));
  const chainFalloff = projectile.chainFalloff ?? 0.82;
  if (chainCount <= 0 || chainRange <= 0 || chainRadius <= 0 || chainDmg <= 0) {
    return;
  }

  const visited = new Set([source]);
  let current = source;
  for (let i = 0; i < chainCount; i++) {
    let next = null;
    let bestD = chainRange * chainRange;
    for (const e of state.enemies) {
      if (visited.has(e) || e.hp <= 0) continue;
      const d = dist2(current.x, current.y, e.x, e.y);
      if (d <= bestD) {
        bestD = d;
        next = e;
      }
    }
    if (!next) break;

    visited.add(next);
    const damage = applyPriorityTargetDamageBonus(state, next, Math.round(chainDmg));
    recordEnemyDamage(state, "blastchain", next, damage);
    next.hp -= damage;
    if (!next.isBoss) {
      next.knock = Math.min(160, (next.knock || 0) + 65);
    }
    spawnDamagePopup(state, next.x, next.y - (next.r || 12), damage);
    triggerExplosion(state, next.x, next.y, chainRadius, Math.round(chainDmg), {
      exclude: next,
      knock: 55,
      popupScale: 1,
      burstColor: "#ffd2c7",
      alphaMul: 1.15,
      burstSprite: "ofudaExplosion",
      damageSource: "blastchain",
      skipRing: true,
    });
    chainDmg = Math.max(1, Math.round(chainDmg * chainFalloff));
    current = next;
  }
}

function spawnKillDrops(state, x, y) {
  state.drops.push({
    x,
    y,
    r: 6,
    xp: 5,
    vx: rand(-12, 12),
    vy: rand(-12, 12),
  });
}

function stepHoming(state, p, dt) {
  const spd = Math.hypot(p.vx || 0, p.vy || 0) || 620;

  const t = nearestEnemy(state, p.x, p.y);
  if (!t) return;

  let tx = t.x - p.x;
  let ty = t.y - p.y;
  [tx, ty] = norm(tx, ty);

  const [pvx, pvy] = norm(p.vx, p.vy);
  const h = clamp(p.homing ?? 0.22, 0, 0.85);

  const nx = pvx * (1 - h) + tx * h;
  const ny = pvy * (1 - h) + ty * h;
  const [hx, hy] = norm(nx, ny);

  p.vx = hx * spd;
  p.vy = hy * spd;
}

function stepBoomerang(state, p, dt) {
  p.age = (p.age || 0) + dt;
  const returnAfter = p.returnAfter ?? 0.36;
  const baseSpd = Math.max(60, Math.hypot(p.vx || 0, p.vy || 0) || 620);

  if (p.age >= returnAfter) {
    const px = state.player.x;
    const py = state.player.y;
    let dx = px - p.x;
    let dy = py - p.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;

    const steer = 0.24;
    const [pvx, pvy] = norm(p.vx, p.vy);
    const nx = pvx * (1 - steer) + dx * steer;
    const ny = pvy * (1 - steer) + dy * steer;
    const [hx, hy] = norm(nx, ny);

    p.vx = hx * baseSpd;
    p.vy = hy * baseSpd;

    if (d < 18) {
      p.life = 0;
    }
  } else {
    stepHoming(state, p, dt);
  }
}

function stepOfuda(state, p, dt) {
  // 護符は通常弾より少し強めの追尾をかける
  const spd = Math.hypot(p.vx || 0, p.vy || 0) || 520;
  const t = nearestEnemy(state, p.x, p.y);
  if (t) {
    let tx = t.x - p.x;
    let ty = t.y - p.y;
    [tx, ty] = norm(tx, ty);

    const [pvx, pvy] = norm(p.vx, p.vy);
    const h = clamp(p.homing ?? 0, 0, 0.75);

    const nx = pvx * (1 - h) + tx * h;
    const ny = pvy * (1 - h) + ty * h;
    const [hx, hy] = norm(nx, ny);

    p.vx = hx * spd;
    p.vy = hy * spd;
  }

  // 描画用の回転角を更新する
  p.rot = p.rot ?? Math.atan2(p.vy, p.vx);
  p.rot += (p.spin || 0) * dt;
}

function stepSakuraPetal(state, p, dt) {
  p.sakuraAngle =
    (p.sakuraAngle ?? Math.atan2(p.y - state.player.y, p.x - state.player.x)) +
    (p.sakuraTurnSpeed ?? 8) * (p.sakuraDir ?? 1) * dt;
  p.sakuraRadius = (p.sakuraRadius ?? 0) + (p.sakuraRadialSpeed ?? 130) * dt;

  const centerX = state.player.x;
  const centerY = state.player.y;
  const targetX = centerX + Math.cos(p.sakuraAngle) * p.sakuraRadius;
  const targetY = centerY + Math.sin(p.sakuraAngle) * p.sakuraRadius;
  p.vx = (targetX - p.x) / Math.max(dt, 0.0001);
  p.vy = (targetY - p.y) / Math.max(dt, 0.0001);
  p.rot = p.rot ?? Math.atan2(p.vy, p.vx);
  p.rot += (p.spin || 0) * dt;
}

export function stepProjectiles(state, hud, audio, dt) {
  const playerDamageMul = getPlayerDamageMultiplier(state);

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];

    p.life -= dt;
    p.age = (p.age ?? 0) + dt;
    if (p.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    // 弾種ごとに挙動を切り替える
    if (p.kind === "petal") {
      stepBoomerang(state, p, dt);
    } else if (p.kind === "sakuraPetal") {
      stepSakuraPetal(state, p, dt);
    } else if (p.kind === "ofuda" || p.kind === "blastchain") {
      stepOfuda(state, p, dt);
    } else if (p.kind === "slash" || p.kind === "reppuzanSlash") {
      p.rot = Math.atan2(p.vy, p.vx);
    } else if (p.kind === "kodamaOrb") {
      p.rot = Math.atan2(p.vy, p.vx);
    } else {
      stepHoming(state, p, dt);
    }

    // 移動
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // 敵との当たり判定
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      const rr = (p.r || 6) + (e.r || 12);
      if (dist2(p.x, p.y, e.x, e.y) < rr * rr) {
        // 護符は同じ敵に対して1枚につき1回だけ当たる
        if (p.kind === "ofuda" || p.kind === "slash" || p.kind === "reppuzanSlash") {
          if (!p._hitSet) p._hitSet = new WeakSet();
          if (p._hitSet.has(e)) {
            continue;
          }
          p._hitSet.add(e);
        }

        // ダメージ計算
        const ups = state.upgrades || {};
        const ofudaMul = ups.ofudaDmgMul ?? 1;

        let dmg = Math.round(p.dmg * playerDamageMul);

        // 起爆札と爆符連鎖には強化倍率を反映する
        if (p.kind === "ofuda" || p.kind === "blastchain") {
          dmg = Math.floor(dmg * ofudaMul);
        }
        dmg = applyPriorityTargetDamageBonus(state, e, dmg);

        const damageSource = getProjectileDamageSource(p);
        recordEnemyDamage(state, damageSource, e, dmg);
        e.hp -= dmg;

        if (p.lifeSteal > 0) {
          const player = state.player;
          player.hp = Math.min(player.hpMax, player.hp + p.lifeSteal);
        }

        // 起爆札・爆符連鎖に爆発効果がある場合は周囲にも追加ダメージを与える
        if ((p.kind === "ofuda" || p.kind === "blastchain") && (p.blastRadius ?? 0) > 0) {
          triggerExplosion(
            state,
            e.x,
            e.y,
            p.blastRadius,
            Math.round((p.blastDmg ?? 20) * playerDamageMul),
            {
              exclude: e,
              damageSource,
              burstSprite: "ofudaExplosion",
              skipRing: true,
            },
          );
          if (p.kind === "blastchain") {
            triggerChainExplosions(state, e, p);
          }
        }

        // ダメージ表示
        spawnDamagePopup(state, e.x, e.y - (e.r || 12), dmg);

        // ノックバック
        if (!e.isBoss && p.kind !== "ofuda" && p.kind !== "petal") {
          e.knock = Math.min(190, (e.knock || 0) + (p.knock ?? 90));
        }

        // ヒットストップ
        state.hitStop = Math.min(0.05, (state.hitStop || 0) + 0.01);

        // 撃破処理
        if (e.hp <= 0) {
          killEnemy(state, hud, audio, e, false);
          state.enemies.splice(j, 1);
        }

        // 弾種ごとの消滅条件と貫通回数を処理する
        if (p.kind === "petal") {
          p._hits = (p._hits || 0) + 1;
          const guaranteedHits = 2;
          const extra = Math.max(0, p.pierce || 0);
          const maxHits = guaranteedHits + extra;

          if (p._hits >= maxHits) {
            state.projectiles.splice(i, 1);
            break;
          } else {
            const [nx, ny] = norm(p.vx, p.vy);
            p.x += nx * 8;
            p.y += ny * 8;
          }
        } else if (p.kind === "sakuraPetal") {
          state.fx.push({ kind: "burst", t: 0, dur: 0.12, x: e.x, y: e.y });
          state.projectiles.splice(i, 1);
          break;
        } else if (p.kind === "ofuda") {
          p._hits = (p._hits || 0) + 1;
          const maxHits = 1;
          if (p._hits >= maxHits) {
            state.projectiles.splice(i, 1);
            break;
          }
        } else if (p.kind === "slash" || p.kind === "reppuzanSlash") {
          p._hits = (p._hits || 0) + 1;
          const maxHits = 1 + Math.max(0, p.pierce ?? 0);
          state.fx.push({
            kind: "slashArc",
            t: 0,
            dur: 0.1,
            x: e.x,
            y: e.y,
            angle: p.rot ?? 0,
            range: p.kind === "reppuzanSlash" ? 70 : 48,
            angleDeg: 52,
          });
          if (p._hits >= maxHits) {
            state.projectiles.splice(i, 1);
            break;
          }
        } else if (p.kind === "blastchain") {
          // 爆符連鎖は数体まで貫通できる
          p._hits = (p._hits || 0) + 1;
          const maxHits = 1 + (p.pierce ?? 2);
          if (p._hits >= maxHits) {
            state.projectiles.splice(i, 1);
            break;
          }
        } else {
          // 通常弾は pierce が残っていれば貫通し、なければ消滅する
          if (p.pierce > 0) {
            p.pierce -= 1;
          } else {
            state.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }
}




