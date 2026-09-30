import { canUsePlayerTokenHoverInspection } from '../components/createSceneItemRenderer';

test('enables passive token inspection only for players when the mode opts in', () => {
    expect(canUsePlayerTokenHoverInspection({
        allowPlayerTokenHoverInspection: true,
        isPlayerView: true,
        isToken: true,
    })).toBe(true);

    expect(canUsePlayerTokenHoverInspection({
        allowPlayerTokenHoverInspection: false,
        isPlayerView: true,
        isToken: true,
    })).toBe(false);
    expect(canUsePlayerTokenHoverInspection({
        allowPlayerTokenHoverInspection: true,
        isPlayerView: false,
        isToken: true,
    })).toBe(false);
    expect(canUsePlayerTokenHoverInspection({
        allowPlayerTokenHoverInspection: true,
        isPlayerView: true,
        isToken: false,
    })).toBe(false);
});

