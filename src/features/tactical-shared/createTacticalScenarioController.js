import {
    addDoc, collection, deleteDoc, doc, runTransaction, updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getOrUploadFile, releaseFile } from '../../utils/storage';
import {
    buildScenarioItemChanges, getChangedItemFields, mergeScenarioItemsForPersist,
    normalizeRecentLocalWrite,
} from '../../utils/scenarioSync';
import {
    DEFAULT_FINITE_COLUMNS, DEFAULT_FINITE_ROWS, DEFAULT_GRID_CONFIG,
    MIN_GRID_CELL_SIZE, TARGET_GRID_CELL_SIZE, buildBackgroundGridPreset,
    findClosestBackgroundGridPreset, getExactBackgroundGridPresets,
    normalizeGridConfig,
} from './grid';
import { WORLD_SIZE } from './spatial';
import { areScenarioFieldValuesEqual } from './scenarioState';
import { STATUS_EFFECT_IDS } from './tokenSheetSync';

const ROGUELITE_RUNTIME_FIELDS = new globalThis.Set([
    'stats',
    'status',
    'inventory',
    'equipmentLoadout',
    'equippedItems',
    'activeWeaponSet',
    'money',
]);

const assertRuntimePersistenceSucceeded = (results) => {
    const rejectedResult = Array.isArray(results)
        ? results.find((result) => result?.persisted === false)
        : null;

    if (!rejectedResult) return;

    const error = new Error(
        rejectedResult.reason === 'stale-scenario'
            ? 'La aventura activa cambió antes de terminar el guardado.'
            : 'No se pudo guardar el progreso de la aventura.',
    );
    error.code = rejectedResult.reason === 'stale-scenario'
        ? 'roguelite/stale-scenario'
        : 'roguelite/runtime-persist-failed';
    throw error;
};

const getPersistenceErrorMessage = (error) => {
    const code = String(error?.code || '');

    if (code.includes('permission-denied')) {
        return 'Firebase rechazó el permiso de escritura. Revisa las reglas de Firestore.';
    }
    if (code.includes('unavailable') || code.includes('network-request-failed')) {
        return 'No hay conexión estable con Firebase. Conservamos los cambios para reintentarlo.';
    }
    if (code === 'roguelite/stale-scenario') {
        return 'La aventura activa cambió. Vuelve a entrar con «Jugar aventura» y reintenta.';
    }
    if (code.includes('not-found')) {
        return 'El encuentro ya no existe o dejó de estar disponible.';
    }

    return error?.message || 'Firebase no confirmó el guardado. Los cambios siguen pendientes.';
};

/** Frozen CRUD and persistence host shared by tactical modes. */
export const createCanvasScenarioController = ({
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
}) => {
const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Guardamos el archivo para subirlo luego
        setPendingImageFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target.result;
            img.onload = () => {
                const exactPresets = getExactBackgroundGridPresets({
                    imageWidth: img.width,
                    imageHeight: img.height,
                }, MIN_GRID_CELL_SIZE);
                const matchedPreset = findClosestBackgroundGridPreset(exactPresets, 'cellSize', TARGET_GRID_CELL_SIZE)
                    || buildBackgroundGridPreset(img.width, img.height, DEFAULT_FINITE_COLUMNS, DEFAULT_FINITE_ROWS);

                setGridConfig(prev => {
                    const nextConfig = {
                        ...prev,
                        backgroundImage: event.target.result, // Local preview
                        imageWidth: img.width,
                        imageHeight: img.height,
                        isInfinite: false,
                        lockFiniteMapSize: false,
                        columns: matchedPreset.columns,
                        rows: matchedPreset.rows,
                        cellWidth: matchedPreset.cellSize,
                        cellHeight: matchedPreset.cellSize,
                    };
                    registerLocalConfigDraft(prev, nextConfig);
                    setActiveScenario(current => current ? { ...current, config: nextConfig } : current);
                    return nextConfig;
                });
            };
        };
        reader.readAsDataURL(file);
    };

    const clearBackgroundImage = () => {
        setPendingImageFile(null);
        setGridConfig(prev => {
            const nextConfig = {
                ...prev,
                backgroundImage: null,
                backgroundImageHash: null,
                imageWidth: null,
                imageHeight: null,
            };
            registerLocalConfigDraft(prev, nextConfig);
            setActiveScenario(current => current ? { ...current, config: nextConfig } : current);
            return nextConfig;
        });
    };

