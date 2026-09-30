import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../../firebase';
import { applyBoardStackAction } from './boardStackActions';

export const persistBoardStackAction = (scenarioId, command, options) => runTransaction(db, async transaction => {
    const reference = doc(db, 'board_scenarios', scenarioId);
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error('El tablero ya no existe.');
    const current = snapshot.data();
    const result = applyBoardStackAction(current.items || [], command, options);
    const lastModified = Math.max(Date.now(), Number(current.lastModified || 0) + 1);
    transaction.update(reference, {
        items: result.items, lastModified, lastModifiedItemIds: result.changedIds,
        lastModifiedBy: options.actorId || null,
        lastModifiedByRole: options.isPlayerView ? 'player' : 'master',
    });
    return { ...result, lastModified };
});
