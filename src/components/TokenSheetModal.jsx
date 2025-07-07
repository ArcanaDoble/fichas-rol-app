import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EnemyViewModal from './EnemyViewModal';

const TokenSheetModal = ({ token, enemies = [], onClose }) => {
  const sheetId = token?.tokenSheetId;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sheetId) return;
    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    let sheet = sheets[sheetId];
    if (!sheet) {
      if (token.enemyId) {
        const enemy = enemies.find((e) => e.id === token.enemyId);
        if (enemy) {
          sheet = JSON.parse(JSON.stringify(enemy));
          sheet.id = sheetId;
        }
      }
      if (!sheet) sheet = { id: sheetId, name: '', stats: {} };
    }
    setData(sheet);
  }, [sheetId, token, enemies]);

  if (!token || !data) return null;

  return (
    <EnemyViewModal
      enemy={data}
      onClose={onClose}
    />
  );
};

TokenSheetModal.propTypes = {
  token: PropTypes.object,
  enemies: PropTypes.array,
  onClose: PropTypes.func.isRequired,
};

export default TokenSheetModal;
