import {
  getDefaultEquippedFamiliarId,
  getDefaultUnlockedFamiliarIds,
} from "../data/familiars.js";
import { getDefaultUnlockedHeroIds } from "../data/heroes.js";
import { sanitizePermanentUpgrades } from "../data/permanentUpgrades.js";

const PREFS_STORAGE_KEY = "ayakasi_v8_prefs";

const DEFAULT_PREFS = {
  selectedHeroId: 1,
  selectedStageId: 1,
  selectedDifficultyId: "easy",
  unlockedStageMax: 1,
  unlockedDifficulties: {
    1: ["easy"],
    2: ["easy"],
    3: ["easy"],
  },
  audioDefaultsVersion: 3,
  bgmVolume: 0.5,
  seVolume: 0.5,
  showLoadoutPanels: true,
  showEnemyHpBars: false,
  showMiniMap: true,
  soulShards: 0,
  permanentUpgrades: {},
  unlockedHeroIds: getDefaultUnlockedHeroIds(),
  unlockedFamiliars: getDefaultUnlockedFamiliarIds(),
  equippedFamiliarId: getDefaultEquippedFamiliarId(),
  familiarLevel: {},
  familiarMastery: {},
  familiarCountBonus: 0,
};

export function loadPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };

    const parsed = JSON.parse(raw);
    const usesCurrentAudioDefaults = parsed.audioDefaultsVersion === DEFAULT_PREFS.audioDefaultsVersion;
    return {
      selectedHeroId: sanitizeHeroId(parsed.selectedHeroId),
      selectedStageId: sanitizeStageId(parsed.selectedStageId),
      selectedDifficultyId: sanitizeDifficultyId(parsed.selectedDifficultyId),
      unlockedStageMax: sanitizeStageId(parsed.unlockedStageMax),
      unlockedDifficulties: sanitizeUnlockedDifficulties(parsed.unlockedDifficulties),
      audioDefaultsVersion: DEFAULT_PREFS.audioDefaultsVersion,
      bgmVolume: usesCurrentAudioDefaults ? sanitizeVolume(parsed.bgmVolume, DEFAULT_PREFS.bgmVolume) : DEFAULT_PREFS.bgmVolume,
      seVolume: usesCurrentAudioDefaults ? sanitizeVolume(parsed.seVolume, DEFAULT_PREFS.seVolume) : DEFAULT_PREFS.seVolume,
      showLoadoutPanels: sanitizeBoolean(parsed.showLoadoutPanels, DEFAULT_PREFS.showLoadoutPanels),
      showEnemyHpBars: sanitizeBoolean(parsed.showEnemyHpBars, DEFAULT_PREFS.showEnemyHpBars),
      showMiniMap: sanitizeBoolean(parsed.showMiniMap, DEFAULT_PREFS.showMiniMap),
      soulShards: sanitizeNonNegativeInt(parsed.soulShards, DEFAULT_PREFS.soulShards),
      permanentUpgrades: sanitizePermanentUpgrades(parsed.permanentUpgrades, DEFAULT_PREFS.permanentUpgrades),
      unlockedHeroIds: mergeDefaultUnlockedHeroIds(
        sanitizeHeroIdArray(parsed.unlockedHeroIds, DEFAULT_PREFS.unlockedHeroIds),
      ),
      unlockedFamiliars: mergeDefaultUnlockedFamiliars(
        sanitizeStringArray(parsed.unlockedFamiliars, DEFAULT_PREFS.unlockedFamiliars),
      ),
      equippedFamiliarId: sanitizeNullableString(parsed.equippedFamiliarId, DEFAULT_PREFS.equippedFamiliarId),
      familiarLevel: sanitizeLevelMap(parsed.familiarLevel, DEFAULT_PREFS.familiarLevel),
      familiarMastery: sanitizeFamiliarMastery(parsed.familiarMastery, DEFAULT_PREFS.familiarMastery),
      familiarCountBonus: sanitizeNonNegativeInt(parsed.familiarCountBonus, DEFAULT_PREFS.familiarCountBonus),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function getPrefsFromState(state, currentPrefs = state?.prefs ?? {}) {
  const familiarProgress = state?.familiarProgress ?? {};
  return {
    ...currentPrefs,
    selectedHeroId: state?.selectedHeroId ?? currentPrefs.selectedHeroId,
    selectedStageId: state?.selectedStageId ?? currentPrefs.selectedStageId,
    selectedDifficultyId: state?.selectedDifficultyId ?? currentPrefs.selectedDifficultyId,
    unlockedStageMax: state?.unlockedStageMax ?? currentPrefs.unlockedStageMax,
    unlockedDifficulties: state?.unlockedDifficulties ?? currentPrefs.unlockedDifficulties,
    showLoadoutPanels: state?.ui?.showLoadoutPanels ?? currentPrefs.showLoadoutPanels,
    showEnemyHpBars: state?.ui?.showEnemyHpBars ?? currentPrefs.showEnemyHpBars,
    showMiniMap: state?.ui?.showMiniMap ?? currentPrefs.showMiniMap,
    soulShards: state?.soulShards ?? currentPrefs.soulShards,
    permanentUpgrades: state?.permanentUpgrades ?? currentPrefs.permanentUpgrades,
    unlockedHeroIds: state?.unlockedHeroIds ?? currentPrefs.unlockedHeroIds,
    unlockedFamiliars: familiarProgress.unlockedFamiliars ?? currentPrefs.unlockedFamiliars,
    equippedFamiliarId: familiarProgress.equippedFamiliarId ?? currentPrefs.equippedFamiliarId,
    familiarLevel: familiarProgress.familiarLevel ?? currentPrefs.familiarLevel,
    familiarMastery: familiarProgress.familiarMastery ?? currentPrefs.familiarMastery,
    familiarCountBonus: familiarProgress.familiarCountBonus ?? currentPrefs.familiarCountBonus,
  };
}

export function savePrefs(currentPrefs = {}, partialPrefs = {}) {
  const next = {
    ...DEFAULT_PREFS,
    ...currentPrefs,
    ...partialPrefs,
  };

  next.selectedHeroId = sanitizeHeroId(next.selectedHeroId);
  next.selectedStageId = sanitizeStageId(next.selectedStageId);
  next.selectedDifficultyId = sanitizeDifficultyId(next.selectedDifficultyId);
  next.unlockedStageMax = sanitizeStageId(next.unlockedStageMax);
  next.unlockedDifficulties = sanitizeUnlockedDifficulties(next.unlockedDifficulties);
  next.audioDefaultsVersion = DEFAULT_PREFS.audioDefaultsVersion;
  next.selectedStageId = Math.min(next.selectedStageId, next.unlockedStageMax);
  next.bgmVolume = sanitizeVolume(next.bgmVolume, DEFAULT_PREFS.bgmVolume);
  next.seVolume = sanitizeVolume(next.seVolume, DEFAULT_PREFS.seVolume);
  next.showLoadoutPanels = sanitizeBoolean(next.showLoadoutPanels, DEFAULT_PREFS.showLoadoutPanels);
  next.showEnemyHpBars = sanitizeBoolean(next.showEnemyHpBars, DEFAULT_PREFS.showEnemyHpBars);
  next.showMiniMap = sanitizeBoolean(next.showMiniMap, DEFAULT_PREFS.showMiniMap);
  next.soulShards = sanitizeNonNegativeInt(next.soulShards, DEFAULT_PREFS.soulShards);
  next.permanentUpgrades = sanitizePermanentUpgrades(next.permanentUpgrades, DEFAULT_PREFS.permanentUpgrades);
  next.unlockedHeroIds = mergeDefaultUnlockedHeroIds(
    sanitizeHeroIdArray(next.unlockedHeroIds, DEFAULT_PREFS.unlockedHeroIds),
  );
  next.unlockedFamiliars = sanitizeStringArray(next.unlockedFamiliars, DEFAULT_PREFS.unlockedFamiliars);
  next.equippedFamiliarId = sanitizeNullableString(next.equippedFamiliarId, DEFAULT_PREFS.equippedFamiliarId);
  next.familiarLevel = sanitizeLevelMap(next.familiarLevel, DEFAULT_PREFS.familiarLevel);
  next.familiarMastery = sanitizeFamiliarMastery(next.familiarMastery, DEFAULT_PREFS.familiarMastery);
  next.familiarCountBonus = sanitizeNonNegativeInt(next.familiarCountBonus, DEFAULT_PREFS.familiarCountBonus);

  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存不可の環境ではそのまま続行
  }

  return next;
}

