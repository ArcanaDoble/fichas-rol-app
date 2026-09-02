import React, { useEffect, useState } from 'react';
import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import ClassList from './ClassList';
import { CharacterCreatorView } from './CharacterCreatorView';
import RogueliteClassSection from '../features/roguelite/components/RogueliteClassSection';
import { db } from '../firebase';
import {
    normalizeCharacterAccess,
    normalizeRogueliteAccess,
} from '../features/roguelite/access';

export const CharacterListView = ({
    playerName,
    armas,
    armaduras,
    habilidades,
    glossary,
    rarityColorMap,
    onBack,
    onLaunchDiceCalculator,
    onLaunchSpeedSystem,
    onLaunchMinimap,
    onLaunchCanvas,
    onLaunchBoard,
    onLaunchMinigame,
    initialCharacterName = null,
    initialRogueliteClassId = null,
}) => {
    const [playerRecord, setPlayerRecord] = useState(null);
    const [ownedCharacterCount, setOwnedCharacterCount] = useState(null);

    useEffect(() => {
        if (!playerName) {
            setPlayerRecord({});
            return undefined;
        }

        return onSnapshot(
            doc(db, 'players', playerName),
            (snapshot) => {
                setPlayerRecord(snapshot.exists() ? snapshot.data() : {});
            },
            (error) => {
                console.error('Error loading personal character access:', error);
                setPlayerRecord({});
            },
        );
    }, [playerName]);

    useEffect(() => {
        let active = true;

        if (!playerName) {
            setOwnedCharacterCount(0);
            return undefined;
        }

        setOwnedCharacterCount(null);
        getDocs(query(
            collection(db, 'characters'),
            where('owner', '==', playerName),
        ))
            .then((snapshot) => {
                if (active) setOwnedCharacterCount(snapshot.docs.length);
            })
            .catch((error) => {
                console.error('Error checking personal character library:', error);
                // Preserve the legacy behaviour when the preflight cannot be completed.
                if (active) setOwnedCharacterCount(-1);
            });

        return () => {
            active = false;
        };
    }, [playerName]);

    if (!playerRecord || ownedCharacterCount === null) {
        return (
            <div
                className="flex min-h-screen items-center justify-center bg-[#09090b] text-[#c8aa6e]"
                data-testid="character-library-loading"
            >
                <div className="flex items-center gap-3 font-['Cinzel'] text-xs uppercase tracking-[0.22em] text-[#c8aa6e]/75">
                    <span className="h-2 w-2 animate-pulse bg-[#c8aa6e]" />
                    Preparando archivo de aventura
                </div>
            </div>
        );
    }

    const characterAccess = normalizeCharacterAccess(playerRecord);
    const rogueliteAccess = normalizeRogueliteAccess(playerRecord);
    const hasExplicitCharacterAccess = (
        typeof playerRecord?.gameAccess?.characters?.enabled === 'boolean'
        || typeof playerRecord?.characterAccess?.enabled === 'boolean'
    );
    const isLegacyClassesOnlyProfile = (
        !hasExplicitCharacterAccess
        && ownedCharacterCount === 0
        && rogueliteAccess.enabled
        && rogueliteAccess.unlockedClassIds.length > 0
    );
    const characterLibraryEnabled = characterAccess.enabled && !isLegacyClassesOnlyProfile;

    return (
        <ClassList
            title={characterLibraryEnabled ? 'Mis Personajes' : 'Mis Clases'}
            subtitle={characterLibraryEnabled
                ? 'Gestiona tus personajes y continúa tu aventura.'
                : 'Elige una clase desbloqueada y continúa tu aventura.'}
            collectionPath="characters"
            ownerFilter={playerName}
            CreatorComponent={CharacterCreatorView}
            creatorLabel="Personaje"
            isPlayerMode={true}
            primaryLibraryEnabled={characterLibraryEnabled}
            allowCreation={characterLibraryEnabled}
            initialCharacterName={initialCharacterName}

            armas={armas}
            armaduras={armaduras}
            habilidades={habilidades}
            glossary={glossary}
            rarityColorMap={rarityColorMap}

            onLaunchMinigame={onLaunchMinigame}
            onLaunchDiceCalculator={onLaunchDiceCalculator}
            onLaunchSpeedSystem={onLaunchSpeedSystem}
            onLaunchMinimap={onLaunchMinimap}
            onLaunchCanvas={onLaunchCanvas}
            onLaunchBoard={onLaunchBoard}
            currentUserId={playerName}

            additionalLibrarySection={({ openClassDetails, syncOpenClassDetails }) => (
                <RogueliteClassSection
                    playerName={playerName}
                    access={rogueliteAccess}
                    onOpenClass={openClassDetails}
                    onClassesChange={syncOpenClassDetails}
                    initialClassId={initialRogueliteClassId}
                />
            )}

            disableSidebar={false}
            backButtonLabel="Cerrar Sesión"
            onBack={onBack}
        />
    );
};
