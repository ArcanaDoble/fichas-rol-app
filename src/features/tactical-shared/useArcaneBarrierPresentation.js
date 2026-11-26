import { useEffect, useState } from 'react';
import { getBarrierRevealAt } from './arcaneBarrierTimeline';
import { hasArcaneBarrier } from '../../utils/arcaneBarrierStatus';

// The token material and its public marker reveal together on the local clock.
export const useArcaneBarrierPresentation = (token, presentation) => {
  const active = hasArcaneBarrier(token);
  const revealAt = getBarrierRevealAt(token, presentation);
  const [, refresh] = useState(0);
  useEffect(() => {
    const remaining = revealAt - Date.now();
    if (!active || remaining <= 0) return undefined;
    const timer = setTimeout(() => refresh(value => value + 1), remaining);
    return () => clearTimeout(timer);
  }, [active, revealAt]);
  return { active, revealAt, visible: active && Date.now() >= revealAt };
};
