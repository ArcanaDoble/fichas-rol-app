import React from 'react';
import { RelicsView } from '../../components/RelicsView';
import {
  getCampaignTalentRoster,
  getCampaignTalentSlots,
  setCampaignLoadoutTalentCatalog,
  setCampaignLoadoutTalentSlots,
} from './campaignTalents';

// Keep the original character editor and adapt its changes to the shared
// campaign roster so editing here also updates the equipped talent copies.
export default function CampaignTalentsView({ character = {}, onChange, readOnly = false }) {
  const slots = getCampaignTalentSlots(character);
  const equippedIds = new Set(slots.filter(Boolean).map((talent) => talent.id));
  const legacyCharacter = {
    ...character,
    actionData: {
      movement: [],
      action: [],
      bonus: [],
      ...character.actionData,
      reaction: getCampaignTalentRoster(character).map((talent) => ({
        ...talent,
        desc: talent.desc ?? talent.description ?? '',
        isActive: equippedIds.has(talent.id),
      })),
    },
    features: (character.features || []).map((feature) => ({
      ...feature,
      level: feature.level ?? 1,
    })),
  };
  const canEdit = !readOnly && typeof onChange === 'function';

  const updateActions = (actions) => {
    if (!canEdit) return;
    const activeIds = actions.reaction.filter((talent) => talent.isActive).map((talent) => talent.id);
    const nextSlotIds = slots.map((talent) => activeIds.includes(talent?.id) ? talent.id : null);
    activeIds.forEach((id) => {
      const emptyIndex = nextSlotIds.indexOf(null);
      if (!nextSlotIds.includes(id) && emptyIndex >= 0) nextSlotIds[emptyIndex] = id;
    });
    let next = setCampaignLoadoutTalentCatalog(character, actions.reaction.map((talent) => ({
      ...talent,
      description: talent.desc ?? talent.description ?? '',
    })));
    next = setCampaignLoadoutTalentSlots(next, nextSlotIds);
    next.talents.slots = next.talents.slots.map((talent) => talent ? {
      ...slots.find((previous) => previous?.id === talent.id),
      ...talent,
    } : null);
    onChange({
      ...next,
      actionData: { ...actions, reaction: next.actionData.reaction },
    });
  };

  return (
    <RelicsView
      dndClass={legacyCharacter}
      readOnly={!canEdit}
      onActionsChange={updateActions}
      onFeaturesChange={(features) => canEdit && onChange({ ...character, features })}
    />
  );
}
