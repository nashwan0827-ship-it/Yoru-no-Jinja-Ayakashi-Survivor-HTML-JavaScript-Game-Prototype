// src/systems/fx.js
// エフェクト更新（時間経過で消す） + dmgポップの上昇

export function stepFx(state, dt){
  for(let i = state.fx.length - 1; i >= 0; i--){
    const f = state.fx[i];

    f.t += dt;

    // dmgは上に流す
    if(f.kind === "dmg"){
      f.y += (f.vy || -30) * dt;
    }

    if(f.t >= f.dur){
      state.fx.splice(i, 1);
    }
  }
}