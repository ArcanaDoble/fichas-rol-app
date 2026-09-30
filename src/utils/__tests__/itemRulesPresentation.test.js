import { getItemRulesPresentation } from '../itemRulesPresentation';

test('separates legacy appended metadata while retaining the actual rules verbatim', () => {
    const description = 'Gasta 1 dado. No atraviesa muros. Además, gasta maná para llevar un aliado.';
    const item = { description: `${description}\nAlcance: Catalizador • Rasgos: Conjuro, movimiento` };
    expect(getItemRulesPresentation(item)).toEqual({ description, range: 'Catalizador', traits: ['Conjuro', 'movimiento'] });
    expect(item.description).toContain('Alcance:');
});

test('retains range mentions and punctuation that are part of a rule', () => {
    const description = 'Alcance: aumenta 1 casilla si gastas maná. Rasgos: no se añaden durante el turno.';
    expect(getItemRulesPresentation({ description }).description).toBe(description);
});

test('uses explicit fields and supports nested copies with empty optional description fields', () => {
    expect(getItemRulesPresentation({ detail: '', payload: { range: 'Arma', traits: ['Barrido'],
        description: 'Empuja 1 casilla. Alcance: Arma • Rasgos: Barrido' } })).toEqual({
        description: 'Empuja 1 casilla.', range: 'Arma', traits: ['Barrido'],
    });
});
