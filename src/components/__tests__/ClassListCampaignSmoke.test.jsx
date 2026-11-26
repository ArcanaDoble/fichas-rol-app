import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ClassList from '../ClassList';
import { FreeParryProvider } from '../../features/parry-free/FreeParryProvider';
import { applyRoomCommand } from '../../features/parry-free/freeParryRoom';

jest.mock('../../firebase', () => ({ db: {}, storage: {} }));
jest.mock('../../utils/storage', () => ({ uploadDataUrl: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  where: jest.fn(),
  writeBatch: jest.fn(),
}));

const yerma = {
  id: 'char-1768079340468-356',
  owner: 'Yerma',
  name: 'Yerma',
  image: '',
  description: 'Personaje existente',
  stats: { vida: { current: 4, max: 4 } },
  attributes: { destreza: 'd8' },
  actionData: { reaction: [{ id: 'astuta', name: 'Astuta', desc: 'Texto existente', isActive: true }] },
  talents: { slots: [{ id: 'astuta', name: 'Astuta', desc: 'Texto existente' }, null, null] },
  equipment: { weapons: [{ name: 'Yermo', itemType: 'weapon' }], armor: [], abilities: [], objects: [], accessories: [] },
  equippedItems: { mainHand: { name: 'Yermo', itemType: 'weapon' }, offHand: null, body: { name: 'Gabardina de cuero', itemType: 'armor', defense: 1, image: '/gabardina-del-objeto.webp' } },
};

function sheetParryService() {
  let room = null;
  const listeners = new Set();
  return {
    listenRoom:next => { listeners.add(next); next(room); return () => listeners.delete(next); },
    roomCommand:async (id, event) => {
      room = await applyRoomCommand(room, id, event);
      listeners.forEach(next => next(room));
      return room;
    },
  };
}

test('replaces the campaign speed tag with a single Parry access for the current character', async () => {
  const firestore = require('firebase/firestore');
  const character = { ...yerma, tags:['Velocidad', 'Minimapa', 'Tablero', 'Parry'] };
  const reference = (...args) => ({ path:args.filter(entry => typeof entry === 'string').join('/') });
  window.matchMedia = jest.fn().mockReturnValue({ matches:false, addEventListener:jest.fn(), removeEventListener:jest.fn() });
  firestore.collection.mockImplementation(reference);
  firestore.doc.mockImplementation(reference);
  firestore.query.mockImplementation(value => value);
  firestore.where.mockReturnValue({});
  firestore.getDocs.mockResolvedValue({ empty:false, docs:[{ id:character.id, data:() => character }] });
  firestore.getDoc.mockResolvedValue({ exists:() => false });
  firestore.onSnapshot.mockImplementation((ref, onNext) => {
    onNext({ docs:[], empty:true, forEach:() => {} });
    return jest.fn();
  });

  render(<FreeParryProvider initialConfig={{ viewer:{ controllerId:'player:Yerma', controller:'Jugador', name:'Yerma' }, players:['Yerma'] }}
    service={sheetParryService()}>
    <ClassList collectionPath="characters" ownerFilter="Yerma" currentUserId="Yerma" isPlayerMode
      initialCharacterName="Yerma" rarityColorMap={{}} onBack={jest.fn()} />
  </FreeParryProvider>);

  const entry = await screen.findByRole('button', { name:'Abrir Parry libre con Yerma' });
  expect(screen.getAllByRole('button', { name:/Abrir Parry libre con Yerma/ })).toHaveLength(1);
  expect(entry).toHaveTextContent(/^Parry$/);
  expect(screen.queryByRole('button', { name:/velocidad/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name:/minimapa/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name:/tablero/i })).toBeInTheDocument();
  await act(async () => fireEvent.click(entry));
  expect(await screen.findByRole('textbox', { name:'Tu personaje' })).toHaveValue('Yerma');
});

