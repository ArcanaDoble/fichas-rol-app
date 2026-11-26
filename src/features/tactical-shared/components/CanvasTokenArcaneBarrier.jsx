import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { getTokenSilhouetteStyle } from '../tokenSilhouette';
import { BARRIER_HIT_MS } from '../arcaneBarrierTimeline';
import { useArcaneBarrierPresentation } from '../useArcaneBarrierPresentation';
import { subscribeBarrierField, setBarrierFieldImpact, BARRIER_FIELD_SIZE } from './arcaneBarrierField';
import './CanvasTokenArcaneBarrier.css';

export function ArcaneBarrierSurface({ source, isCircular = true, reduced = false, impact = null }) {
  const canvas = useRef(null);
  useEffect(() => {
    if (!canvas.current || /jsdom/i.test(navigator.userAgent)) return undefined;
    return subscribeBarrierField(canvas.current, { circular: isCircular, reduced: Boolean(reduced) });
  }, [isCircular, reduced]);
  useEffect(() => { setBarrierFieldImpact(canvas.current, Boolean(impact)); }, [impact, isCircular, reduced]);
  return <div className="noma-token-barrier__membrane" aria-hidden="true"
    style={isCircular ? { borderRadius: '50%', inset: '-14%' } : getTokenSilhouetteStyle(source, false)}>
    <canvas ref={canvas} width={BARRIER_FIELD_SIZE} height={BARRIER_FIELD_SIZE} />
    <span className="noma-token-barrier__sheen" />
    {impact && <span key={impact} className="noma-token-barrier__impact" />}
  </div>;
}

export default function CanvasTokenArcaneBarrier({ token, source = token?.img, isCircular = Boolean(token?.isCircular), presentation }) {
  const reduced = useReducedMotion();
  const { active, revealAt, visible } = useArcaneBarrierPresentation(token, presentation);
  const lastImpact = useRef(token?.arcaneBarrier?.lastImpactId);
  const [impact, setImpact] = useState(null);
  useEffect(() => {
    const id = token?.arcaneBarrier?.lastImpactId;
    const previous = lastImpact.current;
    lastImpact.current = id;
    if (!id || id === previous || !active || document.hidden) return;
    setImpact(id);
  }, [token, active]);
  useEffect(() => {
    if (!impact) return undefined;
    const timer = setTimeout(() => setImpact(null), reduced ? 350 : BARRIER_HIT_MS);
    return () => clearTimeout(timer);
  }, [impact, reduced]);
  if (!visible) return null;
  const barrierId = token.arcaneBarrier?.id || `manual-barrier-${token.id}`;
  return <div className="noma-token-barrier" data-barrier-id={barrierId} data-impact={Boolean(impact)}
    data-reduced-motion={Boolean(reduced)} data-forming={Boolean(revealAt)} aria-label="Barrera rúnica: +1 CD hasta el final del combate">
    <ArcaneBarrierSurface key={barrierId} source={source} isCircular={isCircular} reduced={reduced} impact={impact} />
  </div>;
}
