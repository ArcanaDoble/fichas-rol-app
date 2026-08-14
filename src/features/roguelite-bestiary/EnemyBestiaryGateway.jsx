import React, { useState } from 'react';
import PropTypes from 'prop-types';
import BestiaryView from '../../components/BestiaryView';
import EnemyModeSelector from './EnemyModeSelector';
import RogueliteBestiaryView from './RogueliteBestiaryView';

const EnemyBestiaryGateway = ({ onBack, armas, armaduras, habilidades, accesorios }) => {
  const [mode, setMode] = useState(null);
  if (!mode) return <EnemyModeSelector onBack={onBack} onSelect={setMode} />;
  if (mode === 'role') return <BestiaryView onBack={() => setMode(null)} />;
  return <RogueliteBestiaryView onBack={() => setMode(null)} armas={armas} armaduras={armaduras} habilidades={habilidades} accesorios={accesorios} />;
};

EnemyBestiaryGateway.propTypes = {
  onBack: PropTypes.func.isRequired,
  armas: PropTypes.array,
  armaduras: PropTypes.array,
  habilidades: PropTypes.array,
  accesorios: PropTypes.array,
};

EnemyBestiaryGateway.defaultProps = { armas: [], armaduras: [], habilidades: [], accesorios: [] };

export default EnemyBestiaryGateway;

