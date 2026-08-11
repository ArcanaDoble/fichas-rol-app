import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import LoadoutView from '../LoadoutView';

jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));
jest.mock('../../hooks/useCustomEquipmentImages', () => ({
  useCustomEquipmentImages: () => new Map(),
  getCustomImage: () => null,
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...parts) => ({ path: parts.filter((part) => typeof part === 'string').join('/') })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  onSnapshot: jest.fn((reference, onNext) => {
    onNext({ forEach: () => {} });
    return jest.fn();
  }),
}));

beforeEach(() => {
  require('firebase/firestore').getDocs.mockReturnValue(new Promise(() => {}));
});

const equipment = {
  weapons: [{
    templateId: 'great-axe',
    name: 'Gran hacha',
    category: 'Marcial',
    itemType: 'weapon',
    damage: '1d10 Físico',
    range: 'Toque',
    consumption: '🟡🟡',
    traits: 'Marcial, Dos manos',
    handsRequired: 2,
    description: 'Un arma pesada para abrir la primera línea.',
  }],
  armor: [{
    templateId: 'leather-armor',
    name: 'Armadura de cuero',
    category: 'Ligera',
    itemType: 'armor',
    defense: '2',
    consumption: '🔷🔷🔷🔷🔷🔷',
    traits: 'Ligera',
    description: 'Protección flexible.',
  }],
  abilities: [],
  objects: [],
  accessories: [],
};

const createClass = (overrides = {}) => ({
  id: 'barbarian',
  equipment,
  equippedItems: { mainHand: null, offHand: null, body: null },
  summary: {
    proficiencies: {
      weapons: { simple: false, martial: true, special: false },
      armor: { light: true, medium: false, heavy: false },
    },
  },
  talents: {},
  ...overrides,
});

const renderInventory = (props = {}) => {
  render(
    <LoadoutView
      dndClass={createClass()}
      equipmentCatalog={{ weapons: [], armor: [], abilities: [] }}
      glossary={[]}
      rarityColorMap={{}}
      {...props}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));
};

test('the roguelite player can only search and filter the master pool', () => {
  renderInventory({
    rogueliteRole: 'player',
    equipmentCatalog: {
      weapons: [{ name: 'Arma prohibida del catálogo', payload: { name: 'Arma prohibida del catálogo' } }],
      armor: [],
      abilities: [],
    },
    onAddEquipment: jest.fn(),
    onRemoveEquipment: jest.fn(),
  });

  expect(screen.getByText('FILTRAR INVENTARIO')).toBeInTheDocument();
  expect(screen.queryByText('AGREGAR AL INVENTARIO')).not.toBeInTheDocument();
  expect(screen.queryByText('Arma prohibida del catálogo')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Agregar' })).not.toBeInTheDocument();
  expect(screen.queryByTitle('Eliminar')).not.toBeInTheDocument();

  const cards = screen.getAllByTestId('inventory-item-card');
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByText('Gran hacha')).toBeInTheDocument();
  expect(within(cards[0]).getByText('Dos manos')).toBeInTheDocument();
  expect(within(cards[0]).getByLabelText('Coste: 2 dados de acción')).toBeInTheDocument();
  const armorCard = cards.find((card) => within(card).queryByText('Armadura de cuero'));
  expect(within(armorCard).queryByLabelText(/Coste:/)).not.toBeInTheDocument();
  expect(within(armorCard).queryByText('🔷🔷🔷🔷🔷🔷')).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar en tu inventario' }), {
    target: { value: 'cuero' },
  });
  expect(screen.queryByText('Gran hacha')).not.toBeInTheDocument();
  expect(screen.getByText('Armadura de cuero')).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar en tu inventario' }), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Armas' }));
  expect(screen.getByText('Gran hacha')).toBeInTheDocument();
  expect(screen.queryByText('Armadura de cuero')).not.toBeInTheDocument();
});

