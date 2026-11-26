import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createFireballRenderer, getFireballGeometry } from '../spells/fireballRenderer';
import { FIREBALL_DURATION_MS } from '../spells/canvasSpellPresentation';
import { createArcaneProjectileRenderer, getArcaneProjectileGeometry } from '../spells/arcaneProjectileRenderer';
import { createArcaneMistRenderer, getArcaneMistGeometry } from '../spells/arcaneMistRenderer';
import { createArcaneBarrierRenderer, getArcaneBarrierGeometry } from '../spells/arcaneBarrierRenderer';
import FogShaderEffect from '../../tactical-shared/components/FogShaderEffect';
import { ArcaneBarrierSurface } from '../../tactical-shared/components/CanvasTokenArcaneBarrier';
import '../../tactical-shared/components/CanvasTokenArcaneBarrier.css';
import './CanvasSpellEffect.css';

const FireballPlayback = ({ effect, zoom, reducedMotion }) => {
  const canvas = useRef(null);
  const [rendererReady, setRendererReady] = useState(false);
  const geometry = useMemo(() => getFireballGeometry(effect, zoom), [effect, zoom]);
  useEffect(() => {
    if (reducedMotion) return undefined;
    let renderer;
    try { renderer = createFireballRenderer(canvas.current, geometry, effect, zoom); } catch (_) { /* CSS fallback. */ }
    if (!renderer) { setRendererReady(false); return undefined; }
    let frame, previous = -Infinity;
    const draw = () => {
      const elapsed = Date.now() - effect.presentationStartedAt;
      if (document.hidden || elapsed >= FIREBALL_DURATION_MS) return;
      if (elapsed - previous >= 1000 / 30) {
        if (!renderer.draw(elapsed)) { setRendererReady(false); return; }
        previous = elapsed;
      }
      frame = requestAnimationFrame(draw);
    };
    renderer.draw(Math.max(0, Date.now() - effect.presentationStartedAt));
    setRendererReady(true);
    draw();
    return () => { cancelAnimationFrame(frame); renderer.destroy(); };
  }, [effect, geometry, zoom, reducedMotion]);
  const area = effect.placement;
  const delay = `${-Math.max(0, Date.now() - effect.presentationStartedAt)}ms`;
  return <div className="canvas-fireball-effect" aria-hidden="true" data-fireball-id={effect.id}
    data-renderer={rendererReady && !reducedMotion ? 'webgl' : 'fallback'} data-reduced-motion={reducedMotion}
    style={{ '--fireball-delay': delay }}>
    <canvas ref={canvas} className="canvas-fireball-effect__surface"
      style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height }} />
    <div className="canvas-fireball-effect__fallback">
      <span className="canvas-fireball-effect__orb" style={{ offsetPath: `path('${geometry.path}')`,
        width: Math.min(area.width, area.height) * .28, height: Math.min(area.width, area.height) * .28 }} />
      <span className="canvas-fireball-effect__blast" style={{ left: area.x, top: area.y, width: area.width, height: area.height }} />
      <span className="canvas-fireball-effect__wave" style={{ left: area.x, top: area.y, width: area.width, height: area.height }} />
    </div>
  </div>;
};

