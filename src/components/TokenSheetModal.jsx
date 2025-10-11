import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EnemyViewModal from './EnemyViewModal';
import TokenSheetEditor from './TokenSheetEditor';
import { saveTokenSheet, ensureSheetDefaults } from '../utils/token';

const TokenSheetModal = ({
  token,
  enemies = [],
  armas = [],
  armaduras = [],
  habilidades = [],
  onClose,
  highlightText,
  rarityColorMap = {},
}) => {
  const sheetId = token?.tokenSheetId;
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!sheetId || editing) return;
    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    let sheet = sheets[sheetId];

    if (!sheet) {
      let enemyData = null;
      if (token.enemyId) {
        enemyData = enemies.find((e) => e.id === token.enemyId);
      }
      if (enemyData) {
        sheet = JSON.parse(JSON.stringify(enemyData));
        sheet.id = sheetId;
      }
      if (!sheet) sheet = { id: sheetId, name: '', stats: {}, atributos: {} };
    }

    sheet = {
      ...sheet,
      name: token.customName || sheet.name || token.name || '',
      portrait: sheet.portrait || token.url,
    };

    // Map item names to full objects when coming from player data
    const mapItems = (items, catalog) =>
      (items || []).map((it) => {
        if (!it) return null;
        const base = typeof it === 'string' ? { nombre: it } : it;
        const fromCatalog = catalog.find((c) => c.nombre === base.nombre);
        return fromCatalog ? { ...fromCatalog, ...base } : base;
      }).filter(Boolean);
    sheet.weapons = mapItems(sheet.weapons, armas);
    sheet.armaduras = mapItems(sheet.armaduras, armaduras);
    sheet.poderes = mapItems(sheet.poderes, habilidades);

    sheet = ensureSheetDefaults(sheet);

    setData(sheet);
  }, [sheetId, token, enemies, armas, armaduras, habilidades, editing]);

  const handleSave = (updated) => {
    saveTokenSheet(updated);
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
        rarityColorMap={rarityColorMap}
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
  rarityColorMap: PropTypes.object,
};

export default TokenSheetModal;
