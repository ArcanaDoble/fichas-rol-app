export const BARRIER_ARRIVAL_MS = 1450;
export const BARRIER_REDUCED_ARRIVAL_MS = 600;
export const BARRIER_HIT_MS = 650;

// Use the receiver's launch clock. Saved barriers have no live presentation
// and appear immediately; unrelated casts never delay an existing protection.
export const getBarrierRevealAt = (token, presentation) => {
  const effect = presentation?.effect;
  if (effect?.spellId !== 'runic-barrier' || effect.id !== token?.arcaneBarrier?.id
    || effect.targetId !== token?.id || !Number.isFinite(effect.presentationStartedAt)) return 0;
  return effect.presentationStartedAt + (presentation.reducedMotion ? BARRIER_REDUCED_ARRIVAL_MS : BARRIER_ARRIVAL_MS);
};
