import {
  createEmptyRogueliteTalent,
  resolveEquippedTalentIds,
  resolveRogueliteTalentCatalog,
} from '../talents';

describe('roguelite talent ownership', () => {
  test('migrates only active legacy reactions into the dedicated class catalog', () => {
    const catalog = resolveRogueliteTalentCatalog({
      actionData: {
        reaction: [
          {
            id: 'furious-step',
            name: 'Paso furioso',
            desc: 'Avanza una casilla.',
            isActive: true,
          },
          {
            id: 'retaliation',
            name: 'Represalia',
            desc: 'Devuelve daño.',
            isActive: false,
          },
        ],
      },
    });

    expect(catalog).toEqual([
      expect.objectContaining({
        id: 'furious-step',
        name: 'Paso furioso',
        description: 'Avanza una casilla.',
        available: true,
      }),
      expect.objectContaining({ id: 'retaliation', available: false }),
    ]);
  });

  test('migrates old copied talent slots to three stable identifiers', () => {
    const catalog = resolveRogueliteTalentCatalog({
      talentCatalog: [
        { id: 'athletics', name: 'Atletismo' },
        { id: 'intimidation', name: 'Intimidación' },
      ],
    });
    const equippedIds = resolveEquippedTalentIds(
      {
        talents: {
          slots: [
            { name: 'Atletismo', description: 'Copia antigua' },
            { id: 'intimidation', name: 'Nombre antiguo' },
            { id: 'missing', name: 'Eliminado' },
          ],
        },
      },
      catalog
    );

    expect(equippedIds).toEqual(['athletics', 'intimidation', null]);
  });

  test('allows one talent to occupy several personal slots', () => {
    const catalog = [{ id: 'athletics', name: 'Atletismo' }];
    expect(
      resolveEquippedTalentIds(
        {
          equippedTalentIds: ['athletics', 'athletics', null],
        },
        catalog
      )
    ).toEqual(['athletics', 'athletics', null]);
  });

  test('creates an available talent with a unique persistent id', () => {
    const talent = createEmptyRogueliteTalent([{ id: 'existing' }]);
    expect(talent).toMatchObject({
      name: 'Nuevo talento',
      available: true,
      image: '',
    });
    expect(talent.id).not.toBe('existing');
  });

  test('preserves empty names and spaces while a dedicated talent is being edited', () => {
    const catalog = resolveRogueliteTalentCatalog({
      talentCatalog: [
        {
          id: 'editable-talent',
          name: '',
          description: 'Obtienes ventaja ',
          available: true,
        },
      ],
    });

    expect(catalog[0]).toMatchObject({
      id: 'editable-talent',
      name: '',
      description: 'Obtienes ventaja ',
    });
  });
});
