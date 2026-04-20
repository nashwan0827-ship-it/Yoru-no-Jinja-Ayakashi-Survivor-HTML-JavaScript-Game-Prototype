export const HERO_X = [[36,284],[354,605],[659,919],[959,1214],[1236,1482]];
export const HERO_Y = [[134,464],[582,912]];

export const HERO_FRAMES = (() => {
  const frames = [];
  for (let r=0; r<2; r++){
    for (let c=0; c<5; c++){
      const [sx0,sx1] = HERO_X[c];
      const [sy0,sy1] = HERO_Y[r];
      frames.push({ sx:sx0, sy:sy0, sw:(sx1-sx0), sh:(sy1-sy0) });
    }
  }
  return frames;
})();