import React from 'react';
import ClassList from './ClassList';
import { CharacterCreatorView } from './CharacterCreatorView';

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
    onLaunchMinigame,
    initialCharacterName = null,
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

            disableSidebar={false}
            backButtonLabel="Cerrar Sesión"
            onBack={onBack}
        />
    );
};
