import React from 'react';
import { render, screen } from '@testing-library/react';
import CanvasCombatActionModal from '../CanvasCombatActionModal';
import { preloadImage } from '../../../../components/LoadingImage';
import { useCustomEquipmentImages } from '../../../../hooks/useCustomEquipmentImages';

jest.mock('../../../../components/LoadingImage', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../components/LoadingImage'),
  preloadImage: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({
  ...jest.requireActual('../../../../hooks/useCustomEquipmentImages'),
  useCustomEquipmentImages: jest.fn(),
}));

const armor = { id: 'armor', name: 'Armadura de cuero', type: 'armor', canvasSlot: 'body' };
const hero = {
  id: 'preload-hero', name: 'Guerrero', profileType: 'rogueliteClass',
  equippedItems: [armor], stats: { vida: { current: 4, max: 4 }, cd: { current: 5, max: 5 } },
};
const enemy = { id: 'preload-enemy', name: 'Duende', profileType: 'rogueliteEnemy', portrait: '/preload-enemy-face.webp' };

beforeEach(() => {
  jest.clearAllMocks();
  useCustomEquipmentImages.mockReturnValue(new Map());
});

test('warms participating protection artwork while the defender has no draft and the modal is closed', () => {
  const equippedHero = { ...hero, equippedItems: [{ ...armor, image: '/preload-explicit-armor.webp' }] };
  const ally = { ...equippedHero, id: 'preload-ally' };
  const equippedEnemy = { ...enemy, img: '/unused-enemy-image.webp', equippedItems: [{ ...armor, image: '/unused-enemy-armor.webp' }] };
  const spectator = { ...hero, id: 'preload-spectator', equippedItems: [{ ...armor, image: '/unused-spectator-armor.webp' }] };
  useCustomEquipmentImages.mockReturnValue(new Map([['armadura_de_cuero', '/unused-custom-armor.webp']]));
  render(<CanvasCombatActionModal activeScenario={{ items: [equippedHero, ally, equippedEnemy, spectator] }} isPlayerView combatRuntime={{
    attackDraft: null, pendingAttack: null,
    combatState: { participants: { [hero.id]: {}, [ally.id]: {}, [enemy.id]: {} } },
    controlledTokenIds: [hero.id],
  }} />);

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(preloadImage).toHaveBeenCalledTimes(2);
  expect(preloadImage).toHaveBeenCalledWith('/preload-explicit-armor.webp');
  expect(preloadImage).toHaveBeenCalledWith('/preload-enemy-face.webp');
});

test('warms a draft target that is not yet present in combat participants', () => {
  const externalTarget = { ...hero, id: 'external-target', equippedItems: [{ ...armor, image: '/external-target-armor.webp' }] };
  render(<CanvasCombatActionModal activeScenario={{ items: [enemy, externalTarget] }} isPlayerView={false} combatRuntime={{
    attackDraft: {
      attackerId: enemy.id, targetId: externalTarget.id, weapon: { id: 'club', name: 'Garrote', dano: '1d8' },
      actionCost: 0, weaponDiceProfile: [{ id: 'weapon-die', die: 'd8', sides: 8 }],
      range: { rangeName: 'cercano', distance: 1 },
    },
    pendingAttack: null, combatState: { participants: { [enemy.id]: { side: 'enemies' } } },
    controlledTokenIds: [enemy.id], confirmAttack: jest.fn(), cancelAttackDraft: jest.fn(),
  }} />);

  expect(screen.getByRole('heading', { name: /preparar ataque/i })).toBeInTheDocument();
  expect(preloadImage).toHaveBeenCalledWith('/external-target-armor.webp');
});

test('warms a late custom equipment URL and uses that same URL when the remote defense arrives', () => {
  const scenario = { items: [hero, enemy] };
  const runtime = { attackDraft: null, pendingAttack: null, combatState: { participants: { [hero.id]: { actionDice: [] } } }, controlledTokenIds: [hero.id] };
  const { rerender } = render(<CanvasCombatActionModal activeScenario={scenario} combatRuntime={runtime} isPlayerView />);
  expect(preloadImage).toHaveBeenCalledWith('/armaduras/armadura_de_cuero.webp');

  const customUrl = 'https://example.com/custom-protection-after-snapshot.webp';
  useCustomEquipmentImages.mockReturnValue(new Map([['armadura_de_cuero', customUrl]]));
  preloadImage.mockClear();
  rerender(<CanvasCombatActionModal activeScenario={scenario} combatRuntime={runtime} isPlayerView />);
  expect(preloadImage).toHaveBeenCalledTimes(1);
  expect(preloadImage).toHaveBeenCalledWith(customUrl);

  rerender(<CanvasCombatActionModal activeScenario={scenario} combatRuntime={{
    ...runtime,
    pendingAttack: { id: 'remote-defense', attackerId: enemy.id, targetId: hero.id, weaponName: 'Garrote', weapon: {}, pressure: { total: 4 }, status: 'awaiting-defense' },
    resolvePendingAttack: jest.fn(),
  }} isPlayerView />);
  const protection = screen.getByRole('region', { name: 'Defensa actual, CD 5' });
  expect(protection.querySelector('img')).toHaveAttribute('src', customUrl);
  expect(screen.getByRole('button', { name: /recibir ataque/i })).toBeEnabled();
});
