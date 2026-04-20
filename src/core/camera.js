export function createCamera(canvasApi){
  const cam = {
    x: 0,
    y: 0,
    follow(player){
      cam.x = player.x;
      cam.y = player.y;
    },
    toScreen(wx, wy){
      return [ (wx - cam.x) + canvasApi.W/2, (wy - cam.y) + canvasApi.H/2 ];
    }
  };
  return cam;
}