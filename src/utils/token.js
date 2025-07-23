import { nanoid } from 'nanoid';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
    await setDoc(doc(db, 'tokenSheets', sheet.id), sheet, { merge: true });
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
