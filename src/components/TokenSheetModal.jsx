import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EnemyViewModal from './EnemyViewModal';
import TokenSheetEditor from './TokenSheetEditor';

const TokenSheetModal = ({
  token,
  enemies = [],
  armas = [],
  armaduras = [],
  habilidades = [],
  onClose,
  highlightText,
}) => {
  const sheetId = token?.tokenSheetId;
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);

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
      if (!sheet) sheet = { id: sheetId, name: '', stats: {}, atributos: {} };
    }
    // Use token info if sheet lacks it
    sheet = {
      ...sheet,
      name: token.customName || sheet.name || token.name || '',
      portrait: sheet.portrait || token.url,
    };
    if (!sheet.stats || Object.keys(sheet.stats).length === 0) {
      sheet.stats = {
        postura: { base: 0, actual: 0, total: 0 },
        vida: { base: 0, actual: 0, total: 0 },
        ingenio: { base: 0, actual: 0, total: 0 },
        cordura: { base: 0, actual: 0, total: 0 },
        armadura: { base: 0, actual: 0, total: 0 },
      };
    } else {
      Object.keys(sheet.stats).forEach((k) => {
        const st = sheet.stats[k] || {};
        if (st.base === undefined) st.base = st.total ?? 0;
        if (st.total === undefined) st.total = st.base;
      });
    }
    setData(sheet);
  }, [sheetId, token, enemies]);

  const handleSave = (updated) => {
    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    sheets[sheetId] = updated;
    localStorage.setItem('tokenSheets', JSON.stringify(sheets));
    setData(updated);
    setEditing(false);
  };

  if (!token || !data) return null;

  return (
    <>
      <EnemyViewModal
        enemy={data}
        onClose={onClose}
        onEdit={() => setEditing(true)}
        highlightText={highlightText}
        floating
      />
      {editing && (
        <TokenSheetEditor
          sheet={data}
          armas={armas}
          armaduras={armaduras}
          habilidades={habilidades}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
};

TokenSheetModal.propTypes = {
  token: PropTypes.object,
  enemies: PropTypes.array,
  armas: PropTypes.array,
  armaduras: PropTypes.array,
  habilidades: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  highlightText: PropTypes.func,
};

export default TokenSheetModal;
