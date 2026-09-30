import { createBoardCombatController } from '../createBoardCombatController';
import { addDoc } from 'firebase/firestore';

jest.mock('../../../firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    addDoc: jest.fn(async () => ({ id: 'event' })), collection: jest.fn(), doc: jest.fn(),
    serverTimestamp: () => 1, updateDoc: jest.fn(),
}));
jest.mock('../../../utils/combatSystem', () => ({
    ...jest.requireActual('../../../utils/combatSystem'),
    rollAttack: () => ({ total: 2, rolls: [], dice: [] }),
}));

test.each([false, true])('Oculto is removed only when the attack is committed (attack: %s)', attack => {
    const actor = { id: 'hero', name: 'Hero', x: 0, y: 0, width: 25, height: 25,
        status: ['oculto', 'envenenado'], stats: { vida: { current: 5, max: 5 } } };
    const target = { ...actor, id: 'enemy', name: 'Enemy', x: 50, status: [] };
    let scene = { id: 'board', items: [actor, target] };
    const persist = jest.fn();
    const actions = attack ? [{ actionId: 'attack', targetId: 'enemy', cost: 1,
        weapon: { nombre: 'Daga', daño: 'd4', rasgos: [] } }] : [];
    const controller = createBoardCombatController({ activeScenario: scene, activeScenarioRef: { current: scene },
        pendingTurnState: { tokenId: 'hero', x: 0, y: 0, moveCost: 0, actionCost: attack ? 1 : 0, actions },
        gridConfig: { cellWidth: 50, cellHeight: 50 }, armaduras: [], scenarioCollectionName: 'board_scenarios',
        enrichTokenWithCharacterData: token => token, safePersistItems: persist,
        setActiveScenario: update => { scene = update(scene); }, setPendingTurnState: jest.fn(), triggerToast: jest.fn() });
    expect(actor.status).toContain('oculto');
    return controller.handleEndTurn('hero').then(() => {
        expect(scene.items[0].status).toEqual(attack ? ['envenenado'] : ['oculto', 'envenenado']);
        expect(persist).toHaveBeenCalled();
        if (attack) expect(addDoc).toHaveBeenCalled();
    });
});
