import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';

import PropTypes from 'prop-types';





import { getCombatEffectLifetimeMs } from '../../components/FloatingCombatEffects';
import { db } from '../../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where, orderBy, getDoc, serverTimestamp, limit } from 'firebase/firestore';

import { getCombatQueueDisplayState, sortCombatQueueEntries } from '../../utils/combatQueue';

import { getCardStackIds, isCardContainerItem, isCardHiddenByContainerForPlayer, isCardItem, isMasterLibraryDeck, preservePendingHandTransferState } from '../../utils/cardBoard';
import { RECENT_LOCAL_WRITE_PROTECTION_MS, createSerialPersistQueue, getChangedItemFields, getRemoteModifiedItemIds, normalizeRecentLocalWrite, shouldTreatRemotePositionAsConflict } from '../../utils/scenarioSync';
import { applyBoardDieRolls } from '../../utils/boardDicePhysics';
import {
    ACTIVE_BOARD_DIE_ROLL_IDS, BOARD_DICE_ROLL_SIDES, BOARD_DIE_SIDES,
} from '../../utils/boardDiceRuntime';
import { isBoardLightItem, selectAnimatedBoardLightIds } from '../../utils/boardLighting';

// --- Constants ---
 // Importamos releaseFile para limpiar

import { MIN_GRID_CELL_SIZE, DEFAULT_GRID_CONFIG, normalizeGridConfig, getFiniteMapDimensions, getGridPixelDimensions, getExactBackgroundGridPresets, getBackgroundGridPresetIndex } from './grid';
import { isBoardDieItem, isCombatTokenItem, getCardCenter, isPointInsideExpandedItem, getDefaultTokenDimensions, getReactionBudgetForEvent, getReactionSpeedSpentByEvent, isValidSelectionBox } from './legacyCombatRules';
import { WORLD_SIZE, snapWorldPositionToGrid, getCenteredSpawnPosition } from './spatial';


import { syncTokenWithSheet } from './tokenSheetSync';
import { createSceneItemRenderer } from './components/createSceneItemRenderer';


import { useCanvasGridController } from './useTacticalGridController';
import { useCanvasInteractionController } from './useTacticalInteractionController';
import { areScenarioFieldValuesEqual } from './scenarioState';
import { createCanvasScenarioController } from './createTacticalScenarioController';
import { createCanvasTokenController } from './createTacticalTokenController';

















































































































 // Tamaño de la celda en px
 // Tamaño del mundo canvas en px (Aumentado para mapas 4k)







// Helpers matemáticos para Muros y Colisiones

// Genera los puntos de un polígono de sombra proyectado





// =============================================================================
// SpeedTimeline  Minimal horizontal initiative tracker based on SPEED
// Aesthetic: Matches the dark-fantasy gold/slate palette of the canvas UI
// =============================================================================

// --- Helper: Resolve item image (mirrors LoadoutView getObjectImage) ---




// --- Helper: Get rarity visual info ---

// --- Helper: Transform character sheet data into token format ---


// --- Normalize glossary word (mirrors LoadoutView) ---

// =============================================================================
// EquipmentSection  Inventory-style equipment panel for canvas inspector
// Mirrors the aesthetic of LoadoutView / Mazo Inicial / Inventario
// =============================================================================

const EmptySceneItemVisual = () => null;

