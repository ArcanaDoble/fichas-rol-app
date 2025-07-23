import { nanoid } from 'nanoid';

export const createToken = (data = {}) => ({
  ...data,
  syncWithPlayer: true,
  tokenSheetId: nanoid(),
});

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
