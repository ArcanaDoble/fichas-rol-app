import React, { useEffect, useRef } from 'react';
import { WORLD_SIZE } from '../../tactical-shared/spatial';
import { Package, X } from 'lucide-react';
import { TacticalWorkspaceShell } from '../../tactical-shared/components/TacticalWorkspaceShell';
import { CanvasSidebar } from './CanvasSidebar';
import CanvasCombatPanel from './CanvasCombatPanel';
import CanvasInitiativeTimeline from './CanvasInitiativeTimeline';
import CanvasCombatActionModal from './CanvasCombatActionModal';
import { CanvasCombatParticipation } from './CanvasCombatParticipation';
import { useCanvasTurnConfirmation } from '../useCanvasTurnConfirmation';

/** Canvas-owned UI entry point. Shared tactical primitives stay behind this boundary. */
export const CanvasWorkspaceShell = (props) => {
    const completeActivation = useCanvasTurnConfirmation({ pendingTurnState: props.pendingTurnState,
        confirmPendingMovement: props.handleConfirmMobileTacticalMove, completeActivation: props.combatRuntime?.completeActivation });
    const combat = props.activeScenario?.canvasCombat;
    const campaign = props.combatRuntime?.campaignRules;
    const hasPendingInitiative = campaign && props.isPlayerView && ['setup', 'active'].includes(combat?.status)
        && props.combatRuntime.controlledTokenIds?.some(id => combat.participants?.[id]?.awaitingRoll);
    const savedView = useRef(null);
    const targetId = props.combatRuntime?.campaignFocusTargetId;
    useEffect(() => {
        if (!targetId) {
            if (savedView.current) {
                props.setOffset?.(savedView.current.offset);
                props.setSelectedTokenIds?.(savedView.current.selected);
                savedView.current = null;
            }
            return undefined;
        }
        savedView.current ||= { offset: props.offset, selected: props.selectedTokenIds };
        props.setSelectedTokenIds?.([]);
        const center = () => {
            const bounds = props.containerRef.current?.getBoundingClientRect();
            const target = props.activeScenario?.items?.find(item => item.id === targetId);
            if (!bounds || !target) return;
            const landscape = bounds.height < 560 && bounds.width > 600;
            const dockHeight = document.querySelector('.campaign-direction-dock')?.getBoundingClientRect().height || 280;
            const aimX = landscape ? (bounds.width - 360) / 2 : bounds.width / 2;
            const aimY = landscape ? bounds.height / 2 : Math.max(190, (bounds.height - dockHeight + 80) / 2);
            props.setOffset?.({ x: aimX - bounds.width / 2 - (target.x + target.width / 2 - WORLD_SIZE / 2) * props.zoom,
                y: aimY - bounds.height / 2 - (target.y + target.height / 2 - WORLD_SIZE / 2) * props.zoom });
        };
        center();
        const observer = new ResizeObserver(center);
        const dock = document.querySelector('.campaign-direction-dock');
        if (dock) observer.observe(dock);
        if (props.containerRef.current) observer.observe(props.containerRef.current);
        window.addEventListener('resize', center);
        return () => { observer.disconnect(); window.removeEventListener('resize', center); };
    }, [targetId, props.zoom, props.activeScenario?.id]);
    const handleCanvasCombatAction = (tokenId, actionId, data) => {
        if (actionId === 'use_spell') {
            props.itemUseSystem?.cancel?.();
            props.handleCombatAction?.(tokenId, 'cancel_targeting');
            return props.itemUseSystem?.spellUseSystem?.begin?.(tokenId, data?.slotIndex);
        }
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
            <div className="campaign-combat-world" data-aiming={Boolean(targetId)} inert={props.combatRuntime?.campaignVisible || undefined}>
            <TacticalWorkspaceShell
                {...props}
                combatRuntime={{ ...props.combatRuntime, completeActivation, hasPendingInitiative,
                    renderParticipationControl: campaign && props.combatRuntime?.setCombatParticipation
                        ? token => <CanvasCombatParticipation key={token.id} token={token} combat={combat}
                            onChange={props.combatRuntime.setCombatParticipation} /> : null,
                }}
                handleCombatAction={handleCanvasCombatAction}
                isBoardMode={false}
                mode="canvas"
                sectionTitle={props.activeScenario?.rulesSystem === 'campaign' ? 'Canvas · Campaña' : 'Canvas · Roguelite'}
                SidebarComponent={CanvasSidebar}
                CombatPanelComponent={CanvasCombatPanel}
                TimelineComponent={CanvasInitiativeTimeline}
                timelineMode="initiative"
            />
            </div>
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