const TacticalSectionCore = ({ modeDefinition, onBack, currentUserId = 'user-dm', isMaster = true, playerName = '', isPlayerView = false, existingPlayers = [], characterData = null, onOpenCharacterSheet = null, armas = [], armaduras = [], habilidades = [], accesorios = [], glossary = [], rarityColorMap = {}, highlightText = (t) => t }) => {
    const {
        id: mode,
        isBoardMode,
        scenarioCollectionName,
        visibilityDocName,
        sectionTitle,
        buildTimelineTokens,
        createCombatController,
        useFeatureController,
        WorkspaceShell,
        sceneItemVisuals = {},
        syncTokenWithSheet: syncModeTokenWithSheet = syncTokenWithSheet,
        loadRuntimeSheet,
        persistRuntimeItems,
        TokenResourcesComponent,
        EquipmentSectionComponent,
    } = modeDefinition;
    const {
        BoardDieVisual = EmptySceneItemVisual,
        BoardMarkerVisual = EmptySceneItemVisual,
    } = sceneItemVisuals;
    // Estado de la cámara (separado en zoom y offset como en MinimapV2)
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Estado para la Biblioteca de Escenarios
    const [scenarios, setScenarios] = useState([]);
    const [activeScenario, setActiveScenario] = useState(null);
    const [globalActiveId, setGlobalActiveId] = useState(null);
    const [availableCharacters, setAvailableCharacters] = useState([]);
    const activeScenarioRef = useRef(null);
    useEffect(() => { activeScenarioRef.current = activeScenario; }, [activeScenario]);
    const lastRemoteScenarioItemsRef = useRef([]);
    const localUnsavedEditsRef = useRef({}); // { [itemId]: { [key]: value } }
    const localUnsavedConfigEditsRef = useRef({}); // { [configKey]: value }
    const localUnsavedScenarioEditsRef = useRef({}); // { name, allowedPlayers, ... }
    const recentLocalWritesRef = useRef({}); // { [itemId]: { fields: { [key]: value }, time } }
    const lastFlipTimesRef = useRef({}); // { [cardId]: timestamp }
    const persistQueueRef = useRef(null);
    if (!persistQueueRef.current) {
        persistQueueRef.current = createSerialPersistQueue();
    }
    const instantBoardDieMoveIdsRef = useRef(new Set());

    const registerLocalConfigDraft = (previousConfig, nextConfig) => {
        const changedFields = getChangedItemFields(nextConfig, previousConfig);
        if (Object.keys(changedFields).length === 0) return;

        localUnsavedConfigEditsRef.current = {
            ...localUnsavedConfigEditsRef.current,
            ...changedFields,
        };
    };

    const registerLocalScenarioDraft = (updates) => {
        localUnsavedScenarioEditsRef.current = {
            ...localUnsavedScenarioEditsRef.current,
            ...(updates || {}),
        };
    };

    const registerLocalItemDraftChanges = (previousItems = [], nextItems = []) => {
        const previousMap = new Map((previousItems || []).map(item => [item.id, item]));

        (nextItems || []).forEach(item => {
            const changedFields = getChangedItemFields(item, previousMap.get(item.id));
            if (Object.keys(changedFields).length === 0) return;

            localUnsavedEditsRef.current[item.id] = {
                ...(localUnsavedEditsRef.current[item.id] || {}),
                ...changedFields,
            };
        });
    };

    const [viewMode, setViewMode] = useState('LIBRARY'); // 'LIBRARY' | 'EDIT'
    const lastActionTimeRef = useRef(0);

    // Escuchar rolls de dados para actualizar firebase al terminar
    useEffect(() => {
        const handleSaveDieRoll = (e) => {
            const currentScenario = activeScenarioRef.current;
            if (!currentScenario) return;
            const rolls = (Array.isArray(e.detail?.rolls) ? e.detail.rolls : [e.detail])
                .filter(roll => roll?.id && currentScenario.items?.some(item => item.id === roll.id));
            if (rolls.length === 0) return;

            const rollsById = new Map(rolls.map(roll => [roll.id, roll]));
            const hasInstantRoll = rolls.some(roll => roll.instant);
            rolls.forEach((roll) => {
                if (roll.instant) instantBoardDieMoveIdsRef.current.add(roll.id);
            });
            const nextItems = applyBoardDieRolls(currentScenario.items, [...rollsById.values()]);
            if (hasInstantRoll) {
                flushSync(() => {
                    setActiveScenario(prev => ({ ...prev, items: nextItems }));
                });
            } else {
                setActiveScenario(prev => ({ ...prev, items: nextItems }));
            }

            rolls.filter(roll => roll.instant).forEach((roll) => {
                const innerWrapper = document.getElementById(`token-inner-wrapper-${roll.id}`);
                if (innerWrapper) {
                    innerWrapper.style.transition = 'none';
                    innerWrapper.style.transform = 'translate(0px, 0px) translateY(0px) scale(1)';
                }
                window.setTimeout(() => {
                    instantBoardDieMoveIdsRef.current.delete(roll.id);
                    if (innerWrapper) {
                        innerWrapper.style.transition = '';
                    }
                }, 500);
            });

            safePersistItems(currentScenario.id, nextItems, currentScenario.items);
        };
        window.addEventListener('save-die-roll', handleSaveDieRoll);
        return () => window.removeEventListener('save-die-roll', handleSaveDieRoll);
    }, [scenarioCollectionName]);
    const [showToast, setShowToast] = useState(false);
    const [toastType, setToastType] = useState('success');
    const [toastMessage, setToastMessage] = useState('');
    const [toastSubMessage, setToastSubMessage] = useState('');

    const triggerToast = useCallback((message = '', subMessage = '', type = 'success') => {
        setToastType(type);
        setToastMessage(message);
        setToastSubMessage(subMessage);
        setShowToast(true);
    }, []);

    const getLocalSyncActorId = useCallback(() => (
        isPlayerView
            ? `player:${playerName || currentUserId || 'unknown'}`
            : `master:${currentUserId || 'master'}`
    ), [currentUserId, isPlayerView, playerName]);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [pendingImageFile, setPendingImageFile] = useState(null); // Archivo real para subir a Storage
    const [isSaving, setIsSaving] = useState(false); // Estado de guardado en progreso
    const [clipboard, setClipboard] = useState([]); // Portapapeles para copiar/pegar tokens

    // Helper para normalizar coordenadas de eventos (Mouse vs Touch)
    const getEventCoords = (e, identifier = null) => {
        if (e.touches && e.touches.length > 0) {
            if (identifier !== null) {
                const touch = Array.from(e.touches).find(t => t.identifier === identifier);
                if (touch) return { x: touch.clientX, y: touch.clientY };
                // Si el toque específico ya no está, usamos el primero como fallback razonable
            }
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const isUsablePendingTurnState = (state) => {
        if (!state || !state.tokenId) return false;
        return [state.x, state.y, state.startX, state.startY].every(value => Number.isFinite(value));
    };

    // Helper para enriquecer tokens con datos de la ficha (armas, atributos, etc.)
    const enrichTokenWithCharacterData = useCallback((rawToken) => {
        if (!rawToken || !rawToken.linkedCharacterId || availableCharacters.length === 0) return rawToken;
        const charData = availableCharacters.find(c => c.id === rawToken.linkedCharacterId);
        if (!charData) return rawToken;
        return syncModeTokenWithSheet(
            rawToken,
            charData,
            {
                armas,
                armaduras,
                habilidades,
                accesorios,
            },
            { preserveTokenState: true, skipArmorSync: true }
        );
    }, [availableCharacters, armas, armaduras, habilidades, accesorios, syncModeTokenWithSheet]);

    // Tabs del Sidebar
    const [activeTab, setActiveTab] = useState(isPlayerView ? 'TOKENS' : 'CONFIG'); // 'CONFIG' | 'TOKENS' | 'ACCESS' | 'INSPECTOR'
    const [activeLayer, setActiveLayer] = useState('TABLETOP'); // 'TABLETOP' | 'LIGHTING'
    const [tokens, setTokens] = useState([]);
    const [uploadingToken, setUploadingToken] = useState(false);
    const [cards, setCards] = useState([]);
    const [uploadingCard, setUploadingCard] = useState(false);
    const [boardDecks, setBoardDecks] = useState([]);

    // Estado para arrastrar y ordenar en la biblioteca (Sidebar)
    const [draggedLibraryItemId, setDraggedLibraryItemId] = useState(null);
    const [draggedLibraryItemType, setDraggedLibraryItemType] = useState(null); // 'token' | 'card'
    const [dragOverLibraryItemId, setDragOverLibraryItemId] = useState(null);

    // Estado para Drag & Drop de Tokens en el Canvas
    const [draggedTokenId, setDraggedTokenId] = useState(null); // ID del token principal being dragged (para referencia visual inmediata)
    const [tokenDragStart, setTokenDragStart] = useState({ x: 0, y: 0, identifier: null }); // Posición inicial del mouse/touch
    const [tokenOriginalPos, setTokenOriginalPos] = useState({}); // Mapa de posiciones originales { [id]: {x, y} }
    const [dragVisualOrigin, setDragVisualOrigin] = useState({}); // Ancla visual fija del ghost/linea durante el drag
    const [combatOccupancyFeedback, setCombatOccupancyFeedback] = useState(null);
    const [selectedTokenIds, setSelectedTokenIds] = useState([]); // Array de IDs seleccionados
    const [activeBoardHandTokenId, setActiveBoardHandTokenId] = useState(null);
    const [rotatingTokenId, setRotatingTokenId] = useState(null);
    const [resizingTokenId, setResizingTokenId] = useState(null); // Nuevo estado para resize
    const [draggingHandCard, setDraggingHandCard] = useState(null);
    const handDragGhostRef = useRef(null);
    const handDragGeometryRef = useRef(null);
    const handDragFrameRef = useRef(null);
    const handDragPointRef = useRef(null);
    const [previewedBoardCard, setPreviewedBoardCard] = useState(null);
    const [currentDieRollSpeed, setCurrentDieRollSpeed] = useState(0);
    const [dragDirection, setDragDirection] = useState(0);
    const resizeStartRef = useRef(null); // { x, y, width, height }
    const dieLaunchFeedbackRef = useRef({
        frame: null,
        speed: 0,
        direction: 0,
    });

    const queueDieLaunchFeedback = useCallback((speed, direction) => {
        const nextSpeed = Math.max(0, Math.min(1, Number(speed) || 0));
        const nextDirection = Number.isFinite(direction) ? direction : 0;
        dieLaunchFeedbackRef.current.speed = nextSpeed;
        dieLaunchFeedbackRef.current.direction = nextDirection;

        if (dieLaunchFeedbackRef.current.frame !== null) {
            return;
        }

        dieLaunchFeedbackRef.current.frame = requestAnimationFrame(() => {
            dieLaunchFeedbackRef.current.frame = null;
            setCurrentDieRollSpeed((prev) => (
                Math.abs(prev - dieLaunchFeedbackRef.current.speed) < 0.004
                    ? prev
                    : dieLaunchFeedbackRef.current.speed
            ));
            setDragDirection((prev) => (
                Math.abs(prev - dieLaunchFeedbackRef.current.direction) < 0.15
                    ? prev
                    : dieLaunchFeedbackRef.current.direction
            ));
        });
    }, []);

    const resetDieLaunchFeedback = useCallback(() => {
        if (dieLaunchFeedbackRef.current.frame !== null) {
            cancelAnimationFrame(dieLaunchFeedbackRef.current.frame);
            dieLaunchFeedbackRef.current.frame = null;
        }
        dieLaunchFeedbackRef.current.speed = 0;
        dieLaunchFeedbackRef.current.direction = 0;
        setCurrentDieRollSpeed(0);
    }, []);

    useEffect(() => () => {
        if (dieLaunchFeedbackRef.current.frame !== null) {
            cancelAnimationFrame(dieLaunchFeedbackRef.current.frame);
        }
    }, []);

    // Detección de móvil para deshabilitar ciertas funcionalidades problemáticas
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);


    const tokenOriginalPosRef = useRef({});
    useEffect(() => { tokenOriginalPosRef.current = tokenOriginalPos; }, [tokenOriginalPos]);

    // --- ESTADO DE TURNO PENDIENTE (MODO COMBATE) ---
    const [pendingTurnState, setPendingTurnState] = useState(null);
    const [combatEventQueue, setCombatEventQueue] = useState([]);
    const [activeCombatEventId, setActiveCombatEventId] = useState(null);
    const [activeCombatAnimations, setActiveCombatAnimations] = useState([]);
    const seenAnimIdsRef = useRef(new Set()); // Persistent dedup set across renders
    const seenSyncedEffectIdsRef = useRef(new Set()); // Dedup para efectos visuales compartidos
    const resolvingCombatEventsRef = useRef(new Set());
    const [resolvedEventCount, setResolvedEventCount] = useState(0);
    const locallyResolvedEventsRef = useRef(new Set()); // Track events resolved on THIS device
    const [combatLog, setCombatLog] = useState([]);
    const [boardDicePool, setBoardDicePool] = useState(() => (
        BOARD_DICE_ROLL_SIDES.reduce((acc, sides) => ({ ...acc, [sides]: sides === 20 ? 1 : 0 }), {})
    ));
    const [boardDiceExplosive, setBoardDiceExplosive] = useState(() => (
        BOARD_DICE_ROLL_SIDES.reduce((acc, sides) => ({ ...acc, [sides]: false }), {})
    ));
    const [boardDiceRollLog, setBoardDiceRollLog] = useState([]);
    const [isRollingBoardDice, setIsRollingBoardDice] = useState(false);
    // { tokenId, x, y, startX, startY, moveCost, actionCost, actionNames: [] }

    const effectiveCombatEventQueue = useMemo(() => {
        const scenarioItems = activeScenario?.items || [];

        return combatEventQueue.map((entry) => {
            const event = entry?.event;
            if (!event?.targetId) return entry;

            const targetToken = scenarioItems.find((item) => item.id === event.targetId) || entry.targetToken;
            const targetBaseVelocity = Math.max(0, Number(targetToken?.velocidad) || 0);
            const previousReactionSpent = combatEventQueue.reduce((sum, queuedEntry) => {
                const queuedEvent = queuedEntry?.event;
                if (!queuedEvent || queuedEvent.id === event.id || queuedEvent.targetId !== event.targetId) {
                    return sum;
                }

                return sum + getReactionSpeedSpentByEvent(queuedEvent);
            }, 0);
            const attackerFinalVel = Number(event.attackerFinalVel);
            const effectiveReactionBudget = Number.isFinite(attackerFinalVel)
                ? Math.max(0, Math.round(attackerFinalVel - targetBaseVelocity - previousReactionSpent))
                : Math.max(0, getReactionBudgetForEvent(event) - previousReactionSpent);

            return {
                ...entry,
                event: {
                    ...event,
                    reactionBudget: effectiveReactionBudget,
                    baseReactionBudget: getReactionBudgetForEvent(event),
                    reactionSpeedAlreadyCommitted: previousReactionSpent,
                },
            };
        });
    }, [combatEventQueue, activeScenario?.items]);

    const combatQueueDisplay = useMemo(
        () => getCombatQueueDisplayState({
            queue: effectiveCombatEventQueue,
            resolvedCount: resolvedEventCount,
            activeEventId: activeCombatEventId
        }),
        [effectiveCombatEventQueue, resolvedEventCount, activeCombatEventId]
    );
    const activeCombatQueueEntry = combatQueueDisplay.activeEntry;

    useEffect(() => {
        if (!activeCombatEventId) return;
        if (!effectiveCombatEventQueue.some((entry) => entry?.event?.id === activeCombatEventId)) {
            setActiveCombatEventId(null);
        }
    }, [activeCombatEventId, effectiveCombatEventQueue]);

    // --- TARGETING STATE ---
    const [targetingState, setTargetingState] = useState(null);
    // { attackerId, actionId, data, phase: 'targeting' | 'weapon_selection' | 'sweep_selection' }
    const [sweepHoverSide, setSweepHoverSide] = useState(null);
    const [mobileMoveHoverCellKey, setMobileMoveHoverCellKey] = useState(null);

    const [focusedTargetId, setFocusedTargetId] = useState(null); // ID del token fijado como objetivo

    // --- MASTER COMBAT HUD TOGGLE ---
    const [showMasterCombatHUD, setShowMasterCombatHUD] = useState(false);
    const lastMasterHudTokenIdRef = useRef(null); // Recuerda el último token para el HUD del master

    // Refs para acceder a estados actualizados dentro de onSnapshot sin re-suscripciones
    const draggedTokenIdRef = useRef(null);
    useEffect(() => { draggedTokenIdRef.current = draggedTokenId; }, [draggedTokenId]);
    const boardCardHandTransferRef = useRef(null);
    const pendingBoardHandTransferLocksRef = useRef(new globalThis.Map());
    const boardHandHoverSuppressionCleanupRef = useRef(null);
    const [isBoardHandHoverSuppressed, setIsBoardHandHoverSuppressed] = useState(false);
    const lastTouchTokenInteractionRef = useRef({ id: null, time: 0 });
    const selectedTokenIdsRef = useRef([]);
    useEffect(() => { selectedTokenIdsRef.current = selectedTokenIds; }, [selectedTokenIds]);

    // Limpiar el estado de hover táctil móvil si cambia la selección, la posición del token o el estado de turno
    const selectedTokenForHover = activeScenario?.items?.find(item => selectedTokenIds.includes(item.id));
    const selectedTokenForHoverX = selectedTokenForHover?.x;
    const selectedTokenForHoverY = selectedTokenForHover?.y;
    useEffect(() => {
        setMobileMoveHoverCellKey(null);
    }, [selectedTokenIds, selectedTokenForHoverX, selectedTokenForHoverY, pendingTurnState]);

    const mobileMoveTouchStartRef = useRef(null);
    const lastSelectionTimeRef = useRef(0);
    useEffect(() => {
        lastSelectionTimeRef.current = Date.now();
    }, [selectedTokenIds]);

    useEffect(() => {
        if (!isBoardMode || !activeScenario?.items) return;
        const selectedCombatToken = activeScenario.items.find(item => (
            selectedTokenIds.includes(item.id) &&
            isCombatTokenItem(item) &&
            (!isPlayerView || item.controlledBy?.includes(playerName))
        ));
        if (selectedCombatToken) {
            setActiveBoardHandTokenId(selectedCombatToken.id);
        }
    }, [activeScenario?.items, isBoardMode, isPlayerView, playerName, selectedTokenIds]);
    const rotatingTokenIdRef = useRef(null);
    useEffect(() => { rotatingTokenIdRef.current = rotatingTokenId; }, [rotatingTokenId]);
    const resizingTokenIdRef = useRef(null);
    useEffect(() => { resizingTokenIdRef.current = resizingTokenId; }, [resizingTokenId]);
    const pendingTurnStateRef = useRef(null);
    useEffect(() => { pendingTurnStateRef.current = pendingTurnState; }, [pendingTurnState]);
    const cardStackQuickActionBlockUntilRef = useRef(0);
    const cardPreviewHoldRef = useRef(null);
    const cardPreviewSuppressTouchEndRef = useRef(false);
    useEffect(() => {
        if (pendingTurnState && !isUsablePendingTurnState(pendingTurnState)) {
            pendingTurnStateRef.current = null;
            setPendingTurnState(null);
        }
    }, [pendingTurnState]);
    useEffect(() => {
        if (targetingState?.phase !== 'sweep_selection') {
            setSweepHoverSide(null);
        }
    }, [targetingState]);

    // Fetch available characters for Master or Player linking
    useEffect(() => {
        let unsubClasses = () => { };
        let unsubChars = () => { };

        // Todos los participantes del canvas necesitan acceso a los personajes y clases
        // para que el HUD de combate y las reacciones funcionen sincronizadas y con datos completos.
        unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
            const classesData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, _isTemplate: true }));
            setAvailableCharacters(prev => {
                const other = prev.filter(c => !c._isTemplate);
                return [...classesData, ...other];
            });
        });

        unsubChars = onSnapshot(collection(db, 'characters'), (snap) => {
            const charsData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, _isTemplate: false }));
            setAvailableCharacters(prev => {
                const other = prev.filter(c => c._isTemplate);
                return [...other, ...charsData];
            });
        });

        return () => {
            if (typeof unsubClasses === 'function') unsubClasses();
            if (typeof unsubChars === 'function') unsubChars();
        };
    }, [isMaster, playerName]);

    const boardDeckOwnerIds = useMemo(() => {
        if (!isBoardMode) return [];
        if (!isPlayerView) return ['master'];

        const ids = new globalThis.Set([currentUserId, playerName].filter(Boolean));
        availableCharacters.forEach((character) => {
            if (!character || character._isTemplate) return;
            const owner = character.owner || character.ownerName || character.playerName;
            if (
                owner === playerName ||
                owner === currentUserId ||
                character.name === playerName ||
                character.displayName === playerName
            ) {
                ids.add(character.id);
                if (character.name) ids.add(character.name);
            }
        });
        return Array.from(ids);
    }, [availableCharacters, currentUserId, isBoardMode, isPlayerView, playerName]);

    useEffect(() => {
        if (!isBoardMode) {
            setBoardDecks([]);
            return undefined;
        }

        const unsubDecks = onSnapshot(collection(db, 'card_decks'), (snap) => {
            const ownerIds = new globalThis.Set(boardDeckOwnerIds);
            const decksData = snap.docs
                .map(deckDoc => ({ id: deckDoc.id, ...deckDoc.data() }))
                .filter(deck => !isMasterLibraryDeck(deck))
                .filter(deck => ownerIds.has(deck.ownerId))
                .sort((a, b) => {
                    const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
                    const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                });
            setBoardDecks(decksData);
        });

        return () => {
            if (typeof unsubDecks === 'function') unsubDecks();
        };
    }, [boardDeckOwnerIds, isBoardMode]);

    // Estado para Cuadro de Selección
    const [selectionBox, setSelectionBox] = useState(null); // { start: {x,y}, current: {x,y} } (Screen Coords)

    // Estado para Arrastre de Extremos de Muros
    const [draggingWallHandle, setDraggingWallHandle] = useState(null); // { id, handleIndex: 1 | 2 }

    // Estado para Dibujo de Muros
    const [isDrawingWall, setIsDrawingWall] = useState(false);
    const [wallDrawingStart, setWallDrawingStart] = useState(null); // { x, y } en Mundo
    const [wallDrawingCurrent, setWallDrawingCurrent] = useState(null); // { x, y } en Mundo

    // Configuración de movimiento

    // Refs para gestión de eventos directos (performance)
    const containerRef = useRef(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    // No longer needed: const transformRef = useRef(transform);

    // --- Gestión de Notificaciones (Auto-hide) ---
    useEffect(() => {
        if (showToast) {
            const duration = toastType === 'success' ? 3000 : 4000;
            const timer = setTimeout(() => setShowToast(false), duration);
            return () => clearTimeout(timer);
        }
    }, [showToast, toastType]);

    const lastSelectedIdRef = useRef(null);

    // Auto-open Inspector on Selection
    useEffect(() => {
        // No hacer nada si estamos rotando
        if (rotatingTokenId) return;

        if (selectedTokenIds.length === 1) {
            // Auto-open deshabilitado a petición del usuario. Solo doble clic abre inspector.
            const currentId = selectedTokenIds[0];
            lastSelectedIdRef.current = currentId;
        } else {
            // Si no hay selección o hay múltiple, reseteamos la referencia
            lastSelectedIdRef.current = null;
            setTargetingState(null); // Cancelar targeting si cambia la selección
            setFocusedTargetId(null);
            if (selectedTokenIds.length === 0 && activeTab === 'INSPECTOR') {
                setActiveTab(isPlayerView ? 'TOKENS' : 'CONFIG');
            }
        }
    }, [selectedTokenIds, rotatingTokenId, activeTab]);


    // Effect to sync global state and auto-load for players
    useEffect(() => {
        console.log("Monitoring global canvas visibility...");
        let activeScenarioUnsub = null;
        let activeScenarioListenerId = null;

        const globalUnsub = onSnapshot(doc(db, 'gameSettings', visibilityDocName), (docSnap) => {
            const data = docSnap.exists() ? docSnap.data() : {};
            const activeId = data.activeScenarioId || null;
            console.log("📡 canvasVisibility updated  activeScenarioId:", activeId);
            setGlobalActiveId(activeId);

            // If no active scenario, clear local state for players
            if (isPlayerView && !activeId) {
                setActiveScenario(null);
                setViewMode('LIBRARY');
                if (typeof activeScenarioUnsub === 'function') activeScenarioUnsub();
                activeScenarioUnsub = null;
                activeScenarioListenerId = null;
                return;
            }

            // If activeId changed or we don't have a listener yet
            if (isPlayerView && activeId) {
                if (activeScenarioListenerId === activeId && activeScenarioUnsub) return;
                if (typeof activeScenarioUnsub === 'function') activeScenarioUnsub();
                activeScenarioListenerId = activeId;

                console.log("Active scenario detected:", activeId);
                const scenarioRef = doc(db, scenarioCollectionName, activeId);
                activeScenarioUnsub = onSnapshot(scenarioRef, (scenarioDoc) => {
                    if (scenarioDoc.exists()) {
                        const sData = { id: scenarioDoc.id, ...scenarioDoc.data() };
                        const hasPermission = sData.allowedPlayers?.includes(playerName);

                        if (hasPermission) {
                            if (activeScenarioRef.current?.id !== sData.id) {
                                loadScenario(sData);
                            }
                        } else {
                            setActiveScenario(null);
                            setViewMode('LIBRARY');
                        }
                    } else {
                        setActiveScenario(null);
                        setViewMode('LIBRARY');
                    }
                });
            }
        });

        return () => {
            if (typeof globalUnsub === 'function') globalUnsub();
            if (typeof activeScenarioUnsub === 'function') activeScenarioUnsub();
        };
    }, [isPlayerView, playerName]);

    const setGlobalActiveScenario = async (scenarioId) => {
        console.log("🎬 setGlobalActiveScenario called with:", scenarioId);
        try {
            await setDoc(doc(db, 'gameSettings', visibilityDocName), {
                activeScenarioId: scenarioId,
                updatedAt: serverTimestamp()
            }, { merge: true });
            console.log("✅ Global scenario updated successfully:", scenarioId);
            triggerToast(
                scenarioId ? "Transmisión Activada" : "Transmisión Detenida",
                scenarioId ? "Los jugadores pueden ver el escenario" : "Escenario oculto para jugadores",
                'success'
            );
        } catch (e) {
            console.error(" Error toggling active scenario:", e);
            triggerToast("Error de Transmisión", e.message || "No se pudo actualizar", 'error');
        }
    };

    // Listener para Sincronización en Tiempo Real (Multi-navegador)
    useEffect(() => {
        if (!activeScenario?.id) return;

        // Suscribirse a cambios en el documento del escenario activo
        const unsub = onSnapshot(doc(db, scenarioCollectionName, activeScenario.id), (docSnap) => {
            if (docSnap.exists()) {
                const remoteData = docSnap.data();
                const remoteItems = remoteData.items || [];
                lastRemoteScenarioItemsRef.current = remoteItems;
                const normalizedRemoteConfig = remoteData.config
                    ? normalizeGridConfig(remoteData.config)
                    : null;
                const localConfigDraft = isPlayerView
                    ? {}
                    : localUnsavedConfigEditsRef.current;
                const synchronizedConfig = normalizedRemoteConfig
                    ? normalizeGridConfig({ ...normalizedRemoteConfig, ...localConfigDraft })
                    : null;
                const localScenarioDraft = isPlayerView
                    ? {}
                    : localUnsavedScenarioEditsRef.current;

                // --- DETECCIÓN DE CONFLICTOS PARA JUGADORES ---
                // Si el Master mueve una ficha que nosotros estamos manipulando, cancelamos nuestra interacción
                // local para evitar saltos visuales (snap-back) y desincronización de turnos.
                if (isPlayerView && activeScenarioRef.current && remoteData.lastModified > (activeScenarioRef.current.lastModified || 0)) {
                    const remoteItemMap = new Map(remoteItems.map(item => [item.id, item]));
                    const localItemMap = new Map((activeScenarioRef.current?.items || []).map(item => [item.id, item]));
                    const remoteModifiedItemIds = getRemoteModifiedItemIds(remoteData);
                    const remoteWriterId = remoteData.lastModifiedBy || null;
                    const localWriterId = getLocalSyncActorId();
                    const conflictCheckTime = Date.now();
                    const livePendingTurnState = isUsablePendingTurnState(pendingTurnStateRef.current) ? pendingTurnStateRef.current : null;
                    let hasConflict = false;

                    // 1. Conflicto con Arrastre (Individual o Múltiple)
                    if (draggedTokenIdRef.current) {
                        const idsToCheck = Array.from(new globalThis.Set([
                            draggedTokenIdRef.current,
                            ...(selectedTokenIdsRef.current || []),
                            ...Object.keys(tokenOriginalPosRef.current || {})
                        ].filter(Boolean)));
                        const movedExternally = idsToCheck.some(id => {
                            const remoteItem = remoteItemMap.get(id);
                            const original = tokenOriginalPosRef.current[id];
                            const localCurrent = localItemMap.get(id);

                            return shouldTreatRemotePositionAsConflict({
                                itemId: id,
                                remoteItem,
                                originalItem: original,
                                localItem: localCurrent,
                                remoteModifiedItemIds,
                                remoteWriterId,
                                localWriterId,
                                recentLocalWrite: recentLocalWritesRef.current[id],
                                now: conflictCheckTime,
                            });
                        });

                        if (movedExternally) {
                            console.warn("⚠ Master movió fichas en drag. Cancelando.");
                            draggedTokenIdRef.current = null;
                            setDraggedTokenId(null);
                            setRotatingTokenId(null);
                            setResizingTokenId(null);
                            setTokenOriginalPos({});
                            setDragVisualOrigin({});
                            setCombatOccupancyFeedback(null);
                            document.body.style.cursor = 'default';
                            triggerToast("Movimiento Interrumpido", "El Master ha movido las fichas", 'warning');
                            hasConflict = true;
                        }
                    }

                    // 2. Conflicto con Turno Pendiente (Combat Mode)
                    if (!hasConflict && livePendingTurnState) {
                        const id = livePendingTurnState.tokenId;
                        const remoteItem = remoteItemMap.get(id);
                        const startX = livePendingTurnState.startX;
                        const startY = livePendingTurnState.startY;
                        const localCurrent = localItemMap.get(id);
                        const movedExternally = shouldTreatRemotePositionAsConflict({
                            itemId: id,
                            remoteItem,
                            originalItem: { id, x: startX, y: startY },
                            localItem: localCurrent,
                            remoteModifiedItemIds,
                            remoteWriterId,
                            localWriterId,
                            recentLocalWrite: recentLocalWritesRef.current[id],
                            now: conflictCheckTime,
                        });

                        if (movedExternally) {
                            pendingTurnStateRef.current = null;
                            setPendingTurnState(null);
                            triggerToast("Turno Reiniciado", "El Master ha movido tu ficha", 'warning');
                            hasConflict = true;
                        }
                    }

                    // 3. Conflicto con Rotación o Redimensión
                    if (!hasConflict && (rotatingTokenIdRef.current || resizingTokenIdRef.current)) {
                        const id = rotatingTokenIdRef.current || resizingTokenIdRef.current;
                        const remoteItem = remoteItemMap.get(id);
                        const localBaseline = localItemMap.get(id);
                        const remoteClaimsItemChange = !remoteModifiedItemIds || remoteModifiedItemIds.has(id);

                        // Solo hay conflicto si la posición remota ha cambiado respecto a lo que tenemos localmente
                        if (
                            remoteClaimsItemChange &&
                            remoteWriterId !== localWriterId &&
                            remoteItem &&
                            localBaseline &&
                            (remoteItem.x !== localBaseline.x || remoteItem.y !== localBaseline.y)
                        ) {
                            setRotatingTokenId(null);
                            setResizingTokenId(null);
                            triggerToast("Interacción Interrumpida", "El Master ha movido la ficha", 'warning');
                        }
                    }
                }

                // --- Sincronización de Items (Tokens) ---
                setActiveScenario(current => {
                    if (!current || current.id !== docSnap.id) return current;

                    const localItems = Array.isArray(current.items) ? current.items : [];
                    const localItemMap = new Map(localItems.map(item => [item.id, item]));
                    const remoteItemIds = new globalThis.Set(remoteItems.map(item => item.id));
                    const activeDragItemIds = new globalThis.Set([
                        draggedTokenIdRef.current,
                        ...(selectedTokenIdsRef.current || []),
                        ...Object.keys(tokenOriginalPosRef.current || {})
                    ].filter(Boolean));
                    const mergeTime = Date.now();
                    pendingBoardHandTransferLocksRef.current.forEach((expiresAt, itemId) => {
                        if (mergeTime >= expiresAt) {
                            pendingBoardHandTransferLocksRef.current.delete(itemId);
                        }
                    });
                    const livePendingTurnState = isUsablePendingTurnState(pendingTurnStateRef.current) ? pendingTurnStateRef.current : null;

                    // Protegemos las fichas que estamos manipulando localmente (tanto Master como jugadores)
                    // para evitar que los snapshots remotos borren arrastres activos, escrituras recientes (snapback),
                    // ediciones sin guardar del inspector o turnos pendientes.
                    const mergedItems = remoteItems.map(remote => {
                        const localItem = localItemMap.get(remote.id);
                        if (!localItem) return remote;

                        // Caso A: Preservar ediciones no guardadas del inspector (Drafts)
                        const localEdits = localUnsavedEditsRef.current[remote.id];
                        const transferProtectedItem = preservePendingHandTransferState(
                            remote,
                            localItem,
                            pendingBoardHandTransferLocksRef.current.get(remote.id),
                            mergeTime
                        );
                        let itemWithEdits = localEdits
                            ? { ...transferProtectedItem, ...localEdits }
                            : transferProtectedItem;

                        // Caso B: Preservar posición de fichas arrastradas activamente
                        if (draggedTokenIdRef.current && activeDragItemIds.has(remote.id)) {
                            return {
                                ...itemWithEdits,
                                x: localItem.x,
                                y: localItem.y,
                                rotation: localItem.rotation
                            };
                        }

                        // Caso C: Prevenir snapback/rubber-banding de campos de escritura persistente recientes
                        const recentWrite = normalizeRecentLocalWrite(recentLocalWritesRef.current[remote.id]);
                        if (recentWrite) {
                            if (mergeTime - recentWrite.time < RECENT_LOCAL_WRITE_PROTECTION_MS) {
                                // Limpiamos campos confirmados por el servidor
                                const fieldsToProtect = {};
                                let hasProtectedFields = false;

                                Object.entries(recentWrite.fields || {}).forEach(([key, val]) => {
                                    if (areScenarioFieldValuesEqual(remote[key], val)) {
                                        // Confirmado por el servidor, ya no es necesario protegerlo
                                    } else {
                                        fieldsToProtect[key] = val;
                                        hasProtectedFields = true;
                                    }
                                });

                                if (hasProtectedFields) {
                                    recentLocalWritesRef.current[remote.id] = {
                                        time: recentWrite.time,
                                        fields: fieldsToProtect
                                    };
                                    itemWithEdits = {
                                        ...itemWithEdits,
                                        ...fieldsToProtect
                                    };
                                } else {
                                    delete recentLocalWritesRef.current[remote.id];
                                }
                            } else {
                                delete recentLocalWritesRef.current[remote.id];
                            }
                        }

                        // Caso D: Preservar posición en Turnos Pendientes (Combat Mode, solo Jugadores)
                        if (isPlayerView && livePendingTurnState && remote.id === livePendingTurnState.tokenId) {
                            return {
                                ...itemWithEdits,
                                x: localItem.x,
                                y: localItem.y,
                                rotation: localItem.rotation,
                                velocidad: localItem.velocidad
                            };
                        }

                        return itemWithEdits;
                    });
                    const protectedLocalOnlyItems = localItems.filter(localItem => {
                        if (remoteItemIds.has(localItem.id)) return false;
                        const localDraft = localUnsavedEditsRef.current[localItem.id];
                        if (localDraft && Object.keys(localDraft).length > 0) return true;
                        const recentWrite = normalizeRecentLocalWrite(recentLocalWritesRef.current[localItem.id]);
                        return !!recentWrite && mergeTime - recentWrite.time < RECENT_LOCAL_WRITE_PROTECTION_MS;
                    });
                    const nextMergedItems = protectedLocalOnlyItems.length > 0
                        ? [...mergedItems, ...protectedLocalOnlyItems]
                        : mergedItems;

                    const itemsChanged = JSON.stringify(nextMergedItems) !== JSON.stringify(localItems);
                    const lastModifiedChanged = remoteData.lastModified !== current.lastModified;
                    const nextName = Object.prototype.hasOwnProperty.call(localScenarioDraft, 'name')
                        ? localScenarioDraft.name
                        : (remoteData.name ?? current.name);
                    const nextAllowedPlayers = Object.prototype.hasOwnProperty.call(localScenarioDraft, 'allowedPlayers')
                        ? localScenarioDraft.allowedPlayers
                        : (remoteData.allowedPlayers ?? current.allowedPlayers);
                    const configChanged = synchronizedConfig && (
                        JSON.stringify(synchronizedConfig) !== JSON.stringify(current.config)
                    );
                    const scenarioFieldsChanged = (
                        nextName !== current.name ||
                        JSON.stringify(nextAllowedPlayers || []) !== JSON.stringify(current.allowedPlayers || [])
                    );

                    if (itemsChanged || lastModifiedChanged || configChanged || scenarioFieldsChanged) {
                        console.log("Sincronizando tablero con datos remotos (Merging local locks)...");
                        return {
                            ...current,
                            items: nextMergedItems,
                            lastModified: remoteData.lastModified,
                            name: nextName,
                            allowedPlayers: nextAllowedPlayers,
                            ...(synchronizedConfig ? { config: synchronizedConfig } : {}),
                        };
                    }
                    return current;
                });

                // --- Sincronización de Configuración (Oscuridad, Grid, Fondo) ---
                if (synchronizedConfig) {
                    setGridConfig(currentConfig => {
                        // Comprobación profunda simple para evitar re-renders innecesarios
                        if (JSON.stringify(synchronizedConfig) !== JSON.stringify(currentConfig)) {
                            console.log("🌑 Sincronizando configuración (oscuridad/grid) remota...");
                            return synchronizedConfig;
                        }
                        return currentConfig;
                    });
                }
            }
        });

        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [activeScenario?.id, getLocalSyncActorId, isPlayerView, scenarioCollectionName]); // Solo se reinicia si cambiamos de escenario base o identidad de sincronización

    // --- Listener de Eventos de Combate Inminentes (Defensa Activa) ---
    useEffect(() => {
        if (!activeScenario?.id) return;
        // Tanto jugadores como el master necesitan escuchar:
        // jugador necesita playerName, master no lo tiene pero debe escuchar igual
        if (isPlayerView && !playerName) return;

        const q = query(
            collection(db, 'combat_events'),
            where('scenarioId', '==', activeScenario.id),
            where('status', 'in', ['esperando_reaccion', 'evadir_pendiente', 'parar_pendiente', 'recibir_pendiente', 'resuelto'])
        );

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const eventData = { id: change.doc.id, ...change.doc.data() };
                const isMasterView = !isPlayerView;

                if (change.type === 'added') {
                    const items = activeScenarioRef.current?.items || activeScenario.items || [];
                    const targetToken = items.find(i => i.id === eventData.targetId);

                    if (targetToken) {
                        const controlledBy = targetToken.controlledBy;
                        const isControlledByMe = isPlayerView && playerName && Array.isArray(controlledBy) && controlledBy.includes(playerName);
                        const isMasterNPC = isMasterView && (!controlledBy || !Array.isArray(controlledBy) || controlledBy.length === 0 || controlledBy.includes('master'));

                        if (isControlledByMe || isMasterNPC) {
                            setCombatEventQueue(prev => {
                                if (prev.some(e => e.event.id === eventData.id)) return prev;
                                if (prev.length === 0) setResolvedEventCount(0);
                                return sortCombatQueueEntries([
                                    ...prev,
                                    {
                                        event: {
                                            ...eventData,
                                            clientTimestamp: typeof eventData.clientTimestamp === 'number' ? eventData.clientTimestamp : Date.now(),
                                        },
                                        targetToken
                                    }
                                ]);
                            });
                        }
                    }
                } else if (change.type === 'modified') {
                    setCombatEventQueue(prev => {
                        // Actulizamos los datos dentro del evento
                        return sortCombatQueueEntries(
                            prev.map(e => e.event.id === eventData.id
                                ? {
                                    ...e,
                                    event: {
                                        ...eventData,
                                        clientTimestamp: typeof eventData.clientTimestamp === 'number'
                                            ? eventData.clientTimestamp
                                            : e.event.clientTimestamp,
                                    }
                                }
                                : e
                            )
                        );
                    });
                } else if (change.type === 'removed') {
                    const removedId = change.doc.id;
                    const wasResolvedLocally = locallyResolvedEventsRef.current.has(removedId);
                    resolvingCombatEventsRef.current.delete(removedId);

                    if (wasResolvedLocally) {
                        locallyResolvedEventsRef.current.delete(removedId);
                    } else {
                        setCombatEventQueue(prev => sortCombatQueueEntries(prev.filter(e => e.event.id !== removedId)));
                    }
                }
            });
        });

        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [activeScenario?.id, playerName, isPlayerView]);

    // --- Motor de Resolución de Combate (Solo Master) ---
    useEffect(() => {
        if (isPlayerView || !activeScenario?.id) return;

        const q = query(
            collection(db, 'combat_events'),
            where('scenarioId', '==', activeScenario.id),
            where('status', 'in', ['evadir_pendiente', 'parar_pendiente', 'recibir_pendiente'])
        );

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docs.forEach((docSnap) => {
                const event = { id: docSnap.id, ...docSnap.data() };
                resolveCombatEvent(event);
            });
        });

        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [isPlayerView, activeScenario?.id]);

    // --- Listener de Combat Log (últimas 3 entradas) ---
    useEffect(() => {
        if (!activeScenario?.id) return;

        // Limpiar el set de IDs vistos al cambiar de escenario para no bloquear nuevas animaciones
        seenAnimIdsRef.current.clear();

        const q = query(
            collection(db, 'combat_log'),
            orderBy('timestamp', 'desc'),
            limit(3)
        );
        const unsub = onSnapshot(q, (snapshot) => {
            const newAnims = [];
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const entry = { id: change.doc.id, ...change.doc.data() };
                    const animId = `anim_${entry.id}`;
                    const dedupeKey = entry.sourceEventId ? `event_${entry.sourceEventId}` : animId;

                    // Saltar si ya hemos procesado este evento (o este log si no trae sourceEventId)
                    if (seenAnimIdsRef.current.has(dedupeKey)) return;

                    // Solo disparar para entradas recientes (menos de 5 segundos)
                    const now = Date.now();
                    const entryTime = entry.timestamp?.toMillis
                        ? entry.timestamp.toMillis()
                        : (typeof entry.timestamp === 'number'
                            ? entry.timestamp
                            : (typeof entry.clientTimestamp === 'number' ? entry.clientTimestamp : 0));
                    if (now - entryTime < 5000) {
                        seenAnimIdsRef.current.add(dedupeKey);
                        newAnims.push({ id: animId, effect: entry });
                    }
                }
            });

            if (newAnims.length > 0) {
                setActiveCombatAnimations(prev => [...prev, ...newAnims]);

                // Limpiar cada animación tras su duración real para no cortar secuencias escalonadas o estados finales
                newAnims.forEach((anim) => {
                    const lifetimeMs = getCombatEffectLifetimeMs(anim.effect);
                    setTimeout(() => {
                        setActiveCombatAnimations(prev => prev.filter(a => a.id !== anim.id));
                    }, lifetimeMs);
                });
            }

            // Actualizar logs visibles
            const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCombatLog(entries);
        });
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [activeScenario?.id]);

    useEffect(() => {
        if (!isBoardMode || !activeScenario?.id) {
            setBoardDiceRollLog([]);
            return;
        }

        const q = query(
            collection(db, scenarioCollectionName, activeScenario.id, 'dice_rolls'),
            orderBy('clientTimestamp', 'desc'),
            limit(3)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setBoardDiceRollLog(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.error('Error listening board dice rolls:', error);
        });

        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [isBoardMode, activeScenario?.id, scenarioCollectionName]);

    useEffect(() => {
        if (!activeScenario?.id) return;

        seenSyncedEffectIdsRef.current.clear();

        const q = query(
            collection(db, 'combat_effects'),
            where('scenarioId', '==', activeScenario.id)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const newAnims = [];
            const now = Date.now();

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'removed') return;

                const entry = { id: change.doc.id, ...change.doc.data() };
                const animId = `synced_effect_${entry.id}`;

                if (seenSyncedEffectIdsRef.current.has(animId)) return;

                const entryTime = entry.timestamp?.toMillis
                    ? entry.timestamp.toMillis()
                    : (typeof entry.timestamp === 'number'
                        ? entry.timestamp
                        : (typeof entry.clientTimestamp === 'number' ? entry.clientTimestamp : 0));

                if (!entryTime || now - entryTime >= 10000) {
                    deleteDoc(doc(db, 'combat_effects', entry.id)).catch(() => {});
                    return;
                }

                seenSyncedEffectIdsRef.current.add(animId);
                newAnims.push({ id: animId, effect: entry });
            });

            if (newAnims.length > 0) {
                setActiveCombatAnimations(prev => [...prev, ...newAnims]);

                newAnims.forEach((anim) => {
                    const lifetimeMs = getCombatEffectLifetimeMs(anim.effect);
                    setTimeout(() => {
                        setActiveCombatAnimations(prev => prev.filter(a => a.id !== anim.id));
                    }, lifetimeMs);
                });
            }
        });

        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [activeScenario?.id]);

    // --- Manejo del Zoom (Rueda del Mouse - Igual que MinimapV2) ---
    // Listener no pasivo para prevenir el scroll por defecto correctamente
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom(prev => Math.min(Math.max(0.1, prev + delta), 5));
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        return () => container.removeEventListener('wheel', onWheel);
    }, [activeScenario?.id]); // Solo re-vincular si cambia de ID de escenario, no en cada movimiento

    // Handlers de Touch para Zoom (Pinch) y Pan (Igual que MinimapV2)

    // --- Helper: Screen to World Coords ---
    const divToWorld = (screenX, screenY) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return { x: 0, y: 0 };

        // 1. Convert to simple offset relative to container center
        const startX = screenX - containerRect.left - (containerRect.width / 2);
        const startY = screenY - containerRect.top - (containerRect.height / 2);

        // 2. Adjust for Pan Offset and Zoom
        // Screen = Offset + (World - Center) * Zoom
        // (Screen - Offset) / Zoom = World - Center
        // World = ((Screen - Offset) / Zoom) + Center

        const worldX = ((startX - offset.x) / zoom) + (WORLD_SIZE / 2);
        const worldY = ((startY - offset.y) / zoom) + (WORLD_SIZE / 2);

        return { x: worldX, y: worldY };
    }

    const getBoardHandDropRect = () => {
        const handDropZone = document.querySelector('[data-board-hand-drop-zone="true"]');
        return handDropZone?.getBoundingClientRect() || null;
    };

    const isPointInsideBoardHand = (point, padding = {}) => {
        if (!point || !isBoardMode) return false;
        const rect = getBoardHandDropRect();
        if (!rect) return false;
        const horizontal = Number(padding.horizontal) || 0;
        const top = Number(padding.top) || 0;
        const bottom = Number(padding.bottom) || 0;
        return (
            point.x >= rect.left - horizontal &&
            point.x <= rect.right + horizontal &&
            point.y >= rect.top - top &&
            point.y <= rect.bottom + bottom
        );
    };

    const captureBoardHandDragGeometry = (draggedCardId) => {
        const zoneRect = getBoardHandDropRect();
        const slots = [...document.querySelectorAll('[data-board-hand-card-slot="true"]')]
            .map(element => ({
                id: element.dataset.boardHandCardId,
                index: Number(element.dataset.boardHandCardIndex) || 0,
                centerX: (() => {
                    const rect = element.getBoundingClientRect();
                    return rect.left + (rect.width / 2);
                })(),
            }))
            .filter(slot => slot.id)
            .sort((a, b) => a.index - b.index);

        const geometry = {
            zoneRect,
            orderedCardIds: slots.map(slot => slot.id),
            insertionCenters: slots
                .filter(slot => slot.id !== draggedCardId)
                .map(slot => slot.centerX)
                .sort((a, b) => a - b),
        };
        handDragGeometryRef.current = geometry;
        return geometry;
    };

    const getBoardHandReorderTarget = (point, geometry = handDragGeometryRef.current) => {
        const zoneRect = geometry?.zoneRect;
        if (!point || !zoneRect) return { overHand: false, dropIndex: null };

        const overHand = (
            point.x >= zoneRect.left - 28 &&
            point.x <= zoneRect.right + 28 &&
            point.y >= zoneRect.top - 44 &&
            point.y <= zoneRect.bottom + 18
        );
        if (!overHand) return { overHand: false, dropIndex: null };

        const insertionCenters = geometry.insertionCenters || [];
        const firstCenterAfterPointer = insertionCenters.findIndex(centerX => point.x < centerX);
        return {
            overHand: true,
            dropIndex: firstCenterAfterPointer === -1 ? insertionCenters.length : firstCenterAfterPointer,
        };
    };

    const clearBoardHandHoverSuppression = () => {
        boardHandHoverSuppressionCleanupRef.current?.();
        boardHandHoverSuppressionCleanupRef.current = null;
        setIsBoardHandHoverSuppressed(false);
    };

    const suppressBoardHandHoverAfterTransfer = (releasePoint) => {
        boardHandHoverSuppressionCleanupRef.current?.();
        setIsBoardHandHoverSuppressed(true);

        let timeoutId = null;
        const handleMouseMove = (event) => {
            if (event.buttons !== 0) return;
            if (Math.hypot(event.clientX - releasePoint.x, event.clientY - releasePoint.y) <= 10) return;
            clearBoardHandHoverSuppression();
        };
        const cleanup = () => {
            window.removeEventListener('mousemove', handleMouseMove, true);
            if (timeoutId !== null) window.clearTimeout(timeoutId);
        };

        window.addEventListener('mousemove', handleMouseMove, true);
        timeoutId = window.setTimeout(clearBoardHandHoverSuppression, 1200);
        boardHandHoverSuppressionCleanupRef.current = cleanup;
    };

    const findCardStackDropTarget = (sourceCard, items = []) => {
        if (!isBoardMode || !isCardItem(sourceCard) || sourceCard.zone !== 'board') return null;

        const sourceStackIds = new globalThis.Set([sourceCard.id, ...getCardStackIds(sourceCard)]);
        const center = getCardCenter(sourceCard);

        return [...items].reverse().find(candidate => (
            isCardItem(candidate) &&
            candidate.zone === 'board' &&
            !candidate.stackParentId &&
            !sourceStackIds.has(candidate.id) &&
            isPointInsideExpandedItem(center, candidate)
        )) || null;
    };

    const findCardContainerDropTarget = (sourceCard, items = []) => {
        if (!isBoardMode || !isCardItem(sourceCard) || sourceCard.zone !== 'board') return null;

        const center = getCardCenter(sourceCard);
        return [...items].reverse().find(candidate => (
            isCardContainerItem(candidate) &&
            candidate.zone === 'board' &&
            candidate.id !== sourceCard.containerId &&
            isPointInsideExpandedItem(center, candidate, 0.08)
        )) || null;
    };

    const snapToWallEndpoints = (worldPos, customSnapActive = null) => {
        let snappedPos = { ...worldPos };

        const shouldSnap = customSnapActive !== null ? customSnapActive : gridConfig.snapToGrid;

        // 1. Snap a la rejilla si está activo
        if (shouldSnap) {
            snappedPos = snapWorldPositionToGrid(snappedPos, gridConfig);
        }

        // 2. Snap a otros muros (prioritario sobre la rejilla si está cerca)
        let minDistance = 15 / zoom; // Distancia de magnetismo
        if (activeScenario?.items) {
            activeScenario.items.filter(i => i.type === 'wall').forEach(wall => {
                const d1 = Math.hypot(worldPos.x - wall.x1, worldPos.y - wall.y1);
                const d2 = Math.hypot(worldPos.x - wall.x2, worldPos.y - wall.y2);
                if (d1 < minDistance) {
                    snappedPos = { x: wall.x1, y: wall.y1 };
                    minDistance = d1;
                }
                if (d2 < minDistance) {
                    snappedPos = { x: wall.x2, y: wall.y2 };
                    minDistance = d2;
                }
            });
        }

        return snappedPos;
    }

    // Efecto para listeners globales de mouse/touch up/move para evitar que se pierda el drag al salir del div
    useEffect(() => {
        const handleGlobalUp = (e) => {
            if (isDragging || draggedTokenId || rotatingTokenId || selectionBox || resizingTokenId || draggingWallHandle) {
                handleMouseUp(e);
            }
        };

        const handleGlobalMove = (e) => {
            if (isDragging || draggedTokenId || rotatingTokenId || selectionBox || draggingWallHandle || resizingTokenId) {
                handleMouseMove(e);
            }
        };

        if (isDragging || draggedTokenId || rotatingTokenId || selectionBox || draggingWallHandle || resizingTokenId) {
            window.addEventListener('mouseup', handleGlobalUp);
            window.addEventListener('mousemove', handleGlobalMove);
            window.addEventListener('touchend', handleGlobalUp);
            window.addEventListener('touchmove', handleGlobalMove, { passive: false });
        }

        return () => {
            window.removeEventListener('mouseup', handleGlobalUp);
            window.removeEventListener('mousemove', handleGlobalMove);
            window.removeEventListener('touchend', handleGlobalUp);
            window.removeEventListener('touchmove', handleGlobalMove);
        };
    }, [isDragging, draggedTokenId, rotatingTokenId, selectionBox, draggingWallHandle, resizingTokenId, activeLayer]);

    // Dummy state just to make linter happy if needed or unused var
    const [, setLoadingRotation] = useState(0);

    // Estado de configuración del Grid
    const [gridConfig, setGridConfig] = useState(DEFAULT_GRID_CONFIG);
    const [gridInputDrafts, setGridInputDrafts] = useState(() => ({
        columns: String(DEFAULT_GRID_CONFIG.columns),
        rows: String(DEFAULT_GRID_CONFIG.rows),
        cellWidth: String(DEFAULT_GRID_CONFIG.cellWidth),
        cellHeight: String(DEFAULT_GRID_CONFIG.cellHeight),
    }));

    // --- CAMPOS DE MAPA CALCULADOS ---
    const finiteMapFrameDimensions = !gridConfig.isInfinite ? getFiniteMapDimensions(gridConfig) : null;
    const finiteGridDimensions = !gridConfig.isInfinite ? getGridPixelDimensions(gridConfig) : null;
    const backgroundGridPresets = useMemo(() => {
        if (
            gridConfig.isInfinite ||
            !gridConfig.backgroundImage ||
            !(Number(gridConfig.imageWidth) > 0) ||
            !(Number(gridConfig.imageHeight) > 0)
        ) {
            return [];
        }

        return getExactBackgroundGridPresets(gridConfig, MIN_GRID_CELL_SIZE).sort((a, b) => b.cellSize - a.cellSize);
    }, [gridConfig.isInfinite, gridConfig.backgroundImage, gridConfig.imageWidth, gridConfig.imageHeight]);
    const currentBackgroundGridPresetIndex = useMemo(
        () => getBackgroundGridPresetIndex(gridConfig, backgroundGridPresets),
        [gridConfig, backgroundGridPresets]
    );

    useEffect(() => {
        setGridInputDrafts({
            columns: String(gridConfig.columns),
            rows: String(gridConfig.rows),
            cellWidth: String(gridConfig.cellWidth),
            cellHeight: String(gridConfig.cellHeight),
        });
    }, [gridConfig.columns, gridConfig.rows, gridConfig.cellWidth, gridConfig.cellHeight]);
    const mapBounds = {
        width: gridConfig.isInfinite
            ? (gridConfig.columns * gridConfig.cellWidth)
            : (finiteMapFrameDimensions?.width || (gridConfig.columns * gridConfig.cellWidth)),
        height: gridConfig.isInfinite
            ? (gridConfig.rows * gridConfig.cellHeight)
            : (finiteMapFrameDimensions?.height || (gridConfig.rows * gridConfig.cellHeight)),
    };
    // Añadimos un pequeño margen (bleed) de 4px para asegurar que no haya fugas en los bordes por redondeo
    const bleed = 4;
    const mapX = (WORLD_SIZE - mapBounds.width) / 2;
    const mapY = (WORLD_SIZE - mapBounds.height) / 2;
    const mapLayerBounds = gridConfig.isInfinite
        ? { x: 0, y: 0, width: WORLD_SIZE, height: WORLD_SIZE }
        : {
            x: mapX - bleed,
            y: mapY - bleed,
            width: mapBounds.width + bleed * 2,
            height: mapBounds.height + bleed * 2,
        };
    const mapLayerStyle = {
        left: `${mapLayerBounds.x}px`,
        top: `${mapLayerBounds.y}px`,
        width: `${mapLayerBounds.width}px`,
        height: `${mapLayerBounds.height}px`,
    };
    const mapLayerViewBox = `${mapLayerBounds.x} ${mapLayerBounds.y} ${mapLayerBounds.width} ${mapLayerBounds.height}`;

    // Calculamos los "Observadores" activos (tokens seleccionados con visión)
    // Para jugadores: SOLO se activa cuando seleccionan tokens específicos (no hay fallback)
    // Ahora soporta múltiples tokens seleccionados para mostrar la unión de sus visiones
    const observerIds = isPlayerView
        ? (activeScenario?.items || []).filter(s => s && selectedTokenIds.includes(s.id) && s.controlledBy?.includes(playerName) && s.hasVision).map(s => s.id)
        : (activeScenario?.items || []).filter(s =>
            s && selectedTokenIds.includes(s.id) && s.type !== 'light' && s.type !== 'wall' && s.hasVision
        ).map(s => s.id);

    // Para compatibilidad: si hay un solo observer, usamos su ID directamente
    const observerId = observerIds.length === 1 ? observerIds[0] : null;

    const fileInputRef = useRef(null);

    // --- LOGICA DE BIBLIOTECA (Firebase) ---
    // Optimizacion Critica: Solo escuchar la base de datos entera de escenarios si estamos viéndola.
    useEffect(() => {
        if (viewMode !== 'LIBRARY') return;

        console.log(`📚 Conectando a Biblioteca de Escenarios (${sectionTitle})...`);
        const unsub = onSnapshot(collection(db, scenarioCollectionName), (snap) => {
            // Se omiten los arrays pesados de los items para la vista del listado de menús (Ahorro VRAM/RAM masivo)
            const loaded = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name,
                    lastModified: data.lastModified,
                    config: data.config,
                    preview: data.preview,
                    ownerId: data.ownerId,
                    allowedPlayers: data.allowedPlayers
                };
            });
            setScenarios(loaded.sort((a, b) => b.lastModified - a.lastModified));
        });
        return () => {
            console.log(`📚 Desconectando de Biblioteca de Escenarios (${sectionTitle})...`);
            if (typeof unsub === 'function') unsub();
        };
    }, [viewMode, scenarioCollectionName, sectionTitle]);

    // --- SUSCRIPCIÓN A TOKENS (Firebase) ---
    // Optimización: Solo descargar el índice completo de tokens si la pestaña de la barra lateral está en 'TOKENS'.
    useEffect(() => {
        if (activeTab !== 'TOKENS') return;

        console.log("🪙 Conectando a Biblioteca de Tokens...");
        const unsub = onSnapshot(collection(db, 'canvas_tokens'), (snap) => {
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setTokens(loaded.sort((a, b) => b.createdAt - a.createdAt));
        });
        return () => {
            console.log("🪙 Desconectando de Biblioteca de Tokens...");
            if (typeof unsub === 'function') unsub();
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'TOKENS' || !isBoardMode) return;

        console.log("Conectando a Biblioteca de Cartas...");
        const unsub = onSnapshot(collection(db, 'canvas_cards'), (snap) => {
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCards(loaded.sort((a, b) => b.createdAt - a.createdAt));
        });
        return () => {
            if (typeof unsub === 'function') unsub();
        };
    }, [activeTab, isBoardMode]);

    // --- KEYBOARD SHORTCUTS (Copy/Paste/Delete) ---
    useEffect(() => {
        const handleKeyDown = async (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            // COPY (Ctrl+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                if (selectedTokenIds.length > 0 && activeScenario?.items) {
                    const tokensToCopy = activeScenario.items.filter(item => selectedTokenIds.includes(item.id));
                    if (tokensToCopy.length > 0) {
                        setClipboard(tokensToCopy);
                        console.log("Tokens copiados al portapapeles:", tokensToCopy.length);
                    }
                }
            }

            // PASTE (Ctrl+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                const currentScenario = activeScenarioRef.current || activeScenario;
                if (clipboard.length > 0 && currentScenario) {
                    e.preventDefault();
                    const newTokens = clipboard.map(originalItem => {
                        const newId = crypto.randomUUID();
                        return {
                            ...originalItem,
                            id: newId,
                            x: (originalItem.x || 0) + 40,
                            y: (originalItem.y || 0) + 40,
                            stats: JSON.parse(JSON.stringify(originalItem.stats || {})),
                            attributes: JSON.parse(JSON.stringify(originalItem.attributes || {})),
                            status: [...(originalItem.status || [])]
                        };
                    });
                    const updatedItems = [...(currentScenario.items || []), ...newTokens];
                    setActiveScenario(prev => (
                        prev?.id === currentScenario.id
                            ? { ...prev, items: updatedItems }
                            : prev
                    ));
                    safePersistItems(
                        currentScenario.id,
                        updatedItems,
                        currentScenario.items,
                        newTokens.map(token => token.id)
                    );
                    setSelectedTokenIds(newTokens.map(t => t.id));
                    setToastType('success');
                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 2500);
                }
            }

            // DELETE / BACKSPACE / CTRL+DELETE
            if (e.key === 'Delete' || e.key === 'Backspace' || (e.ctrlKey && e.key === 'Delete')) {
                if (selectedTokenIds.length > 0 && activeScenario) {
                    const updatedItems = activeScenario.items.filter(item => !selectedTokenIds.includes(item.id));
                    setActiveScenario(prev => ({ ...prev, items: updatedItems }));
                    setSelectedTokenIds([]);
                    safePersistItems(activeScenario.id, updatedItems, activeScenario.items);
                    triggerToast("Selección Eliminada", "El tablero se ha sincronizado", 'info');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeScenario, selectedTokenIds, clipboard, scenarioCollectionName]);

    // Auto-create player token when entering with character data
    const autoTokenScenarioReservationRef = useRef(null);
    // Auto-create OR sync player token on join / characterData change
    // ⚠ CRITICAL: Este efecto SIEMPRE lee datos frescos del servidor antes de escribir,
    // para evitar que un jugador con datos locales antiguos sobrescriba los tokens del Master.
    useEffect(() => {
        if (!isPlayerView || !characterData || !activeScenario?.id) return;
        if (autoTokenScenarioReservationRef.current === activeScenario.id) return;
        // Reservar la creación antes de iniciar la lectura asíncrona. En desarrollo,
        // React puede ejecutar el efecto dos veces y no debe duplicar el token.
        autoTokenScenarioReservationRef.current = activeScenario.id;

        const characterName = characterData.name || playerName;
        const scenarioId = activeScenario.id;

        const safeSync = async () => {
            try {
                const runtimeSheet = loadRuntimeSheet
                    ? await loadRuntimeSheet(characterData, { playerName, scenarioId })
                    : characterData;
                // 1. SIEMPRE leer datos FRESCOS del servidor (nunca confiar en el estado local)
                const freshSnap = await getDoc(doc(db, scenarioCollectionName, scenarioId));
                if (!freshSnap.exists()) {
                    autoTokenScenarioReservationRef.current = null;
                    return;
                }
                const freshData = freshSnap.data();
                const freshItems = freshData.items || [];

                // 2. Buscar si el token del jugador ya existe en los datos FRESCOS del servidor
                const isRogueliteClassLaunch = runtimeSheet.profileType === 'rogueliteClass';
                const existingToken = freshItems.find((item) => {
                    if (!item.controlledBy?.includes(playerName)) return false;
                    if (isRogueliteClassLaunch) {
                        const activeRunId = runtimeSheet.activeRun?.id;
                        const belongsToActiveRun = !activeRunId || !item.runId || item.runId === activeRunId;
                        return belongsToActiveRun && (
                            item.linkedClassId === runtimeSheet.id
                            || (item.profileType === 'rogueliteClass' && item.name === characterName)
                        );
                    }
                    return item.name === characterName;
                });

                if (existingToken) {
                    const isHistoricalRunSnapshot = Boolean(
                        isRogueliteClassLaunch
                        && runtimeSheet.activeRun?.currentScenarioId
                        && runtimeSheet.activeRun.currentScenarioId !== scenarioId
                        && existingToken.runId === runtimeSheet.activeRun.id
                    );
                    if (isHistoricalRunSnapshot) {
                        setActiveScenario(prev => prev?.id === scenarioId ? { ...prev, items: freshItems } : prev);
                        return;
                    }

                    // Sincronizar datos de ficha al token existente (stats, atributos, etc.)
                    const syncedToken = syncModeTokenWithSheet(existingToken, runtimeSheet, {
                        armas,
                        armaduras,
                        habilidades,
                        accesorios,
                    }, isRogueliteClassLaunch
                        ? { scenarioId, preserveTokenState: false }
                        : { scenarioId });

                    if (JSON.stringify(syncedToken) !== JSON.stringify(existingToken)) {
                        console.log('[SafeSync] Sincronizando token existente al entrar:', characterName);
                        // Modificar SOLO el token del jugador en la lista fresca del servidor
                        const updatedItems = freshItems.map(i => i.id === existingToken.id ? syncedToken : i);
                        setActiveScenario(prev => prev?.id === scenarioId ? { ...prev, items: updatedItems } : prev);
                        await safePersistItems(
                            scenarioId,
                            updatedItems,
                            freshItems,
                            [existingToken.id],
                            { persistRuntime: isRogueliteClassLaunch },
                        );
                    } else {
                        // Si no hay cambios, solo actualizar estado local con datos frescos
                        setActiveScenario(prev => prev?.id === scenarioId ? { ...prev, items: freshItems } : prev);
                    }
                } else {
                    // El token NO existe en el servidor → crearlo (spawn nuevo)
                    const defaultTokenDimensions = getDefaultTokenDimensions(gridConfig);
                    const spawnPosition = getCenteredSpawnPosition(gridConfig, {
                        width: defaultTokenDimensions.width,
                        height: defaultTokenDimensions.height,
                    }, {
                        centerInCell: true
                    });

                    const baseToken = {
                        id: `token-${Date.now()}-${playerName}`,
                        x: spawnPosition.x,
                        y: spawnPosition.y,
                        width: defaultTokenDimensions.width,
                        height: defaultTokenDimensions.height,
                        rotation: 0,
                        layer: 'TOKEN',
                        hasVision: true,
                        visionRadius: 300,
                        controlledBy: [playerName],
                        isCircular: true,
                    };

                    const newToken = syncModeTokenWithSheet(baseToken, runtimeSheet, {
                        armas,
                        armaduras,
                        habilidades,
                        accesorios,
                    }, { scenarioId });
                    console.log('🎭 [SafeSync] Auto-creating player token:', newToken.name);

                    // Añadir a la lista fresca del servidor (no a la local)
                    const updatedItems = [...freshItems, newToken];
                    setActiveScenario(prev => prev?.id === scenarioId ? { ...prev, items: updatedItems } : prev);

                    const playerZoom = 1.2;
                    setZoom(playerZoom);
                    setOffset({
                        x: -(spawnPosition.x + defaultTokenDimensions.width / 2 - WORLD_SIZE / 2) * playerZoom,
                        y: -(spawnPosition.y + defaultTokenDimensions.height / 2 - WORLD_SIZE / 2) * playerZoom,
                    });

                    await safePersistItems(
                        scenarioId,
                        updatedItems,
                        freshItems,
                        [newToken.id],
                        { persistRuntime: isRogueliteClassLaunch },
                    );
                }

            } catch (err) {
                autoTokenScenarioReservationRef.current = null;
                console.error(' [SafeSync] Error en sincronización segura:', err);
            }
        };

        safeSync();
    }, [
        isPlayerView,
        characterData,
        activeScenario?.id,
        playerName,
        gridConfig,
        armas,
        armaduras,
        habilidades,
        accesorios,
        loadRuntimeSheet,
        syncModeTokenWithSheet,
    ]);

    // Listener para sincronización en tiempo real desde edición de fichas
    // ⚠ CRITICAL: Lee datos frescos del servidor antes de escribir para evitar sobrescrituras.
    useEffect(() => {
        const handleSyncEvent = async (e) => {
            const { name, sheet } = e.detail || {};
            const currentScenario = activeScenarioRef.current;

            if (!name || !sheet || !currentScenario?.id) return;
            if (
                sheet.profileType === 'rogueliteClass'
                && sheet.activeRun?.currentScenarioId
                && sheet.activeRun.currentScenarioId !== currentScenario.id
            ) return;

            try {
                // Leer datos frescos del servidor
                const freshSnap = await getDoc(doc(db, scenarioCollectionName, currentScenario.id));
                if (!freshSnap.exists()) return;
                const freshData = freshSnap.data();
                const freshItems = freshData.items || [];

                let hasChanges = false;
                const updatedItems = freshItems.map(item => {
                    const isMatch = (sheet.profileType === 'rogueliteClass'
                        && item.linkedClassId
                        && item.linkedClassId === sheet.id) ||
                        (item.linkedCharacterId && item.linkedCharacterId === sheet.id) ||
                        (!item.linkedCharacterId && item.name === name);

                    if (isMatch && item.layer === 'TOKEN') {
                        const synced = syncModeTokenWithSheet(item, sheet, {
                            armas,
                            armaduras,
                            habilidades,
                            accesorios,
                        }, {
                            scenarioId: currentScenario.id,
                            preserveTokenState: sheet.profileType === 'rogueliteClass' ? false : undefined,
                        });
                        if (JSON.stringify(synced) !== JSON.stringify(item)) {
                            hasChanges = true;
                            return synced;
                        }
                    }
                    return item;
                });

                if (hasChanges) {
                    console.log(' [SafeSync] Sincronización en tiempo real para:', name);
                    setActiveScenario(prev => prev?.id === currentScenario.id ? { ...prev, items: updatedItems } : prev);
                    await safePersistItems(currentScenario.id, updatedItems, freshItems);
                }
            } catch (err) {
                console.error(' [SafeSync] Error sincronizando ficha en tiempo real:', err);
            }
        };


        window.addEventListener('playerSheetSaved', handleSyncEvent);
        return () => window.removeEventListener('playerSheetSaved', handleSyncEvent);
    }, [armas, armaduras, habilidades, accesorios, syncModeTokenWithSheet]);

    // --- HELPER: renderItemJSX ---
    // Usamos una función que devuelve JSX en lugar de un "Componente" de React definido dentro de otro,
    // para evitar que los nodos DOM se destruyan y reconstruyan en cada renderizado (lo cual rompe el double-click).

    const {
        handleImageUpload,
        clearBackgroundImage,
        createNewScenario,
        loadScenario,
        saveCurrentScenario,
        deleteScenario,
        handleTokenUpload,
        deleteToken,
        handleReorderLibraryItem,
        handleCardUpload,
        deleteCard,
        safePersistItems,
        updateItem,
    } = createCanvasScenarioController({
        activeScenario,
        availableCharacters,
        characterData,
        currentUserId,
        getLocalSyncActorId,
        gridConfig,
        isPlayerView,
        itemToDelete,
        lastRemoteScenarioItemsRef,
        localUnsavedConfigEditsRef,
        localUnsavedEditsRef,
        localUnsavedScenarioEditsRef,
        offset,
        pendingBoardHandTransferLocksRef,
        pendingImageFile,
        persistQueueRef,
        persistRuntimeItems,
        playerName,
        recentLocalWritesRef,
        registerLocalConfigDraft,
        scenarioCollectionName,
        setActiveScenario,
        setGridConfig,
        setIsSaving,
        setItemToDelete,
        setOffset,
        setPendingImageFile,
        setShowToast,
        setToastType,
        setUploadingCard,
        setUploadingToken,
        setViewMode,
        setZoom,
        triggerToast,
        zoom,
    });

    const {
        handleBoardCardBackUpload,
        addCardToBoard,
        getHandCardsForToken,
        addCardToHand,
        addCardContainerToBoard,
        addDeckToBoard,
        addBoardMarkerToBoard,
        addBoardDieToBoard,
        adjustBoardDiceCount,
        toggleBoardDiceExplosive,
        clearBoardDicePool,
        rollBoardDicePool,
        toggleBoardDiceRollDie,
        removeCardFromContainer,
        moveBoardCardToHand,
        playHandCardToBoard,
        closeBoardCardPreview,
        openBoardCardPreview,
        startBoardCardLongPressPreview,
        handleHandCardDragStart,
        toggleHandCardFace,
        consumeCardStackQuickActionEvent,
        unstackSpecificCard,
    } = useFeatureController({
        activeBoardHandTokenId,
        activeScenario,
        activeScenarioRef,
        boardCardHandTransferRef,
        boardDiceExplosive,
        boardDicePool,
        boardHandHoverSuppressionCleanupRef,
        captureBoardHandDragGeometry,
        cardPreviewHoldRef,
        cardPreviewSuppressTouchEndRef,
        cardStackQuickActionBlockUntilRef,
        characterData,
        clearBoardHandHoverSuppression,
        currentUserId,
        divToWorld,
        draggingHandCard,
        getBoardHandReorderTarget,
        getEventCoords,
        gridConfig,
        handDragFrameRef,
        handDragGeometryRef,
        handDragGhostRef,
        handDragPointRef,
        isBoardMode,
        isPlayerView,
        isRollingBoardDice,
        lastMasterHudTokenIdRef,
        lastSelectedIdRef,
        offset,
        pendingBoardHandTransferLocksRef,
        playerName,
        safePersistItems,
        scenarioCollectionName,
        selectedTokenIds,
        setActiveScenario,
        setBoardDiceExplosive,
        setBoardDicePool,
        setCombatOccupancyFeedback,
        setDragVisualOrigin,
        setDraggedTokenId,
        setDraggingHandCard,
        setDraggingWallHandle,
        setIsRollingBoardDice,
        setPreviewedBoardCard,
        setResizingTokenId,
        setRotatingTokenId,
        setSelectedTokenIds,
        setTokenOriginalPos,
        triggerToast,
        updateItem,
        zoom,
    });

    const getBoardDieRollBounds = useCallback((die) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect || !die) return null;

        const centerX = containerRect.width / 2 + offset.x + ((die.x + (die.width / 2) - (WORLD_SIZE / 2)) * zoom);
        const centerY = containerRect.height / 2 + offset.y + ((die.y + (die.height / 2) - (WORLD_SIZE / 2)) * zoom);
        const margin = Math.max(32, Math.min(die.width || 48, die.height || 48) * zoom * 0.75);

        return {
            left: Math.max(40, centerX - margin),
            right: Math.max(40, containerRect.width - centerX - margin),
            top: Math.max(40, centerY - margin),
            bottom: Math.max(40, containerRect.height - centerY - margin),
        };
    }, [offset.x, offset.y, zoom]);

    const getBoardDieRollObstacles = useCallback((die) => {
        const currentScenario = activeScenarioRef.current;
        if (!die || !currentScenario?.items) return [];
        const dieCenterX = Number(die.x) + ((Number(die.width) || 48) / 2);
        const dieCenterY = Number(die.y) + ((Number(die.height) || 48) / 2);

        return currentScenario.items
            .filter(item => (
                isBoardDieItem(item)
                && item.id !== die.id
                && item.zone !== 'hand'
                && !ACTIVE_BOARD_DIE_ROLL_IDS.has(item.id)
            ))
            .map(item => ({
                id: item.id,
                sides: Number(item.dieSides) || 20,
                width: Number(item.width) || 48,
                height: Number(item.height) || 48,
                dx: (Number(item.x) + ((Number(item.width) || 48) / 2)) - dieCenterX,
                dy: (Number(item.y) + ((Number(item.height) || 48) / 2)) - dieCenterY,
                rotation3d: item.dieRotation3d || { x: 0, y: 0.25, z: 0 },
            }));
    }, []);

    const rollBoardDie = useCallback((die, options = {}) => {
        if (!die || !isBoardDieItem(die) || ACTIVE_BOARD_DIE_ROLL_IDS.has(die.id)) return;

        const angle = Math.random() * Math.PI * 2;
        const force = options.force ?? 0.45;
        const velocity = options.velocity || {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force,
        };

        window.dispatchEvent(new CustomEvent('roll-die', {
            detail: {
                id: die.id,
                velocity,
                settleInPlace: options.settleInPlace ?? false,
                bounds: options.bounds || getBoardDieRollBounds(die),
                obstacles: options.obstacles || getBoardDieRollObstacles(die),
                zoom,
                width: Number(die.width) || 48,
                height: Number(die.height) || 48,
            }
        }));
    }, [getBoardDieRollBounds, getBoardDieRollObstacles, zoom]);

    const {
        resetAllSpeed,
        handleCombatAction,
        consumeSweepTemplateEvent,
        handleSweepTemplateCancel,
        handleSweepTemplateClick,
        handleCancelAction,
        applySangradoSpeedPenalty,
        queueSangradoSpeedAnimation,
        resolveCombatEvent,
        handleSelectCombatQueueIndex,
        handleReaction,
        handleEndTurn,
    } = createCombatController({
        activeCombatQueueEntry,
        activeScenario,
        activeScenarioRef,
        armaduras,
        effectiveCombatEventQueue,
        enrichTokenWithCharacterData,
        focusedTargetId,
        gridConfig,
        locallyResolvedEventsRef,
        pendingTurnState,
        pendingTurnStateRef,
        resolvingCombatEventsRef,
        safePersistItems,
        scenarioCollectionName,
        setActiveCombatAnimations,
        setActiveCombatEventId,
        setActiveScenario,
        setCombatEventQueue,
        setFocusedTargetId,
        setPendingTurnState,
        setResolvedEventCount,
        setSweepHoverSide,
        setTargetingState,
        targetingState,
        triggerToast,
    });

    const {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleMouseDown,
        handleMouseMove,
        getItemInteractionSnapshot,
        startWallHandleDrag,
        handleMouseUp,
    } = useCanvasInteractionController({
        activeLayer,
        activeScenario,
        activeScenarioRef,
        applySangradoSpeedPenalty,
        boardCardHandTransferRef,
        cardPreviewSuppressTouchEndRef,
        cardStackQuickActionBlockUntilRef,
        containerRef,
        currentDieRollSpeed,
        divToWorld,
        dragStartRef,
        draggedTokenId,
        draggedTokenIdRef,
        draggingWallHandle,
        findCardContainerDropTarget,
        findCardStackDropTarget,
        getBoardDieRollBounds,
        getEventCoords,
        gridConfig,
        isBoardMode,
        isDragging,
        isDrawingWall,
        isPlayerView,
        isPointInsideBoardHand,
        lastSelectedIdRef,
        moveBoardCardToHand,
        offset,
        pendingTurnState,
        playerName,
        queueDieLaunchFeedback,
        queueSangradoSpeedAnimation,
        recentLocalWritesRef,
        resetDieLaunchFeedback,
        resizeStartRef,
        resizingTokenId,
        rollBoardDie,
        rotatingTokenId,
        safePersistItems,
        selectedTokenIds,
        selectedTokenIdsRef,
        selectionBox,
        setActiveScenario,
        setCombatOccupancyFeedback,
        setDragVisualOrigin,
        setDraggedTokenId,
        setDraggingWallHandle,
        setIsDragging,
        setLoadingRotation,
        setOffset,
        setPendingTurnState,
        setResizingTokenId,
        setRotatingTokenId,
        setSelectedTokenIds,
        setSelectionBox,
        setTokenOriginalPos,
        setWallDrawingCurrent,
        setWallDrawingStart,
        setZoom,
        snapToWallEndpoints,
        suppressBoardHandHoverAfterTransfer,
        tokenDragStart,
        tokenOriginalPos,
        tokenOriginalPosRef,
        wallDrawingCurrent,
        wallDrawingStart,
        zoom,
    });

    const {
        addTokenToCanvas,
        consumeMobileMoveTemplateEvent,
        shouldUseMobileTacticalMove,
        canUseBoardMobileTacticalMove,
        getBoardMobileTacticalMoveOptions,
        handleMobileTacticalMoveCell,
        handleBoardMobileTacticalMoveCell,
        handleCancelMobileTacticalMove,
        handleTokenMouseDown,
        handleRotationMouseDown,
        linkCharacter,
        unlinkCharacter,
        deleteItem,
        rotateItem,
        toggleWallType,
        toggleDoorOpen,
        toggleSecretWall,
        addLightToCanvas,
        addAreaToCanvas,
    } = createCanvasTokenController({
        accesorios,
        activeLayer,
        activeScenario,
        activeScenarioRef,
        applySangradoSpeedPenalty,
        armaduras,
        armas,
        boardCardHandTransferRef,
        cardStackQuickActionBlockUntilRef,
        clearBoardHandHoverSuppression,
        containerRef,
        currentUserId,
        focusedTargetId,
        getEventCoords,
        getItemInteractionSnapshot,
        gridConfig,
        habilidades,
        isBoardMode,
        isMobile,
        isPlayerView,
        isUsablePendingTurnState,
        lastActionTimeRef,
        lastSelectedIdRef,
        lastTouchTokenInteractionRef,
        offset,
        openBoardCardPreview,
        pendingTurnState,
        pendingTurnStateRef,
        playerName,
        queueSangradoSpeedAnimation,
        resizingTokenId,
        safePersistItems,
        selectedTokenIds,
        setActiveBoardHandTokenId,
        setActiveScenario,
        setCombatOccupancyFeedback,
        setDragVisualOrigin,
        setDraggedTokenId,
        setFocusedTargetId,
        setMobileMoveHoverCellKey,
        setPendingTurnState,
        setResizingTokenId,
        setRotatingTokenId,
        setSelectedTokenIds,
        setTargetingState,
        setTokenDragStart,
        setTokenOriginalPos,
        startBoardCardLongPressPreview,
        targetingState,
        triggerToast,
        updateItem,
        zoom,
        syncTokenWithSheet: syncModeTokenWithSheet,
    });

    const handleResizeMouseDown = (e, item) => {
        if (isCardItem(item)) return;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();

        setResizingTokenId(item.id);
        setTokenOriginalPos({
            [item.id]: getItemInteractionSnapshot(item)
        });
        const { x, y } = getEventCoords(e);
        const touchId = e.type.startsWith('touch') && e.touches?.[0]
            ? e.touches[0].identifier
            : null;

        resizeStartRef.current = {
            startX: x,
            startY: y,
            startWidth: item.width,
            startHeight: item.height,
            identifier: touchId,
        };
    };

    // Handler para click en el fondo del canvas (Deseleccionar y Selection Box)
    const handleCanvasBackgroundMouseDown = (e) => {
        const { x: curX, y: curY } = getEventCoords(e);
        const isTouch = e.type.startsWith('touch');

        // Si estamos en targeting, un clic en el fondo cancela el modo
        if (targetingState) {
            setTargetingState(null);
            setFocusedTargetId(null);
            triggerToast("Acción Cancelada", "Selección de objetivo interrumpida", 'info');
            return;
        }

        // Solo si click izquierdo directo en el fondo o touch
        if ((isTouch || e.button === 0) && !e.altKey && e.target === containerRef.current) {

            // Si estamos en modo dibujo de muros (Solo en capa Iluminación)
            if (isDrawingWall && activeLayer === 'LIGHTING') {
                const worldPos = divToWorld(curX, curY);
                const snapped = snapToWallEndpoints(worldPos);
                setWallDrawingStart(snapped);
                setWallDrawingCurrent(snapped);
                return;
            }

            if (!e.shiftKey) {
                setSelectedTokenIds([]); // Limpiar selección si no es Shift
                if (isBoardMode) setActiveBoardHandTokenId(null);
            }

            // Verificación de dispositivo móvil (Touch o pantalla pequeña)
            const isMobile = isTouch || window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;
            if (isMobile) return;

            // Iniciar Selection Box
            setSelectionBox({
                start: { x: curX, y: curY },
                current: { x: curX, y: curY }
            });
        } else {
            handleMouseDown(e); // Mantener lógica de pan (Alt+Click o Middle Click)
        }
    };


    // Calcular dimensiones totales si es finito
    const {
        finiteMapWidth,
        finiteMapHeight,
        finiteGridWidth,
        finiteGridHeight,
        showSettings,
        setShowSettings,
        handleConfigChange,
        handleGridDraftChange,
        commitGridDraft,
        handleGridDraftKeyDown,
        applyBackgroundGridPreset,
    } = useCanvasGridController({
        backgroundGridPresets,
        finiteGridDimensions,
        finiteMapFrameDimensions,
        gridConfig,
        gridInputDrafts,
        registerLocalConfigDraft,
        registerLocalItemDraftChanges,
        setActiveScenario,
        setGridConfig,
        setGridInputDrafts,
    });

    // Versión dinámica para invalidar caché de máscaras SVG cuando cambian puertas
    // IMPORTANTE: Solo cambia cuando cambia el estado de las puertas (isOpen), no cuando se mueven tokens
    // Esto evita parpadeos durante la selección/movimiento de tokens
    const doorStateHash = useMemo(() => {
        const doors = (activeScenario?.items || [])
            .filter(item => item?.type === 'wall' && item?.wallType === 'door')
            .map(door => `${door.id}:${door.isOpen ? '1' : '0'}`)
            .sort()
            .join('|');
        return doors || '0';
    }, [activeScenario?.items]);

    const maskVersion = doorStateHash;

    const renderItemJSX = createSceneItemRenderer({
        BoardDieVisual,
        BoardMarkerVisual,
        activeLayer,
        activeScenario,
        boardCardHandTransferRef,
        combatOccupancyFeedback,
        consumeCardStackQuickActionEvent,
        currentDieRollSpeed,
        currentUserId,
        deleteItem,
        dragDirection,
        dragVisualOrigin,
        draggedTokenId,
        gridConfig,
        handleResizeMouseDown,
        handleRotationMouseDown,
        handleTokenMouseDown,
        instantBoardDieMoveIdsRef,
        isBoardMode,
        isPlayerView,
        isUsablePendingTurnState,
        lastFlipTimesRef,
        lastSelectedIdRef,
        pendingTurnState,
        playerName,
        removeCardFromContainer,
        resizingTokenId,
        rotateItem,
        rotatingTokenId,
        selectedTokenIds,
        setActiveTab,
        setSelectedTokenIds,
        setShowSettings,
        startWallHandleDrag,
        targetingState,
        toggleDoorOpen,
        toggleSecretWall,
        toggleWallType,
        tokenOriginalPos,
        unstackSpecificCard,
        updateItem,
        zoom,
    });

    const selectionBoxContainerRect = isValidSelectionBox(selectionBox)
        ? containerRef.current?.getBoundingClientRect()
        : null;
    const selectionBoxOverlayRect = selectionBoxContainerRect
        ? {
            left: Math.min(selectionBox.start.x, selectionBox.current.x) - selectionBoxContainerRect.left,
            top: Math.min(selectionBox.start.y, selectionBox.current.y) - selectionBoxContainerRect.top,
            width: Math.abs(selectionBox.current.x - selectionBox.start.x),
            height: Math.abs(selectionBox.current.y - selectionBox.start.y)
        }
        : null;
    const timelineTokens = useMemo(
        () => buildTimelineTokens(activeScenario?.items || []),
        [activeScenario?.items, buildTimelineTokens]
    );
    const activeScenarioItems = useMemo(() => activeScenario?.items || [], [activeScenario?.items]);
    const boardLights = useMemo(
        () => activeScenarioItems.filter(isBoardLightItem),
        [activeScenarioItems]
    );
    const animatedBoardLightIds = useMemo(
        () => selectAnimatedBoardLightIds(boardLights),
        [boardLights]
    );

    useEffect(() => {
        if (!isPlayerView || activeScenarioItems.length === 0) return;
        setSelectedTokenIds(prev => {
            const visibleSelection = prev.filter((id) => {
                const selectedItem = activeScenarioItems.find(item => item?.id === id);
                return selectedItem && !isCardHiddenByContainerForPlayer(selectedItem, activeScenarioItems, true);
            });
            return visibleSelection.length === prev.length ? prev : visibleSelection;
        });
    }, [activeScenarioItems, isPlayerView]);

    const canvasRenderItemGroups = useMemo(() => {
        const livePendingTurnState = isUsablePendingTurnState(pendingTurnState) ? pendingTurnState : null;
        const lights = [];
        const others = [];

        for (const item of activeScenarioItems) {
            if (!item) continue;
            if (isCardHiddenByContainerForPlayer(item, activeScenarioItems, isPlayerView)) continue;
            let renderItem = item;

            if (
                isPlayerView &&
                livePendingTurnState &&
                livePendingTurnState.tokenId === item.id &&
                draggedTokenId !== item.id
            ) {
                renderItem = { ...item, x: livePendingTurnState.x, y: livePendingTurnState.y };
            }

            if (renderItem.type === 'light') {
                lights.push(renderItem);
            } else {
                others.push(renderItem);
            }
        }

        return { lights, others };
    }, [activeScenarioItems, draggedTokenId, isPlayerView, pendingTurnState]);

    return (
        <WorkspaceShell {...{
            accesorios, activeBoardHandTokenId, activeCombatAnimations, activeCombatQueueEntry, activeLayer, activeScenario,
            activeTab, addAreaToCanvas, addBoardDieToBoard, addBoardMarkerToBoard, addCardContainerToBoard, addCardToBoard,
            addCardToHand, addDeckToBoard, addLightToCanvas, addTokenToCanvas, adjustBoardDiceCount, animatedBoardLightIds,
            applyBackgroundGridPreset, armaduras, armas, availableCharacters, backgroundGridPresets, bleed,
            boardDecks, boardDiceExplosive, boardDicePool, boardDiceRollLog, boardLights, canUseBoardMobileTacticalMove,
            BOARD_DICE_ROLL_SIDES, BOARD_DIE_SIDES, BoardDieVisual, BoardMarkerVisual,
            canvasRenderItemGroups, cards, clearBackgroundImage, clearBoardDicePool, closeBoardCardPreview, combatLog,
            combatQueueDisplay, commitGridDraft, consumeMobileMoveTemplateEvent, consumeSweepTemplateEvent, containerRef, createNewScenario,
            currentBackgroundGridPresetIndex, deleteCard, deleteItem, deleteScenario, deleteToken, dragOverLibraryItemId,
            draggedLibraryItemId, draggedLibraryItemType, draggedTokenId, draggingHandCard, enrichTokenWithCharacterData, existingPlayers,
            fileInputRef, finiteGridHeight, finiteGridWidth, finiteMapHeight, finiteMapWidth, focusedTargetId,
            getBoardMobileTacticalMoveOptions, getHandCardsForToken, globalActiveId, glossary, gridConfig, gridInputDrafts,
            habilidades, handDragGhostRef, handleBoardCardBackUpload, handleBoardMobileTacticalMoveCell, handleCancelAction, handleCancelMobileTacticalMove,
            handleCanvasBackgroundMouseDown, handleCardUpload, handleCombatAction, handleConfigChange, handleEndTurn, handleGridDraftChange,
            handleGridDraftKeyDown, handleHandCardDragStart, handleImageUpload, handleMobileTacticalMoveCell, handleMouseMove, handleMouseUp,
            handleReaction, handleReorderLibraryItem, handleSelectCombatQueueIndex, handleSweepTemplateCancel, handleSweepTemplateClick, handleTokenUpload,
            handleTouchEnd, handleTouchMove, handleTouchStart, highlightText, isBoardHandHoverSuppressed, isBoardMode,
            isDrawingWall, isMaster, isPlayerView, isRollingBoardDice, isSaving, isUsablePendingTurnState,
            itemToDelete, lastFlipTimesRef, lastMasterHudTokenIdRef, lastSelectionTimeRef, linkCharacter, loadScenario,
            mapBounds, mapLayerBounds, mapLayerStyle, mapLayerViewBox, mapX, mapY,
            maskVersion, mobileMoveHoverCellKey, mobileMoveTouchStartRef, mode, observerIds, offset,
            onBack, onOpenCharacterSheet, pendingTurnState, playHandCardToBoard, playerName, previewedBoardCard,
            rarityColorMap, registerLocalScenarioDraft, renderItemJSX, resetAllSpeed, resizingTokenId, rollBoardDicePool,
            rollBoardDie, rotatingTokenId, saveCurrentScenario, scenarios, sectionTitle, selectedTokenIds,
            selectionBoxOverlayRect, setActiveLayer, setActiveScenario, setActiveTab, setDragOverLibraryItemId, setDraggedLibraryItemId,
            setDraggedLibraryItemType, setGlobalActiveScenario, setIsDrawingWall, setItemToDelete, setMobileMoveHoverCellKey, setSelectedTokenIds,
            setShowMasterCombatHUD, setShowSettings, setSweepHoverSide, setViewMode, setZoom, shouldUseMobileTacticalMove,
            showMasterCombatHUD, showSettings, showToast, sweepHoverSide, targetingState, timelineTokens,
            toastMessage, toastSubMessage, toastType, toggleBoardDiceExplosive, toggleBoardDiceRollDie, toggleHandCardFace,
            tokenOriginalPos, tokens, triggerToast, unlinkCharacter, unstackSpecificCard, updateItem,
            uploadingCard, uploadingToken, viewMode, wallDrawingCurrent, wallDrawingStart, zoom,
            TokenResourcesComponent, EquipmentSectionComponent,
        }} />
    );
};

TacticalSectionCore.propTypes = {
    modeDefinition: PropTypes.shape({
        id: PropTypes.oneOf(['canvas', 'board']).isRequired,
        isBoardMode: PropTypes.bool.isRequired,
        scenarioCollectionName: PropTypes.string.isRequired,
        visibilityDocName: PropTypes.string.isRequired,
        sectionTitle: PropTypes.string.isRequired,
        buildTimelineTokens: PropTypes.func.isRequired,
        createCombatController: PropTypes.func.isRequired,
        useFeatureController: PropTypes.func.isRequired,
        WorkspaceShell: PropTypes.elementType.isRequired,
        loadRuntimeSheet: PropTypes.func,
        persistRuntimeItems: PropTypes.func,
        TokenResourcesComponent: PropTypes.elementType,
        EquipmentSectionComponent: PropTypes.elementType,
        sceneItemVisuals: PropTypes.shape({
            BoardDieVisual: PropTypes.elementType,
            BoardMarkerVisual: PropTypes.elementType,
        }),
    }).isRequired,
    onBack: PropTypes.func.isRequired,
};

export default TacticalSectionCore;








