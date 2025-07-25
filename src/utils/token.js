import { nanoid } from 'nanoid';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import sanitize from './sanitize';

export const createToken = (data = {}) => {
  const token = { ...data, tokenSheetId: nanoid() };
  try {
    setDoc(doc(db, 'tokenSheets', token.tokenSheetId), { stats: {} });
  } catch (err) {
    console.error('create token sheet', err);
  }
  return token;
};

export const saveTokenSheet = async (sheet) => {
  if (!sheet?.id) return;
  const stored = localStorage.getItem('tokenSheets');
  const sheets = stored ? JSON.parse(stored) : {};
  sheets[sheet.id] = { ...(sheets[sheet.id] || {}), ...sheet };
  localStorage.setItem('tokenSheets', JSON.stringify(sheets));
  window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: sheet }));
  try {
    const data = sanitize(sheet);
    await setDoc(doc(db, 'tokenSheets', sheet.id), data);
  } catch (err) {
    console.error('save token sheet', err);
  }
};

export const cloneTokenSheet = (sourceId, targetId) => {
  if (!sourceId || !targetId) return;
  const stored = localStorage.getItem('tokenSheets');
  if (!stored) return;
  const sheets = JSON.parse(stored);
  const sheet = sheets[sourceId];
  if (!sheet) return;
  const copy = JSON.parse(JSON.stringify(sheet));
  copy.id = targetId;
  sheets[targetId] = copy;
  localStorage.setItem('tokenSheets', JSON.stringify(sheets));
  window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: copy }));
};
export const ensureSheetDefaults = (sheet) => {
  if (!sheet || typeof sheet !== 'object') return sheet;
  if (!sheet.atributos) sheet.atributos = {};
  ['destreza', 'vigor', 'intelecto', 'voluntad'].forEach((attr) => {
    if (!sheet.atributos[attr]) sheet.atributos[attr] = 'D4';
  });
  const recursoColor = {
    postura: '#34d399',
    vida: '#f87171',
    ingenio: '#60a5fa',
    cordura: '#a78bfa',
    armadura: '#9ca3af',
  };
  const ensure = (st, index, id) => {
    const stat = { ...st };
    if (stat.base === undefined) stat.base = stat.total ?? 0;
    if (stat.total === undefined) stat.total = stat.base;
    if (stat.color === undefined) stat.color = recursoColor[id] || '#ffffff';
    if (stat.showOnToken === undefined)
      stat.showOnToken = index < 5 ? true : !!(stat.base || stat.total || stat.actual || stat.buff);
    if (stat.label === undefined) stat.label = id;
    if (stat.tokenRow === undefined) stat.tokenRow = index;
    if (stat.tokenAnchor === undefined) stat.tokenAnchor = 'top';
    return stat;
  };
  if (!sheet.stats) sheet.stats = {};
  if (sheet.resourcesList && sheet.resourcesList.length > 0) {
    sheet.resourcesList.forEach((res, idx) => {
      sheet.stats[res.id] = ensure(sheet.stats[res.id] || {}, idx, res.id);
      if (res.color && !sheet.stats[res.id].color) sheet.stats[res.id].color = res.color;
      if (res.tokenRow !== undefined) sheet.stats[res.id].tokenRow = res.tokenRow;
      if (res.tokenAnchor) sheet.stats[res.id].tokenAnchor = res.tokenAnchor;
    });
  } else if (Object.keys(sheet.stats).length === 0) {
    ['postura','vida','ingenio','cordura','armadura'].forEach((id, idx) => {
      sheet.stats[id] = ensure({}, idx, id);
    });
  } else {
    Object.keys(sheet.stats).forEach((id, idx) => {
      sheet.stats[id] = ensure(sheet.stats[id], idx, id);
    });
  }
  return sheet;
};
