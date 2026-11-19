import { quizStorage } from './accountStorage';
const STORAGE_KEY = 'cda-quiz-progress-v1';

function scopedStorageKey(lot = 'lot1') {
  return `${STORAGE_KEY}:${lot}`;
}

export function isResumableProgress(state) {
  return Boolean(
    state &&
    Array.isArray(state.quizQuestions) &&
    state.quizQuestions.length > 0 &&
    Number.isInteger(state.currentIndex) &&
    state.currentIndex >= 0 &&
    state.currentIndex < state.quizQuestions.length,
  );
}

export function loadProgress(questionsData, lot = 'lot1') {
  try {
    const scopedKey = scopedStorageKey(lot);
    let raw = quizStorage.getItem(scopedKey);
    let migratedFromLegacy = false;

    // Les anciennes données correspondaient au premier lot. On les migre une seule fois.
    if (!raw && lot === 'lot1') {
      raw = quizStorage.getItem(STORAGE_KEY);
      migratedFromLegacy = Boolean(raw);
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.quizQuestions) || parsed.quizQuestions.length === 0) {
      return null;
    }
    if (!['home', 'quiz', 'results'].includes(parsed.screen)) return null;
    if (!isResumableProgress(parsed)) {
      clearProgress(lot);
      return null;
    }
    if (typeof parsed.answers !== 'object' || parsed.answers === null) return null;

    const currentIds = new Set(questionsData.map((q) => q.id));
    const stillValid = parsed.quizQuestions.every((q) => currentIds.has(q.id));
    if (!stillValid) {
      if (migratedFromLegacy) quizStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (migratedFromLegacy) {
      quizStorage.setItem(scopedKey, raw);
      quizStorage.removeItem(STORAGE_KEY);
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveProgress(state, lot = 'lot1') {
  try {
    const key = scopedStorageKey(lot);
    if (!isResumableProgress(state)) {
      quizStorage.removeItem(key);
      return;
    }
    quizStorage.setItem(key, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private browsing, quota) — progress just won't persist.
  }
}

export function clearProgress(lot = 'lot1') {
  try {
    quizStorage.removeItem(scopedStorageKey(lot));
    if (lot === 'lot1') quizStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