const createNewScenario = async () => {
        const newScenario = {
            name: 'Nuevo Encuentro',
            lastModified: Date.now(),
            ownerId: currentUserId,
            preview: null,
            config: { ...DEFAULT_GRID_CONFIG, isInfinite: false },
            items: [], // Inicializamos array de tokens
            camera: { zoom: 1, offset: { x: 0, y: 0 } }
        };

        try {
            const docRef = await addDoc(collection(db, scenarioCollectionName), newScenario);
            loadScenario({ id: docRef.id, ...newScenario });
        } catch (error) {
            console.error("Error creating scenario:", error);
        }
    };

    const loadScenario = (scenario) => {
        lastRemoteScenarioItemsRef.current = scenario.items || [];
        localUnsavedEditsRef.current = {};
        localUnsavedConfigEditsRef.current = {};
        localUnsavedScenarioEditsRef.current = {};
        recentLocalWritesRef.current = {};
        pendingBoardHandTransferLocksRef.current.clear();
        setPendingImageFile(null);
        setActiveScenario(scenario);
        if (scenario.config) setGridConfig(normalizeGridConfig(scenario.config));

        // Determinar cámara inicial
        let initialCamera = scenario.camera;

        if (isPlayerView) {
            // Prefer the token matching the current character name, fall back to any controlled token
            const charName = characterData?.name;
            const playerToken = charName
                ? (scenario.items?.find(i => i.controlledBy?.includes(playerName) && i.name === charName)
                    || scenario.items?.find(i => i.controlledBy?.includes(playerName)))
                : scenario.items?.find(i => i.controlledBy?.includes(playerName));
            if (playerToken) {
                const playerZoom = 1.2;
                initialCamera = {
                    zoom: playerZoom,
                    offset: {
                        x: - (playerToken.x + playerToken.width / 2 - WORLD_SIZE / 2) * playerZoom,
                        y: - (playerToken.y + playerToken.height / 2 - WORLD_SIZE / 2) * playerZoom
                    }
                };
            }
        }

        if (initialCamera) {
            setZoom(initialCamera.zoom);
            setOffset(initialCamera.offset);
        }
        setViewMode('EDIT');
    };

