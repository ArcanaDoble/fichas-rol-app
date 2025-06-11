import React from 'react';
import PropTypes from 'prop-types';

const GridCell = ({ size }) => (
  <div
    style={{ width: size, height: size }}
    className="border border-gray-700 box-border"
  />
);

GridCell.propTypes = {
  size: PropTypes.number.isRequired,
};

export default GridCell;
