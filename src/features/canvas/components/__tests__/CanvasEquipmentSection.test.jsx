import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CanvasEquipmentSection from '../CanvasEquipmentSection';

jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => ({}),
}));

jest.mock('../../../tactical-shared/components/TacticalAssetImage', () => ({
  getObjectImage: () => null,
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

    expect(screen.getByText('Inventario de aventura')).toBeInTheDocument();
    expect(screen.getByText('1 equipados · 2 objetos')).toBeInTheDocument();
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
});
