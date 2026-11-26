import React, { useState } from 'react';
import { Brain, Footprints, Gauge, Heart, Infinity as InfinityIcon, Minus, Plus, Shield } from 'lucide-react';
import { adjustYermo, normalizeYermo } from '../../campaign/yermo';
import { applyCampaignImpact, getCampaignArmorRd } from '../campaignSystem';
import './CampaignTokenResources.css';
import CampaignThreatTray from './CampaignThreatTray';
import { normalizeCampaignThreatProfile } from '../combat/campaignThreatDice';

export default function CampaignTokenResources({ token, onUpdate, isPlayerView = false }) {
  const [impact, setImpact] = useState('');
  const enemy = token.profileType === 'rogueliteEnemy';
  const threatProfile = normalizeCampaignThreatProfile(token.threatDice, token.threatDie);
  const definitions = [
    ['vida', 'Vida', Heart, '#e7a0a8', true],
    ...(!enemy ? [['mente', 'Mente', Brain, '#bba2db', true]] : []),
    ['movimiento', 'Movilidad', Footprints, '#86bfe2', true],
    ['armadura', 'RD', Shield, '#c8c6be', false],
    ...(token.campaignPersonality ? [['yermo', 'Yermo', InfinityIcon, '#9c92b1', false]] : []),
    ...(enemy ? [['iniciativa', 'Iniciativa', Gauge, '#d7b867', false], ['ofensiva', 'Acción', Gauge, '#d68469', false]] : []),
    ...(token.stats?.karma ? [['karma', 'Karma', Gauge, '#c8aa6e', false]] : []),
  ];
  const update = (id, field, value, bounded) => {
    if (id === 'yermo') {
      if (/^\d*$/.test(value)) onUpdate({ yermo: normalizeYermo(value) });
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const current = token.stats?.[id] || { current: 0, max: 0 };
    const next = { ...current, [field]: id === 'karma' ? Math.trunc(parsed) : Math.max(0, Math.trunc(parsed)) };
    if (bounded) next.current = Math.min(next.current, next.max);
    else next.max = next.current;
    onUpdate({ stats: { ...token.stats, [id]: next },
      ...(id === 'ofensiva' ? { offenseBase: next.current } : {}),
      ...(id === 'iniciativa' ? { fixedInitiative: next.current, velocidad: next.current } : {}),
    }, { resourceId: id, field });
  };
  return <section className="campaign-inspector-resources" aria-label="Estadísticas de Campaña">
    <h4>Campaña · Estadísticas</h4>
    {definitions.map(([id, label, Icon, color, bounded]) => {
      const stat = id === 'yermo' ? { current: normalizeYermo(token.yermo) } : token.stats?.[id] || { current: 0, max: 0 };
      return <div className="campaign-inspector-resource" key={id} style={{ '--resource-color': color }}>
        <div className="campaign-inspector-resource__row">
          <span className="campaign-inspector-resource__label"><Icon size={15} />{label}</span>
          <div className="campaign-inspector-resource__values">
            <button aria-label={`Reducir ${label}`} onClick={() => update(id, 'current', id === 'yermo' ? adjustYermo(stat.current, -1) : stat.current - 1, bounded)}><Minus size={13} /></button>
            <input aria-label={`${label} actual`} inputMode={id === 'karma' ? 'text' : 'numeric'}
              value={stat.current} onChange={e => update(id, 'current', e.target.value, bounded)} onFocus={e => e.target.select()}
              style={id === 'yermo' ? { width: `${Math.max(3, Math.min(14, stat.current.length + 1))}ch` } : undefined} />
            {bounded && <><span>/</span><input aria-label={`${label} máximo`} inputMode="numeric" value={stat.max}
              onChange={e => update(id, 'max', e.target.value, true)} onFocus={e => e.target.select()} /></>}
            <button aria-label={`Aumentar ${label}`} onClick={() => update(id, 'current', id === 'yermo' ? adjustYermo(stat.current, 1) : stat.current + 1, bounded)}><Plus size={13} /></button>
          </div>
        </div>
        {bounded && <div className="campaign-inspector-resource__bar" role="meter" aria-label={label}
          aria-valuenow={stat.current} aria-valuemin={0} aria-valuemax={stat.max || 1}>
          <span style={{ transform: `scaleX(${stat.max > 0 ? Math.min(1, stat.current / stat.max) : 0})` }} />
        </div>}
      </div>;
    })}
    {enemy && !isPlayerView && <CampaignThreatTray profileOnly selection={{ customDice: threatProfile.map(die => Number(die.slice(1))) }}
      note="Se aplica al siguiente combate; se tira y recupera cada ronda."
      onChange={({ customDice }) => onUpdate({ threatDice: customDice.map(sides => `d${sides}`), threatDie: customDice.length ? `d${customDice[0]}` : null })} />}
    <form className="campaign-inspector-impact" onSubmit={e => { e.preventDefault();
      if (impact === '') return;
      onUpdate({ stats: applyCampaignImpact(token, impact) }); setImpact('');
    }}>
      <label htmlFor={`impact-${token.id}`}>Impacto <small>− {getCampaignArmorRd(token)} RD</small></label>
      <input id={`impact-${token.id}`} inputMode="numeric" placeholder="0" value={impact}
        onChange={e => { if (/^\d*$/.test(e.target.value)) setImpact(e.target.value); }} />
      <button type="submit" disabled={impact === ''}>Aplicar daño</button>
    </form>
  </section>;
}
