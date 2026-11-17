/** Copie un texte dans le presse-papiers. Lève une erreur si l'API est indisponible. */
export function copyToClipboard(text) {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error('Presse-papiers indisponible'));
  }
  return navigator.clipboard.writeText(text);
}
