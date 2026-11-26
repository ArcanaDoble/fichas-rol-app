import React, { useState } from 'react';
import {
  Check,
  DoorOpen,
  Grid3X3,
  Lamp,
  MousePointer2,
  PanelsTopLeft,
  Spline,
  Trash2,
} from 'lucide-react';
import { isLine, surveyKind } from './surveyGeometry';
import './mapSurvey.css';

const modes = [
  ['select', 'Ajustar', MousePointer2],
  ['wall', 'Muro', Spline],
  ['door', 'Puerta', DoorOpen],
  ['window', 'Ventana', PanelsTopLeft],
  ['light', 'Foco', Lamp],
];
const help = {
  select: 'Toca un tramo o un foco. Arrastra sus puntos para ajustarlo.',
  wall: 'Arrastra de punto a punto, o marca ambos extremos con dos toques.',
  door: 'Marca los dos extremos de la puerta.',
  window: 'Marca los dos extremos de la ventana.',
  light:
    'Toca para colocar un foco, o arrastra desde el centro hasta su alcance.',
};

function FieldRange({ label, value, min, max, step, text, onCommit }) {
  const [draft, setDraft] = useState(null);
  const commit = (e) => {
    const next = Number(e.currentTarget.value);
    if (next !== value) onCommit(next);
    setDraft(null);
  };
  return (
    <label className="n3-survey-range">
      <span>
        {label} <output>{text(draft ?? value)}</output>
      </span>
      <input
        type="range"
        aria-label={label}
        value={draft ?? value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={(e) => {
          if (draft !== null) commit(e);
        }}
      />
    </label>
  );
}

export default function MapSurveyToolbar({
  settings,
  selected,
  change,
  close,
  command,
}) {
  const mode = settings.mode;
  const update = (values) =>
    command({ type: 'terrain', terrain: { ...selected, ...values } });
  const doors = selected?.kind === 'door';
  return (
    <div className="n3-survey">
      {selected && mode === 'select' ? (
        <section
          className="n3-survey-inspect"
          aria-label="Elemento seleccionado"
        >
          {isLine(selected) ? (
            <>
              <label>
                Tramo
                <select
                  aria-label="Tipo de tramo"
                  value={surveyKind(selected)}
                  onChange={(e) => {
                    const kind = e.target.value;
                    update({
                      kind,
                      name: modes.find((m) => m[0] === kind)[1],
                      open: false,
                      secret: false,
                      transparent: kind === 'window',
                      blocksVision: kind !== 'window',
                    });
                  }}
                >
                  <option value="wall">Muro</option>
                  <option value="door">Puerta</option>
                  <option value="window">Ventana</option>
                </select>
              </label>
              {doors && (
                <>
                  <button
                    type="button"
                    aria-pressed={Boolean(selected.open)}
                    onClick={() => update({ open: !selected.open })}
                  >
                    <DoorOpen size={16} />{' '}
                    {selected.open ? 'Cerrar puerta' : 'Abrir puerta'}
                  </button>
                  <label className="n3-survey-check">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.secret)}
                      onChange={(e) => update({ secret: e.target.checked })}
                    />{' '}
                    Secreta
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <label className="n3-survey-color">
                Luz{' '}
                <input
                  aria-label="Color del foco"
                  type="color"
                  value={selected.color || '#fff1ae'}
                  onChange={(e) => update({ color: e.target.value })}
                />
              </label>
              <FieldRange
                label="Radio"
                value={selected.radius || 3}
                min={0.25}
                max={40}
                step={0.25}
                text={(v) => v.toLocaleString('es') + ' cas.'}
                onCommit={(radius) => update({ radius })}
              />
              <FieldRange
                label="Intensidad"
                value={selected.intensity ?? 0.8}
                min={0.15}
                max={1}
                step={0.05}
                text={(v) => Math.round(v * 100) + ' %'}
                onCommit={(intensity) => update({ intensity })}
              />
              <label className="n3-survey-check">
                <input
                  type="checkbox"
                  checked={Boolean(selected.flicker)}
                  onChange={(e) => update({ flicker: e.target.checked })}
                />{' '}
                Titilar
              </label>
            </>
          )}
          <button
            type="button"
            aria-label="Retirar elemento"
            title="Retirar elemento"
            onClick={async () => {
              if (await command({ type: 'terrain', removeId: selected.id }))
                change({ selectedId: null });
            }}
          >
            <Trash2 size={17} />
          </button>
        </section>
      ) : (
        <p className="n3-survey-help">{help[mode]}</p>
      )}
      <div
        className="n3-survey-tools"
        role="toolbar"
        aria-label="Puntos de trazado"
      >
        {modes.map(([key, label, Icon]) => (
          <button
            type="button"
            key={key}
            aria-label={label}
            aria-pressed={mode === key}
            onClick={() => change({ mode: key })}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          aria-label="Ajustar a la cuadrícula"
          title="Ajustar a la cuadrícula"
          aria-pressed={settings.grid}
          onClick={() => change({ grid: !settings.grid })}
        >
          <Grid3X3 size={18} />
          <span>Rejilla</span>
        </button>
        <button type="button" aria-label="Terminar trazado" onClick={close}>
          <Check size={19} />
          <span>Listo</span>
        </button>
      </div>
    </div>
  );
}
