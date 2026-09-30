import React from 'react';
import { Package, X } from 'lucide-react';
import { TacticalWorkspaceShell } from '../../tactical-shared/components/TacticalWorkspaceShell';
import { CanvasSidebar } from './CanvasSidebar';
import CanvasCombatPanel from './CanvasCombatPanel';
import CanvasInitiativeTimeline from './CanvasInitiativeTimeline';
import CanvasCombatActionModal from './CanvasCombatActionModal';

/** Canvas-owned UI entry point. Shared tactical primitives stay behind this boundary. */
export const CanvasWorkspaceShell = (props) => {
    const handleCanvasCombatAction = (tokenId, actionId, data) => {
        if (actionId === 'stand_up') return props.combatRuntime?.standUp?.(tokenId, data?.id);
        if (
            actionId === 'attack'
            && data
            && props.targetingState?.phase === 'weapon_selection'
            && props.focusedTargetId
        ) {
            const opened = props.combatRuntime?.beginAttackDraft?.({
                attackerId: tokenId,
                targetId: props.focusedTargetId,
                weapon: data,
            });
            if (opened) props.handleCombatAction?.(tokenId, 'cancel_targeting');
            return;
        }
        return props.handleCombatAction?.(tokenId, actionId, data);
    };

    return (
        <>
            <TacticalWorkspaceShell
                {...props}
                handleCombatAction={handleCanvasCombatAction}
                isBoardMode={false}
                mode="canvas"
                SidebarComponent={CanvasSidebar}
                CombatPanelComponent={CanvasCombatPanel}
                TimelineComponent={CanvasInitiativeTimeline}
                timelineMode="initiative"
            />
            {props.catalogPlacementItem && (
                <div
                    className="pointer-events-auto fixed left-1/2 top-4 z-[190] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 border border-[#c8aa6e]/65 bg-[#080d18]/96 px-3 py-2 text-[#f0e6d2] shadow-[0_16px_36px_rgba(0,0,0,0.65)]"
                    data-testid="canvas-catalog-placement-mode"
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-slate-700 bg-black/35">
                        {props.catalogPlacementItem.image ? (
                            <img src={props.catalogPlacementItem.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <Package className="h-5 w-5 text-[#c8aa6e]" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <strong className="block truncate font-['Cinzel'] text-[10px] uppercase tracking-[0.12em]">
                            {props.catalogPlacementItem.item?.name || props.catalogPlacementItem.item?.nombre || 'Objeto'}
                        </strong>
                        <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-[0.14em] text-[#c8aa6e]">
                            Toca una casilla para colocarlo
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={props.cancelCatalogPlacement}
                        className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-slate-700 text-slate-400 transition-colors hover:text-white"
                        aria-label="Cancelar colocación de objeto"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            <CanvasCombatActionModal
                activeScenario={props.activeScenario}
                combatRuntime={props.combatRuntime}
                isPlayerView={props.isPlayerView}
                glossary={props.glossary}
            />
        </>
    );
};
