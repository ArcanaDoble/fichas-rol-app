import {
    addCanvasLootToInventory,
    createCanvasLootSceneItem,
    detachCanvasInventoryItem,
    findCanvasLootPosition,
    getCanvasLootRenderPlacement,
    isCanvasLootItem,
    normalizeCanvasInventoryItem,
    pickUpCanvasLootForToken,
    reorderCanvasInventory,
    resolveCanvasLootRecipient,
} from '../canvasInventoryTransfer';

describe('canvas inventory transfer', () => {
    test('reorders inventory without changing its items', () => {
        const inventory = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
        expect(reorderCanvasInventory(inventory, 0, 2).map((item) => item.name)).toEqual(['B', 'C', 'A']);
        expect(inventory.map((item) => item.name)).toEqual(['A', 'B', 'C']);
    });

    test('detaching an equipped weapon also clears its loadout slots', () => {
        const sword = { name: 'Mandoble', templateId: 'weapon:mandoble', type: 'weapon', isEquipped: true };
        const result = detachCanvasInventoryItem({
            profileType: 'rogueliteClass',
            inventory: [sword],
            equipmentLoadout: {
                activeWeaponSet: 0,
                weaponSets: [{ mainHand: sword, offHand: null }, { mainHand: null, offHand: null }],
                mainHand: sword,
                offHand: null,
            },
        }, 0);

        expect(result.updates.inventory).toEqual([]);
        expect(result.updates.equippedItems).toEqual([]);
        expect(result.updates.equipmentLoadout.mainHand).toBeNull();
        expect(result.updates.runtimeDirty).toBe(true);
    });

    test('clears an equipped slot even when the inventory copy uses a runtime identity', () => {
        const inventorySword = {
            name: 'Mandoble',
            templateId: 'weapon:mandoble',
            runItemId: 'weapon:mandoble:0',
            type: 'weapon',
        };
        const equippedSword = {
            nombre: 'Mandoble',
            templateId: 'weapon:mandoble',
            type: 'weapon',
        };
        const result = detachCanvasInventoryItem({
            profileType: 'rogueliteClass',
            inventory: [inventorySword],
            equipmentLoadout: {
                activeWeaponSet: 0,
                weaponSets: [
                    { mainHand: equippedSword, offHand: null },
                    { mainHand: null, offHand: null },
                ],
                mainHand: equippedSword,
                offHand: null,
            },
        }, 0);

        expect(result.updates.inventory).toEqual([]);
        expect(result.updates.equipmentLoadout.mainHand).toBeNull();
        expect(result.updates.equipmentLoadout.weaponSets[0].mainHand).toBeNull();
        expect(result.updates.equippedItems).toEqual([]);
    });

    test('places loot in the nearest unoccupied grid cell', () => {
        const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
        const sourceToken = { id: 'hero', layer: 'TOKEN', x: 100, y: 100, width: 50, height: 50 };
        const position = findCanvasLootPosition({
            worldPoint: { x: 125, y: 125 },
            sourceToken,
            items: [sourceToken],
            gridConfig,
        });

        expect(position.gridCell).toEqual({ x: 2, y: 2 });
        expect(position.width).toBeCloseTo(16);
        expect(position.height).toBeCloseTo(16);
        expect(position.cellRect).toEqual(expect.objectContaining({ width: 50, height: 50 }));
    });

    test('aligns loot position and preview with finite map grid offset', () => {
        const gridConfig = {
            isInfinite: false,
            columns: 12,
            rows: 8,
            cellWidth: 256,
            cellHeight: 256,
        };
        // Finite grid origin in 12000x12000 world is (12000 - 12*256)/2 = 4464, (12000 - 8*256)/2 = 4976
        const worldPoint = { x: 4464 + 100, y: 4976 + 100 }; // Inside cell (0, 0)
        const position = findCanvasLootPosition({
            worldPoint,
            items: [],
            gridConfig,
        });

        expect(position.gridCell).toEqual({ x: 0, y: 0 });
        expect(position.cellRect).toEqual({
            x: 4464,
            y: 4976,
            width: 256,
            height: 256,
        });
        expect(position.x).toBeCloseTo(4464 + (256 - 81.92) / 2);
        expect(position.y).toBeCloseTo(4976 + (256 - 81.92) / 2);
    });

    test('creates a Canvas-only pickup and adds it back without equipping it', () => {
        const loot = createCanvasLootSceneItem({
            item: { name: 'Estilete', type: 'weapon', isEquipped: true },
            image: '/estilete.webp',
            sourceToken: { id: 'hero', name: 'Bárbaro' },
            position: { x: 10, y: 20, width: 30, height: 30 },
        });
        const recipient = addCanvasLootToInventory({ id: 'rogue', inventory: [] }, loot.lootItem);

        expect(isCanvasLootItem(loot)).toBe(true);
        expect(loot.type).toBe('scenePickup');
        expect(loot.img).toBe('/estilete.webp');
        expect(recipient.inventory[0]).toEqual(expect.objectContaining({
            name: 'Estilete',
            isEquipped: false,
            isPrepared: false,
        }));
    });

    test('preserves nested catalog identity, rarity and art through a ground transfer', () => {
        const sourceItem = {
            type: 'armor',
            payload: {
                id: 'armor-mail',
                nombre: 'Armadura de mallas',
                rareza: 'Poco común',
                descripcion: 'Neutraliza impactos cortantes.',
            },
            defensa: 7,
        };
        const normalized = normalizeCanvasInventoryItem(sourceItem, '/armaduras/mallas.webp');
        const loot = createCanvasLootSceneItem({
            item: sourceItem,
            image: '/armaduras/mallas.webp',
            sourceToken: { id: 'enemy', name: 'Guardia' },
            position: { x: 10, y: 20, width: 30, height: 30 },
        });
        const recipient = addCanvasLootToInventory({ id: 'hero', inventory: [] }, loot.lootItem);

        expect(normalized).toEqual(expect.objectContaining({
            name: 'Armadura de mallas',
            rareza: 'Poco común',
            image: '/armaduras/mallas.webp',
            description: 'Neutraliza impactos cortantes.',
        }));
        expect(loot).toEqual(expect.objectContaining({
            name: 'Armadura de mallas',
            img: '/armaduras/mallas.webp',
        }));
        expect(recipient.inventory[0]).toEqual(expect.objectContaining({
            name: 'Armadura de mallas',
            rareza: 'Poco común',
            image: '/armaduras/mallas.webp',
            description: 'Neutraliza impactos cortantes.',
            isEquipped: false,
        }));
    });

    test('detaches enemy equipment so an enemy can be disarmed onto the canvas', () => {
        const sword = { id: 'enemy-sword', name: 'Espada mellada', type: 'weapon' };
        const result = detachCanvasInventoryItem({
            profileType: 'rogueliteEnemy',
            inventory: [sword],
            equippedItems: [sword],
            enemyAbilities: [],
        }, 0);

        expect(result.item).toEqual(expect.objectContaining(sword));
        expect(result.updates.inventory).toEqual([]);
        expect(result.updates.equippedItems).toEqual([]);
    });

    test('uses the controlled token under the loot as its explicit recipient', () => {
        const loot = {
            id: 'loot',
            sceneItemKind: 'canvasLoot',
            x: 112,
            y: 112,
            width: 25,
            height: 25,
        };
        const hero = {
            id: 'hero',
            profileType: 'rogueliteClass',
            layer: 'TOKEN',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            controlledBy: ['Ada'],
        };

        expect(resolveCanvasLootRecipient({
            loot,
            items: [loot, hero],
            isPlayerView: true,
            playerName: 'Ada',
        })).toEqual({ recipient: hero, blockedRecipient: null });
    });

    test('rejects a token under the loot when the player does not control it', () => {
        const loot = {
            id: 'loot',
            sceneItemKind: 'canvasLoot',
            x: 112,
            y: 112,
            width: 25,
            height: 25,
        };
        const enemy = {
            id: 'enemy',
            profileType: 'rogueliteEnemy',
            layer: 'TOKEN',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            controlledBy: [],
        };

        expect(resolveCanvasLootRecipient({
            loot,
            items: [loot, enemy],
            isPlayerView: true,
            playerName: 'Ada',
        })).toEqual({ recipient: null, blockedRecipient: enemy });
    });

    test('correctly targets the specific token when two tokens share a cell in combat formation/duel', () => {
        const gridConfig = { isInfinite: true, cellWidth: 100, cellHeight: 100, isCombatActive: true };
        const heroA = {
            id: 'hero-a',
            profileType: 'rogueliteClass',
            layer: 'TOKEN',
            isToken: true,
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            controlledBy: ['Ada'],
        };
        const heroB = {
            id: 'hero-b',
            profileType: 'rogueliteClass',
            layer: 'TOKEN',
            isToken: true,
            x: 0,
            y: 0,
            width: 50,
            height: 50,
            controlledBy: ['Ada'],
        };
        const items = [heroA, heroB];

        // Dragging loot positioned over the left side of the cell
        const leftLoot = { id: 'loot-left', sceneItemKind: 'canvasLoot', x: 5, y: 25, width: 25, height: 25 };
        const leftTarget = resolveCanvasLootRecipient({ loot: leftLoot, items: [leftLoot, ...items], gridConfig, isPlayerView: true, playerName: 'Ada' });

        // Dragging loot positioned over the right side of the cell
        const rightLoot = { id: 'loot-right', sceneItemKind: 'canvasLoot', x: 65, y: 25, width: 25, height: 25 };
        const rightTarget = resolveCanvasLootRecipient({ loot: rightLoot, items: [rightLoot, ...items], gridConfig, isPlayerView: true, playerName: 'Ada' });

        expect(leftTarget.recipient).toBeDefined();
        expect(rightTarget.recipient).toBeDefined();
        expect(leftTarget.recipient.id).not.toEqual(rightTarget.recipient.id);
    });

    test('picks up ground loot when a controlled token moves to its grid cell', () => {
        const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
        const potionLoot = {
            id: 'loot-potion',
            name: 'Poción de Vida',
            img: '/objetos/pocion.webp',
            sceneItemKind: 'canvasLoot',
            lootItem: { nombre: 'Poción de Vida', rareza: 'Raro', type: 'consumable' },
            x: 112,
            y: 112,
            width: 25,
            height: 25,
        };
        const heroToken = {
            id: 'hero',
            name: 'Bárbaro',
            profileType: 'rogueliteClass',
            layer: 'TOKEN',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            controlledBy: ['Ada'],
            inventory: [],
        };

        const result = pickUpCanvasLootForToken({
            token: heroToken,
            items: [heroToken, potionLoot],
            gridConfig,
            isPlayerView: true,
            playerName: 'Ada',
        });

        expect(result.pickedLoots).toHaveLength(1);
        expect(result.pickedLoots[0].id).toBe('loot-potion');
        expect(result.nextToken.inventory).toHaveLength(1);
        expect(result.nextToken.inventory[0].name).toBe('Poción de Vida');
        expect(result.nextToken.inventory[0].rareza).toBe('Raro');
        expect(result.nextToken.inventory[0].image).toBe('/objetos/pocion.webp');
        expect(result.nextToken.runtimeDirty).toBe(true);
        expect(result.nextItems.find((item) => item.id === 'loot-potion')).toBeUndefined();
    });

    test('ignores ground loot when the token is not in the same cell', () => {
        const gridConfig = { isInfinite: true, cellWidth: 50, cellHeight: 50 };
        const potionLoot = {
            id: 'loot-potion',
            name: 'Poción de Vida',
            sceneItemKind: 'canvasLoot',
            lootItem: { name: 'Poción de Vida', type: 'consumable' },
            x: 312,
            y: 312,
            width: 25,
            height: 25,
        };
        const heroToken = {
            id: 'hero',
            name: 'Bárbaro',
            profileType: 'rogueliteClass',
            layer: 'TOKEN',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            controlledBy: ['Ada'],
            inventory: [],
        };

        const result = pickUpCanvasLootForToken({
            token: heroToken,
            items: [heroToken, potionLoot],
            gridConfig,
            isPlayerView: true,
            playerName: 'Ada',
        });

        expect(result.pickedLoots).toHaveLength(0);
        expect(result.nextToken.inventory).toHaveLength(0);
        expect(result.nextItems).toHaveLength(2);
    });

    test('distributes multiple loot items in the same grid cell without overlapping', () => {
        const gridConfig = { isInfinite: true, cellWidth: 100, cellHeight: 100 };
        const loot1 = {
            id: 'loot-1',
            sceneItemKind: 'canvasLoot',
            x: 0,
            y: 0,
            width: 32,
            height: 32,
            droppedAt: 100,
        };
        const loot2 = {
            id: 'loot-2',
            sceneItemKind: 'canvasLoot',
            x: 0,
            y: 0,
            width: 32,
            height: 32,
            droppedAt: 200,
        };

        const pos1Single = getCanvasLootRenderPlacement(loot1, [loot1], gridConfig);
        expect(pos1Single.x).toBeCloseTo(34);
        expect(pos1Single.y).toBeCloseTo(34);

        const pos1Pair = getCanvasLootRenderPlacement(loot1, [loot1, loot2], gridConfig);
        const pos2Pair = getCanvasLootRenderPlacement(loot2, [loot1, loot2], gridConfig);

        expect(pos1Pair.x).toBeCloseTo(10);
        expect(pos2Pair.x).toBeCloseTo(58);
        expect(Math.abs(pos2Pair.x - pos1Pair.x)).toBeGreaterThanOrEqual(32);
    });
});
