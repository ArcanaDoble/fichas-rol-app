import {
    ITEM_USE_PHASES,
    advanceItemUseSession,
    createItemUseSession,
} from '../item-use/itemUseSystem';
import {
    getItemUseDefinition,
    smokeBombItemUseDefinition,
    healingPotionItemUseDefinition,
} from '../item-use/itemUseDefinitions';

describe('ItemUseSystem', () => {
    it('chains configurable phases and stores each result', () => {
        const definition = {
            id: 'test-item',
            phases: [
                { id: ITEM_USE_PHASES.SELECT_DIE, storeAs: 'die' },
                { id: ITEM_USE_PHASES.SELECT_TARGET, storeAs: 'target' },
                { id: ITEM_USE_PHASES.CONFIRM, storeAs: 'confirmed' },
            ],
        };
        let session = createItemUseSession({
            definition,
            sourceToken: { id: 'token-1' },
            item: { id: 'item-1' },
        });
        session = advanceItemUseSession(session, { id: 'd6' });
        session = advanceItemUseSession(session, { id: 'target-1' });
        session = advanceItemUseSession(session, true);

        expect(session.status).toBe('complete');
        expect(session.context).toEqual({
            die: { id: 'd6' },
            target: { id: 'target-1' },
            confirmed: true,
        });
    });

    it('does not advance when a phase validator rejects the result', () => {
        const session = createItemUseSession({
            definition: smokeBombItemUseDefinition,
            sourceToken: { id: 'token-1' },
            item: { name: 'Bomba de humo' },
        });
        const rejected = advanceItemUseSession(session, { value: 6, status: 'spent' });
        expect(rejected.phase).toBe(ITEM_USE_PHASES.SELECT_DIE);
        expect(rejected.error).toBe('Selecciona un dado disponible.');
    });

    it('keeps smoke-specific data in the definition, not the engine', () => {
        expect(getItemUseDefinition({ name: 'Bomba de humo' })).toBe(smokeBombItemUseDefinition);
        expect(getItemUseDefinition({ name: 'Poción menor' })).toBeNull();
        expect(smokeBombItemUseDefinition.phases.map(({ id }) => id)).toEqual([
            ITEM_USE_PHASES.SELECT_DIE,
            ITEM_USE_PHASES.PLACE_AREA,
            ITEM_USE_PHASES.CONFIRM,
            ITEM_USE_PHASES.CONSUME_RESOURCES,
            ITEM_USE_PHASES.RESOLVE_EFFECTS,
        ]);
    });

    it('recognizes the healing potion without turning other potions into healing items', () => {
        expect(getItemUseDefinition({ name: 'Poción de curación' })).toBe(healingPotionItemUseDefinition);
        expect(getItemUseDefinition({ nombre: 'POCION DE CURACION' })).toBe(healingPotionItemUseDefinition);
        expect(getItemUseDefinition({ name: 'Poción', itemUseId: 'healing-potion' })).toBe(healingPotionItemUseDefinition);
        expect(getItemUseDefinition({ name: 'Poción' })).toBeNull();
        expect(getItemUseDefinition({ name: 'Poción de curación', itemUseId: 'other-effect' })).toBeNull();
    });

    it('takes the healing potion straight from its cost to confirmation without placing an area', () => {
        const resource = { id: 'action-1', kind: 'action-die', status: 'available', value: 6 };
        const session = createItemUseSession({ definition: healingPotionItemUseDefinition,
            sourceToken: { id: 'hero' }, item: { name: 'Poción de curación' } });
        const selected = advanceItemUseSession(session, resource);
        expect(selected.phase).toBe(ITEM_USE_PHASES.CONFIRM);
        expect(selected.context.resource).toBe(resource);
        expect(healingPotionItemUseDefinition.effect).toEqual({ type: 'heal', die: 'd4', sides: 4, target: 'self' });
    });
});
