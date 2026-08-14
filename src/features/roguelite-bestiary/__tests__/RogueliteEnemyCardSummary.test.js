import { formatEquipmentSummary } from '../RogueliteEnemyCard';

describe('formatEquipmentSummary', () => {
  test('resume el arma adaptada sin perder su tipo', () => {
    expect(formatEquipmentSummary({
      type: 'weapon',
      dano: '1d4 Físico',
      alcance: 'Toque',
      actionCost: 1,
    })).toBe('Arma · 1d4 Físico · Toque · 1 dado');
  });

  test('muestra la CD de una armadura y omite costes heredados', () => {
    expect(formatEquipmentSummary({
      type: 'armor',
      defenseClass: 7,
      consumo: '🟡🟡🟡',
    })).toBe('Armadura · CD 7');
  });

  test('usa la descripción como salida segura para objetos sin perfil de combate', () => {
    expect(formatEquipmentSummary({
      type: 'object',
      descripcion: 'Recupera una copia de talento.',
    })).toBe('Objeto · Recupera una copia de talento.');
  });

  test('enumera rasgos sin repetir el rótulo rasgos', () => {
    expect(formatEquipmentSummary({
      type: 'weapon',
      dano: '1d8',
      traits: 'Derribo, Empuje',
    })).toBe('Arma · 1d8 · Derribo, Empuje');
  });
});
