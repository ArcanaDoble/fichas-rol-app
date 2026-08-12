import React from 'react';
import ClassList from './ClassList';
import { CharacterCreatorView } from './CharacterCreatorView';
import RogueliteClassSection from '../features/roguelite/components/RogueliteClassSection';

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
    return (
        <ClassList
            title="Mis Personajes"
            subtitle="Gestiona tus personajes y continúa tu aventura."
            collectionPath="characters"
            ownerFilter={playerName}
            CreatorComponent={CharacterCreatorView}
            creatorLabel="Personaje"
            isPlayerMode={true}
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
