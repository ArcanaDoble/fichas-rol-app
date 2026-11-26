import React from 'react';
import PropTypes from 'prop-types';
import { FiArrowLeft, FiChevronRight } from 'react-icons/fi';

const EnemyModeSelector = ({ onBack, onSelect }) => (
  <main className="noma-enemy-mode">
    <div className="noma-enemy-mode__frame">
      <header className="noma-enemy-mode__header">
        <div>
          <button type="button" className="noma-enemy-mode__back" onClick={onBack}>
            <FiArrowLeft /> Volver
          </button>
          <h1>Fichas de enemigos</h1>
          <p>Elige el archivo que vas a gestionar. Las fichas de Roguelite, rol tradicional y Campaña se guardan por separado.</p>
        </div>
      </header>
      <div className="noma-enemy-mode__choices">
        <button type="button" className="noma-enemy-mode__choice" onClick={() => onSelect('roguelite')}>
          <span className="noma-enemy-mode__art" aria-hidden="true"><img src="/armas/espada_larga.webp" alt="" /></span>
          <span className="noma-enemy-mode__copy"><small>Archivo de combate</small><strong>Roguelite</strong><em>Tarjetas de enemigo, equipo, habilidades y despliegue directo en el Canvas.</em></span>
          <span className="noma-enemy-mode__entry">Abrir archivo <FiChevronRight aria-hidden="true" /></span>
        </button>
        <button type="button" className="noma-enemy-mode__choice" onClick={() => onSelect('campaignNpc')}>
          <span className="noma-enemy-mode__art" aria-hidden="true"><img src="/objetos/pergamino.webp" alt="" /></span>
          <span className="noma-enemy-mode__copy"><small>Archivo de Campaña</small><strong>PNJ y enemigos de Campaña</strong><em>Fichas reutilizables de aliados y enemigos. Elige su bando y añádelas al encuentro.</em></span>
          <span className="noma-enemy-mode__entry">Abrir archivo <FiChevronRight aria-hidden="true" /></span>
        </button>
        <button type="button" className="noma-enemy-mode__choice" onClick={() => onSelect('role')}>
          <span className="noma-enemy-mode__art" aria-hidden="true"><img src="/objetos/libro.webp" alt="" /></span>
          <span className="noma-enemy-mode__copy"><small>Registro de enemigos</small><strong>Rol tradicional</strong><em>Abre el bestiario de las partidas de rol sin transformar sus fichas.</em></span>
          <span className="noma-enemy-mode__entry">Abrir archivo <FiChevronRight aria-hidden="true" /></span>
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
