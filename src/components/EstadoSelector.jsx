import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-tooltip';

const ESTADOS = [
  { id: 'acido', name: 'Ácido', img: '/estados/Ácido.png', desc: 'Pierdes una propiedad de armadura hasta que tu u otro personaje realice la acción de REPARAR sobre la armadura.' },
  { id: 'apresado', name: 'Apresado', img: '/estados/Apresado.png', desc: 'No puedes realizar acciones de evasión ni de movimiento hasta que tu u otro personaje realice la acción de LIBERAR sobre ti.' },
  { id: 'ardiendo', name: 'Ardiendo', img: '/estados/Ardiendo.png', desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de APAGAR sobre ti, pierdes un bloque de cuerpo o de mente.' },
  { id: 'asfixiado', name: 'Asfixiado', img: '/estados/Asfixiado.png', desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de RESPIRAR sobre ti, pierdes un bloque de cuerpo.' },
  { id: 'asustado', name: 'Asustado', img: '/estados/Asustado.png', desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de TRANQUILIZAR sobre ti, pierdes un bloque de mente.' },
  { id: 'aturdido', name: 'Aturdido', img: '/estados/Aturdido.png', desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de ESPABILAR sobre ti, pierdes un bloque de mente.' },
  { id: 'cansado', name: 'Cansado', img: '/estados/Enfermo.png', desc: 'Por cada tiempo que gastes hasta que realices la acción de DESCANSAR, pierdes un bloque de cuerpo.' },
  { id: 'cegado', name: 'Cegado', img: '/estados/Cegado.png', desc: 'Por cada tiempo que gastes para realizar una tirada hasta que realices la acción de ACLARAR, se anula un dado del resultado.' },
  { id: 'congelado', name: 'Congelado', img: '/estados/Congelado.png', desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de CALENTAR sobre ti, pierdes un bloque de cuerpo o de mente.' },
  { id: 'derribado', name: 'Derribado', img: '/estados/Derribado.png', desc: 'No puedes defenderte ni realizar acciones de movimiento hasta que tu u otro personaje realice la acción de LEVANTAR sobre tí.' },
  { id: 'enfermo', name: 'Enfermo', img: '/estados/Enfermo.png', desc: 'Por cada tiempo que gastes hasta que tu u otro personaje realice la acción de TRATAR sobre ti, pierdes un bloque de cuerpo o de mente.' },
  { id: 'ensordecido', name: 'Ensordecido', img: '/estados/Ensordecido.png', desc: 'No puedes oir hasta que realices la acción de ACLARAR.' },
  { id: 'envenenado', name: 'Envenenado', img: '/estados/Envenenado.png', desc: 'No puedes recibir curaciones hasta que tu u otro personaje realice la acción de TRATAR sobre ti.' },
  { id: 'herido', name: 'Herido', img: '/estados/Herido.png', desc: 'Puede ser utilizado por el scheduler como una clave que garantiza un fracaso. Desaparece tras un descanso largo.' },
  { id: 'iluminado', name: 'Iluminado', img: '/estados/Iluminado.png', desc: 'Emites luz a tu alrededor.' },
  { id: 'regeneracion', name: 'Regeneración', img: '/estados/Regeneración.png', desc: 'Por cada tiempo que gastes hasta que recibas daño, recuperas un bloque de cuerpo.' },
  { id: 'sangrado', name: 'Sangrado', img: '/estados/Sangrado.png', desc: 'Por cada tiempo que gastes hasta que recibas una curación, pierdes un bloque de cuerpo.' },
  { id: 'silenciado', name: 'Silenciado', img: '/estados/Silenciado.png', desc: 'No puedes hablar hasta que realices la acción de ACLARAR.' },
];

function EstadoSelector({ selected = [], onToggle }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
      {ESTADOS.map(e => (
        <button
          key={e.id}
          onClick={() => onToggle(e.id)}
          className={`relative rounded-lg p-2 bg-gray-800 hover:bg-gray-700 transition flex flex-col items-center justify-center ${selected.includes(e.id) ? 'ring-2 ring-green-400' : ''}`}
          data-tooltip-id={`estado-${e.id}`}
          data-tooltip-content={e.desc}
        >
          <img src={e.img} alt={e.name} className="w-12 h-12" />
          <span className="text-xs mt-1">{e.name}</span>
          <Tooltip id={`estado-${e.id}`} place="top" className="max-w-[90vw] sm:max-w-xs whitespace-pre-line break-words" />
        </button>
      ))}
    </div>
  );
}

EstadoSelector.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.string),
  onToggle: PropTypes.func.isRequired,
};

export default EstadoSelector;
export { ESTADOS };
