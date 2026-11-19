import { quizStorage } from './accountStorage';
const HISTORY_KEY = 'cda-quiz-history-v1';
const MAX_ENTRIES = 50;

function scopedHistoryKey(lot = 'lot1') {
  return `${HISTORY_KEY}:${lot}`;
}

export function loadHistory(lot = 'lot1') {
  try {
    const scopedKey = scopedHistoryKey(lot);
    let raw = quizStorage.getItem(scopedKey);

    // Migration des anciennes statistiques vers le lot 1.
    if (!raw && lot === 'lot1') {
      const legacy = quizStorage.getItem(HISTORY_KEY);
      if (legacy) {
        raw = legacy;
        quizStorage.setItem(scopedKey, legacy);
        quizStorage.removeItem(HISTORY_KEY);
      }
    }

    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry, lot = 'lot1') {
  try {
    const history = loadHistory(lot);
    history.unshift(entry);
    quizStorage.setItem(scopedHistoryKey(lot), JSON.stringify(history.slice(0, MAX_ENTRIES)));
  } catch {
    // localStorage unavailable — history just won't persist.
  }
}

export function clearHistory(lot = 'lot1') {
  try {
    quizStorage.removeItem(scopedHistoryKey(lot));
    if (lot === 'lot1') quizStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

// Aggregates every logged attempt into a per-category success rate,
// sorted weakest-first so the user knows what to work on.
export function computeCategoryStats(history) {
  const byCategory = {};
  history.forEach((entry) => {
    Object.entries(entry.categoryStats || {}).forEach(([category, { correct, total }]) => {
      if (!byCategory[category]) byCategory[category] = { correct: 0, total: 0 };
      byCategory[category].correct += correct;
      byCategory[category].total += total;
    });
  });
  return Object.entries(byCategory)
    .map(([category, { correct, total }]) => ({
      category,
      correct,
      total,
      rate: total > 0 ? correct / total : 0,
    }))
    .sort((a, b) => a.rate - b.rate);
}
