import {
  getDefaultEquippedFamiliarId,
  getDefaultUnlockedFamiliarIds,
} from "../data/familiars.js";

const PREFS_STORAGE_KEY = "ayakasi_v8_prefs";

const DEFAULT_PREFS = {
  selectedHeroId: 1,
  selectedStageId: 1,
  unlockedStageMax: 1,
  audioDefaultsVersion: 3,
  bgmVolume: 0.5,
  seVolume: 0.5,
  showLoadoutPanels: true,
  showEnemyHpBars: false,
  showMiniMap: true,
  unlockedFamiliars: getDefaultUnlockedFamiliarIds(),
  equippedFamiliarId: getDefaultEquippedFamiliarId(),
  familiarLevel: {},
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
      unlockedStageMax: sanitizeStageId(parsed.unlockedStageMax),
      audioDefaultsVersion: DEFAULT_PREFS.audioDefaultsVersion,
      bgmVolume: usesCurrentAudioDefaults ? sanitizeVolume(parsed.bgmVolume, DEFAULT_PREFS.bgmVolume) : DEFAULT_PREFS.bgmVolume,
      seVolume: usesCurrentAudioDefaults ? sanitizeVolume(parsed.seVolume, DEFAULT_PREFS.seVolume) : DEFAULT_PREFS.seVolume,
      showLoadoutPanels: sanitizeBoolean(parsed.showLoadoutPanels, DEFAULT_PREFS.showLoadoutPanels),
      showEnemyHpBars: sanitizeBoolean(parsed.showEnemyHpBars, DEFAULT_PREFS.showEnemyHpBars),
      showMiniMap: sanitizeBoolean(parsed.showMiniMap, DEFAULT_PREFS.showMiniMap),
      unlockedFamiliars: mergeDefaultUnlockedFamiliars(
        sanitizeStringArray(parsed.unlockedFamiliars, DEFAULT_PREFS.unlockedFamiliars),
      ),
      equippedFamiliarId: sanitizeNullableString(parsed.equippedFamiliarId, DEFAULT_PREFS.equippedFamiliarId),
      familiarLevel: sanitizeLevelMap(parsed.familiarLevel, DEFAULT_PREFS.familiarLevel),
      familiarCountBonus: sanitizeNonNegativeInt(parsed.familiarCountBonus, DEFAULT_PREFS.familiarCountBonus),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(partialPrefs = {}) {
  const next = {
    ...loadPrefs(),
    ...partialPrefs,
  };

  next.selectedHeroId = sanitizeHeroId(next.selectedHeroId);
  next.selectedStageId = sanitizeStageId(next.selectedStageId);
  next.unlockedStageMax = sanitizeStageId(next.unlockedStageMax);
  next.audioDefaultsVersion = DEFAULT_PREFS.audioDefaultsVersion;
  next.selectedStageId = Math.min(next.selectedStageId, next.unlockedStageMax);
  next.bgmVolume = sanitizeVolume(next.bgmVolume, DEFAULT_PREFS.bgmVolume);
  next.seVolume = sanitizeVolume(next.seVolume, DEFAULT_PREFS.seVolume);
  next.showLoadoutPanels = sanitizeBoolean(next.showLoadoutPanels, DEFAULT_PREFS.showLoadoutPanels);
  next.showEnemyHpBars = sanitizeBoolean(next.showEnemyHpBars, DEFAULT_PREFS.showEnemyHpBars);
  next.showMiniMap = sanitizeBoolean(next.showMiniMap, DEFAULT_PREFS.showMiniMap);
  next.unlockedFamiliars = sanitizeStringArray(next.unlockedFamiliars, DEFAULT_PREFS.unlockedFamiliars);
  next.equippedFamiliarId = sanitizeNullableString(next.equippedFamiliarId, DEFAULT_PREFS.equippedFamiliarId);
  next.familiarLevel = sanitizeLevelMap(next.familiarLevel, DEFAULT_PREFS.familiarLevel);
  next.familiarCountBonus = sanitizeNonNegativeInt(next.familiarCountBonus, DEFAULT_PREFS.familiarCountBonus);

  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存不可の環境ではそのまま続行
  }

  return next;
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

function sanitizeNonNegativeInt(value, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) return fallback;
  return number;
}
