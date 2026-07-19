import {
  CARD_BUILDER_PROJECT_FORMAT,
  createCardBuilderProject,
  embedCardBuilderProjectInPng,
  extractCardBuilderProjectFromPng,
  parseCardBuilderProject,
} from '../cardBuilderProject';

const ONE_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const fromBase64 = (value) => new Uint8Array(Buffer.from(value, 'base64'));

describe('card builder editable projects', () => {
  test('creates and parses a versioned project without losing Unicode configuration', () => {
    const project = createCardBuilderProject({
      cardName: 'Espada rúnica',
      containers: [{ id: 'description', key: 'description-1' }],
      description: 'Daño mágico — edición completa',
    }, '2026-07-16T10:00:00.000Z');

    expect(project.format).toBe(CARD_BUILDER_PROJECT_FORMAT);
    expect(parseCardBuilderProject(JSON.stringify(project))).toEqual(project);
  });

  test('embeds the editable project in a valid PNG and extracts it intact', () => {
    const source = fromBase64(ONE_PIXEL_PNG);
    const project = createCardBuilderProject({
      cardName: 'Golpe de suerte',
      headerImageSrc: 'data:image/png;base64,abc123',
      traits: ['Fluida', 'Mágica'],
    }, '2026-07-16T10:00:00.000Z');

    const editablePng = embedCardBuilderProjectInPng(source, project);

    expect(Array.from(editablePng.slice(0, 8))).toEqual(Array.from(source.slice(0, 8)));
    expect(extractCardBuilderProjectFromPng(editablePng)).toEqual(project);
    expect(editablePng.length).toBeGreaterThan(source.length);
  });

  test('rejects ordinary PNG files that do not contain an editable project', () => {
    expect(() => extractCardBuilderProjectFromPng(fromBase64(ONE_PIXEL_PNG)))
      .toThrow('CARD_PROJECT_NOT_FOUND');
  });

  test('rejects unknown JSON files and newer unsupported project versions', () => {
    expect(() => parseCardBuilderProject({ hello: 'world' })).toThrow('INVALID_CARD_PROJECT');
    expect(() => parseCardBuilderProject({
      format: CARD_BUILDER_PROJECT_FORMAT,
      version: 999,
      card: {},
    })).toThrow('CARD_PROJECT_VERSION_TOO_NEW');
  });
});
