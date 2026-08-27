import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CanvasEquipmentSection from '../CanvasEquipmentSection';

jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => ({}),
}));

jest.mock('../../../tactical-shared/components/TacticalAssetImage', () => ({
  getObjectImage: (item) => item?.customImage || null,
}));

describe('CanvasEquipmentSection', () => {
  test('shows the complete run inventory and distinguishes equipped items', () => {
    render(
      <CanvasEquipmentSection
        token={{
          profileType: 'rogueliteClass',
          inventory: [
            {
              name: 'Mandoble',
              templateId: 'weapon:mandoble',
              type: 'weapon',
              isEquipped: true,
            },
            {
              name: 'Poción',
              templateId: 'object:pocion',
              type: 'object',
              isEquipped: false,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('Inventario')).toBeInTheDocument();
    expect(screen.getByText('1 equipados · 2 elementos')).toBeInTheDocument();
    expect(screen.getByText('Arma · Equipado')).toBeInTheDocument();
    expect(screen.getByText('Objeto')).toBeInTheDocument();
    expect(screen.getAllByTestId('inventory-item-card')).toHaveLength(2);
  });

  test('removing an equipped item clears it from the run loadout', () => {
    const onUpdateToken = jest.fn();
    const mandoble = {
      name: 'Mandoble',
      templateId: 'weapon:mandoble',
      type: 'weapon',
      isEquipped: true,
    };

    render(
      <CanvasEquipmentSection
        token={{
          profileType: 'rogueliteClass',
          inventory: [mandoble],
          equipmentLoadout: {
            activeWeaponSet: 0,
            weaponSets: [{ mainHand: mandoble, offHand: null }, { mainHand: null, offHand: null }],
            mainHand: mandoble,
            offHand: null,
          },
        }}
        onUpdateToken={onUpdateToken}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Mandoble' }));

    expect(onUpdateToken).toHaveBeenCalledWith(expect.objectContaining({
      inventory: [],
      equippedItems: [],
      equipmentLoadout: expect.objectContaining({ mainHand: null, offHand: null }),
    }));
  });

  test('presents prepared spells as abilities in the inspector', () => {
    render(
      <CanvasEquipmentSection
        token={{
          profileType: 'rogueliteClass',
          equippedSkillIds: ['ability:fireball', null, null],
          inventory: [{
            name: 'Bola de fuego',
            templateId: 'ability:fireball',
            type: 'ability',
            isEquipped: false,
            isPrepared: true,
            customImage: 'fireball.webp',
          }],
        }}
      />,
    );

    expect(screen.getByText('Conjuros & Magia')).toBeInTheDocument();
    expect(screen.getByText('Habilidades equipadas')).toBeInTheDocument();
    expect(screen.getAllByText('Bola de fuego')).toHaveLength(2);
    expect(screen.getByLabelText('1 habilidades equipadas')).toHaveTextContent('1/3');
    expect(within(screen.getByTestId('roguelite-token-spells')).getAllByText('Ranura vacía')).toHaveLength(2);
    expect(screen.queryByText('Habilidad · Preparada')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('inventory-item-card')).toHaveLength(0);
    expect(screen.queryByText('Objeto')).not.toBeInTheDocument();
    expect(screen.getByTestId('roguelite-token-spells').querySelector('img')).toHaveAttribute('src', 'fireball.webp');
  });

  test('restores equipped talents with the original three-slot ledger design', () => {
    render(
      <CanvasEquipmentSection
        token={{
          profileType: 'rogueliteClass',
          equippedTalentIds: ['guardian', null, null],
          equippedTalentSlots: [{
              id: 'guardian',
              name: 'Guardián',
              description: 'Protege a un aliado cercano.',
              imageSource: 'guardian.webp',
            }, null, null],
          inventory: [],
        }}
      />,
    );

    expect(screen.getByText('Talentos equipados')).toBeInTheDocument();
    expect(screen.getAllByText('Guardián')).toHaveLength(2);
    expect(screen.getByLabelText('1 talentos equipados')).toHaveTextContent('1/3');
    expect(within(screen.getByTestId('roguelite-token-talents')).getAllByText('Ranura vacía')).toHaveLength(2);
    expect(screen.queryByText('Talento · Equipado')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('inventory-item-card')).toHaveLength(0);
    expect(screen.getByTestId('roguelite-token-talents').querySelector('img')).toHaveAttribute('src', 'guardian.webp');
  });

  test('persists used state and expands a slot to show its complete information', () => {
    const onUpdateToken = jest.fn();
    render(
      <CanvasEquipmentSection
        token={{
          profileType: 'rogueliteClass',
          equippedTalentIds: ['guardian', null, null],
          equippedTalentSlots: [{
            id: 'guardian',
            name: 'Guardián',
            description: 'Protege a un aliado cercano durante toda la reacción.',
            traits: ['Reacción', 'Defensa'],
          }, null, null],
          inventory: [],
        }}
        onUpdateToken={onUpdateToken}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Marcar Guardián como usado' }));
    expect(onUpdateToken).toHaveBeenCalledWith({
      usedTalentSlots: [true, false, false],
      usedTalentSlotIds: ['guardian', null, null],
    }, true);

    expect(screen.queryByTestId('roguelite-token-talents-details-0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar detalles de Guardián' }));
    expect(screen.getByTestId('roguelite-token-talents-details-0')).toHaveTextContent(
      'Protege a un aliado cercano durante toda la reacción.',
    );
    expect(screen.getByTestId('roguelite-token-talents-details-0')).toHaveTextContent('Reacción');
    expect(screen.getByRole('button', { name: 'Ocultar detalles de Guardián' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByTestId('roguelite-token-talents')).getByText('Detalle abierto')).toBeInTheDocument();
    expect(screen.getAllByText('Protege a un aliado cercano durante toda la reacción.')).toHaveLength(1);
    expect(screen.getByTestId('roguelite-token-talents-details-0').querySelector('.noma-token-feature__details-scroll'))
      .toBeInTheDocument();
  });

  test('reorders inventory from the accessible drag handle', () => {
    const onUpdateToken = jest.fn();
    render(
      <CanvasEquipmentSection
        token={{
          id: 'hero',
          profileType: 'rogueliteClass',
          inventory: [
            { name: 'Espada', templateId: 'weapon:sword', type: 'weapon' },
            { name: 'Poción', templateId: 'object:potion', type: 'object' },
          ],
        }}
        onUpdateToken={onUpdateToken}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover Espada' }), { key: 'ArrowDown' });

    expect(onUpdateToken).toHaveBeenCalledWith({
      inventory: [
        expect.objectContaining({ name: 'Poción' }),
        expect.objectContaining({ name: 'Espada' }),
      ],
    });
  });

  test('removes enemy equipment without applying player loadout rules', () => {
    const onUpdateToken = jest.fn();
    const mandoble = { id: 'mandoble', name: 'Mandoble', type: 'weapon', isEquipped: true };
    const carga = { id: 'carga', name: 'Carga', type: 'ability', isPrepared: true };

    render(
      <CanvasEquipmentSection
        token={{
          profileType: 'rogueliteEnemy',
          inventory: [mandoble, carga],
          equippedItems: [mandoble],
          enemyAbilities: [carga],
        }}
        onUpdateToken={onUpdateToken}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Mandoble' }));

    expect(onUpdateToken).toHaveBeenCalledWith({
      inventory: [carga],
      equippedItems: [],
      enemyAbilities: [carga],
    });
  });

  test('presents enemy abilities without the prepared qualifier', () => {
    render(
      <CanvasEquipmentSection
        token={{
          profileType: 'rogueliteEnemy',
          inventory: [{ id: 'carga', name: 'Carga', type: 'ability', isPrepared: true }],
          enemyAbilities: [{ id: 'carga', name: 'Carga', type: 'ability', isPrepared: true }],
        }}
      />,
    );

    expect(screen.getByText('Habilidad')).toBeInTheDocument();
    expect(screen.queryByText('Habilidad · Preparada')).not.toBeInTheDocument();
  });

  test('displays visual drop indicator and updates feedback when dragging an item over another slot', () => {
    const onUpdateToken = jest.fn();
    render(
      <CanvasEquipmentSection
        token={{
          id: 'hero',
          profileType: 'rogueliteClass',
          inventory: [
            { name: 'Espada', templateId: 'weapon:sword', type: 'weapon' },
            { name: 'Poción', templateId: 'object:potion', type: 'object' },
          ],
        }}
        onUpdateToken={onUpdateToken}
      />,
    );

    const moveButton = screen.getByRole('button', { name: 'Mover Espada' });
    fireEvent.pointerDown(moveButton, { clientX: 10, clientY: 10, button: 0, pointerId: 1 });

    document.elementFromPoint = jest.fn(() => document.querySelectorAll('[data-canvas-inventory-index]')[1]);

    fireEvent.pointerMove(window, { clientX: 10, clientY: 80 });

    expect(document.elementFromPoint).toHaveBeenCalled();
    expect(screen.getByTestId('canvas-inventory-drag-preview')).toBeInTheDocument();

    const cards = screen.getAllByTestId('inventory-item-card');
    expect(cards[0]).toHaveClass('is-dragging');
    expect(cards[1]).toHaveClass('is-drop-target');

    fireEvent.pointerUp(window, { clientX: 10, clientY: 80 });

    expect(onUpdateToken).toHaveBeenCalledWith({
      inventory: [
        expect.objectContaining({ name: 'Poción' }),
        expect.objectContaining({ name: 'Espada' }),
      ],
    });
  });
});
