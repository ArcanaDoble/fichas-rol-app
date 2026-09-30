import { preloadAntidoteArt } from '../preloadAntidoteArt';
import { preloadImage } from '../../../components/LoadingImage';

jest.mock('../../../components/LoadingImage', () => ({ preloadImage: jest.fn(async () => true) }));

test('warms other players and enemy inventories once per URL, including wrapped copies', async () => {
    await preloadAntidoteArt([
        { controlledBy: ['Other'], inventory: [{ name: 'Antídoto', image: '/antidote.webp' }] },
        { equipment: { belt_0: { payload: { itemUseId: 'antidote', img: '/antidote.webp' } } } },
        { inventory: [{ name: 'Sword', image: '/sword.webp' }] },
    ]);
    expect(preloadImage).toHaveBeenCalledTimes(1);
    expect(preloadImage).toHaveBeenCalledWith('/antidote.webp');
});
