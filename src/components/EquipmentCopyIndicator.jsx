import React from 'react';
import PropTypes from 'prop-types';
import { Layers2 } from 'lucide-react';

const EquipmentCopyIndicator = ({ count = 1 }) => {
  if (count < 2) return null;

  const label = `${count} copias físicas`;
  return (
    <span
      className="noma-equipment-copy"
      role="img"
      aria-label={label}
      title={label}
    >
      <Layers2 aria-hidden="true" />
      <span aria-hidden="true">{count}</span>
    </span>
  );
};

EquipmentCopyIndicator.propTypes = {
  count: PropTypes.number,
};

export default EquipmentCopyIndicator;
