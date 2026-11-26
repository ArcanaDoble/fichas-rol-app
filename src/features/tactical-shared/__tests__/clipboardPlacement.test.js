import { placeClipboardItems } from '../clipboardPlacement';

test('centers a copied group at the pointer without changing its formation or original items', () => {
    const items = [
        { id: 'first', type: 'token', x: 0, y: 20, width: 40, height: 40 },
        { id: 'second', type: 'token', x: 100, y: 70, width: 60, height: 60 },
    ];
    const result = placeClipboardItems(items, { x: 500, y: 400 }, { snapToGrid: false });
    expect(result).toMatchObject([{ x: 420, y: 345 }, { x: 520, y: 395 }]);
    expect(items[0]).toMatchObject({ x: 0, y: 20 });
});

test('places a compact token in the pointed grid cell with the existing snap rules', () => {
    const result = placeClipboardItems([{ type: 'token', x: 100, y: 100, width: 40, height: 40 }],
        { x: 631, y: 527 }, { isInfinite: true, cellWidth: 100, cellHeight: 100, snapToGrid: true });
    expect(result[0]).toMatchObject({ x: 630, y: 530 });
});

test('translates copied wall endpoints with their bounds', () => {
    const wall = { type: 'wall', x: 0, y: 0, width: 100, height: 100, x1: 100, y1: 0, x2: 0, y2: 100 };
    expect(placeClipboardItems([wall], { x: 500, y: 500 }, { snapToGrid: false })[0])
        .toMatchObject({ x: 450, y: 450, x1: 550, y1: 450, x2: 450, y2: 550 });
});
