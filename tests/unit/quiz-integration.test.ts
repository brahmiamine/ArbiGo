import { expect, it } from 'vitest';
import { readNavigation, navigationSearch } from '@/lib/navigation';
import { computeScore } from '@/features/quiz/utils/scoring';
import { setQuizOwner, quizStorage } from '@/features/quiz/utils/accountStorage';
import { vi } from 'vitest';
it('keeps quiz routes in the shared application navigation', () => {
  const state = readNavigation('?page=quiz&quiz=settings');
  expect(state.tab).toBe('quiz');
  expect(navigationSearch(state, '?quiz=settings')).toContain('quiz=settings');
});
it('isolates imported quiz settings and progress between accounts', () => {
  const memory = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
      removeItem: (k: string) => memory.delete(k),
    },
  });
  setQuizOwner('a');
  quizStorage.setItem('progress', 'first');
  setQuizOwner('b');
  expect(quizStorage.getItem('progress')).toBeNull();
  quizStorage.setItem('progress', 'second');
  setQuizOwner('a');
  expect(quizStorage.getItem('progress')).toBe('first');
  vi.unstubAllGlobals();
});
it('retains partial credit for multiple-choice answers from Quizfff', () => {
  const result = computeScore(
    [
      {
        id: 'q',
        correct: ['a', 'b'],
        options: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        type: 'multiple',
      },
    ],
    { q: ['a'] },
  );
  expect(result.total).toBeGreaterThan(0);
  expect(result.total).toBeLessThan(100);
});

it('saves a new session from the first question rather than losing it on reload', async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
      removeItem: (k: string) => values.delete(k),
    },
  });
  const { saveProgress, loadProgress } = await import('@/features/quiz/utils/storage');
  setQuizOwner('resume-test');
  const state = { screen: 'quiz', quizQuestions: [{ id: 'q' }], currentIndex: 0, answers: {} };
  saveProgress(state, 'lot1');
  expect(loadProgress([{ id: 'q' }], 'lot1')).toMatchObject({ currentIndex: 0, screen: 'quiz' });
  vi.unstubAllGlobals();
});