export function savePrefsFromState(state, partialPrefs = {}) {
  const next = savePrefs(getPrefsFromState(state), partialPrefs);
  if (state && typeof state === "object") {
    if (state.prefs && typeof state.prefs === "object") {
      Object.assign(state.prefs, next);
      return state.prefs;
    }
    state.prefs = next;
  }
  return next;
}

export function resetPrefs() {
  try {
    window.localStorage.removeItem(PREFS_STORAGE_KEY);
  } catch {
    // 保存不可の環境ではそのまま続行
  }
  return { ...DEFAULT_PREFS };
}

function sanitizeHeroId(value) {
  const heroId = Number(value);
  if (!Number.isInteger(heroId) || heroId <= 0) return DEFAULT_PREFS.selectedHeroId;
  return heroId;
}

function sanitizeStageId(value) {
  const stageId = Number(value);
  if (!Number.isInteger(stageId) || stageId <= 0) return DEFAULT_PREFS.selectedStageId;
  return stageId;
}

function sanitizeDifficultyId(value) {
  return ["easy", "normal", "hard"].includes(value) ? value : DEFAULT_PREFS.selectedDifficultyId;
}

function sanitizeUnlockedDifficulties(value) {
  const result = {};
  const source = value && typeof value === "object" ? value : {};
  const keys = new Set([
    ...Object.keys(DEFAULT_PREFS.unlockedDifficulties),
    ...Object.keys(source),
  ]);

  keys.forEach((key) => {
    const stageId = sanitizeStageId(key);
    const ids = Array.isArray(source[key]) ? source[key] : [];
    result[stageId] = [...new Set(["easy", ...ids.map((id) => sanitizeDifficultyId(id))])];
  });

  return result;
}

