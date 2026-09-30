describe('smoke portrait preloading', () => {
    let warmSmokePortraits;
    let images;
    let originalImage;
    const smoke = { id: 'smoke', type: 'geometry', geometryKind: 'smoke', x: 0, y: 0, width: 100, height: 100 };
    const resident = (id, x = 10) => ({ id, type: 'token', x, y: 10, width: 20, height: 20, img: `/${id}.png` });

    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();
        globalThis.__fichasRolLoadedImageUrls = new Set();
        images = [];
        originalImage = global.Image;
        global.Image = function MockImage() { images.push(this); };
        ({ warmSmokePortraits } = require('../smokePortraitPreload'));
    });
    afterEach(() => {
        global.Image = originalImage;
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('preloads only residents, and does not restart requests on movement or reveal', () => {
        const items = [smoke, resident('inside'), resident('outside', 200)];
        warmSmokePortraits(items);
        warmSmokePortraits(items.map(item => ({ ...item })));
        expect(images).toHaveLength(1);
        expect(images[0].src).toBe('/inside.png');
        images[0].onload();
        warmSmokePortraits(items);
        expect(images).toHaveLength(1);
        expect(globalThis.__fichasRolLoadedImageUrls.has('/inside.png')).toBe(true);
    });

    test('limits decoding requests to four at once and continues as they finish', () => {
        warmSmokePortraits([smoke, ...Array.from({ length: 8 }, (_, index) => resident(`inside-${index}`))]);
        expect(images).toHaveLength(4);
        images[0].onload();
        expect(images).toHaveLength(5);
        images[1].onerror();
        expect(images).toHaveLength(6);
    });

    test('failed portraits do not retry on every drag frame', () => {
        const items = [smoke, resident('broken')];
        warmSmokePortraits(items);
        images[0].onerror();
        warmSmokePortraits(items);
        expect(images).toHaveLength(1);
        jest.advanceTimersByTime(30001);
        warmSmokePortraits(items);
        expect(images).toHaveLength(2);
    });
});
