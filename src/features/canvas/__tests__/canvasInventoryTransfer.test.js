import {
    addCanvasLootToInventory,
    createCanvasLootSceneItem,
    detachCanvasInventoryItem,
    findCanvasLootPosition,
    isCanvasLootItem,
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

    test('places loot in the nearest unoccupied grid cell', () => {
        const gridConfig = { cellWidth: 50, cellHeight: 50 };
        const sourceToken = { id: 'hero', layer: 'TOKEN', x: 100, y: 100, width: 50, height: 50 };
        const position = findCanvasLootPosition({
            worldPoint: { x: 125, y: 125 },
            sourceToken,
            items: [sourceToken],
            gridConfig,
        });

        expect(position.gridCell).not.toEqual({ x: 2, y: 2 });
        expect(position.width).toBeCloseTo(25);
        expect(position.height).toBeCloseTo(25);
        expect(position.cellRect).toEqual(expect.objectContaining({ width: 50, height: 50 }));
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

    test('detaches enemy equipment so an enemy can be disarmed onto the canvas', () => {
        const sword = { id: 'enemy-sword', name: 'Espada mellada', type: 'weapon' };
        const result = detachCanvasInventoryItem({
            profileType: 'rogueliteEnemy',
            inventory: [sword],
            equippedItems: [sword],
            enemyAbilities: [],
        }, 0);

        expect(result.item).toBe(sword);
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
});