test('loads a campaign sheet without converting old stats and saves new values and talents separately', async () => {
  const firestore = require('firebase/firestore');
  const writes = [];
  const launchCanvas = jest.fn();
  let updateEquipmentImages;
  const reference = (...args) => ({ path: args.filter((entry) => typeof entry === 'string').join('/') });
  window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  firestore.collection.mockImplementation(reference);
  firestore.doc.mockImplementation(reference);
  firestore.query.mockImplementation((value) => value);
  firestore.where.mockReturnValue({});
  firestore.getDocs.mockResolvedValue({
    empty: false,
    docs: [{ id: yerma.id, data: () => yerma }],
  });
  firestore.getDoc.mockResolvedValue({ exists: () => false });
  firestore.onSnapshot.mockImplementation((ref, onNext) => {
    if (ref.path === 'equipment_images') updateEquipmentImages = onNext;
    onNext({ docs: [], empty: true, forEach: () => {} });
    return jest.fn();
  });
  firestore.writeBatch.mockImplementation(() => ({
    set: (ref, value) => writes.push({ path: ref.path, value }),
    commit: jest.fn().mockResolvedValue(undefined),
  }));

  render(
    <FreeParryProvider initialConfig={{ viewer:{ controllerId:'player:Yerma', controller:'Jugador', name:'Yerma' }, players:['Yerma'] }}
      service={sheetParryService()}>
    <ClassList
      collectionPath="characters"
      ownerFilter="Yerma"
      currentUserId="Yerma"
      isPlayerMode
      initialCharacterName="Yerma"
      armas={[{ id: 'great-axe', name: 'Hacha de prueba', handsRequired: 2, category: 'Marcial', damage: '1d10', image: '/axe.jpg' }]}
      armaduras={[]}
      habilidades={[{ id: 'skill-test', name: 'Habilidad de prueba', description: 'Texto de la habilidad' }]}
      glossary={[]}
      rarityColorMap={{}}
      onBack={jest.fn()}
      onLaunchCanvas={launchCanvas}
    />
    </FreeParryProvider>,
  );

  expect(await screen.findByRole('button', { name: 'Editar Retrato' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name:'Abrir Parry libre con Yerma' }));
  expect(await screen.findByRole('textbox', { name:'Tu personaje' })).toHaveValue('Yerma');
  fireEvent.click(screen.getByRole('button', { name:'Cerrar Parry libre' }));
  expect(screen.getByRole('button', { name: 'Jugar Aventura' })).toBeInTheDocument();
  expect(screen.getByText('DADOS DE ACCIÓN')).toBeInTheDocument();
  const campaignDice = screen.getByTestId('campaign-action-dice');
  expect(campaignDice).toHaveClass('grid-cols-3');
  expect(campaignDice.children).toHaveLength(3);
  expect(within(campaignDice).queryByText(/Movilidad/i)).not.toBeInTheDocument();
  const campaignStats = screen.getByText('ESTADÍSTICAS').parentElement.parentElement;
  expect(within(campaignStats).getByText(/Movilidad/i)).toBeInTheDocument();
  expect(campaignStats.querySelector('.lucide-brain')).toBeInTheDocument();
  expect(within(campaignStats).getByText('Gabardina de cuero')).toBeInTheDocument();
  expect(screen.getByTestId('campaign-armor-art')).toHaveAttribute('src', '/gabardina-del-objeto.webp');
  const publishArmorImage = (imageUrl) => act(() => updateEquipmentImages({
    forEach: (callback) => callback({
      id: 'gabardina_de_cuero',
      data: () => ({ itemName: 'Gabardina de cuero', imageUrl }),
    }),
  }));
  publishArmorImage('/gabardina-configurada.webp');
  expect(screen.getByTestId('campaign-armor-art')).toHaveAttribute('src', '/gabardina-configurada.webp');
  publishArmorImage('/gabardina-actualizada.webp');
  expect(screen.getByTestId('campaign-armor-art')).toHaveAttribute('src', '/gabardina-actualizada.webp');
  expect(screen.getByRole('textbox', { name: 'Armadura RD' })).toBeInTheDocument();
  expect(screen.getByText('RELIQUIAS')).toBeInTheDocument();
  expect(screen.queryByText(/ver ficha anterior/i)).not.toBeInTheDocument();
  expect(screen.queryByText('ATRIBUTOS')).not.toBeInTheDocument();
  expect(screen.queryByText('POSTURA')).not.toBeInTheDocument();
  expect(screen.queryByText('INGENIO')).not.toBeInTheDocument();
  expect(screen.queryByText('CORDURA')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Editar estadísticas' }));
  const vidaActual = screen.getByRole('textbox', { name: 'Vida actual' });
  const vidaMaximo = screen.getByRole('textbox', { name: 'Vida máximo' });
  const menteActual = screen.getByRole('textbox', { name: 'Mente actual' });
  const menteMaximo = screen.getByRole('textbox', { name: 'Mente máximo' });
  const movilidad = screen.getByRole('textbox', { name: 'Movilidad' });
  const armaduraRd = screen.getByRole('textbox', { name: 'Armadura RD' });
  expect(within(campaignStats).queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(campaignStats.querySelector('input[type="number"]')).not.toBeInTheDocument();
  [vidaActual, vidaMaximo, menteActual, menteMaximo, movilidad, armaduraRd].forEach((input) => {
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });
  expect(vidaActual).toHaveValue('');
  expect(menteActual).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Reducir Vida actual' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Aumentar Vida máximo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aumentar Mente máximo' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aumentar Movilidad' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aumentar Armadura RD' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Dado de acción 1: Sin definir' }));
  fireEvent.click(screen.getByRole('button', { name: 'd8' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Vida actual' }));
  expect(vidaActual).toHaveValue('1');
  fireEvent.click(screen.getByRole('button', { name: 'Reducir Vida actual' }));
  expect(vidaActual).toHaveValue('0');
  expect(screen.getByRole('button', { name: 'Reducir Vida actual' })).toBeDisabled();
  fireEvent.change(vidaActual, { target: { value: '53' } });
  fireEvent.change(vidaMaximo, { target: { value: '60' } });
  const vidaBar = screen.getByRole('progressbar', { name: 'Vida' });
  expect(vidaBar).toHaveAttribute('aria-valuenow', '53');
  expect(vidaBar).toHaveAttribute('aria-valuemax', '60');
  expect(vidaBar.querySelectorAll('button')).toHaveLength(0);
  expect(parseFloat(screen.getByTestId('campaign-resource-fill-vida').style.width)).toBeCloseTo((53 / 60) * 100, 3);
  fireEvent.change(menteActual, { target: { value: '8' } });
  fireEvent.change(menteMaximo, { target: { value: '12' } });
  fireEvent.change(movilidad, { target: { value: '100000' } });
  const groupedMovement = screen.getByRole('img', { name: 'Movilidad: 100000 casillas' });
  expect(groupedMovement.querySelectorAll('.campaign-stat-unit')).toHaveLength(12);
  expect(within(groupedMovement).getByText('+99988')).toBeInTheDocument();
  fireEvent.change(movilidad, { target: { value: '2' } });
  expect(movilidad).toHaveValue('2');
  expect(screen.getByRole('img', { name: 'Movilidad: 2 casillas' }).querySelectorAll('.campaign-stat-unit')).toHaveLength(2);
  fireEvent.change(armaduraRd, { target: { value: '0' } });
  expect(armaduraRd).toHaveValue('0');
  expect(campaignStats.querySelector('.campaign-stat-units--armor')).not.toBeInTheDocument();
  fireEvent.change(armaduraRd, { target: { value: '3' } });
  expect(armaduraRd).toHaveValue('3');
  fireEvent.click(document.getElementById('save-btn-sidebar'));

  await waitFor(() => {
    expect(writes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: `campaignCharacterSheets/${yerma.id}`,
        value: expect.objectContaining({
          vida: { current: 53, max: 60 },
          mente: { current: 8, max: 12 },
          movilidad: 2,
          armaduraRd: 3,
          actionDice: ['d8', null, null],
          sourceCharacterId: yerma.id,
          owner: 'Yerma',
        }),
      }),
    ]));
  });
  expect(writes.find((entry) => entry.path === `characters/${yerma.id}`)).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Jugar Aventura' }));
  await waitFor(() => expect(launchCanvas).toHaveBeenCalledWith('Yerma', expect.objectContaining({
    id: yerma.id,
    profileType: 'campaignCharacter',
    campaignSheet: expect.objectContaining({ vida: { current: 53, max: 60 }, actionDice: ['d8', null, null] }),
  })));

  fireEvent.click(screen.getByText('RELIQUIAS').closest('button'));
  expect(screen.getByRole('heading', { name: 'GUÍA DE ACCIONES & TALENTOS' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByDisplayValue('Astuta'), { target: { value: 'Astuta revisada' } });
  fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
  fireEvent.click(document.getElementById('save-btn-sidebar'));

  await waitFor(() => {
    const savedCharacter = writes.filter((entry) => entry.path === `characters/${yerma.id}`).at(-1)?.value;
    expect(savedCharacter?.actionData?.reaction?.[0]?.name).toBe('Astuta revisada');
    expect(savedCharacter?.talents?.slots?.[0]?.name).toBe('Astuta revisada');
    expect(savedCharacter?.equipment?.weapons?.[0]?.name).toBe('Yermo');
  });

  fireEvent.click(screen.getByText('MAZO INICIAL').closest('button'));
  const sidebar = screen.getByTestId('talents-sidebar');
  expect(within(sidebar).getByRole('textbox', { name: 'Nombre de la clave' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Reducción de daño: 1' })).toBeInTheDocument();
  expect(screen.queryByText(/cada .* de Presión/)).not.toBeInTheDocument();
  expect(screen.queryByText('Resistencia Máxima (Vida)')).not.toBeInTheDocument();
  fireEvent.change(within(sidebar).getByRole('textbox', { name: 'Nombre de la clave' }), { target: { value: 'Clave de Yerma' } });
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Añadir talento al personaje' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del talento' }), { target: { value: 'Talento personal' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Descripción del talento' }), { target: { value: 'Creado por la jugadora' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar editor de talento' }));
  expect(within(sidebar).queryByText('Catálogo de talentos')).not.toBeInTheDocument();
  expect(within(sidebar).getAllByText('Talentos equipados')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Activar talento Talento personal' }));
  expect(screen.getByRole('button', { name: 'Desactivar talento Talento personal', pressed: false })).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: 'Inventario' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar en catálogo' }), { target: { value: 'Hacha' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
  expect(screen.getAllByTestId('inventory-item-card')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Habilidades' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar en catálogo' }), { target: { value: 'Habilidad de prueba' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Seleccionar habilidad para ranura 1' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Habilidad de prueba/ }));

  fireEvent.click(screen.getByRole('button', { name: 'Equipables' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar a conjunto II' }));
  fireEvent.click(screen.getByText('Mano Hábil'));
  const weaponSelector = screen.getByText('Seleccionar arma del inventario').parentElement.parentElement;
  expect(within(weaponSelector).getByRole('button', { name: /Yermo/ })).toBeDisabled();
  // Campaign players can equip catalog weapons without a master proficiency gate.
  fireEvent.click(within(weaponSelector).getByRole('button', { name: /Hacha de prueba/ }));
  expect(screen.getByRole('status', { name: 'Mano Torpe ocupada por Hacha de prueba' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar a conjunto I' }));
  expect(screen.getByRole('button', { name: 'Desequipar Yermo' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar a conjunto II' }));
  fireEvent.click(document.getElementById('save-btn-sidebar'));
  await waitFor(() => {
    const saved = writes.filter((entry) => entry.path === `characters/${yerma.id}`).at(-1)?.value;
    expect(saved?.equippedItems?.activeWeaponSet).toBe(1);
    expect(saved?.equippedItems?.mainHand?.name).toBe('Hacha de prueba');
    expect(saved?.equippedItems?.offHand).toBeNull();
    expect(saved?.equippedItems?.weaponSets?.[0]?.mainHand?.name).toBe('Yermo');
    expect(saved?.equippedItems?.body?.name).toBe('Gabardina de cuero');
    expect(saved?.equippedItems?.body?.defense).toBe(1);
    expect(saved?.equipment?.weapons?.[1]?.image).toBe('/axe.jpg');
    expect(saved?.talents?.title).toBe('Clave de Yerma');
    expect(saved?.talents?.slots?.[0]?.name).toBe('Astuta revisada');
    expect(saved?.talents?.slots?.[1]?.desc).toBe('Creado por la jugadora');
    expect(saved?.equippedSkillIds?.[0]).toBe('skill-test');
    expect(saved?.roguelite).toBeUndefined();
    expect(saved?.talentCatalog).toBeUndefined();
    expect(saved?.owner).toBe('Yerma');
  });
  expect(writes.every((entry) => entry.path === `characters/${yerma.id}` || entry.path === `campaignCharacterSheets/${yerma.id}`)).toBe(true);

  fireEvent.click(screen.getByText('RESUMEN').closest('button'));
  fireEvent.click(screen.getByRole('button', { name: 'Editar Retrato' }));
  expect(screen.getByRole('button', { name: 'Portada' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Avatar' })).toBeInTheDocument();
}, 20000);
