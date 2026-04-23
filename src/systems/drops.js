import { norm, clamp } from "../core/utils.js";
import { savePrefs } from "../core/save.js";

export function grantLevelUp(state, audio, levelup){
  const p = state.player;
  if (!p) return false;

  p.xp = p.xpToNext;

  while(p.xp >= p.xpToNext){
    p.xp -= p.xpToNext;
    p.level += 1;
    p.xpToNext = Math.floor(p.xpToNext*1.18 + 8);
    audio.SE.levelUp();
    levelup.show();
  }

  return true;
}

export function stepDrops(state, hud, audio, levelup, dt){
  const p = state.player;
  const familiars = state.activeFamiliars ?? [];

  for(let i=state.drops.length-1;i>=0;i--){
    const d=state.drops[i];
    d.x += d.vx*dt; d.y += d.vy*dt;
    d.vx *= (1-2.2*dt); d.vy *= (1-2.2*dt);

    const dd=Math.hypot(p.x-d.x, p.y-d.y);
    let pickupDist = dd;
    let pickupRadius = p.r + d.r + 4;
    let magnetTargetX = p.x;
    let magnetTargetY = p.y;
    let magnetDist = dd;
    let magnetRadius = p.magnet;

    for (const familiar of familiars) {
      const fd = Math.hypot(familiar.x - d.x, familiar.y - d.y);
      const familiarPickupRadius = (familiar.pickupRadius ?? 42) + d.r;
      if (fd < pickupDist) {
        pickupDist = fd;
        pickupRadius = familiarPickupRadius;
      }

      const familiarMagnetRadius = familiar.magnetRadius ?? 115;
      if (fd < familiarMagnetRadius && fd < magnetDist) {
        magnetTargetX = familiar.x;
        magnetTargetY = familiar.y;
        magnetDist = fd;
        magnetRadius = familiarMagnetRadius;
      }
    }

    if(dd < p.magnet){
      const [nx,ny]=norm(p.x-d.x, p.y-d.y);
      d.x += nx*420*dt;
      d.y += ny*420*dt;
    } else if (magnetDist < magnetRadius) {
      const [nx,ny]=norm(magnetTargetX-d.x, magnetTargetY-d.y);
      d.x += nx*420*dt;
      d.y += ny*420*dt;
    }

    if(pickupDist < pickupRadius){
      if (d.kind === "soulShard") {
        const amount = Math.max(1, Math.floor(d.amount ?? 1));
        state.soulShards = Math.max(0, Math.floor(state.soulShards ?? 0)) + amount;
        state.runSoulShards = Math.max(0, Math.floor(state.runSoulShards ?? 0)) + amount;
        savePrefs({ soulShards: state.soulShards });
        window.dispatchEvent(new CustomEvent("soul-shards-changed"));
        hud.flash(`\u9b42\u7247 +${amount}`);
      } else {
        state.score += d.xp*10;
        p.xp += d.xp * (p.xpGainMul ?? 1);
      }
      state.drops.splice(i,1);
      audio.SE.pickup();

      while(d.kind !== "soulShard" && p.xp >= p.xpToNext){
        grantLevelUp(state, audio, levelup);
      }
    }
  }
}
