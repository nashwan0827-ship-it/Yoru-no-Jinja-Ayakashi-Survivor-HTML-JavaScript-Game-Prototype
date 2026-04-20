export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
export const rand  = (a,b)=>a+Math.random()*(b-a);
export const randi = (a,b)=>Math.floor(rand(a,b+1));
export const dist2 = (ax,ay,bx,by)=>{ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; };
export const len   = (x,y)=>Math.hypot(x,y);
export const norm  = (x,y)=>{ const l=len(x,y)||1; return [x/l,y/l]; };