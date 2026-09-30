import React from 'react';
import PropTypes from 'prop-types';
import { Hand } from 'lucide-react';

const resolveIndicatorState = (usages = []) => {
  const equippedUsages = usages.filter((usage) => usage?.hand || usage?.slot);
  const usesBothHands = equippedUsages.some((usage) => (
    usage.hand === 'both' || Number(usage.handsRequired) === 2
  ));
  const usesLeftHand = usesBothHands || equippedUsages.some((usage) => (
    usage.hand === 'left' || usage.slot === 'offHand'
  ));
  const usesRightHand = usesBothHands || equippedUsages.some((usage) => (
    usage.hand === 'right' || usage.slot === 'mainHand'
  ));
  const setNames = [...new Set(equippedUsages.map((usage) => (
    Number(usage.weaponSetIndex) === 1 ? 'II' : 'I'
  )))];

  let stateLabel = 'libre';
  if (usesBothHands) stateLabel = 'equipada a dos manos';
  else if (usesLeftHand && usesRightHand) stateLabel = 'equipada en ambas manos';
  else if (usesLeftHand) stateLabel = 'equipada en mano torpe';
  else if (usesRightHand) stateLabel = 'equipada en mano hábil';

  return {
    usesLeftHand,
    usesRightHand,
    label: setNames.length > 0
      ? `Conjunto ${setNames.join(' y ')}: ${stateLabel}`
      : 'Libre: ninguna mano ocupada',
  };
};

const EquipmentHandsIndicator = ({ usages = [], className = '', subtle = false }) => {
  const { usesLeftHand, usesRightHand, label } = resolveIndicatorState(usages);

  return (
    <span
      className={`noma-equipment-hands ${subtle ? 'is-subtle' : ''} ${className}`.trim()}
      role="img"
      aria-label={label}
      title={label}
    >
      <span className={`noma-equipment-hands__hand is-left ${usesLeftHand ? 'is-active' : ''}`}>
        <Hand aria-hidden="true" />
      </span>
      <span className={`noma-equipment-hands__hand is-right ${usesRightHand ? 'is-active' : ''}`}>
        <Hand aria-hidden="true" />
      </span>
    </span>
  );
};

EquipmentHandsIndicator.propTypes = {
  usages: PropTypes.arrayOf(PropTypes.shape({
    hand: PropTypes.oneOf(['left', 'right', 'both']),
    slot: PropTypes.oneOf(['mainHand', 'offHand']),
    handsRequired: PropTypes.number,
    weaponSetIndex: PropTypes.number,
  })),
  className: PropTypes.string,
  subtle: PropTypes.bool,
};

EquipmentHandsIndicator.defaultProps = {
  usages: [],
  className: '',
  subtle: false,
};

export default EquipmentHandsIndicator;