function sanitizeVolume(value, fallback) {
  const volume = Number(value);
  if (!Number.isFinite(volume)) return fallback;
  return Math.max(0, Math.min(1, volume));
}

function sanitizeBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function sanitizeStringArray(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return value.filter((item) => typeof item === "string");
}

function sanitizeHeroIdArray(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function mergeDefaultUnlockedHeroIds(value) {
  return [...new Set([...value, ...DEFAULT_PREFS.unlockedHeroIds])];
}

function mergeDefaultUnlockedFamiliars(value) {
  return [...new Set([...value, ...DEFAULT_PREFS.unlockedFamiliars])];
}

function sanitizeNullableString(value, fallback) {
  if (value === undefined) return fallback;
  if (value === null) return null;
  return typeof value === "string" ? value : fallback;
}

function sanitizeLevelMap(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }

  const result = {};
  for (const [key, rawLevel] of Object.entries(value)) {
    const level = Number(rawLevel);
    if (typeof key === "string" && Number.isInteger(level) && level > 0) {
      result[key] = level;
    }
  }
  return result;
}

function sanitizeFamiliarMastery(value, fallback) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }

  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== "string" || !raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const level = Number(raw.level);
    const xp = Number(raw.xp);
    if (!Number.isInteger(level) || level <= 0) continue;
    result[key] = {
      level: Math.max(1, Math.min(10, level)),
      xp: Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0,
    };
  }
  return result;
}

function sanitizeNonNegativeInt(value, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return fallback;
  return number;
}
