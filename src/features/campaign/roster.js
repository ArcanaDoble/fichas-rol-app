// All personal characters use Campaign. Roguelite profiles are opened through
// their own persistence route, even when they share the character library.
export const isCampaignCharacter = (character, { collectionPath, persistenceMode } = {}) => Boolean(
  character?.id
  && collectionPath === 'characters'
  && persistenceMode !== 'roguelite'
);
