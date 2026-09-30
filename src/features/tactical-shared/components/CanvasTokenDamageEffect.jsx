import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CANVAS_DAMAGE_IMPACT_MS } from '../canvasDamagePresentation';
import './CanvasTokenDamageEffect.css';
import { getTokenSilhouetteStyle } from '../tokenSilhouette';

/** A local visual response to committed Life loss; mounting a token never replays old damage. */
export default function CanvasTokenDamageEffect({ life, isCircular = true, durationMs = 850, damageEffect = null, source }) {
    const reducedMotion = useReducedMotion();
    const currentLife = Number(life);
    const playbackDuration = damageEffect
        ? Math.max(250, Number(damageEffect.previewDurationMs) || CANVAS_DAMAGE_IMPACT_MS)
        : Math.max(250, Number(durationMs) || 850);
    const previousLife = useRef(currentLife);
    const sequence = useRef(0);
    const playedCue = useRef(null);
    const [impact, setImpact] = useState(null);

    useEffect(() => {
        const previous = previousLife.current;
        previousLife.current = currentLife;
        if (!Number.isFinite(previous) || !Number.isFinite(currentLife)) return undefined;
        if (currentLife >= previous) {
            if (currentLife > previous) setImpact(null);
            return undefined;
        }
        if (damageEffect && currentLife === Number(damageEffect.nextLife)) return undefined;
        if (reducedMotion || (typeof document !== 'undefined' && document.hidden)) {
            setImpact(null);
            return undefined;
        }
        const nextSequence = ++sequence.current;
        setImpact(nextSequence);
        return undefined;
    }, [currentLife, reducedMotion, damageEffect]);

    useEffect(() => {
        const revealAt = Number(damageEffect?.revealAt);
        if (!revealAt || playedCue.current === damageEffect.id || currentLife !== Number(damageEffect.nextLife)) return undefined;
        if (reducedMotion || (typeof document !== 'undefined' && document.hidden)) return undefined;
        const play = () => {
            if (playedCue.current === damageEffect.id) return;
            playedCue.current = damageEffect.id;
            setImpact(++sequence.current);
        };
        const remaining = revealAt - Date.now();
        if (remaining <= 0) play();
        else {
            const timer = setTimeout(play, remaining);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [damageEffect?.id, damageEffect?.revealAt, damageEffect?.nextLife, currentLife, reducedMotion]);

    useEffect(() => {
        if (impact === null) return undefined;
        const timer = setTimeout(() => setImpact(active => active === impact ? null : active), playbackDuration);
        return () => clearTimeout(timer);
    }, [impact, playbackDuration]);

    if (impact === null) return null;
    return <div key={impact} className={`noma-token-damage-effect${isCircular ? ' noma-token-damage-effect--round' : ''}`}
        style={{ '--token-impact-duration': `${playbackDuration - 30}ms`, '--token-impact-flare-duration': `${Math.min(440, Math.round(playbackDuration * .4))}ms`,
            ...(!isCircular ? { inset: 0, borderRadius: 0, ...getTokenSilhouetteStyle(source, false) } : {}) }}
        aria-hidden="true" />;
}
