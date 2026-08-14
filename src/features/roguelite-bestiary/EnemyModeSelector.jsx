import React from 'react';
import PropTypes from 'prop-types';
import { FiArrowLeft, FiChevronRight, FiShield } from 'react-icons/fi';
import { Skull } from 'lucide-react';

const EnemyModeSelector = ({ onBack, onSelect }) => (
  <main className="noma-enemy-mode">
    <div className="noma-enemy-mode__frame">
      <header className="noma-enemy-mode__header">
        <div>
          <button type="button" className="noma-enemy-mode__back" onClick={onBack}>
            <FiArrowLeft /> Volver
          </button>
          <h1>Fichas de enemigos</h1>
          <p>Elige el archivo que vas a gestionar. Ambos sistemas conservan sus criaturas y reglas por separado.</p>
        </div>
      </header>
      <div className="noma-enemy-mode__choices">
        <button type="button" onClick={() => onSelect('roguelite')}>
          <span className="noma-enemy-mode__icon"><Skull /></span>
          <span><small>Archivo de combate</small><strong>Roguelite</strong><em>Tarjetas de enemigo, equipo, habilidades y despliegue directo en el Canvas.</em></span>
          <FiChevronRight />
        </button>
        <button type="button" onClick={() => onSelect('role')}>
          <span className="noma-enemy-mode__icon"><FiShield /></span>
          <span><small>Registro de enemigos</small><strong>Rol tradicional</strong><em>Abre el bestiario de las partidas de rol sin transformar sus fichas.</em></span>
          <FiChevronRight />
        </button>
      </div>
    </div>
  </main>
);

EnemyModeSelector.propTypes = {
  onBack: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default EnemyModeSelector;