const ArcaneProjectilePlayback = ({ effect, zoom, reducedMotion }) => {
  const canvas = useRef(null);
  const [rendererReady, setRendererReady] = useState(false);
  const geometry = useMemo(() => getArcaneProjectileGeometry(effect), [effect]);
  useEffect(() => {
    if (reducedMotion) return undefined;
    let renderer;
    try { renderer = createArcaneProjectileRenderer(canvas.current, geometry, zoom); } catch (_) { /* CSS fallback. */ }
    if (!renderer) { setRendererReady(false); return undefined; }
    let frame, previous = -Infinity;
    const draw = () => {
      const elapsed = Date.now() - effect.presentationStartedAt;
      if (document.hidden || elapsed >= FIREBALL_DURATION_MS) return;
      if (elapsed - previous >= 1000 / 30) {
        if (!renderer.draw(elapsed)) { setRendererReady(false); return; }
        previous = elapsed;
      }
      frame = requestAnimationFrame(draw);
    };
    setRendererReady(true); draw();
    return () => { cancelAnimationFrame(frame); renderer.destroy(); };
  }, [effect, geometry, reducedMotion, zoom]);
  const area = effect.placement;
  const delay = `${-Math.max(0, Date.now() - effect.presentationStartedAt)}ms`;
  return <div className="canvas-arcane-projectile" aria-hidden="true" data-projectile-id={effect.id}
    data-renderer={rendererReady && !reducedMotion ? 'webgl' : 'fallback'} data-reduced-motion={reducedMotion}
    style={{ '--fireball-delay': delay }}>
    <canvas ref={canvas} className="canvas-fireball-effect__surface"
      style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height }} />
    <div className="canvas-arcane-projectile__fallback">
      <span className="canvas-arcane-projectile__orb" style={{ offsetPath: `path('${geometry.path}')`, width: geometry.radius * .5, height: geometry.radius * .5 }} />
      <span className="canvas-arcane-projectile__impact" style={{ left: area.x, top: area.y, width: area.width, height: area.height }} />
    </div>
  </div>;
};

const MIST_COLOR = [0.5, 0.48, 0.58];
const ArcaneMistPlayback = ({ effect, zoom, reducedMotion, sourceVisible = true }) => {
  const canvas = useRef(null);
  const [rendererReady, setRendererReady] = useState(false);
  const geometry = useMemo(() => getArcaneMistGeometry(effect, sourceVisible), [effect, sourceVisible]);
  useEffect(() => {
    if (reducedMotion) return undefined;
    let renderer;
    try { renderer = createArcaneMistRenderer(canvas.current, geometry, zoom); } catch (_) { /* CSS vapor fallback. */ }
    if (!renderer) { setRendererReady(false); return undefined; }
    let frame, previous = -Infinity;
    const draw = () => {
      const elapsed = Date.now() - effect.presentationStartedAt;
      if (document.hidden || elapsed >= FIREBALL_DURATION_MS) return;
      if (elapsed - previous >= 1000 / 30) {
        if (!renderer.draw(elapsed)) { setRendererReady(false); return; }
        previous = elapsed;
      }
      frame = requestAnimationFrame(draw);
    };
    setRendererReady(true); draw();
    return () => { cancelAnimationFrame(frame); renderer.destroy(); };
  }, [effect, geometry, reducedMotion, zoom]);
  const area = effect.placement, cell = geometry.cell;
  return <div className="canvas-arcane-mist" aria-hidden="true" data-mist-id={effect.id}
    data-renderer={rendererReady && !reducedMotion ? 'webgl' : 'fallback'} data-reduced-motion={reducedMotion}
    data-source-visible={sourceVisible}
    style={{ '--mist-delay': `${-Math.max(0, Date.now() - effect.presentationStartedAt)}ms`,
      '--mist-arrival': sourceVisible ? '1400ms' : '150ms' }}>
    <canvas ref={canvas} className="canvas-arcane-mist__surface"
      style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height }} />
    <div className="canvas-arcane-mist__fallback">
      {sourceVisible && <>
        <span className="canvas-arcane-mist__gather" style={{ left: geometry.source.x - cell * .7,
          top: geometry.source.y - cell * .7, width: cell * 1.4, height: cell * 1.4 }} />
        {[0, 1, 2, 3, 4, 5].map(index => <span key={index} className="canvas-arcane-mist__ribbon"
          style={{ offsetPath: `path('${geometry.path}')`, width: cell * .7, height: cell * .4, '--mist-wisp-index': index }} />)}
      </>}
      <div className="canvas-arcane-mist__cell" style={{ left: area.x, top: area.y, width: area.width, height: area.height }}>
        <span className="canvas-arcane-mist__seal" />
        <span className="canvas-arcane-mist__bloom"><FogShaderEffect color={MIST_COLOR} density={.72} speed={.6} /></span>
        <span className="canvas-arcane-mist__wisp" />
      </div>
    </div>
  </div>;
};

