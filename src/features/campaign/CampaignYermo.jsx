import React from 'react';
import PropTypes from 'prop-types';
import { Infinity as InfinityIcon, Minus, Plus } from 'lucide-react';
import { adjustYermo, getYermoScale, normalizeYermo } from './yermo';
import './CampaignYermo.css';

const CampaignYermo = ({ value, onChange, readOnly = false }) => {
  const amount = normalizeYermo(value);
  const scale = getYermoScale(amount);
  return (
    <section className="campaign-yermo" aria-label="Reserva de Yermo">
      <div className="campaign-yermo__header">
        <h4 className="campaign-stat-heading">
          Yermo
          <InfinityIcon className="campaign-yermo__infinity" aria-label="Sin máximo" />
        </h4>
        <div className="campaign-yermo__controls">
          {!readOnly && <button type="button" className="campaign-stat-adjust" aria-label="Reducir Yermo"
            disabled={amount === '0'} onClick={() => onChange(adjustYermo(amount, -1))}>
            <Minus aria-hidden="true" />
          </button>}
          <input type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off"
            className="campaign-stat-number campaign-yermo__amount" aria-label="Yermo actual"
            value={amount} readOnly={readOnly}
            style={{ width: `${Math.max(3, Math.min(14, amount.length + 1))}ch` }}
            onFocus={(event) => event.target.select()}
            onChange={(event) => {
              if (/^\d*$/.test(event.target.value)) onChange(normalizeYermo(event.target.value));
            }} />
          {!readOnly && <button type="button" className="campaign-stat-adjust" aria-label="Aumentar Yermo"
            onClick={() => onChange(adjustYermo(amount, 1))}>
            <Plus aria-hidden="true" />
          </button>}
        </div>
      </div>
      <div className="campaign-yermo__track" role="img"
        aria-label={`Yermo: ${amount}. Cada tramo representa ${scale.step}.`}>
        {scale.segments.map((fill, index) => (
          <span className="campaign-yermo__segment" key={index}>
            <span className="campaign-yermo__fill" style={{ transform: `scaleX(${fill / 100})` }} />
          </span>
        ))}
      </div>
      <div className="campaign-yermo__scale">{scale.step} por tramo</div>
    </section>
  );
};

CampaignYermo.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
};

export default CampaignYermo;
