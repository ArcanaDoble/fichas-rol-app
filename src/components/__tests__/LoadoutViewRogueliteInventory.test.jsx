import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
  const firestore = require('firebase/firestore');
  firestore.collection.mockImplementation((...parts) => ({
    path: parts.filter((part) => typeof part === 'string').join('/'),
  }));
  firestore.getDocs.mockReturnValue(new Promise(() => {}));
  firestore.onSnapshot.mockImplementation((reference, onNext) => {
    if (['customItems', 'accessories'].includes(reference.path)) {
      firestore.getDocs(reference).then(onNext);
    } else onNext({ forEach: () => {}, docs: [] });
    return jest.fn();
  });
});

const equipment = {
  weapons: [{
    templateId: 'great-axe',
    instanceId: 'great-axe::1',
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
  const result = render(
    <LoadoutView
      dndClass={createClass()}
      equipmentCatalog={{ weapons: [], armor: [], abilities: [] }}
      glossary={[]}
      rarityColorMap={{}}
      {...props}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));
  return result;
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

test('the backpack exposes persistent manual ordering from the card handle', () => {
  const onReorderEquipment = jest.fn();
  renderInventory({
    rogueliteRole: 'player',
    onReorderEquipment,
  });

  fireEvent.keyDown(screen.getByRole('button', { name: 'Mover Gran hacha' }), {
    key: 'ArrowDown',
  });

  expect(onReorderEquipment).toHaveBeenCalledWith([
    expect.objectContaining({ category: 'armor', index: 0 }),
    expect.objectContaining({ category: 'weapons', index: 0 }),
  ]);
});

test('the backpack restores the persisted manual order', () => {
  renderInventory({
    rogueliteRole: 'player',
    dndClass: createClass({
      equipment: {
        ...equipment,
        weapons: [{ ...equipment.weapons[0], _inventoryOrder: 1 }],
        armor: [{ ...equipment.armor[0], _inventoryOrder: 0 }],
      },
    }),
  });

  const cards = screen.getAllByTestId('inventory-item-card');
  expect(within(cards[0]).getByText('Armadura de cuero')).toBeInTheDocument();
  expect(within(cards[1]).getByText('Gran hacha')).toBeInTheDocument();
});

test('backpack cards use a uniform desktop grid without content-driven row sizing', () => {
  renderInventory({
    rogueliteRole: 'player',
    dndClass: createClass({
      equipment: {
        ...equipment,
        weapons: [{
          ...equipment.weapons[0],
          description: 'Una descripción deliberadamente larga. '.repeat(12),
        }],
      },
    }),
  });

  const grid = screen.getByTestId('class-inventory-grid');
  expect(grid).toHaveClass('noma-class-inventory-grid');
  expect(grid).not.toHaveClass('auto-rows-fr');
  screen.getAllByTestId('inventory-item-card').forEach((card) => {
    expect(card.parentElement).toHaveClass('noma-class-inventory-entry');
    expect(card.parentElement).not.toHaveClass('self-start');
  });
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

test('an existing inventory copy recovers its lore from the current object catalog', async () => {
  require('firebase/firestore').getDocs.mockImplementation((reference) => Promise.resolve({
    docs: reference.path === 'customItems' ? [{
      data: () => ({
        id: 'healing-potion',
        name: 'Poción de curación',
        lore: 'Un tónico oscuro preparado con médula animal.',
      }),
    }] : [],
  }));

  renderInventory({
    rogueliteRole: 'master',
    dndClass: createClass({
      equipment: {
        weapons: [],
        armor: [],
        abilities: [],
        accessories: [],
        objects: [{
          templateId: 'healing-potion',
          name: 'Poción de curación',
          itemType: 'object',
          description: 'Recupera 1d4 de salud.',
        }],
      },
    }),
  });

  const lore = await screen.findByText('Un tónico oscuro preparado con médula animal.');
  const card = lore.closest('[data-testid="inventory-item-card"]');
  expect(within(card).getByText('Efecto')).toBeInTheDocument();
  expect(within(card).getByText('Lore')).toBeInTheDocument();
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

test('a two-handed weapon keeps both slots visible and blocks the supporting hand', () => {
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

  const occupiedSlot = screen.getByRole('status', {
    name: 'Mano Torpe ocupada por Gran hacha',
  });
  expect(within(occupiedSlot).getByText('A dos manos')).toBeInTheDocument();
  expect(within(occupiedSlot).getByText('Gran hacha')).toBeInTheDocument();
  expect(screen.getByText('OCUPADA')).toBeInTheDocument();
  expect(screen.getByTestId('two-handed-connector')).toHaveAttribute('data-connector-direction', 'right');
  expect(screen.getByRole('button', { name: 'Desequipar Gran hacha' }))
    .toHaveClass('noma-loadout-slot-remove');
  expect(document.querySelectorAll('.noma-loadout-hand-slot')).toHaveLength(2);

  fireEvent.click(occupiedSlot);
  expect(onUpdateEquipped).not.toHaveBeenCalled();
  expect(screen.queryByText('Seleccionar arma del inventario')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));
  const greatAxeCard = screen.getAllByTestId('inventory-item-card')
    .find((card) => within(card).queryByText('Gran hacha'));
  const bothHands = within(greatAxeCard).getByRole('img', {
    name: 'Conjunto I: equipada a dos manos',
  });
  expect(bothHands.querySelectorAll('.is-active')).toHaveLength(2);
});

test('unequipping a two-handed weapon in the off hand releases the visible supporting slot', () => {
  const greatAxe = equipment.weapons[0];
  const onUpdateEquipped = jest.fn();
  function Fixture() {
    const [items, setItems] = React.useState({ mainHand: null, offHand: greatAxe, body: null });
    return <LoadoutView
      dndClass={createClass({ equippedItems: items })}
      equipmentCatalog={{ weapons: [], armor: [], abilities: [] }}
      glossary={[]}
      rarityColorMap={{}}
      rogueliteRole="player"
      onUpdateEquipped={(slot, item, options) => {
        onUpdateEquipped(slot, item, options);
        setItems((previous) => ({ ...previous, [slot]: item }));
      }}
    />;
  }
  render(<Fixture />);

  expect(screen.getByRole('status', {
    name: 'Mano Hábil ocupada por Gran hacha',
  })).toBeInTheDocument();
  expect(document.querySelectorAll('.noma-loadout-hand-slot')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Desequipar Gran hacha' }));
  expect(onUpdateEquipped).toHaveBeenCalledWith('offHand', null, { weaponSetIndex: 0 });
  expect(screen.queryByText('A dos manos')).not.toBeInTheDocument();
  expect(screen.getByText('Mano Torpe')).toBeInTheDocument();
  expect(screen.getByText('Mano Hábil')).toBeInTheDocument();
  expect(document.querySelectorAll('.noma-loadout-hand-slot')).toHaveLength(2);

});

test('equipped armor explains its passive CD threshold and exposes up to three glossary traits', () => {
  const paddedArmor = {
    templateId: 'armor:padded',
    instanceId: 'armor:padded::1',
    name: 'Armadura acolchada',
    category: 'Ligera',
    itemType: 'armor',
    defenseClass: '6',
    traits: 'Conmocionante, Crítico, Empuje, Oculto',
  };

  render(
    <LoadoutView
      dndClass={createClass({
        equipment: {
          weapons: [],
          armor: [paddedArmor],
          abilities: [],
          objects: [],
          accessories: [],
        },
        equippedItems: { mainHand: null, offHand: null, body: paddedArmor },
      })}
      equipmentCatalog={{ weapons: [], armor: [], abilities: [] }}
      glossary={[
        { word: 'Conmocionante', info: 'Neutraliza Conmoción.', color: '#e3bf65' },
        { word: 'Crítico', info: 'Neutraliza Crítico.', color: '#e96a62' },
        { word: 'Empuje', info: 'Neutraliza Empuje.', color: '#72b7df' },
      ]}
      rarityColorMap={{}}
      rogueliteRole="player"
      onUpdateEquipped={jest.fn()}
    />,
  );

  expect(screen.getByRole('img', {
    name: 'CD 6: pierdes un bloque de Vida por cada 6 de Presión',
  })).toBeInTheDocument();
  expect(screen.getByText('Defensa pasiva')).toBeInTheDocument();
  expect(screen.getByText('1 bloque')).toBeInTheDocument();
  expect(screen.getByText('cada 6 de Presión')).toBeInTheDocument();
  const concussionTrait = screen.getByText('Conmocionante');
  expect(concussionTrait).toHaveAttribute('data-tooltip-content', 'Neutraliza Conmoción.');
  expect(concussionTrait).toHaveStyle({ color: '#e3bf65' });
  expect(screen.getByText('Crítico')).toHaveAttribute('data-tooltip-content', 'Neutraliza Crítico.');
  expect(screen.getByText('Empuje')).toHaveAttribute('data-tooltip-content', 'Neutraliza Empuje.');
  expect(screen.queryByText('Oculto')).not.toBeInTheDocument();
  expect(screen.queryByText('Neutraliza')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Desequipar Armadura acolchada' }))
    .toHaveClass('noma-loadout-slot-remove');

  fireEvent.click(screen.getByText('Armadura acolchada'));
  const armorSelector = screen.getByText('Seleccionar armadura del inventario')
    .parentElement.parentElement;
  expect(within(armorSelector).getByText('CD 6')).toBeInTheDocument();
  expect(within(armorSelector).queryByText('Defensa: 6')).not.toBeInTheDocument();
});

test('two owned daggers are separate copies and expose their exact hand usage', () => {
  const onUpdateEquipped = jest.fn();
  const daggerOne = {
    templateId: 'weapon:dagger',
    instanceId: 'weapon:dagger::1',
    name: 'Daga',
    category: 'Simple',
    itemType: 'weapon',
    handsRequired: 1,
  };
  const daggerTwo = {
    ...daggerOne,
    instanceId: 'weapon:dagger::2',
  };

  render(
    <LoadoutView
      dndClass={createClass({
        equipment: {
          weapons: [daggerOne, daggerTwo],
          armor: [],
          abilities: [],
          objects: [],
          accessories: [],
        },
        equippedItems: {
          weaponSets: [
            { mainHand: daggerOne, offHand: null },
            { mainHand: null, offHand: null },
          ],
          activeWeaponSet: 0,
        },
        summary: {
          proficiencies: {
            weapons: { simple: true, martial: false, special: false },
            armor: { light: true, medium: false, heavy: false },
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

  fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));
  const daggerCards = screen.getAllByTestId('inventory-item-card');
  const inventoryHands = within(daggerCards[0]).getByRole('img', {
    name: 'Conjunto I: equipada en mano hábil',
  });
  const equippedCopyIndicator = within(daggerCards[0]).getByRole('img', {
    name: '2 copias físicas',
  });
  expect(equippedCopyIndicator).toHaveClass('noma-equipment-copy');
  expect(equippedCopyIndicator.closest('.noma-inventory-card__equipment-state')).not.toBeNull();
  expect(equippedCopyIndicator.closest('.noma-inventory-card__actions')).toBeNull();
  expect(inventoryHands.closest('.noma-inventory-card__equipment-state')).not.toBeNull();
  expect(inventoryHands.querySelector('.is-right')).toHaveClass('is-active');
  expect(inventoryHands.querySelector('.is-left')).not.toHaveClass('is-active');
  const freeCopyIndicator = within(daggerCards[1]).getByRole('img', {
    name: '2 copias físicas',
  });
  expect(freeCopyIndicator).toHaveClass('noma-equipment-copy');
  expect(freeCopyIndicator.closest('.noma-inventory-card__equipment-state')).not.toBeNull();
  expect(within(daggerCards[1]).queryByRole('img', {
    name: /equipada|libre/i,
  })).not.toBeInTheDocument();
  expect(within(daggerCards[1]).queryByText(/Copia \d+ de \d+|Libre/i)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Equipables' }));
  fireEvent.click(screen.getByText('Mano Torpe'));
  const selector = screen.getByText('Seleccionar arma del inventario').parentElement.parentElement;
  const daggerOptions = within(selector).getAllByRole('button', { name: /Daga/i });
  expect(daggerOptions[0]).toBeDisabled();
  expect(daggerOptions[1]).toBeEnabled();
  expect(within(daggerOptions[0]).getByRole('img', {
    name: 'Conjunto I: equipada en mano hábil',
  }).querySelector('.is-right')).toHaveClass('is-active');
  expect(within(daggerOptions[1]).getByRole('img', {
    name: 'Libre: ninguna mano ocupada',
  }).querySelector('.is-active')).toBeNull();

  fireEvent.click(daggerOptions[1]);
  expect(onUpdateEquipped).toHaveBeenCalledWith(
    'offHand',
    expect.objectContaining({ instanceId: 'weapon:dagger::2', name: 'Daga' }),
    { weaponSetIndex: 0 },
  );
});

test('the same two hand slots edit two independent weapon sets', () => {
  const onUpdateEquipped = jest.fn();
  const secondGreatAxe = {
    ...equipment.weapons[0],
    instanceId: 'great-axe::2',
  };

  render(
    <LoadoutView
      dndClass={createClass({
        equipment: {
          ...equipment,
          weapons: [equipment.weapons[0], secondGreatAxe],
        },
        equippedItems: {
          mainHand: equipment.weapons[0],
          offHand: null,
          body: null,
          activeWeaponSet: 0,
          weaponSets: [
            { mainHand: equipment.weapons[0], offHand: null },
            { mainHand: null, offHand: null },
          ],
        },
      })}
      equipmentCatalog={{ weapons: [], armor: [], abilities: [] }}
      glossary={[]}
      rarityColorMap={{}}
      rogueliteRole="player"
      onUpdateEquipped={onUpdateEquipped}
    />,
  );

  expect(screen.getByText('CONJUNTO I')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Cambiar a conjunto II' }));
  expect(onUpdateEquipped).toHaveBeenCalledWith('activeWeaponSet', 1);
  expect(screen.getByText('CONJUNTO II')).toBeInTheDocument();
  expect(screen.getByText('Mano Hábil')).toBeInTheDocument();
  expect(screen.getByText('Mano Torpe')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Mano Hábil'));
  const selector = screen.getByText('Seleccionar arma del inventario').parentElement.parentElement;
  const axeOptions = within(selector).getAllByRole('button', { name: /Gran hacha/i });
  expect(axeOptions[0]).toBeDisabled();
  expect(axeOptions[1]).toBeEnabled();
  fireEvent.click(axeOptions[1]);
  expect(onUpdateEquipped).toHaveBeenCalledWith(
    'mainHand',
    expect.objectContaining({
      templateId: 'great-axe',
      instanceId: 'great-axe::2',
      name: 'Gran hacha',
    }),
    { weaponSetIndex: 1 },
  );
});


test('role-playing inventory receives new and edited Forge objects live', () => {
  const firestore = require('firebase/firestore');
  const listeners = {};
  firestore.onSnapshot.mockImplementation((ref, callback) => {
    listeners[ref.path] = callback;
    callback({ docs: [], forEach: () => {} });
    return jest.fn();
  });
  const onAddEquipment = jest.fn();
  renderInventory({ rogueliteRole: 'legacy', onAddEquipment });
  fireEvent.click(screen.getByRole('button', { name: 'Objetos' }));
  const send = description => act(() => listeners.customItems({ docs: [{ id: 'new-item', data: () => ({ name: 'Test tonic', description }) }] }));
  send('Original');
  expect(screen.getByText('Test tonic')).toBeInTheDocument();
  send('Updated');
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
  expect(onAddEquipment).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-item', description: 'Updated' }), 'objects');
});
