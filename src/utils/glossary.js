const normalizeGlossaryWord = (word = '') =>
  word
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getGlossaryTooltipId = (word = '') => {
  const normalized = normalizeGlossaryWord(word)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `gloss-${normalized || 'term'}`;
};

const escapeGlossaryWord = (word = '') =>
  word
    .toString()
    .replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export { normalizeGlossaryWord, getGlossaryTooltipId, escapeGlossaryWord };
