import React from 'react';
import { render } from '@testing-library/react';
import RogueliteEnemyCard from '../RogueliteEnemyCard';
import { createEmptyRogueliteEnemy } from '../enemyModel';

jest.mock('../../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => new Map(),
}));

const renderCard = (enemy) => render(
  <RogueliteEnemyCard
    enemy={enemy}
    equipmentCatalog={[]}
    abilityLibrary={[]}
    onChange={jest.fn()}
    onSave={jest.fn()}
    onDelete={jest.fn()}
    onDuplicate={jest.fn()}
    onSaveAbility={jest.fn()}
    onLaunch={jest.fn()}
  />
);

describe('arte panorámico de la tarjeta de enemigo', () => {
  test('prioriza la cabecera compuesta y respeta su foco responsive', () => {
    const { container } = renderCard({
      ...createEmptyRogueliteEnemy(),
      image: 'retrato.webp',
      headerImage: 'cabecera.webp',
      headerFocus: { x: 0.7, y: 0.35 },
    });
    const image = container.querySelector('.noma-talent-stage__art img');

    expect(image).toHaveAttribute('src', 'cabecera.webp');
    expect(image).toHaveStyle({ objectPosition: '70% 35%' });
  });

  test('mantiene el encuadre CSS anterior en tarjetas todavía no migradas', () => {
    const { container } = renderCard({
      ...createEmptyRogueliteEnemy(),
      image: 'retrato-legado.webp',
      headerImage: '',
    });
    const image = container.querySelector('.noma-talent-stage__art img');

    expect(image).toHaveAttribute('src', 'retrato-legado.webp');
    expect(image.getAttribute('style')).toBeNull();
  });

  test('limita la edición visual a veinte bloques', () => {
    const { getByLabelText } = renderCard({
      ...createEmptyRogueliteEnemy(),
      stats: { vida: { current: 99, max: 99 } },
    });

    expect(getByLabelText('Vida actual')).toHaveValue('20');
    expect(getByLabelText('Vida base')).toHaveValue('20');
    expect(getByLabelText('Vida base')).toHaveAttribute('maxlength', '2');
  });

  test('usa el coste compacto de dos dados y omite el rótulo redundante de rasgos', () => {
    const { container, getByLabelText } = renderCard({
      ...createEmptyRogueliteEnemy(),
      equipmentSlotCount: 1,
      equipmentSlots: [{
        id: 'mandoble',
        name: 'Mandoble',
        type: 'weapon',
        dano: '2d8',
        actionCost: 2,
        traits: 'Derribo, Empuje',
      }],
    });

    const cost = getByLabelText('Coste: 2 dados de acción');
    expect(cost.querySelectorAll('svg')).toHaveLength(1);
    expect(cost).toHaveTextContent('2');
    expect(container.querySelector('.noma-enemy-entry__traits')).toHaveTextContent('Derribo · Empuje');
    expect(container.querySelector('.noma-enemy-entry__traits')).not.toHaveTextContent('Rasgos');
  });

});
