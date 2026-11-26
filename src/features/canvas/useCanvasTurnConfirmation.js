import { useRef } from 'react';

// Finishing a preview and finishing an activation are separate user actions.
// Route both HUD and initiative-panel buttons through the same gate.
export const useCanvasTurnConfirmation = ({ pendingTurnState, confirmPendingMovement, completeActivation }) => {
    const busy = useRef(false);
    return async tokenId => {
        if (busy.current) return false;
        busy.current = true;
        try {
            const pending = pendingTurnState?.tokenId === tokenId ? pendingTurnState : null;
            const hasPendingMovement = pending && ((Number(pending.moveCost) || 0) > 0
                || (Number.isFinite(pending.x) && Number.isFinite(pending.startX) && pending.x !== pending.startX)
                || (Number.isFinite(pending.y) && Number.isFinite(pending.startY) && pending.y !== pending.startY));
            if (hasPendingMovement) return await confirmPendingMovement?.(null, tokenId);
            return await completeActivation?.(tokenId);
        } finally { busy.current = false; }
    };
};
