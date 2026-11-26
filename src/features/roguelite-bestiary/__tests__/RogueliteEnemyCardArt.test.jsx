import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import RogueliteEnemyCard from '../RogueliteEnemyCard';
import { createEmptyRogueliteEnemy, normalizeRogueliteEnemy } from '../enemyModel';
import { createEmptyCampaignNpc } from '../campaignNpcModel';

jest.mock('../../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => new Map(),
  getCustomImage: () => null,
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

const renderNpcCard = (enemy) => render(
  <RogueliteEnemyCard
    variant="campaignNpc"
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
  test('las nuevas fichas usan ilustración cuadrada sin migrar los encuadres existentes', () => {
    expect(createEmptyRogueliteEnemy().headerLayout).toBe('square');
    expect(createEmptyCampaignNpc().headerLayout).toBe('square');
    expect(normalizeRogueliteEnemy({ image: 'antigua.webp', imageCrop: { x: 10, y: 20, width: 80, height: 40 } }).headerLayout).toBe('panorama');
    const { container } = renderCard({ ...createEmptyRogueliteEnemy(), headerImage: 'cuadrada.webp', headerLayout: 'square' });
    expect(container.querySelector('.noma-enemy-card__stage')).toHaveAttribute('data-layout', 'square');
    expect(container.querySelector('.noma-enemy-card__illustration-space')).toBeInTheDocument();
    expect(container.querySelector('.noma-talent-stage__art img')).toHaveAttribute('src', 'cuadrada.webp');
  });

  test('un enemigo de Campaña usa acabado rojo sin borrar su rareza anterior', () => {
    const npc = { ...createEmptyCampaignNpc(), allegiance: 'enemy', rarity: 'epica' };
    const { container, unmount } = renderNpcCard(npc);
    expect(container.querySelector('article')).toHaveAttribute('data-allegiance', 'enemy');
    expect(container.querySelector('article').style.getPropertyValue('--noma-talent-accent')).toBe('#d1746d');
    expect(container.querySelector('.noma-talent-stage__rarity')).toHaveTextContent('Enemigo');
    expect(screen.queryByRole('button', { name: 'Épica' })).not.toBeInTheDocument();
    unmount();
    const ally = renderNpcCard({ ...npc, allegiance: 'ally' });
    expect(ally.container.querySelector('article').style.getPropertyValue('--noma-talent-accent')).toBe('#b96bd6');
    expect(screen.getByRole('button', { name: 'Épica' })).toBeInTheDocument();
  });

  test('prioriza la cabecera compuesta y respeta su foco responsive', () => {
    const { container } = renderCard({
      ...createEmptyRogueliteEnemy(),
      image: 'retrato.webp',
      headerImage: 'cabecera.webp',
      headerLayout: 'panorama',
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

  test('muestra la Vida por puntos y la RD propias del PNJ de Campaña', () => {
    const { getByLabelText, queryByLabelText, getByTestId } = renderNpcCard({
      ...createEmptyCampaignNpc(),
      stats: { vida: { current: 52, max: 60 }, armadura: { current: 3, max: 3 } },
    });

    expect(getByTestId('campaign-npc-card')).toBeInTheDocument();
    expect(getByLabelText('Vida actual')).toHaveValue('52');
    expect(getByLabelText('Vida base')).toHaveAttribute('maxlength', '3');
    expect(getByLabelText('RD actual')).toHaveValue('3');
    expect(queryByLabelText('CD actual')).not.toBeInTheDocument();
  });

  test('el perfil de Amenaza del PNJ usa acceso directo y guarda todas las copias', () => {
    const onChange = jest.fn();
    render(<RogueliteEnemyCard variant="campaignNpc" enemy={{ ...createEmptyCampaignNpc(), threatDice: ['d8', 'd8'] }}
      equipmentCatalog={[]} abilityLibrary={[]} onChange={onChange} onSave={jest.fn()} onDelete={jest.fn()}
      onDuplicate={jest.fn()} onSaveAbility={jest.fn()} onLaunch={jest.fn()} />);
    const tray = screen.getByRole('region', { name: 'Perfil inicial de Amenaza' });
    expect(tray.closest('details')).toBeNull();
    expect(screen.getByText('2d8')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir d20 de Amenaza' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ threatDice: ['d8', 'd8', 'd20'], threatDie: 'd8' }));
  });

});