test('the master keeps the existing catalog add controls', () => {
  const onAddEquipment = jest.fn();
  renderInventory({
    rogueliteRole: 'master',
    equipmentCatalog: {
      weapons: [{
        name: 'Espada corta',
        category: 'Arma simple',
        payload: { id: 'short-sword', name: 'Espada corta' },
      }],
      armor: [],
      abilities: [],
    },
    onAddEquipment,
  });

  expect(screen.getByText('AGREGAR AL INVENTARIO')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar en catálogo' }), {
    target: { value: 'espada' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

  expect(onAddEquipment).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'short-sword', name: 'Espada corta' }),
    'weapons',
  );
  expect(screen.getAllByTitle('Eliminar')).toHaveLength(2);
});

test('the inventory card integrates the item image and configured rarity color', () => {
  renderInventory({
    rogueliteRole: 'player',
    dndClass: createClass({
      equipment: {
        ...equipment,
        weapons: [{
          ...equipment.weapons[0],
          icon: 'data:image/webp;base64,AA==',
          rareza: 'Reliquia',
        }],
      },
    }),
    rarityColorMap: { Reliquia: '#c45f91' },
  });

  const card = screen.getAllByTestId('inventory-item-card')[0];
  expect(card.style.getPropertyValue('--noma-item-accent')).toBe('#c45f91');
  expect(within(card).getByText('Reliquia')).toBeInTheDocument();
  expect(card.querySelector('.noma-inventory-card__art')).toHaveAttribute(
    'src',
    'data:image/webp;base64,AA==',
  );
});

test('an item without class proficiency stays visible but cannot be equipped', () => {
  const onUpdateEquipped = jest.fn();
  render(
    <LoadoutView
      dndClass={createClass({
        summary: {
          proficiencies: {
            weapons: { simple: false, martial: false, special: false },
            armor: { light: false, medium: false, heavy: false },
          },
        },
      })}
      equipmentCatalog={{ weapons: [], armor: [], abilities: [] }}
      glossary={[]}
      rarityColorMap={{}}
      rogueliteRole="player"
      onUpdateEquipped={onUpdateEquipped}
    />,
  );

  fireEvent.click(screen.getByText('Mano Hábil'));
  const unavailableWeapon = screen.getByRole('button', { name: /Gran hacha/i });

  expect(unavailableWeapon).toBeDisabled();
  expect(within(unavailableWeapon).getByText('Sin competencia en armas Marciales')).toBeInTheDocument();
  expect(within(unavailableWeapon).getByText('No equipable')).toBeInTheDocument();

  fireEvent.click(unavailableWeapon);
  expect(onUpdateEquipped).not.toHaveBeenCalled();

  fireEvent.click(screen.getByText('Armadura', { selector: 'span' }));
  const unavailableArmor = screen.getByRole('button', { name: /Armadura de cuero/i });

  expect(unavailableArmor).toBeDisabled();
  expect(within(unavailableArmor).getByText('Sin competencia en armadura Ligera')).toBeInTheDocument();
  expect(within(unavailableArmor).getByText('No equipable')).toBeInTheDocument();

  fireEvent.click(unavailableArmor);
  expect(onUpdateEquipped).not.toHaveBeenCalled();
});

test('a two-handed weapon visually occupies and blocks the opposite hand', () => {
  const onUpdateEquipped = jest.fn();
  const greatAxe = equipment.weapons[0];

  render(
    <LoadoutView
      dndClass={createClass({
        equippedItems: { mainHand: greatAxe, offHand: null, body: null },
      })}
      equipmentCatalog={{ weapons: [], armor: [], abilities: [] }}
      glossary={[]}
      rarityColorMap={{}}
      rogueliteRole="player"
      onUpdateEquipped={onUpdateEquipped}
    />,
  );

  expect(screen.getByText('2 manos')).toBeInTheDocument();
  const occupiedSlot = screen.getByRole('status', {
    name: 'Mano Torpe ocupada por Gran hacha',
  });
  expect(within(occupiedSlot).getByText('Arma a dos manos')).toBeInTheDocument();
  expect(within(occupiedSlot).getByText('Ocupada por Gran hacha')).toBeInTheDocument();

  fireEvent.click(occupiedSlot);
  expect(onUpdateEquipped).not.toHaveBeenCalled();
  expect(screen.queryByText('Seleccionar arma del inventario')).not.toBeInTheDocument();
});