const ArcaneBarrierPlayback = ({ effect, zoom, reducedMotion, sourceVisible = true, sourceAppearance }) => {
  const canvas = useRef(null);
  const [rendererReady, setRendererReady] = useState(false);
  const geometry = useMemo(() => getArcaneBarrierGeometry(effect, sourceVisible), [effect, sourceVisible]);
  useEffect(() => {
    if (reducedMotion) return undefined;
    let renderer;
    try { renderer = createArcaneBarrierRenderer(canvas.current, geometry, zoom); } catch (_) { /* CSS fallback. */ }
    if (!renderer) { setRendererReady(false); return undefined; }
    let frame, previous = -Infinity;
    const draw = () => {
      const elapsed = Date.now() - effect.presentationStartedAt;
      if (document.hidden || elapsed >= FIREBALL_DURATION_MS) return;
      if (elapsed - previous >= 1000 / 30) {
        if (!renderer.draw(elapsed)) { setRendererReady(false); return; }
        previous = elapsed;
      }
      frame = requestAnimationFrame(draw);
    };
    setRendererReady(true); draw();
    return () => { cancelAnimationFrame(frame); renderer.destroy(); };
  }, [effect, geometry, reducedMotion, zoom]);
  const area = effect.placement, cell = geometry.cell;
  const fieldSize = { left: area.x - area.width * .2, top: area.y - area.height * .2,
    width: area.width * 1.4, height: area.height * 1.4 };
  return <div className="canvas-runic-barrier" aria-hidden="true" data-barrier-cast-id={effect.id}
    data-renderer={rendererReady && !reducedMotion ? 'webgl' : 'fallback'} data-reduced-motion={reducedMotion}
    data-source-visible={sourceVisible} style={{ '--barrier-delay': `${-Math.max(0, Date.now() - effect.presentationStartedAt)}ms` }}>
    <canvas ref={canvas} className="canvas-runic-barrier__surface"
      style={{ left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height }} />
    {sourceVisible && <div className="canvas-runic-barrier__source" style={{
      left: geometry.source.x - (effect.sourcePosition?.width || cell) * .5,
      top: geometry.source.y - (effect.sourcePosition?.height || cell) * .5,
      width: effect.sourcePosition?.width || cell, height: effect.sourcePosition?.height || cell,
      transform: sourceAppearance?.isCircular === false ? `rotate(${sourceAppearance.rotation || 0}deg)` : undefined }}>
      <ArcaneBarrierSurface source={sourceAppearance?.img} isCircular={sourceAppearance?.isCircular !== false} reduced={reducedMotion} />
    </div>}
    <div className="canvas-runic-barrier__fallback">
      {sourceVisible && [0, 1, 2].map(index => <span key={index} className="canvas-runic-barrier__thread" style={{
        offsetPath: `path('${geometry.path}')`, width: cell * .6, height: cell * .16, '--barrier-strand': index }} />)}
      <span className="canvas-runic-barrier__aura" style={fieldSize} />
      <span className="canvas-runic-barrier__veil" style={{ left: area.x - area.width * .06,
        top: area.y - area.height * .06, width: area.width * 1.12, height: area.height * 1.12 }} />
    </div>
  </div>;
};

const CanvasSpellEffect = ({ presentation, zoom = 1 }) => {
  if (!presentation?.effect) return null;
  if (presentation.effect.spellId === 'runic-barrier' && presentation.targetVisible === false) return null;
  const Playback = presentation.effect.spellId === 'runic-barrier' ? ArcaneBarrierPlayback
    : presentation.effect.spellId === 'arcane-mist' ? ArcaneMistPlayback
    : presentation.effect.spellId === 'arcane-projectile' ? ArcaneProjectilePlayback : FireballPlayback;
  return <Playback key={presentation.effect.id} effect={presentation.effect} zoom={zoom}
    reducedMotion={presentation.reducedMotion} sourceVisible={presentation.sourceVisible} sourceAppearance={presentation.sourceAppearance} />;
};

export default CanvasSpellEffect;
