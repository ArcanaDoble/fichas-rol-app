import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CampaignCombatOverlay from '../CampaignCombatOverlay';

jest.mock('../../../../hooks/useCustomEquipmentImages', () => ({ useCustomEquipmentImages: () => ({}), getCustomImage: () => null }));

const weapon = { id: 'sword', instanceId: 'sword', name: 'Espada', type: 'weapon', dano: '1d8', hands: 1, canvasSlot: 'mainHand', alcance: 'Cercano' };
const actor = (id, profileType) => ({ id, type: 'token', profileType, rulesSystem: 'campaign', name: id, x: id === 'a' ? 50 : 0, y: 0,
  width: 50, height: 50, teamId: 'allies', isCircular: true, equippedItems: [weapon], status: [],
  stats: { vida: { current: 28, max: 28 }, armadura: { current: 1 }, movimiento: { current: 2 } } });
const items = [actor('a', 'rogueliteEnemy'), actor('b', 'campaignCharacter')];
const grid = { cellWidth: 50, cellHeight: 50, isInfinite: true };

test('the integrated defense uses directions over the token without disclosing the rival action or testing its threshold', async () => {
  const commit = jest.fn();
  const runtime = { campaignPending: { id: 'exchange', status: 'awaiting-defense', attackerId: 'a', targetId: 'b', melee: true,
    weapon, actionValue: 900 }, campaignCanControl: token => token?.id === 'b', campaignGridConfig: grid,
    combatState: { participants: { b: { side: 'players', actionDice: [{ id: 'die', die: 'd10', value: 7, status: 'available' }] } } },
    commitCampaignDefense: commit };
  render(<><div data-board-item-id="b"><img alt="Objetivo" /></div>
    <CampaignCombatOverlay activeScenario={{ items }} combatRuntime={runtime} isPlayerView /></>);
  expect(screen.getByText('Recursos del atacante reservados')).toBeInTheDocument();
  expect(screen.queryByText(/900/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Evasión' }));
  fireEvent.click(screen.getByRole('button', { name: 'd10 · 7' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Norte', exact: true })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Norte', exact: true }));
  expect(screen.getByRole('button', { name: 'Revelar y resolver' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Revelar y resolver' }));
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({ defense: 'evade', ids: ['die'], destination: expect.objectContaining({ label: 'Norte' }) }));
});

test('the integrated illustrated preparation uses actual NPC dice and includes the selected reserve in its total', () => {
  const prepare = jest.fn();
  const resources = [{ id: 'attack', kind: 'basic', value: 5, label: 'Acción principal', status: 'available' },
    { id: 'threat', kind: 'threat', value: 4, label: 'd8', die: 'd8', status: 'available' }];
  const draft = { id: 'draft', attackerId: 'a', targetId: 'b', phase: 'prepare', weapon,
    selection: { actionCost: 1, structuralCost: 1, campaignMode: 'single', parts: [], profile: [], range: { rangeName: 'Cercano' } } };
  render(<CampaignCombatOverlay activeScenario={{ items }} isPlayerView={false}
    combatRuntime={{ campaignDraft: draft, campaignAttackResources: resources, prepareCampaignAttack: prepare }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Acción básica · 5, valor fijo' }));
  fireEvent.click(screen.getByRole('button', { name: 'd8 · 4' }));
  expect(screen.getByText('9')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Elegir zona sobre el token' }));
  expect(prepare).toHaveBeenCalledWith(['attack', 'threat'], { customDice: [] });
});

test('a GM selects multiple punctual dice directly in preparation, while a delegated NPC player cannot create them', () => {
  const prepare = jest.fn();
  const draft = { id: 'quick-threat', attackerId: 'a', targetId: 'b', phase: 'prepare', weapon,
    selection: { actionCost: 1, structuralCost: 1, campaignMode: 'single', parts: [], profile: [], range: { rangeName: 'Cercano' } } };
  const runtime = { campaignDraft: draft, prepareCampaignAttack: prepare,
    campaignAttackResources: [{ id: 'attack', kind: 'basic', value: 5, label: 'Acción principal', status: 'available' }] };
  const { container, rerender } = render(<CampaignCombatOverlay activeScenario={{ items }} combatRuntime={runtime} isPlayerView={false} />);
  expect(container.querySelector('details')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Acción básica · 5, valor fijo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d8 de Amenaza' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d8 de Amenaza' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d20 de Amenaza' }));
  expect(prepare).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Elegir zona sobre el token' }));
  expect(prepare).toHaveBeenCalledWith(['attack'], { customDice: [8, 8, 20] });
  rerender(<CampaignCombatOverlay activeScenario={{ items }} combatRuntime={runtime} isPlayerView />);
  expect(screen.queryByRole('region', { name: 'Amenaza puntual' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Acción básica · 5, valor fijo' })).toBeInTheDocument();
});

test.each([false, true])('the resolved exchange reveals both color legends for GM/player=%s without opponent values', async isPlayerView => {
  const runtime = { campaignPending: { id: 'revealed', status: 'resolved', attackerId: 'a', targetId: 'b', melee: true, weapon,
    actionValue: 900, reveal: { zones: ['arriba'] }, defense: { mode: 'parry', zones: ['derecha'] },
    result: { damage: 4, before: 28, after: 24, hits: [] } }, campaignCanControl: token => token?.id === 'b', combatState: {} };
  render(<><div data-board-item-id="b"><img alt="Objetivo" /></div>
    <CampaignCombatOverlay activeScenario={{ items }} combatRuntime={runtime} isPlayerView={isPlayerView} /></>);
  await waitFor(() => expect(screen.getByRole('img', { name: 'Ataque: Arriba. Parry: Derecha.' })).toBeInTheDocument());
  expect(screen.getByText('Ataque: Arriba')).toHaveClass('campaign-reveal-attack');
  expect(screen.getByText('Parry: Derecha')).toHaveClass('campaign-reveal-parry');
  if (isPlayerView) expect(screen.queryByText(/900/)).not.toBeInTheDocument();
});

test('the NPC defense submits punctual dice from the same tray and hides its creation controls from a delegated player', async () => {
  const commit = jest.fn();
  const npcItems = [items[0], { ...actor('b', 'rogueliteEnemy'), offenseBase: 5 }];
  const runtime = { campaignPending: { id: 'npc-defense', status: 'awaiting-defense', attackerId: 'a', targetId: 'b', melee: true,
    weapon, actionValue: 900 }, campaignCanControl: token => token?.id === 'b', campaignGridConfig: grid,
    combatState: { participants: { b: { side: 'enemies', enemyActions: [{ id: 'defense', status: 'available' }] } } },
    commitCampaignDefense: commit };
  const { rerender } = render(<><div data-board-item-id="b"><img alt="Objetivo" /></div>
    <CampaignCombatOverlay activeScenario={{ items: npcItems }} combatRuntime={runtime} isPlayerView={false} /></>);
  fireEvent.click(screen.getByRole('button', { name: 'Defensa básica · 5, valor fijo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d6 de Amenaza' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d12 de Amenaza' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Derecha', exact: true })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('radio', { name: 'Derecha', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Revelar y resolver' }));
  expect(commit).toHaveBeenCalledWith(expect.objectContaining({ ids: ['defense'], customDice: [6, 12] }));
  rerender(<><div data-board-item-id="b"><img alt="Objetivo" /></div>
    <CampaignCombatOverlay activeScenario={{ items: npcItems }} combatRuntime={runtime} isPlayerView /></>);
  expect(screen.queryByRole('region', { name: 'Amenaza puntual' })).not.toBeInTheDocument();
  expect(screen.queryByText(/900/)).not.toBeInTheDocument();
});
