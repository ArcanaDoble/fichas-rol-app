import { render, act } from '@testing-library/react';
import React from 'react';

function EquipmentSyncListener({ tokens }) {
  React.useEffect(() => {
    const handler = (e) => {
      const sheet = e.detail;
      if (!sheet || !sheet.id) return;
      const token = tokens.find(
        (t) =>
          t.tokenSheetId === sheet.id &&
          t.controlledBy &&
          t.controlledBy !== 'master'
      );
      if (!token) return;
      const mapNames = (arr) =>
        (arr || [])
          .map((it) => (typeof it === 'string' ? it : it.nombre))
          .filter(Boolean);
      const playerSheet = {
        ...sheet,
        weapons: mapNames(sheet.weapons),
        armaduras: mapNames(sheet.armaduras),
        poderes: mapNames(sheet.poderes),
      };
      localStorage.setItem(
        `player_${token.controlledBy}`,
        JSON.stringify(playerSheet)
      );
      window.dispatchEvent(
        new CustomEvent('playerSheetSaved', {
          detail: { name: token.controlledBy, sheet: playerSheet, origin: 'mapSync' },
        })
      );
    };
    window.addEventListener('tokenSheetSaved', handler);
    return () => window.removeEventListener('tokenSheetSaved', handler);
  }, [tokens]);
  return null;
}

test('equipment names are mapped on tokenSheetSaved', () => {
  const tokens = [{ id: 't1', controlledBy: 'Alice', tokenSheetId: 's1' }];
  const saved = jest.fn();
  localStorage.clear();
  window.addEventListener('playerSheetSaved', saved);
  render(<EquipmentSyncListener tokens={tokens} />);

  const sheet = {
    id: 's1',
    weapons: [{ nombre: 'Espada' }],
    armaduras: [{ nombre: 'Armadura' }],
    poderes: [{ nombre: 'Fuego' }],
  };

  act(() => {
    window.dispatchEvent(new CustomEvent('tokenSheetSaved', { detail: sheet }));
  });

  const stored = JSON.parse(localStorage.getItem('player_Alice'));
  expect(stored.weapons).toEqual(['Espada']);
  expect(stored.armaduras).toEqual(['Armadura']);
  expect(stored.poderes).toEqual(['Fuego']);
  expect(saved).toHaveBeenCalledTimes(1);
  window.removeEventListener('playerSheetSaved', saved);
});
