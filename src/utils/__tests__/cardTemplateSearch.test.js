import {
  filterCardTemplates,
  normalizeCardSearchText,
} from '../cardTemplateSearch';

const templates = [
  { id: '1', name: 'Revólver', type: 'weapon', sourceDeckName: 'Armas del Oeste' },
  { id: '2', name: 'Acción rápida', type: 'action', sourceDeckName: 'Colección base' },
  { id: '3', name: 'Mente fría', type: 'attribute', sourceDeckName: 'Atributos' },
];

test('normaliza tildes, mayúsculas, signos y espacios', () => {
  expect(normalizeCardSearchText('  ACCIÓN—Rápida  ')).toBe('accion rapida');
});

test('encuentra cartas aunque la consulta omita las tildes', () => {
  expect(filterCardTemplates(templates, 'revolver')).toEqual([templates[0]]);
  expect(filterCardTemplates(templates, 'acción rapida')).toEqual([templates[1]]);
});

test('busca por varias palabras sin exigir su orden', () => {
  expect(filterCardTemplates(templates, 'rapida accion')).toEqual([templates[1]]);
});

test('incluye tipo y colección en la búsqueda', () => {
  expect(filterCardTemplates(templates, 'arma oeste')).toEqual([templates[0]]);
  expect(filterCardTemplates(templates, 'atributo')).toEqual([templates[2]]);
});

test('conserva el orden original cuando no hay consulta', () => {
  expect(filterCardTemplates(templates, '   ')).toBe(templates);
});

