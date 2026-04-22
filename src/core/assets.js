import { PATHS } from "../../paths.js";

function loadImage(src){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ ok:true, img, src });
    img.onerror = () => resolve({ ok:false, img:null, src });
    img.src = src;
  });
}

export function createAssets(){
  let _stage1Tiles = null;
  let _stage1TilesReady = false;
  let _toriiWeatheredImg = null;
  let _toriiWeatheredReady = false;
  let _autumnLeavesImg = null;
  let _autumnLeavesReady = false;
  let _mossyRocksImg = null;
  let _mossyRocksReady = false;
  let _mossyLanternImg = null;
  let _mossyLanternReady = false;

  let _heroImg = null;
  let _heroReady = false;
  let _heroError = false;
  let _heroSrc = "";

  let _enemy2Img = null;
  let _enemy2Ready = false;
  const _enemy2Cols = 4;
  const _enemy2Rows = 2;
  let _enemy2FW = 0;
  let _enemy2FH = 0;

  let _bossImg = null;
  let _bossReady = false;
  const _bossCols = 4;
  const _bossRows = 2;
  let _bossFW = 0;
  let _bossFH = 0;

  let _enemyOniRedImg = null;
  let _enemyOniRedReady = false;
  const _enemyOniRedCols = 4;
  const _enemyOniRedRows = 2;
  let _enemyOniRedFW = 0;
  let _enemyOniRedFH = 0;

  let _enemyFastImg = null;
  let _enemyFastReady = false;
  const _enemyFastCols = 4;
  const _enemyFastRows = 2;
  let _enemyFastFW = 0;
  let _enemyFastFH = 0;

  let _enemyTankImg = null;
  let _enemyTankReady = false;
  const _enemyTankCols = 4;
  const _enemyTankRows = 2;
  let _enemyTankFW = 0;
  let _enemyTankFH = 0;

  let _enemyBoarImg = null;
  let _enemyBoarReady = false;
  const _enemyBoarCols = 4;
  const _enemyBoarRows = 2;
  let _enemyBoarFW = 0;
  let _enemyBoarFH = 0;

  let _enemyKageboshiImg = null;
  let _enemyKageboshiReady = false;
  const _enemyKageboshiCols = 4;
  const _enemyKageboshiRows = 2;
  let _enemyKageboshiFW = 0;
  let _enemyKageboshiFH = 0;

  let _enemyKageboshiRedImg = null;
  let _enemyKageboshiRedReady = false;
  const _enemyKageboshiRedCols = 4;
  const _enemyKageboshiRedRows = 2;
  let _enemyKageboshiRedFW = 0;
  let _enemyKageboshiRedFH = 0;

  let _slashFxImg = null;
  let _slashFxReady = false;
  const _slashFxCols = 4;
  const _slashFxRows = 2;
  let _slashFxFW = 0;
  let _slashFxFH = 0;

  let _petalFxImg = null;
  let _petalFxReady = false;
  const _petalFxCols = 4;
  const _petalFxRows = 2;
  let _petalFxFW = 0;
  let _petalFxFH = 0;

  let _ofudaFxImg = null;
  let _ofudaFxReady = false;
  const _ofudaFxCols = 4;
  const _ofudaFxRows = 2;
  let _ofudaFxFW = 0;
  let _ofudaFxFH = 0;

  let _ofudaExplosionFxImg = null;
  let _ofudaExplosionFxReady = false;
  const _ofudaExplosionFxCols = 4;
  const _ofudaExplosionFxRows = 2;
  let _ofudaExplosionFxFW = 0;
  let _ofudaExplosionFxFH = 0;

  let _thunderFxImg = null;
  let _thunderFxReady = false;
  const _thunderFxCols = 4;
  const _thunderFxRows = 2;
  let _thunderFxFW = 0;
  let _thunderFxFH = 0;

  let _orbitFxImg = null;
  let _orbitFxReady = false;
  const _orbitFxCols = 4;
  const _orbitFxRows = 2;
  let _orbitFxFW = 0;
  let _orbitFxFH = 0;

  let _shikigamiFamiliarImg = null;
  let _shikigamiFamiliarReady = false;
  const _shikigamiFamiliarCols = 4;
  const _shikigamiFamiliarRows = 2;
  let _shikigamiFamiliarFW = 0;
  let _shikigamiFamiliarFH = 0;

  let _reiriTanukiFamiliarImg = null;
  let _reiriTanukiFamiliarReady = false;
  const _reiriTanukiFamiliarCols = 4;
  const _reiriTanukiFamiliarRows = 2;
  let _reiriTanukiFamiliarFW = 0;
  let _reiriTanukiFamiliarFH = 0;

  let _yakyoOwlFamiliarImg = null;
  let _yakyoOwlFamiliarReady = false;
  const _yakyoOwlFamiliarCols = 4;
  const _yakyoOwlFamiliarRows = 2;
  let _yakyoOwlFamiliarFW = 0;
  let _yakyoOwlFamiliarFH = 0;

  let _shikigamiFoxfireFxImg = null;
  let _shikigamiFoxfireFxReady = false;
  const _shikigamiFoxfireFxCols = 4;
  const _shikigamiFoxfireFxRows = 2;
  let _shikigamiFoxfireFxFW = 0;
  let _shikigamiFoxfireFxFH = 0;

  let _shikigamiFoxfireBlueFxImg = null;
  let _shikigamiFoxfireBlueFxReady = false;
  const _shikigamiFoxfireBlueFxCols = 4;
  const _shikigamiFoxfireBlueFxRows = 2;
  let _shikigamiFoxfireBlueFxFW = 0;
  let _shikigamiFoxfireBlueFxFH = 0;

  let _yakyoIceFxImg = null;
  let _yakyoIceFxReady = false;
  const _yakyoIceFxCols = 4;
  const _yakyoIceFxRows = 2;
  let _yakyoIceFxFW = 0;
  let _yakyoIceFxFH = 0;

  async function loadHero(heroId){
    const srcMap = {
      1: PATHS.hero1,
      2: PATHS.hero2,
      3: PATHS.hero3,
      4: PATHS.hero4,
      5: PATHS.hero5,
    };
    const src = srcMap[heroId] || PATHS.hero1;
    _heroSrc = src;
    _heroReady = false;
    _heroError = false;

    const res = await loadImage(src);
    if(res.ok){
      _heroImg = res.img;
      _heroReady = true;
      _heroError = false;
    }else{
      _heroImg = null;
      _heroReady = false;
      _heroError = true;
      console.error("[assets] hero load failed:", res.src);
    }
  }

  async function loadEnemy2(){
    const res = await loadImage(PATHS.enemy2);
    if(res.ok){
      _enemy2Img = res.img;
      _enemy2Ready = true;
      _enemy2FW = Math.floor(_enemy2Img.width / _enemy2Cols);
      _enemy2FH = Math.floor(_enemy2Img.height / _enemy2Rows);
    }else{
      _enemy2Img = null;
      _enemy2Ready = false;
      _enemy2FW = 0;
      _enemy2FH = 0;
      console.error("[assets] enemy2 load failed:", res.src);
    }
  }

  async function loadStage1Tiles(){
    const entries = [
      ["ground1", PATHS.stage1TileGround1],
      ["ground2", PATHS.stage1TileGround2],
      ["moss1", PATHS.stage1TileMoss1],
      ["shadow1", PATHS.stage1TileShadow1],
      ["stone1", PATHS.stage1TileStone1],
      ["stone2", PATHS.stage1TileStone2],
    ];
    const loaded = await Promise.all(
      entries.map(async ([key, src]) => [key, await loadImage(src)]),
    );
    const tiles = {};
    let ok = true;
    for (const [key, res] of loaded) {
      if (res.ok) {
        tiles[key] = res.img;
      } else {
        ok = false;
        console.error("[assets] stage1 tile load failed:", res.src);
      }
    }
    _stage1Tiles = tiles;
    _stage1TilesReady = ok;
  }

  async function loadToriiWeathered(){
    const res = await loadImage(PATHS.toriiWeathered);
    if(res.ok){
      _toriiWeatheredImg = res.img;
      _toriiWeatheredReady = true;
    }else{
      _toriiWeatheredImg = null;
      _toriiWeatheredReady = false;
      console.error("[assets] torii load failed:", res.src);
    }
  }

  async function loadStageObjects(){
    const entries = [
      ["autumnLeaves", PATHS.autumnLeaves],
      ["mossyRocks", PATHS.mossyRocks],
      ["mossyLantern", PATHS.mossyLantern],
    ];
    const loaded = await Promise.all(
      entries.map(async ([key, src]) => [key, await loadImage(src)]),
    );
    for (const [key, res] of loaded) {
      if (key === "autumnLeaves") {
        _autumnLeavesImg = res.ok ? res.img : null;
        _autumnLeavesReady = res.ok;
      } else if (key === "mossyRocks") {
        _mossyRocksImg = res.ok ? res.img : null;
        _mossyRocksReady = res.ok;
      } else if (key === "mossyLantern") {
        _mossyLanternImg = res.ok ? res.img : null;
        _mossyLanternReady = res.ok;
      }

      if (!res.ok) {
        console.error("[assets] stage object load failed:", res.src);
      }
    }
  }

  async function loadBoss(){
    const res = await loadImage(PATHS.boss);
    if(res.ok){
      _bossImg = res.img;
      _bossReady = true;
      _bossFW = Math.floor(_bossImg.width / _bossCols);
      _bossFH = Math.floor(_bossImg.height / _bossRows);
    }else{
      _bossImg = null;
      _bossReady = false;
      _bossFW = 0;
      _bossFH = 0;
      console.error("[assets] boss load failed:", res.src);
    }
  }

  async function loadEnemyOniRed(){
    const res = await loadImage(PATHS.enemyOniRed);
    if(res.ok){
      _enemyOniRedImg = res.img;
      _enemyOniRedReady = true;
      _enemyOniRedFW = Math.floor(_enemyOniRedImg.width / _enemyOniRedCols);
      _enemyOniRedFH = Math.floor(_enemyOniRedImg.height / _enemyOniRedRows);
    }else{
      _enemyOniRedImg = null;
      _enemyOniRedReady = false;
      _enemyOniRedFW = 0;
      _enemyOniRedFH = 0;
      console.error("[assets] enemyOniRed load failed:", res.src);
    }
  }

  async function loadEnemyFast(){
    const res = await loadImage(PATHS.enemyFast);
    if(res.ok){
      _enemyFastImg = res.img;
      _enemyFastReady = true;
      _enemyFastFW = Math.floor(_enemyFastImg.width / _enemyFastCols);
      _enemyFastFH = Math.floor(_enemyFastImg.height / _enemyFastRows);
    }else{
      _enemyFastImg = null;
      _enemyFastReady = false;
      _enemyFastFW = 0;
      _enemyFastFH = 0;
      console.error("[assets] enemyFast load failed:", res.src);
    }
  }

  async function loadEnemyTank(){
    const res = await loadImage(PATHS.enemyTank);
    if(res.ok){
      _enemyTankImg = res.img;
      _enemyTankReady = true;
      _enemyTankFW = Math.floor(_enemyTankImg.width / _enemyTankCols);
      _enemyTankFH = Math.floor(_enemyTankImg.height / _enemyTankRows);
    }else{
      _enemyTankImg = null;
      _enemyTankReady = false;
      _enemyTankFW = 0;
      _enemyTankFH = 0;
      console.error("[assets] enemyTank load failed:", res.src);
    }
  }

  async function loadEnemyBoar(){
    const res = await loadImage(PATHS.enemyBoar);
    if(res.ok){
      _enemyBoarImg = res.img;
      _enemyBoarReady = true;
      _enemyBoarFW = Math.floor(_enemyBoarImg.width / _enemyBoarCols);
      _enemyBoarFH = Math.floor(_enemyBoarImg.height / _enemyBoarRows);
    }else{
      _enemyBoarImg = null;
      _enemyBoarReady = false;
      _enemyBoarFW = 0;
      _enemyBoarFH = 0;
      console.error("[assets] enemyBoar load failed:", res.src);
    }
  }

  async function loadEnemyKageboshi(){
    const res = await loadImage(PATHS.enemyKageboshi);
    if(res.ok){
      _enemyKageboshiImg = res.img;
      _enemyKageboshiReady = true;
      _enemyKageboshiFW = Math.floor(_enemyKageboshiImg.width / _enemyKageboshiCols);
      _enemyKageboshiFH = Math.floor(_enemyKageboshiImg.height / _enemyKageboshiRows);
    }else{
      _enemyKageboshiImg = null;
      _enemyKageboshiReady = false;
      _enemyKageboshiFW = 0;
      _enemyKageboshiFH = 0;
      console.error("[assets] enemyKageboshi load failed:", res.src);
    }
  }

  async function loadEnemyKageboshiRed(){
    const res = await loadImage(PATHS.enemyKageboshiRed);
    if(res.ok){
      _enemyKageboshiRedImg = res.img;
      _enemyKageboshiRedReady = true;
      _enemyKageboshiRedFW = Math.floor(_enemyKageboshiRedImg.width / _enemyKageboshiRedCols);
      _enemyKageboshiRedFH = Math.floor(_enemyKageboshiRedImg.height / _enemyKageboshiRedRows);
    }else{
      _enemyKageboshiRedImg = null;
      _enemyKageboshiRedReady = false;
      _enemyKageboshiRedFW = 0;
      _enemyKageboshiRedFH = 0;
      console.error("[assets] enemyKageboshiRed load failed:", res.src);
    }
  }

  async function loadSlashFx(){
    const res = await loadImage(PATHS.slashFx);
    if(res.ok){
      _slashFxImg = res.img;
      _slashFxReady = true;
      _slashFxFW = Math.floor(_slashFxImg.width / _slashFxCols);
      _slashFxFH = Math.floor(_slashFxImg.height / _slashFxRows);
    }else{
      _slashFxImg = null;
      _slashFxReady = false;
      _slashFxFW = 0;
      _slashFxFH = 0;
      console.error("[assets] slashFx load failed:", res.src);
    }
  }

  async function loadPetalFx(){
    const res = await loadImage(PATHS.petalFx);
    if(res.ok){
      _petalFxImg = res.img;
      _petalFxReady = true;
      _petalFxFW = Math.floor(_petalFxImg.width / _petalFxCols);
      _petalFxFH = Math.floor(_petalFxImg.height / _petalFxRows);
    }else{
      _petalFxImg = null;
      _petalFxReady = false;
      _petalFxFW = 0;
      _petalFxFH = 0;
      console.error("[assets] petalFx load failed:", res.src);
    }
  }

  async function loadOfudaFx(){
    const res = await loadImage(PATHS.ofudaFx);
    if(res.ok){
      _ofudaFxImg = res.img;
      _ofudaFxReady = true;
      _ofudaFxFW = Math.floor(_ofudaFxImg.width / _ofudaFxCols);
      _ofudaFxFH = Math.floor(_ofudaFxImg.height / _ofudaFxRows);
    }else{
      _ofudaFxImg = null;
      _ofudaFxReady = false;
      _ofudaFxFW = 0;
      _ofudaFxFH = 0;
      console.error("[assets] ofudaFx load failed:", res.src);
    }
  }

  async function loadOrbitFx(){
    const res = await loadImage(PATHS.orbitFx);
    if(res.ok){
      _orbitFxImg = res.img;
      _orbitFxReady = true;
      _orbitFxFW = Math.floor(_orbitFxImg.width / _orbitFxCols);
      _orbitFxFH = Math.floor(_orbitFxImg.height / _orbitFxRows);
    }else{
      _orbitFxImg = null;
      _orbitFxReady = false;
      _orbitFxFW = 0;
      _orbitFxFH = 0;
      console.error("[assets] orbitFx load failed:", res.src);
    }
  }

  async function loadShikigamiFamiliar(){
    const res = await loadImage(PATHS.shikigamiFamiliar);
    if(res.ok){
      _shikigamiFamiliarImg = res.img;
      _shikigamiFamiliarReady = true;
      _shikigamiFamiliarFW = Math.floor(_shikigamiFamiliarImg.width / _shikigamiFamiliarCols);
      _shikigamiFamiliarFH = Math.floor(_shikigamiFamiliarImg.height / _shikigamiFamiliarRows);
    }else{
      _shikigamiFamiliarImg = null;
      _shikigamiFamiliarReady = false;
      _shikigamiFamiliarFW = 0;
      _shikigamiFamiliarFH = 0;
      console.error("[assets] shikigami familiar load failed:", res.src);
    }
  }

  async function loadReiriTanukiFamiliar(){
    const res = await loadImage(PATHS.reiriTanukiFamiliar);
    if(res.ok){
      _reiriTanukiFamiliarImg = res.img;
      _reiriTanukiFamiliarReady = true;
      _reiriTanukiFamiliarFW = Math.floor(_reiriTanukiFamiliarImg.width / _reiriTanukiFamiliarCols);
      _reiriTanukiFamiliarFH = Math.floor(_reiriTanukiFamiliarImg.height / _reiriTanukiFamiliarRows);
    }else{
      _reiriTanukiFamiliarImg = null;
      _reiriTanukiFamiliarReady = false;
      _reiriTanukiFamiliarFW = 0;
      _reiriTanukiFamiliarFH = 0;
      console.error("[assets] reiri tanuki familiar load failed:", res.src);
    }
  }

  async function loadYakyoOwlFamiliar(){
    const res = await loadImage(PATHS.yakyoOwlFamiliar);
    if(res.ok){
      _yakyoOwlFamiliarImg = res.img;
      _yakyoOwlFamiliarReady = true;
      _yakyoOwlFamiliarFW = Math.floor(_yakyoOwlFamiliarImg.width / _yakyoOwlFamiliarCols);
      _yakyoOwlFamiliarFH = Math.floor(_yakyoOwlFamiliarImg.height / _yakyoOwlFamiliarRows);
    }else{
      _yakyoOwlFamiliarImg = null;
      _yakyoOwlFamiliarReady = false;
      _yakyoOwlFamiliarFW = 0;
      _yakyoOwlFamiliarFH = 0;
      console.error("[assets] yakyo owl familiar load failed:", res.src);
    }
  }

  async function loadShikigamiFoxfireFx(){
    const res = await loadImage(PATHS.shikigamiFoxfireFx);
    if(res.ok){
      _shikigamiFoxfireFxImg = res.img;
      _shikigamiFoxfireFxReady = true;
      _shikigamiFoxfireFxFW = Math.floor(_shikigamiFoxfireFxImg.width / _shikigamiFoxfireFxCols);
      _shikigamiFoxfireFxFH = Math.floor(_shikigamiFoxfireFxImg.height / _shikigamiFoxfireFxRows);
    }else{
      _shikigamiFoxfireFxImg = null;
      _shikigamiFoxfireFxReady = false;
      _shikigamiFoxfireFxFW = 0;
      _shikigamiFoxfireFxFH = 0;
      console.error("[assets] shikigami foxfire load failed:", res.src);
    }
  }

  async function loadShikigamiFoxfireBlueFx(){
    const res = await loadImage(PATHS.shikigamiFoxfireBlueFx);
    if(res.ok){
      _shikigamiFoxfireBlueFxImg = res.img;
      _shikigamiFoxfireBlueFxReady = true;
      _shikigamiFoxfireBlueFxFW = Math.floor(_shikigamiFoxfireBlueFxImg.width / _shikigamiFoxfireBlueFxCols);
      _shikigamiFoxfireBlueFxFH = Math.floor(_shikigamiFoxfireBlueFxImg.height / _shikigamiFoxfireBlueFxRows);
    }else{
      _shikigamiFoxfireBlueFxImg = null;
      _shikigamiFoxfireBlueFxReady = false;
      _shikigamiFoxfireBlueFxFW = 0;
      _shikigamiFoxfireBlueFxFH = 0;
      console.error("[assets] blue shikigami foxfire load failed:", res.src);
    }
  }

  async function loadYakyoIceFx(){
    const res = await loadImage(PATHS.yakyoIceFx);
    if(res.ok){
      _yakyoIceFxImg = res.img;
      _yakyoIceFxReady = true;
      _yakyoIceFxFW = Math.floor(_yakyoIceFxImg.width / _yakyoIceFxCols);
      _yakyoIceFxFH = Math.floor(_yakyoIceFxImg.height / _yakyoIceFxRows);
    }else{
      _yakyoIceFxImg = null;
      _yakyoIceFxReady = false;
      _yakyoIceFxFW = 0;
      _yakyoIceFxFH = 0;
      console.error("[assets] yakyo ice load failed:", res.src);
    }
  }

  async function loadOfudaExplosionFx(){
    const res = await loadImage(PATHS.ofudaExplosionFx);
    if(res.ok){
      _ofudaExplosionFxImg = res.img;
      _ofudaExplosionFxReady = true;
      _ofudaExplosionFxFW = Math.floor(_ofudaExplosionFxImg.width / _ofudaExplosionFxCols);
      _ofudaExplosionFxFH = Math.floor(_ofudaExplosionFxImg.height / _ofudaExplosionFxRows);
    }else{
      _ofudaExplosionFxImg = null;
      _ofudaExplosionFxReady = false;
      _ofudaExplosionFxFW = 0;
      _ofudaExplosionFxFH = 0;
      console.error("[assets] ofudaExplosionFx load failed:", res.src);
    }
  }

  async function loadThunderFx(){
    const res = await loadImage(PATHS.thunderFx);
    if(res.ok){
      _thunderFxImg = res.img;
      _thunderFxReady = true;
      _thunderFxFW = Math.floor(_thunderFxImg.width / _thunderFxCols);
      _thunderFxFH = Math.floor(_thunderFxImg.height / _thunderFxRows);
    }else{
      _thunderFxImg = null;
      _thunderFxReady = false;
      _thunderFxFW = 0;
      _thunderFxFH = 0;
      console.error("[assets] thunderFx load failed:", res.src);
    }
  }

  async function preload(){
    await Promise.all([
      loadStage1Tiles(),
      loadToriiWeathered(),
      loadStageObjects(),
      loadHero(1),
      loadEnemy2(),
      loadBoss(),
      loadEnemyOniRed(),
      loadEnemyFast(),
      loadEnemyTank(),
      loadEnemyBoar(),
      loadEnemyKageboshi(),
      loadEnemyKageboshiRed(),
      loadSlashFx(),
      loadPetalFx(),
      loadOfudaFx(),
      loadOfudaExplosionFx(),
      loadThunderFx(),
      loadOrbitFx(),
      loadShikigamiFamiliar(),
      loadReiriTanukiFamiliar(),
      loadYakyoOwlFamiliar(),
      loadShikigamiFoxfireFx(),
      loadShikigamiFoxfireBlueFx(),
      loadYakyoIceFx(),
    ]);
  }

  return {
    preload,
    loadHero,

    stage1Tiles: ()=>_stage1Tiles,
    stage1TilesReady: ()=>_stage1TilesReady,
    toriiWeatheredImg: ()=>_toriiWeatheredImg,
    toriiWeatheredReady: ()=>_toriiWeatheredReady,
    autumnLeavesImg: ()=>_autumnLeavesImg,
    autumnLeavesReady: ()=>_autumnLeavesReady,
    mossyRocksImg: ()=>_mossyRocksImg,
    mossyRocksReady: ()=>_mossyRocksReady,
    mossyLanternImg: ()=>_mossyLanternImg,
    mossyLanternReady: ()=>_mossyLanternReady,

    heroImg: ()=>_heroImg,
    heroReady: ()=>_heroReady,
    heroError: ()=>_heroError,
    heroSrc: ()=>_heroSrc,

    enemy2Img: ()=>_enemy2Img,
    enemy2Ready: ()=>_enemy2Ready,
    ENEMY2_COLS: ()=>_enemy2Cols,
    ENEMY2_ROWS: ()=>_enemy2Rows,
    ENEMY2_FW: ()=>_enemy2FW,
    ENEMY2_FH: ()=>_enemy2FH,

    bossImg: ()=>_bossImg,
    bossReady: ()=>_bossReady,
    BOSS_COLS: ()=>_bossCols,
    BOSS_ROWS: ()=>_bossRows,
    BOSS_FW: ()=>_bossFW,
    BOSS_FH: ()=>_bossFH,

    enemyOniRedImg: ()=>_enemyOniRedImg,
    enemyOniRedReady: ()=>_enemyOniRedReady,
    ENEMY_ONI_RED_COLS: ()=>_enemyOniRedCols,
    ENEMY_ONI_RED_ROWS: ()=>_enemyOniRedRows,
    ENEMY_ONI_RED_FW: ()=>_enemyOniRedFW,
    ENEMY_ONI_RED_FH: ()=>_enemyOniRedFH,

    enemyFastImg: ()=>_enemyFastImg,
    enemyFastReady: ()=>_enemyFastReady,
    ENEMY_FAST_COLS: ()=>_enemyFastCols,
    ENEMY_FAST_ROWS: ()=>_enemyFastRows,
    ENEMY_FAST_FW: ()=>_enemyFastFW,
    ENEMY_FAST_FH: ()=>_enemyFastFH,

    enemyTankImg: ()=>_enemyTankImg,
    enemyTankReady: ()=>_enemyTankReady,
    ENEMY_TANK_COLS: ()=>_enemyTankCols,
    ENEMY_TANK_ROWS: ()=>_enemyTankRows,
    ENEMY_TANK_FW: ()=>_enemyTankFW,
    ENEMY_TANK_FH: ()=>_enemyTankFH,

    enemyBoarImg: ()=>_enemyBoarImg,
    enemyBoarReady: ()=>_enemyBoarReady,
    ENEMY_BOAR_COLS: ()=>_enemyBoarCols,
    ENEMY_BOAR_ROWS: ()=>_enemyBoarRows,
    ENEMY_BOAR_FW: ()=>_enemyBoarFW,
    ENEMY_BOAR_FH: ()=>_enemyBoarFH,

    enemyKageboshiImg: ()=>_enemyKageboshiImg,
    enemyKageboshiReady: ()=>_enemyKageboshiReady,
    ENEMY_KAGEBOSHI_COLS: ()=>_enemyKageboshiCols,
    ENEMY_KAGEBOSHI_ROWS: ()=>_enemyKageboshiRows,
    ENEMY_KAGEBOSHI_FW: ()=>_enemyKageboshiFW,
    ENEMY_KAGEBOSHI_FH: ()=>_enemyKageboshiFH,

    enemyKageboshiRedImg: ()=>_enemyKageboshiRedImg,
    enemyKageboshiRedReady: ()=>_enemyKageboshiRedReady,
    ENEMY_KAGEBOSHI_RED_COLS: ()=>_enemyKageboshiRedCols,
    ENEMY_KAGEBOSHI_RED_ROWS: ()=>_enemyKageboshiRedRows,
    ENEMY_KAGEBOSHI_RED_FW: ()=>_enemyKageboshiRedFW,
    ENEMY_KAGEBOSHI_RED_FH: ()=>_enemyKageboshiRedFH,

    slashFxImg: ()=>_slashFxImg,
    slashFxReady: ()=>_slashFxReady,
    SLASH_FX_COLS: ()=>_slashFxCols,
    SLASH_FX_ROWS: ()=>_slashFxRows,
    SLASH_FX_FW: ()=>_slashFxFW,
    SLASH_FX_FH: ()=>_slashFxFH,

    petalFxImg: ()=>_petalFxImg,
    petalFxReady: ()=>_petalFxReady,
    PETAL_FX_COLS: ()=>_petalFxCols,
    PETAL_FX_ROWS: ()=>_petalFxRows,
    PETAL_FX_FW: ()=>_petalFxFW,
    PETAL_FX_FH: ()=>_petalFxFH,

    ofudaFxImg: ()=>_ofudaFxImg,
    ofudaFxReady: ()=>_ofudaFxReady,
    OFUDA_FX_COLS: ()=>_ofudaFxCols,
    OFUDA_FX_ROWS: ()=>_ofudaFxRows,
    OFUDA_FX_FW: ()=>_ofudaFxFW,
    OFUDA_FX_FH: ()=>_ofudaFxFH,

    ofudaExplosionFxImg: ()=>_ofudaExplosionFxImg,
    ofudaExplosionFxReady: ()=>_ofudaExplosionFxReady,
    OFUDA_EXPLOSION_FX_COLS: ()=>_ofudaExplosionFxCols,
    OFUDA_EXPLOSION_FX_ROWS: ()=>_ofudaExplosionFxRows,
    OFUDA_EXPLOSION_FX_FW: ()=>_ofudaExplosionFxFW,
    OFUDA_EXPLOSION_FX_FH: ()=>_ofudaExplosionFxFH,

    thunderFxImg: ()=>_thunderFxImg,
    thunderFxReady: ()=>_thunderFxReady,
    THUNDER_FX_COLS: ()=>_thunderFxCols,
    THUNDER_FX_ROWS: ()=>_thunderFxRows,
    THUNDER_FX_FW: ()=>_thunderFxFW,
    THUNDER_FX_FH: ()=>_thunderFxFH,

    orbitFxImg: ()=>_orbitFxImg,
    orbitFxReady: ()=>_orbitFxReady,
    ORBIT_FX_COLS: ()=>_orbitFxCols,
    ORBIT_FX_ROWS: ()=>_orbitFxRows,
    ORBIT_FX_FW: ()=>_orbitFxFW,
    ORBIT_FX_FH: ()=>_orbitFxFH,

    shikigamiFamiliarImg: ()=>_shikigamiFamiliarImg,
    shikigamiFamiliarReady: ()=>_shikigamiFamiliarReady,
    SHIKIGAMI_FAMILIAR_COLS: ()=>_shikigamiFamiliarCols,
    SHIKIGAMI_FAMILIAR_ROWS: ()=>_shikigamiFamiliarRows,
    SHIKIGAMI_FAMILIAR_FW: ()=>_shikigamiFamiliarFW,
    SHIKIGAMI_FAMILIAR_FH: ()=>_shikigamiFamiliarFH,

    reiriTanukiFamiliarImg: ()=>_reiriTanukiFamiliarImg,
    reiriTanukiFamiliarReady: ()=>_reiriTanukiFamiliarReady,
    REIRI_TANUKI_FAMILIAR_COLS: ()=>_reiriTanukiFamiliarCols,
    REIRI_TANUKI_FAMILIAR_ROWS: ()=>_reiriTanukiFamiliarRows,
    REIRI_TANUKI_FAMILIAR_FW: ()=>_reiriTanukiFamiliarFW,
    REIRI_TANUKI_FAMILIAR_FH: ()=>_reiriTanukiFamiliarFH,

    yakyoOwlFamiliarImg: ()=>_yakyoOwlFamiliarImg,
    yakyoOwlFamiliarReady: ()=>_yakyoOwlFamiliarReady,
    YAKYO_OWL_FAMILIAR_COLS: ()=>_yakyoOwlFamiliarCols,
    YAKYO_OWL_FAMILIAR_ROWS: ()=>_yakyoOwlFamiliarRows,
    YAKYO_OWL_FAMILIAR_FW: ()=>_yakyoOwlFamiliarFW,
    YAKYO_OWL_FAMILIAR_FH: ()=>_yakyoOwlFamiliarFH,

    shikigamiFoxfireFxImg: ()=>_shikigamiFoxfireFxImg,
    shikigamiFoxfireFxReady: ()=>_shikigamiFoxfireFxReady,
    SHIKIGAMI_FOXFIRE_FX_COLS: ()=>_shikigamiFoxfireFxCols,
    SHIKIGAMI_FOXFIRE_FX_ROWS: ()=>_shikigamiFoxfireFxRows,
    SHIKIGAMI_FOXFIRE_FX_FW: ()=>_shikigamiFoxfireFxFW,
    SHIKIGAMI_FOXFIRE_FX_FH: ()=>_shikigamiFoxfireFxFH,

    shikigamiFoxfireBlueFxImg: ()=>_shikigamiFoxfireBlueFxImg,
    shikigamiFoxfireBlueFxReady: ()=>_shikigamiFoxfireBlueFxReady,
    SHIKIGAMI_FOXFIRE_BLUE_FX_COLS: ()=>_shikigamiFoxfireBlueFxCols,
    SHIKIGAMI_FOXFIRE_BLUE_FX_ROWS: ()=>_shikigamiFoxfireBlueFxRows,
    SHIKIGAMI_FOXFIRE_BLUE_FX_FW: ()=>_shikigamiFoxfireBlueFxFW,
    SHIKIGAMI_FOXFIRE_BLUE_FX_FH: ()=>_shikigamiFoxfireBlueFxFH,

    yakyoIceFxImg: ()=>_yakyoIceFxImg,
    yakyoIceFxReady: ()=>_yakyoIceFxReady,
    YAKYO_ICE_FX_COLS: ()=>_yakyoIceFxCols,
    YAKYO_ICE_FX_ROWS: ()=>_yakyoIceFxRows,
    YAKYO_ICE_FX_FW: ()=>_yakyoIceFxFW,
    YAKYO_ICE_FX_FH: ()=>_yakyoIceFxFH,
  };
}
