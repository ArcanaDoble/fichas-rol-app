export const ATTRIBUTE_CARD_TYPES = ['Cuerpo', 'Mente', 'Hambre'];
export const UNCLASSIFIED_ATTRIBUTE_TYPE = 'unclassified';

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

export const normalizeAttributeCardType = (value) => {
  const normalized = normalizeText(value);
  return ATTRIBUTE_CARD_TYPES.find((type) => normalizeText(type) === normalized) || null;
};

export const resolveAttributeCardType = (card, templates = []) => {
  const directType = normalizeAttributeCardType(card?.attributeType);
  if (directType) return directType;

  const matchingTemplate = templates.find((template) => {
    if (card?.templateId && (template?.id === card.templateId || template?.templateId === card.templateId)) {
      return true;
    }
    return Boolean(card?.frontUrl && template?.frontUrl && card.frontUrl === template.frontUrl);
  });
  const templateType = normalizeAttributeCardType(matchingTemplate?.attributeType);
  if (templateType) return templateType;

  const normalizedName = normalizeText(card?.name);
  const inferredType = ATTRIBUTE_CARD_TYPES.find((type) => normalizedName.includes(normalizeText(type)));
  return inferredType || UNCLASSIFIED_ATTRIBUTE_TYPE;
};

export const groupAttributeCards = (cards = [], templates = []) => {
  const groups = {
    Cuerpo: [],
    Mente: [],
    Hambre: [],
    [UNCLASSIFIED_ATTRIBUTE_TYPE]: [],
  };

  cards.forEach((card) => {
    if ((card?.type || 'action') !== 'attribute') return;
    groups[resolveAttributeCardType(card, templates)].push(card);
  });

  return groups;
};

export const normalizeCardGroups = (groups = [], cards = []) => {
  const validCardIds = new Set(cards.map((card) => card?.id).filter(Boolean));
  const assignedCardIds = new Set();
  const usedGroupIds = new Set();

  return (Array.isArray(groups) ? groups : []).reduce((normalized, group, index) => {
    const id = typeof group?.id === 'string' && group.id.trim()
      ? group.id.trim()
      : `group-${index + 1}`;
    if (usedGroupIds.has(id)) return normalized;
    usedGroupIds.add(id);

    const cardIds = (Array.isArray(group?.cardIds) ? group.cardIds : []).filter((cardId) => {
      if (!validCardIds.has(cardId) || assignedCardIds.has(cardId)) return false;
      assignedCardIds.add(cardId);
      return true;
    });

    normalized.push({
      id,
      name: typeof group?.name === 'string' && group.name.trim()
        ? group.name.trim().slice(0, 40)
        : `Agrupación ${index + 1}`,
      cardIds,
      ...(typeof group?.createdAt === 'number' ? { createdAt: group.createdAt } : {}),
    });
    return normalized;
  }, []);
};

export const moveCardToGroup = (groups = [], cardId, targetGroupId = null) => groups.map((group) => {
  const cardIds = (group.cardIds || []).filter((id) => id !== cardId);
  if (group.id === targetGroupId) cardIds.push(cardId);
  return { ...group, cardIds };
});

export const removeCardGroup = (groups = [], groupId) => groups.filter((group) => group.id !== groupId);

export const swapCardGroupsById = (groups = [], draggedId, targetId) => {
  const draggedIndex = groups.findIndex((group) => group.id === draggedId);
  const targetIndex = groups.findIndex((group) => group.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return groups;

  const reorderedGroups = [...groups];
  [reorderedGroups[draggedIndex], reorderedGroups[targetIndex]] = [
    reorderedGroups[targetIndex],
    reorderedGroups[draggedIndex],
  ];
  return reorderedGroups;
};

export const getGroupedCardIds = (groups = []) => new Set(
  groups.flatMap((group) => Array.isArray(group?.cardIds) ? group.cardIds : []),
);
