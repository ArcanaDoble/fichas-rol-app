const CARD_TYPE_SEARCH_LABELS = {
  general: 'general',
  action: 'accion acciones',
  attribute: 'atributo atributos',
  trap: 'trampa trampas',
  weapon: 'arma armas',
  armor: 'armadura armaduras',
  minion: 'minion minions',
  skill: 'habilidad habilidades',
  status: 'estado estados',
};

export const normalizeCardSearchText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const getTemplateSearchFields = (template = {}) => {
  const normalizedName = normalizeCardSearchText(template.name);
  const normalizedType = normalizeCardSearchText(
    `${template.type || ''} ${CARD_TYPE_SEARCH_LABELS[template.type] || ''}`
  );
  const normalizedSource = normalizeCardSearchText(
    `${template.sourceDeckName || ''} ${template.sourceType || ''}`
  );

  return {
    normalizedName,
    searchableText: `${normalizedName} ${normalizedType} ${normalizedSource}`.trim(),
  };
};

const getTemplateMatchRank = (template, normalizedQuery, queryTokens) => {
  const { normalizedName, searchableText } = getTemplateSearchFields(template);
  if (!queryTokens.every((token) => searchableText.includes(token))) return null;

  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;
  if (normalizedName.split(' ').some((word) => word.startsWith(normalizedQuery))) return 2;
  if (normalizedName.includes(normalizedQuery)) return 3;
  if (queryTokens.every((token) => normalizedName.includes(token))) return 4;
  return 5;
};

export const filterCardTemplates = (templates = [], query = '') => {
  const normalizedQuery = normalizeCardSearchText(query);
  if (!normalizedQuery) return templates;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  return templates
    .map((template, originalIndex) => ({
      template,
      originalIndex,
      rank: getTemplateMatchRank(template, normalizedQuery, queryTokens),
    }))
    .filter(({ rank }) => rank !== null)
    .sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex)
    .map(({ template }) => template);
};

