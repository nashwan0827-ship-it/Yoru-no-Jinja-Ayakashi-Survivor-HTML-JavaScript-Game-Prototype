import { clamp } from "../core/utils.js";

export function drawHPBar(ctx, sx, sy, w, hp, hpMax){
  const pct = clamp(hp/hpMax,0,1);
  ctx.globalAlpha=0.6;
  ctx.fillStyle="rgba(0,0,0,0.35)";
  ctx.fillRect(sx-w/2, sy-26, w, 4);
  ctx.fillStyle="rgba(255,255,255,0.75)";
  ctx.fillRect(sx-w/2, sy-26, w*pct, 4);
  ctx.globalAlpha=1;
}

export function drawOni(ctx, e, sx, sy){
  ctx.fillStyle="#5aa0ff";
  ctx.beginPath(); ctx.arc(sx,sy,e.r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#0b0a12";
  ctx.fillRect(sx-5, sy-4, 4,4);
  ctx.fillRect(sx+1, sy-4, 4,4);
}

export function drawChochin(ctx, timeSurvived, e, sx, sy){
  const bob = Math.sin(timeSurvived*4 + e.x*0.01)*3;
  ctx.fillStyle="#ffb14a";
  ctx.beginPath();
  ctx.ellipse(sx, sy+bob, e.r, e.r*1.25, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle="#0b0a12";
  ctx.fillRect(sx-5, sy-5+bob, 4,4);
  ctx.fillRect(sx+1, sy-5+bob, 4,4);
}