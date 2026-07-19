import {
  groupAttributeCards,
  getGroupedCardIds,
  moveCardToGroup,
  normalizeAttributeCardType,
  normalizeCardGroups,
  removeCardGroup,
  resolveAttributeCardType,
  swapCardGroupsById,
  UNCLASSIFIED_ATTRIBUTE_TYPE,
} from '../deckCardGrouping';

describe('deck card attribute grouping', () => {
  test('normalizes the three supported attribute types', () => {
    expect(normalizeAttributeCardType('cuerpo')).toBe('Cuerpo');
    expect(normalizeAttributeCardType(' MENTE ')).toBe('Mente');
    expect(normalizeAttributeCardType('Hámbré')).toBe('Hambre');
    expect(normalizeAttributeCardType('Tiempo')).toBeNull();
  });

  test('recovers legacy attribute types from their source template', () => {
    const templates = [{
      id: 'library:attributes:mind-card',
      templateId: 'mind-card',
      frontUrl: '/mind.png',
      attributeType: 'Mente',
    }];

    expect(resolveAttributeCardType({
      templateId: 'library:attributes:mind-card',
      frontUrl: '/old-copy.png',
    }, templates)).toBe('Mente');
    expect(resolveAttributeCardType({ frontUrl: '/mind.png' }, templates)).toBe('Mente');
  });

  test('groups only attribute cards while preserving their original order', () => {
    const cards = [
      { id: 'body-1', type: 'attribute', attributeType: 'Cuerpo' },
      { id: 'action-1', type: 'action' },
      { id: 'hunger-1', type: 'attribute', name: 'Carta de Hambre' },
      { id: 'unknown-1', type: 'attribute', name: 'Sin nombre' },
      { id: 'body-2', type: 'attribute', attributeType: 'Cuerpo' },
    ];

    const groups = groupAttributeCards(cards);

    expect(groups.Cuerpo.map((card) => card.id)).toEqual(['body-1', 'body-2']);
    expect(groups.Hambre.map((card) => card.id)).toEqual(['hunger-1']);
    expect(groups.Mente).toEqual([]);
    expect(groups[UNCLASSIFIED_ATTRIBUTE_TYPE].map((card) => card.id)).toEqual(['unknown-1']);
  });

  test('normalizes manual groups and prevents a card from belonging to two groups', () => {
    const cards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const groups = normalizeCardGroups([
      { id: 'one', name: ' Primera ', cardIds: ['a', 'b', 'missing'], accent: '#c85a4b' },
      { id: 'two', name: 'Segunda', cardIds: ['b', 'c'] },
    ], cards);

    expect(groups).toEqual([
      { id: 'one', name: 'Primera', cardIds: ['a', 'b'] },
      { id: 'two', name: 'Segunda', cardIds: ['c'] },
    ]);
    expect([...getGroupedCardIds(groups)]).toEqual(['a', 'b', 'c']);
  });

  test('moves cards between groups and deleting a group leaves card data untouched', () => {
    const groups = [
      { id: 'one', name: 'Uno', cardIds: ['a', 'b'] },
      { id: 'two', name: 'Dos', cardIds: ['c'] },
    ];

    const moved = moveCardToGroup(groups, 'b', 'two');
    expect(moved[0].cardIds).toEqual(['a']);
    expect(moved[1].cardIds).toEqual(['c', 'b']);
    expect(removeCardGroup(moved, 'two')).toEqual([{ id: 'one', name: 'Uno', cardIds: ['a'] }]);
  });

  test('swaps two manual groups without changing their cards', () => {
    const groups = [
      { id: 'one', name: 'Uno', cardIds: ['a'] },
      { id: 'two', name: 'Dos', cardIds: ['b', 'c'] },
      { id: 'three', name: 'Tres', cardIds: [] },
    ];

    const reordered = swapCardGroupsById(groups, 'one', 'three');
    expect(reordered.map((group) => group.id)).toEqual(['three', 'two', 'one']);
    expect(reordered[2].cardIds).toEqual(['a']);
    expect(swapCardGroupsById(groups, 'one', 'missing')).toBe(groups);
  });
});
