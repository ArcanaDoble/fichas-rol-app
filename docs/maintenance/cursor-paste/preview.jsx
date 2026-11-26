// The real Canvas with the same in-memory scene used for movement regression checks.
import '../../design/prototypes/forced-movement/ForcedMovementPreview';
import { readPreviewScene, savePreviewScene } from '../../../output/playwright/campaign-canvas-firestore';

const scene = readPreviewScene();
const walls = [[6020, 5940, 6230, 5940], [6230, 5940, 6230, 6150], [6230, 6150, 6020, 6150], [6020, 6150, 6020, 5940]]
    .map(([x1, y1, x2, y2], index) => ({ id: `paste-room-${index}`, type: 'wall',
        x1, y1, x2, y2, x: Math.min(x1, x2), y: Math.min(y1, y2),
        width: Math.max(5, Math.abs(x2 - x1)), height: Math.max(5, Math.abs(y2 - y1)), color: '#c8aa6e' }));
savePreviewScene({ items: [...scene.items, ...walls] });