const saveCurrentScenario = async () => {
        if (!activeScenario) {
            console.warn("⚠ Intento de guardado sin escenario activo");
            return;
        }

        setIsSaving(true);
        console.log("💾 Iniciando guardado de escenario:", activeScenario.name);

        const localItems = activeScenario.items || [];
        const pendingRuntimeTokenIds = localItems
            .filter((item) => (
                item.profileType === 'rogueliteClass'
                && item.runtimeDirty === true
            ))
            .map((item) => item.id);
        const confirmedItems = pendingRuntimeTokenIds.length > 0
            ? localItems.map((item) => (
                pendingRuntimeTokenIds.includes(item.id)
                    ? { ...item, runtimeDirty: false }
                    : item
            ))
            : localItems;
        const baselineItems = lastRemoteScenarioItemsRef.current || [];
        const pendingLocalEdits = Object.entries(localUnsavedEditsRef.current || {})
            .reduce((acc, [itemId, edits]) => {
                acc[itemId] = { ...(edits || {}) };
                return acc;
            }, {});
        let pendingConfigEdits = { ...(localUnsavedConfigEditsRef.current || {}) };
        const pendingScenarioEdits = { ...(localUnsavedScenarioEditsRef.current || {}) };
        const pendingEditedItemIds = Object.keys(pendingLocalEdits);
        const explicitModifiedIds = pendingEditedItemIds.length > 0
            ? pendingEditedItemIds
            : null;
        const {
            originalMap: baselineItemMap,
            modifiedOrAdded: pendingModifiedOrAdded,
            deletedIds: pendingDeletedIds
        } = buildScenarioItemChanges(confirmedItems, baselineItems, explicitModifiedIds);
        const pendingModifiedItemIds = Array.from(new globalThis.Set([
            ...pendingModifiedOrAdded.map(item => item.id),
            ...pendingDeletedIds
        ].filter(Boolean)));
        const saveStartedAt = Date.now();
        let persistedItems = null;

        pendingModifiedOrAdded.forEach(item => {
            const changedFields = getChangedItemFields(item, baselineItemMap.get(item.id));
            if (Object.keys(changedFields).length === 0) return;

            const existingWrite = normalizeRecentLocalWrite(recentLocalWritesRef.current[item.id]);
            recentLocalWritesRef.current[item.id] = {
                time: saveStartedAt,
                fields: {
                    ...(existingWrite?.fields || {}),
                    ...changedFields
                }
            };
        });

        try {
            const savePayload = {
                items: confirmedItems,
                lastModified: Date.now()
            };

            // Si no es vista de jugador (es Master), guardamos toda la configuración y metadatos
            if (!isPlayerView) {
                let finalBackgroundImage = gridConfig.backgroundImage;
                let finalImageHash = gridConfig.backgroundImageHash;

                // Si hay un archivo pendiente, lo subimos a Storage primero
                if (pendingImageFile) {
                    console.log("📤 Subiendo imagen pesada a Firebase Storage...");
                    const { url, hash } = await getOrUploadFile(pendingImageFile, 'CanvasMaps');

                    // Si ya había una imagen diferente antes, liberamos la referencia anterior
                    if (gridConfig.backgroundImageHash && gridConfig.backgroundImageHash !== hash) {
                        console.log("♻ Liberando imagen anterior de Storage...");
                        await releaseFile(gridConfig.backgroundImageHash);
                    }

                    finalBackgroundImage = url;
                    finalImageHash = hash;
                    localUnsavedConfigEditsRef.current = {
                        ...localUnsavedConfigEditsRef.current,
                        backgroundImage: url,
                        backgroundImageHash: hash,
                    };
                    pendingConfigEdits = {
                        ...pendingConfigEdits,
                        backgroundImage: url,
                        backgroundImageHash: hash,
                    };

                    // Actualizamos el estado local
                    setGridConfig(prev => ({
                        ...prev,
                        backgroundImage: url,
                        backgroundImageHash: hash
                    }));
                    setPendingImageFile(null);
                }

                const updatedConfig = {
                    ...gridConfig,
                    backgroundImage: finalBackgroundImage,
                    backgroundImageHash: finalImageHash
                };

                savePayload.name = activeScenario.name;
                savePayload.config = updatedConfig;
                savePayload.camera = { zoom, offset };
                savePayload.allowedPlayers = activeScenario.allowedPlayers || [];
            }

            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(doc(db, scenarioCollectionName, activeScenario.id));
                if (!sfDoc.exists()) return;

                const currentData = sfDoc.data();
                const currentItems = currentData.items || [];
                const nextItems = mergeScenarioItemsForPersist(
                    currentItems,
                    pendingModifiedOrAdded,
                    pendingDeletedIds,
                    baselineItems
                );
                persistedItems = nextItems;

                const payload = {
                    ...savePayload,
                    items: nextItems,
                    lastModifiedItemIds: pendingModifiedItemIds,
                    lastModifiedBy: getLocalSyncActorId(),
                    lastModifiedByRole: isPlayerView ? 'player' : 'master'
                };

                transaction.update(doc(db, scenarioCollectionName, activeScenario.id), payload);
            });

            if (persistedItems) {
                lastRemoteScenarioItemsRef.current = persistedItems;
            }

            if (persistRuntimeItems && pendingRuntimeTokenIds.length > 0) {
                const runtimeResults = await persistRuntimeItems({
                    scenarioId: activeScenario.id,
                    finalItems: persistedItems || confirmedItems,
                    originalItems: baselineItems,
                    explicitModifiedIds: pendingRuntimeTokenIds,
                });
                assertRuntimePersistenceSucceeded(runtimeResults);
                setActiveScenario((current) => {
                    if (current?.id !== activeScenario.id) return current;
                    return {
                        ...current,
                        items: current.items.map((item) => (
                            pendingRuntimeTokenIds.includes(item.id)
                                ? { ...item, runtimeDirty: false }
                                : item
                        )),
                    };
                });
            }

            Object.entries(pendingLocalEdits).forEach(([itemId, edits]) => {
                const currentEdits = localUnsavedEditsRef.current[itemId];
                if (!currentEdits) return;

                Object.entries(edits || {}).forEach(([key, value]) => {
                    if (areScenarioFieldValuesEqual(currentEdits[key], value)) {
                        delete currentEdits[key];
                    }
                });

                if (Object.keys(currentEdits).length === 0) {
                    delete localUnsavedEditsRef.current[itemId];
                }
            });

            Object.entries(pendingConfigEdits).forEach(([key, value]) => {
                if (areScenarioFieldValuesEqual(localUnsavedConfigEditsRef.current[key], value)) {
                    delete localUnsavedConfigEditsRef.current[key];
                }
            });

            Object.entries(pendingScenarioEdits).forEach(([key, value]) => {
                if (areScenarioFieldValuesEqual(localUnsavedScenarioEditsRef.current[key], value)) {
                    delete localUnsavedScenarioEditsRef.current[key];
                }
            });

            //  SINCRONIZACIÓN BIDIRECCIONAL: Actualizar fichas de personajes vinculados
            if (confirmedItems.length > 0) {
                console.log(" Iniciando sincronización inversa con fichas vinculadas...");
                const syncPromises = confirmedItems
                    .filter(token => token.linkedCharacterId)
                    .map(async (token) => {
                        const charId = token.linkedCharacterId;
                        const char = availableCharacters.find(c => c.id === charId);
                        if (!char) return;

                        const collectionName = char._isTemplate ? 'classes' : 'characters';
                        const charRef = doc(db, collectionName, charId);

                        // Preparar payload de actualización para la ficha
                        const charUpdate = {};

                        // 1. Atributos (destreza, vigor, intelecto, voluntad)
                        if (token.attributes) {
                            charUpdate.attributes = { ...(char.attributes || {}), ...token.attributes };
                        }

                        // 2. Estadísticas (Vida, Armadura, Postura, etc)
                        if (token.stats) {
                            charUpdate.stats = { ...(char.stats || {}), ...token.stats };
                        }

                        // 3. Estados -> Tags
                        if (token.status) {
                            // Mantener tags que no son condicionantes de batalla (ej: historia, rasgos)
                            const currentTags = char.tags || [];
                            const otherTags = currentTags.filter(tag => !STATUS_EFFECT_IDS.includes(tag.toLowerCase().trim()));
                            charUpdate.tags = [...otherTags, ...token.status];
                        }

                        // 4. Velocidad
                        if (token.velocidad !== undefined) {
                            charUpdate.velocidad = token.velocidad;
                        }

                        try {
                            if (Object.keys(charUpdate).length > 0) {
                                await updateDoc(charRef, charUpdate);
                                console.log(`✅ Ficha ${char.name} sincronizada correctamente desde el Canvas`);
                            }
                        } catch (err) {
                            console.error(` Error sincronizando ficha ${char.name}:`, err);
                        }
                    });

                await Promise.all(syncPromises);
            }

            console.log(`✅ Escenario guardado correctamente (${isPlayerView ? 'Jugador' : 'Master'})`);
            triggerToast(
                pendingRuntimeTokenIds.length > 0 ? 'FICHA ACTUALIZADA' : 'CAMBIOS GUARDADOS',
                pendingRuntimeTokenIds.length > 0
                    ? 'Los cambios del inspector se han sincronizado con tu clase'
                    : 'Encuentro sincronizado',
                'success',
            );
        } catch (error) {
            console.error(" Error al guardar escenario:", error);
            triggerToast(
                'NO SE PUDO GUARDAR',
                getPersistenceErrorMessage(error),
                'error',
            );
        } finally {
            setIsSaving(false);
        }
    };

    const deleteScenario = async () => {
        if (!itemToDelete) return;
        const idToDelete = itemToDelete.id;

        // Cerramos el modal inmediatamente para feedback visual instantáneo
        setItemToDelete(null);

        try {
            // Si el escenario tenía una imagen en Storage, liberamos la referencia
            if (itemToDelete.config?.backgroundImageHash) {
                console.log("♻ Eliminando imagen asociada de Storage...");
                await releaseFile(itemToDelete.config.backgroundImageHash);
            }

            await deleteDoc(doc(db, scenarioCollectionName, idToDelete));

            console.log("Encuentro y archivos asociados eliminados correctamente");

            // Si el escenario borrado era el que estábamos editando, volvemos a la biblioteca
            if (activeScenario?.id === idToDelete) {
                setActiveScenario(null);
                setViewMode('LIBRARY');
            }

            // Opcional: Podríamos mostrar un toast específico de "Escenario Eliminado"
            // Pero como la lista se actualiza sola por el onSnapshot, el feedback es el cambio en la lista.
        } catch (error) {
            console.error("Error deleting scenario:", error);
            // Si falla, podríamos informar al usuario
        }
    };

const handleTokenUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingToken(true);
        try {
            const { url, hash } = await getOrUploadFile(file, 'CanvasTokens');
            await addDoc(collection(db, 'canvas_tokens'), {
                url,
                hash,
                name: file.name,
                createdAt: Date.now(),
                uploadedBy: currentUserId
            });
            console.log("Token uploaded successfully");
        } catch (error) {
            console.error("Error uploading token:", error);
        } finally {
            setUploadingToken(false);
        }
    };

    const deleteToken = async (token) => {
        if (!confirm("¿Eliminar este token?")) return;
        try {
            if (token.hash) await releaseFile(token.hash);
            await deleteDoc(doc(db, 'canvas_tokens', token.id));
        } catch (error) {
            console.error("Error deleting token:", error);
        }
    };

    const handleReorderLibraryItem = async (collectionName, itemsList, draggedId, targetId) => {
        const draggedIndex = itemsList.findIndex(item => item.id === draggedId);
        const targetIndex = itemsList.findIndex(item => item.id === targetId);
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

        const newItems = [...itemsList];
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, removed);

        let newCreatedAt;
        if (targetIndex === 0) {
            // Colocado al inicio, debe ser mayor (más nuevo) que el primer elemento actual
            const firstItemTime = Number(newItems[1]?.createdAt || Date.now());
            newCreatedAt = firstItemTime + 1000;
        } else if (targetIndex === newItems.length - 1) {
            // Colocado al final, debe ser menor (más viejo) que el último elemento actual
            const lastItemTime = Number(newItems[newItems.length - 2]?.createdAt || Date.now());
            newCreatedAt = lastItemTime - 1000;
        } else {
            // Colocado en medio
            const prevItemTime = Number(newItems[targetIndex - 1]?.createdAt || Date.now());
            const nextItemTime = Number(newItems[targetIndex + 1]?.createdAt || Date.now());
            newCreatedAt = Math.round((prevItemTime + nextItemTime) / 2);
        }

        try {
            await updateDoc(doc(db, collectionName, draggedId), {
                createdAt: newCreatedAt
            });
            triggerToast("Orden actualizado", "Se ha reordenado el elemento", "success");
        } catch (error) {
            console.error("Error reordering library item:", error);
            triggerToast("Error al ordenar", "No se pudo actualizar el orden", "error");
        }
    };

    const handleCardUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingCard(true);
        try {
            const { url, hash } = await getOrUploadFile(file, 'CanvasCards');
            await addDoc(collection(db, 'canvas_cards'), {
                frontUrl: url,
                hash,
                name: file.name.replace(/\.[^.]+$/, ''),
                createdAt: Date.now(),
                uploadedBy: currentUserId
            });
            e.target.value = '';
        } catch (error) {
            console.error("Error uploading card:", error);
        } finally {
            setUploadingCard(false);
        }
    };

    const deleteCard = async (card) => {
        if (!confirm("¿Eliminar esta carta?")) return;
        try {
            if (card.hash) await releaseFile(card.hash);
            await deleteDoc(doc(db, 'canvas_cards', card.id));
        } catch (error) {
            console.error("Error deleting card:", error);
        }
    };

