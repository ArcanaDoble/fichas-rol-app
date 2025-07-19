import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import EnemyViewModal from './EnemyViewModal';
import TokenSheetEditor from './TokenSheetEditor';

const recursoColor = {
  postura: '#34d399',
  vida: '#f87171',
  ingenio: '#60a5fa',
  cordura: '#a78bfa',
  armadura: '#9ca3af',
};

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

    sheet = {
      ...sheet,
      name: token.customName || sheet.name || token.name || '',
      portrait: sheet.portrait || token.url,
    };

    // Map item names to full objects when coming from player data
    const mapItems = (items, catalog) =>
      (items || []).map((it) => {
        if (typeof it === 'string') {
          return catalog.find((c) => c.nombre === it) || { nombre: it };
        }
        return it;
      });
    sheet.weapons = mapItems(sheet.weapons, armas);
    sheet.armaduras = mapItems(sheet.armaduras, armaduras);
    sheet.poderes = mapItems(sheet.poderes, habilidades);

    const ensureStatDefaults = (st, index, id, name, color, row, anchor) => {
      const stat = { ...st };
      if (stat.base === undefined) stat.base = stat.total ?? 0;
      if (stat.total === undefined) stat.total = stat.base;
      if (stat.color === undefined) stat.color = color || '#ffffff';
      if (stat.showOnToken === undefined)
        stat.showOnToken = index < 5 ? true : !!(stat.base || stat.total || stat.actual || stat.buff);
      if (stat.label === undefined) stat.label = name || id;
      if (stat.tokenRow === undefined) stat.tokenRow = row ?? index;
      if (stat.tokenAnchor === undefined) stat.tokenAnchor = anchor ?? 'top';
      return stat;
    };

    if (sheet.resourcesList && sheet.resourcesList.length > 0) {
      sheet.resourcesList.forEach((res, index) => {
        const existing = sheet.stats[res.id] || {};
        sheet.stats[res.id] = ensureStatDefaults(
          existing,
          index,
          res.id,
          res.name,
          res.color || recursoColor[res.id],
          res.tokenRow,
          res.tokenAnchor
        );
      });
    } else if (!sheet.stats || Object.keys(sheet.stats).length === 0) {
      sheet.stats = {
        postura: ensureStatDefaults({}, 0, 'postura', 'postura', recursoColor.postura),
        vida: ensureStatDefaults({}, 1, 'vida', 'vida', recursoColor.vida),
        ingenio: ensureStatDefaults({}, 2, 'ingenio', 'ingenio', recursoColor.ingenio),
        cordura: ensureStatDefaults({}, 3, 'cordura', 'cordura', recursoColor.cordura),
        armadura: ensureStatDefaults({}, 4, 'armadura', 'armadura', recursoColor.armadura),
      };
    } else {
      Object.keys(sheet.stats).forEach((k, index) => {
        sheet.stats[k] = ensureStatDefaults(sheet.stats[k], index, k, k, recursoColor[k]);
      });
    }

    setData(sheet);
  }, [sheetId, token, enemies, armas, armaduras, habilidades]);

  const handleSave = (updated) => {
    const stored = localStorage.getItem('tokenSheets');
    const sheets = stored ? JSON.parse(stored) : {};
    sheets[sheetId] = updated;
    localStorage.setItem('tokenSheets', JSON.stringify(sheets));
    setData(updated);
    setEditing(false);
    window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: updated }));
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
