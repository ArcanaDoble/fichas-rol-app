import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EnemySheet from './EnemySheet';

const TokenSheetModal = ({ sheetId, onClose }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    setData(sheets[sheetId] || { id: sheetId, name: '', stats: {} });
  }, [sheetId]);

  const handleSave = (d) => {
    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    sheets[sheetId] = d;
    localStorage.setItem('tokenSheets', JSON.stringify(sheets));
    setData(d);
  };

  if (!data) return null;

  return <EnemySheet enemy={data} onClose={onClose} onSave={handleSave} />;
};

TokenSheetModal.propTypes = {
  sheetId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TokenSheetModal;
