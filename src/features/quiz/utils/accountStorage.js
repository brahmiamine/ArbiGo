let owner = '';
export function setQuizOwner(id) {
  owner = String(id);
}
function scoped(kind, key) {
  if (!owner) throw new Error('QUIZ_ACCOUNT_REQUIRED');
  return `arbigo:quiz:${owner}:${kind}:${key}`;
}
export const quizStorage = {
  getItem: (key) => window.localStorage.getItem(scoped('local', key)),
  setItem: (key, value) => window.localStorage.setItem(scoped('local', key), value),
  removeItem: (key) => window.localStorage.removeItem(scoped('local', key)),
};
export const quizSessionStorage = {
  getItem: (key) => window.sessionStorage.getItem(scoped('session', key)),
  setItem: (key, value) => window.sessionStorage.setItem(scoped('session', key), value),
  removeItem: (key) => window.sessionStorage.removeItem(scoped('session', key)),
};