const safePersistItems = async (
        scenarioId,
        finalItems,
        originalItems,
        explicitModifiedIds = null,
        options = {},
) => {
        if (!scenarioId || !finalItems) return false;

        const registerRecentPersistedFields = (itemsToPersist, origItems, explicitIds) => {
            const { originalMap, modifiedOrAdded } = buildScenarioItemChanges(itemsToPersist, origItems, explicitIds);
            const writeTime = Date.now();

            modifiedOrAdded.forEach(item => {
                const changedFields = getChangedItemFields(item, originalMap.get(item.id));
                if (Object.keys(changedFields).length === 0) return;

                const localDraft = localUnsavedEditsRef.current[item.id];
                if (localDraft) {
                    Object.keys(changedFields).forEach(key => {
                        delete localDraft[key];
                    });
                    if (Object.keys(localDraft).length === 0) {
                        delete localUnsavedEditsRef.current[item.id];
                    }
                }

                const existingWrite = normalizeRecentLocalWrite(recentLocalWritesRef.current[item.id]);
                recentLocalWritesRef.current[item.id] = {
                    time: writeTime,
                    fields: {
                        ...(existingWrite?.fields || {}),
                        ...changedFields
                    }
                };
            });
        };

        // Definimos la función interna que ejecuta el guardado
        const executePersist = async (reqId, itemsToPersist, origItems, explicitIds) => {
            const docRef = doc(db, scenarioCollectionName, reqId);
            const { modifiedOrAdded, deletedIds } = buildScenarioItemChanges(itemsToPersist, origItems, explicitIds);

            if (modifiedOrAdded.length === 0 && deletedIds.length === 0) return true;

            const modifiedItemIds = Array.from(new globalThis.Set([
                ...modifiedOrAdded.map(item => item.id),
                ...deletedIds
            ].filter(Boolean)));
            const writerId = getLocalSyncActorId();
            const writerRole = isPlayerView ? 'player' : 'master';
            const retryDelay = (ms) => new Promise(resolve => globalThis.setTimeout(resolve, ms));
            const maxPersistAttempts = 8;
            let lastError = null;

            for (let attempt = 0; attempt < maxPersistAttempts; attempt += 1) {
                try {
                    await runTransaction(db, async (transaction) => {
                        const sfDoc = await transaction.get(docRef);
                        if (!sfDoc.exists()) {
                            const missingScenarioError = new Error('El encuentro ya no existe.');
                            missingScenarioError.code = 'not-found';
                            throw missingScenarioError;
                        }

                        const currentData = sfDoc.data();
                        const currentItems = currentData.items || [];
                        const nextItems = mergeScenarioItemsForPersist(
                            currentItems,
                            modifiedOrAdded,
                            deletedIds,
                            origItems
                        );

                        transaction.update(docRef, {
                            items: nextItems,
                            lastModified: Date.now(),
                            lastModifiedItemIds: modifiedItemIds,
                            lastModifiedBy: writerId,
                            lastModifiedByRole: writerRole
                        });
                    });
                    if (persistRuntimeItems && options.persistRuntime === true) {
                        const runtimeResults = await persistRuntimeItems({
                            scenarioId: reqId,
                            finalItems: itemsToPersist,
                            originalItems: origItems,
                            explicitModifiedIds: modifiedItemIds,
                        });
                        assertRuntimePersistenceSucceeded(runtimeResults);
                    }
                    return true;
                } catch (error) {
                    lastError = error;
                    if (attempt < maxPersistAttempts - 1) {
                        const jitter = Math.floor(Math.random() * 90);
                        await retryDelay((110 * ((attempt + 1) ** 2)) + jitter);
                    }
                }
            }

            console.error("Error in safePersistItems transaction after retries:", lastError);
            return false;
        };

        // Cada delta conserva su turno: ninguna acción rápida reemplaza a otra pendiente.
        const didPersist = await persistQueueRef.current(() => (
            executePersist(scenarioId, finalItems, originalItems, explicitModifiedIds)
        ));

        if (didPersist === true) {
            registerRecentPersistedFields(finalItems, originalItems, explicitModifiedIds);
        }

        return didPersist === true;
    };

    const updateItem = (itemId, updates, persist = false) => {
        const currentToken = activeScenario?.items?.find((item) => item.id === itemId);
        const marksRogueliteProgress = Boolean(
            persistRuntimeItems
            && currentToken?.profileType === 'rogueliteClass'
            && Object.keys(updates || {}).some((field) => ROGUELITE_RUNTIME_FIELDS.has(field)),
        );
        const effectiveUpdates = marksRogueliteProgress
            ? { ...updates, runtimeDirty: true }
            : updates;

        if (!persist) {
            // Guardar localmente en el ref de ediciones no guardadas
            if (!localUnsavedEditsRef.current[itemId]) {
                localUnsavedEditsRef.current[itemId] = {};
            }
            localUnsavedEditsRef.current[itemId] = {
                ...localUnsavedEditsRef.current[itemId],
                ...effectiveUpdates
            };
        } else {
            // Si se persiste directamente, limpiamos ese borrador local
            if (localUnsavedEditsRef.current[itemId]) {
                Object.keys(effectiveUpdates || {}).forEach(key => {
                    delete localUnsavedEditsRef.current[itemId][key];
                });
                if (Object.keys(localUnsavedEditsRef.current[itemId]).length === 0) {
                    delete localUnsavedEditsRef.current[itemId];
                }
            }

            // Registrar los campos persistentes en recentLocalWritesRef para evitar snapback
            const existingWrite = normalizeRecentLocalWrite(recentLocalWritesRef.current[itemId]) || { fields: {} };
            recentLocalWritesRef.current[itemId] = {
                time: Date.now(),
                fields: {
                    ...existingWrite.fields,
                    ...effectiveUpdates
                }
            };
        }

        setActiveScenario(prev => {
            if (!prev) return prev;
            let didChange = false;
            const newItems = prev.items.map(i => {
                if (i.id !== itemId) return i;
                const hasUpdateChange = Object.entries(effectiveUpdates || {}).some(([key, value]) => i[key] !== value);
                if (!hasUpdateChange) return i;
                didChange = true;
                return { ...i, ...effectiveUpdates };
            });

            if (!didChange) return prev;

            if (persist && prev.id) {
                safePersistItems(prev.id, newItems, prev.items, [itemId]).then((didPersist) => {
                    if (!didPersist) {
                        triggerToast(
                            'CAMBIO NO SINCRONIZADO',
                            'Firebase no confirmó el cambio. Pulsa «Guardar cambios» para reintentarlo.',
                            'error',
                        );
                    }
                });
            }

            return { ...prev, items: newItems };
        });
    };

    return {
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
    };
};
