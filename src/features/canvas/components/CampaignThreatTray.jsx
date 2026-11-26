import React from 'react';
import ActionDieSvg from '../../../components/ActionDieSvg';
import './CampaignThreatTray.css';

const faces = [4, 6, 8, 10, 12, 20];

// Like Roll20's basic roller, each polyhedron is a direct action. These dice
// remain unrolled until the existing attack/defense confirmation pays them.
export default function CampaignThreatTray({ selection, onChange, disabled, profileOnly = false, note }) {
  const dice = selection.customDice || [];
  const counts = faces.map(sides => dice.filter(die => die === sides).length);
  const formula = faces.map((sides, index) => counts[index] ? `${counts[index]}d${sides}` : '').filter(Boolean).join(' + ');
  const change = customDice => onChange({ ...selection, customDice });
  const remove = sides => {
    const index = dice.lastIndexOf(sides);
    change(dice.filter((_, dieIndex) => dieIndex !== index));
  };
  return <section className="campaign-threat-tray" aria-label={profileOnly ? 'Perfil inicial de Amenaza' : 'Amenaza puntual'}>
    <div className="campaign-threat-heading"><h3>{profileOnly ? 'Amenaza inicial' : 'Amenaza'}</h3>
      {dice.length ? <button type="button" disabled={disabled} onClick={() => change([])}>Vaciar</button> : <span>Opcional</span>}
    </div>
    <div className="campaign-threat-quick-dice" role="group" aria-label="Añadir dados de Amenaza">
      {faces.map((sides, index) => <div className="campaign-threat-grade" key={sides} data-selected={counts[index] > 0}>
        <button type="button" className="campaign-threat-add" disabled={disabled}
          aria-label={`Añadir d${sides} de Amenaza`} title={`Añadir d${sides}`}
          onClick={() => change([...dice, sides])}>
          <ActionDieSvg faces={sides} value={sides} connectedFaces={sides === 20} selected={counts[index] > 0} />
          {counts[index] > 0 && <span className="campaign-threat-count" aria-hidden="true">×{counts[index]}</span>}
        </button>
        {dice.length > 0 && <button type="button" className="campaign-threat-remove" disabled={disabled || !counts[index]}
          aria-label={`Quitar d${sides} de Amenaza`} title={`Quitar d${sides}`} onClick={() => remove(sides)}>−</button>}
      </div>)}
    </div>
    <p className="campaign-threat-formula" aria-live="polite">{formula
      ? <><strong>{formula}</strong>{!profileOnly && <span> · al confirmar</span>}</>
      : profileOnly ? 'Sin dados' : 'Pulsa un dado para añadirlo · se tira al confirmar'}</p>
    {profileOnly && <p className="campaign-threat-note">{note || 'Se tira y recupera al comenzar cada ronda.'}</p>}
  </section>;
}
