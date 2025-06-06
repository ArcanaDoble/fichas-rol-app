import React from 'react';

const GridCell = ({ size }) => (
  <div
    style={{ width: size, height: size }}
    className="border border-gray-700 box-border"
  />
);

export default GridCell;
