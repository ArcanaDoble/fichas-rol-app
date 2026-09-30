import {
    DEFAULT_STATUS_EFFECTS,
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
});
