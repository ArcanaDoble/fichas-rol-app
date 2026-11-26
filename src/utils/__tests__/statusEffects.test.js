import {
    DEFAULT_STATUS_EFFECTS,
    DEPRECATED_STATUS_EFFECT_IDS,
    ESTADOS,
    mergeStatusEffectsConfig,
} from '../statusEffects';

describe('status effects configuration', () => {
    test('replaces Ensordecido with Oculto in the defaults', () => {
        expect(DEFAULT_STATUS_EFFECTS.ensordecido).toBeUndefined();
        expect(DEFAULT_STATUS_EFFECTS.oculto?.label).toBe('Oculto');
    });

    test('hides the deprecated remote status and adds Oculto to existing configurations', () => {
        const merged = mergeStatusEffectsConfig({
            ensordecido: { label: 'Ensordecido' },
            acido: { ...DEFAULT_STATUS_EFFECTS.acido, label: 'Ácido personalizado' },
        });

        expect(merged.ensordecido).toBeUndefined();
        expect(merged.oculto).toEqual(DEFAULT_STATUS_EFFECTS.oculto);
        expect(merged.acido.label).toBe('Ácido personalizado');
    });

    test('replaces Herido with the selectable Barrera state from the master rules', () => {
        expect(DEFAULT_STATUS_EFFECTS.herido).toBeUndefined();
        expect(DEPRECATED_STATUS_EFFECT_IDS).toContain('herido');
        expect(DEFAULT_STATUS_EFFECTS.barrera).toMatchObject({ label: 'Barrera', iconName: 'Shield' });
        expect(ESTADOS.some(state => state.id === 'herido')).toBe(false);
        const barrier = ESTADOS.find(state => state.id === 'barrera');
        expect(barrier).toMatchObject({ id: 'barrera', name: 'Barrera' });
        expect(barrier.img).toMatch(/^\/estados\/[^/]+\.svg$/);
    });

    test('removes Herido from remote configurations and adds Barrera without dropping custom effects', () => {
        const acid = { ...DEFAULT_STATUS_EFFECTS.acido, label: 'Ácido personalizado' };
        const custom = { label: 'Marca de aventura', iconName: 'Award', hex: '#c8aa6e' };
        const merged = mergeStatusEffectsConfig({
            herido: { label: 'Herido', iconName: 'HeartCrack' },
            acido: acid,
            'marca-aventura': custom,
        });
        expect(merged.herido).toBeUndefined();
        expect(merged.barrera).toEqual(DEFAULT_STATUS_EFFECTS.barrera);
        expect(merged.oculto).toEqual(DEFAULT_STATUS_EFFECTS.oculto);
        expect(merged.acido).toEqual(acid);
        expect(merged['marca-aventura']).toEqual(custom);
    });

    test('a configuration containing only removed conditions restores the current catalog', () => {
        expect(mergeStatusEffectsConfig({ herido: { label: 'Herido' }, ensordecido: { label: 'Ensordecido' } }))
            .toEqual(DEFAULT_STATUS_EFFECTS);
    });
});
