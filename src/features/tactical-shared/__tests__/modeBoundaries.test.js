import { BOARD_MODE_DEFINITION } from '../../board/boardModeDefinition';
import { buildBoardTimelineTokens } from '../../board/boardInitiative';
import { CANVAS_MODE_DEFINITION } from '../../canvas/canvasModeDefinition';
import { buildCanvasTimelineTokens } from '../../canvas/canvasInitiative';
import fs from 'fs';
import path from 'path';

const SOURCE_EXTENSIONS = new globalThis.Set(['.js', '.jsx']);

const listProductionModules = (directory) => (
    fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            return entry.name === '__tests__' ? [] : listProductionModules(absolutePath);
        }
        if (!SOURCE_EXTENSIONS.has(path.extname(entry.name)) || entry.name.includes('.test.')) return [];
        return [absolutePath];
    })
);

const extractRelativeImports = (source = '') => {
    const imports = [];
    const pattern = /(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g;
    let match = pattern.exec(source);
    while (match) {
        if (match[1].startsWith('.')) imports.push(match[1]);
        match = pattern.exec(source);
    }
    return imports;
};

const expectNoImportsInto = (sourceDirectory, forbiddenDirectories) => {
    const normalizedForbiddenDirectories = forbiddenDirectories.map((directory) => (
        `${path.resolve(directory).replaceAll('\\', '/')}/`
    ));
    const violations = [];

    listProductionModules(sourceDirectory).forEach((modulePath) => {
        const source = fs.readFileSync(modulePath, 'utf8');
        extractRelativeImports(source).forEach((specifier) => {
            const targetPath = `${path.resolve(path.dirname(modulePath), specifier).replaceAll('\\', '/')}/`;
            if (normalizedForbiddenDirectories.some((directory) => targetPath.startsWith(directory))) {
                violations.push(`${path.relative(sourceDirectory, modulePath)} -> ${specifier}`);
            }
        });
    });

    expect(violations).toEqual([]);
};

test('canvas and board expose independent mode contracts', () => {
    expect(CANVAS_MODE_DEFINITION.id).toBe('canvas');
    expect(BOARD_MODE_DEFINITION.id).toBe('board');
    expect(CANVAS_MODE_DEFINITION.scenarioCollectionName).toBe('canvas_scenarios');
    expect(BOARD_MODE_DEFINITION.scenarioCollectionName).toBe('board_scenarios');
    expect(CANVAS_MODE_DEFINITION.createCombatController)
        .not.toBe(BOARD_MODE_DEFINITION.createCombatController);
    expect(CANVAS_MODE_DEFINITION.useFeatureController)
        .not.toBe(BOARD_MODE_DEFINITION.useFeatureController);
    expect(CANVAS_MODE_DEFINITION.WorkspaceShell)
        .not.toBe(BOARD_MODE_DEFINITION.WorkspaceShell);
    expect(CANVAS_MODE_DEFINITION.isScenePickupItem).toEqual(expect.any(Function));
    expect(CANVAS_MODE_DEFINITION.sceneItemVisuals.ScenePickupVisual).toBeDefined();
    expect(BOARD_MODE_DEFINITION.isScenePickupItem).toBeUndefined();
    expect(BOARD_MODE_DEFINITION.sceneItemVisuals?.ScenePickupVisual).toBeUndefined();
});

test('canvas initiative is projected from the Canvas combat state instead of legacy speed', () => {
    const tokens = buildCanvasTimelineTokens([
        { id: 'enemy', profileType: 'rogueliteEnemy', velocidad: 2 },
        { id: 'player', profileType: 'rogueliteClass', velocidad: 5 },
        { id: 'decoration', type: 'geometry' },
        { id: 'loot', type: 'scenePickup', stats: { vida: { current: 1, max: 1 } } },
    ], {
        combatState: {
            status: 'active',
            roundPhase: 'turns',
            activeBlockIndex: 0,
            participants: {
                enemy: { tokenId: 'enemy', side: 'enemies', initiative: 8 },
                player: { tokenId: 'player', side: 'players', initiative: 10 },
            },
            blocks: [
                { id: 'players', memberIds: ['player'], actedIds: [] },
                { id: 'enemies', memberIds: ['enemy'], actedIds: [] },
            ],
        },
    });

    expect(tokens.map(({ id, initiative, timelineSide }) => ({ id, initiative, timelineSide }))).toEqual([
        { id: 'enemy', initiative: 8, timelineSide: 'master' },
        { id: 'player', initiative: 10, timelineSide: 'players' },
    ]);
});

test('board initiative is based on cards held by each token seat', () => {
    const tokens = buildBoardTimelineTokens([
        { id: 'master', type: 'token', isCircular: true, controlledBy: [] },
        { id: 'player', type: 'token', isCircular: true, controlledBy: ['Ada'] },
        { id: 'm1', type: 'card', zone: 'hand', handTokenId: 'master', ownerName: 'Master' },
        { id: 'p1', type: 'card', zone: 'hand', handTokenId: 'player', handSeatId: 'Ada' },
        { id: 'p2', type: 'card', zone: 'hand', handTokenId: 'player', handSeatId: 'Ada' },
    ]);

    expect(tokens.map(({ id, initiative, timelineSide }) => ({ id, initiative, timelineSide })))
        .toEqual([
            { id: 'master', initiative: 1, timelineSide: 'master' },
            { id: 'player', initiative: 2, timelineSide: 'players' },
        ]);
});

test('production modules cannot cross the Canvas and Board boundaries', () => {
    const featuresDirectory = path.resolve(__dirname, '../..');
    const canvasDirectory = path.join(featuresDirectory, 'canvas');
    const boardDirectory = path.join(featuresDirectory, 'board');
    const sharedDirectory = path.join(featuresDirectory, 'tactical-shared');

    expectNoImportsInto(canvasDirectory, [boardDirectory]);
    expectNoImportsInto(boardDirectory, [canvasDirectory]);
    expectNoImportsInto(sharedDirectory, [canvasDirectory, boardDirectory]);
});
