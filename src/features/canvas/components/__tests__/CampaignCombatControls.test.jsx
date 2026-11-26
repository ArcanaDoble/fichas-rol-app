import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CombatRose } from '../CampaignCombatControls';
import CampaignThreatTray from '../CampaignThreatTray';

test('keyboard zone selection focuses the actual radio instead of the decorative SVG lance', () => {
  function Rose() {
    const [zone, setZone] = useState(null);
    return <CombatRose phase="defense" value={zone} onChange={setZone} />;
  }
  render(<Rose />);
  const center = screen.getByRole('radio', { name:'Centro' });
  center.focus();
  fireEvent.keyDown(center, { key:'ArrowRight' });
  expect(screen.getByRole('radio', { name:'Derecha' })).toHaveFocus();
  expect(screen.getByRole('radio', { name:'Derecha' })).toHaveAttribute('aria-checked','true');
});

test('the quick tray adds repeated grades, removes just one copy, and clears without rolling', () => {
  const changed = jest.fn();
  function Tray() {
    const [selection, setSelection] = useState({ customDice: [] });
    return <CampaignThreatTray selection={selection} onChange={next => { changed(next); setSelection(next); }} />;
  }
  const { container } = render(<Tray />);
  expect(container.querySelector('details')).toBeNull();
  for (let i = 0; i < 12; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Añadir d8 de Amenaza' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir d20 de Amenaza' }));
  expect(screen.getByText('12d8 + 1d20')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar d8 de Amenaza' }));
  expect(changed).toHaveBeenLastCalledWith({ customDice: [...Array(11).fill(8), 20] });
  expect(screen.getByRole('button', { name: 'Quitar d4 de Amenaza' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Vaciar' }));
  expect(changed).toHaveBeenLastCalledWith({ customDice: [] });
  expect(screen.queryByRole('button', { name: 'Vaciar' })).not.toBeInTheDocument();
});

test('revealed lances distinguish the attacker and a missed parry on separate zones', () => {
  const { container } = render(<CombatRose phase="result" attackZone={['arriba']} defenseZone={['abajo']} defense="parry" />);
  expect(screen.getByRole('img', { name: 'Ataque: Arriba. Parry: Abajo.' })).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(container.querySelector('[data-zone="arriba"] .polish-lance').getAttribute('fill')).toMatch(/-red\)$/);
  const lower = [...container.querySelectorAll('[data-zone="abajo"] .polish-lance')];
  expect(lower).toHaveLength(2);
  lower.forEach(lance => expect(lance.getAttribute('fill')).toMatch(/-blue\)$/));
});

test('a matching parry retains both colors on the same lance, including the central zone', () => {
  const { container, rerender } = render(<CombatRose phase="result" attackZone={['derecha']} defenseZone={['derecha']} defense="parry" matched />);
  expect(container.querySelector('[data-zone="derecha"] .polish-lance').getAttribute('fill')).toMatch(/-clash\)$/);
  expect(container.querySelector('[data-zone="derecha"]')).toHaveAttribute('data-active', 'true');
  expect(container.querySelector('[data-zone="derecha"]')).toHaveAttribute('data-guard', 'true');
  rerender(<CombatRose phase="result" attackZone={['centro']} defenseZone={['centro']} defense="parry" matched />);
  expect(container.querySelector('.polish-rose-center')).toHaveAttribute('data-active', 'true');
  expect(container.querySelector('.polish-rose-center')).toHaveAttribute('data-guard', 'true');
  expect(screen.getByRole('img', { name: 'Ataque: Centro. Parry: Centro.' })).toBeInTheDocument();
});

test('revealed dual attacks and double parries retain every chosen zone without coloring an evasion as parry', () => {
  const { container, rerender } = render(<CombatRose phase="result" attackZone={['arriba', 'izquierda']}
    defenseZone={['arriba', 'derecha']} defense="parry" />);
  expect(container.querySelector('[data-zone="arriba"] .polish-lance').getAttribute('fill')).toMatch(/-clash\)$/);
  expect(container.querySelector('[data-zone="izquierda"] .polish-lance').getAttribute('fill')).toMatch(/-red\)$/);
  expect(container.querySelector('[data-zone="derecha"] .polish-lance').getAttribute('fill')).toMatch(/-blue\)$/);
  rerender(<CombatRose phase="result" attackZone={['arriba']} defenseZone={['derecha']} defense="evade" />);
  expect(container.querySelector('[data-guard="true"]')).toBeNull();
});

test('unresolved parry never paints the rival zone even if unrevealed props are supplied', () => {
  const { container } = render(<CombatRose phase="defense" value="izquierda" onChange={() => {}}
    attackZone={['arriba']} defenseZone={['derecha']} defense="parry" />);
  expect(screen.getByRole('radiogroup', { name: 'Zona de parry' })).toBeInTheDocument();
  expect(container.querySelector('[data-zone="arriba"]')).toHaveAttribute('data-active', 'false');
  expect(container.querySelector('[data-guard="true"]')).toBeNull();
  expect(screen.queryByRole('img', { name: /Ataque:/ })).not.toBeInTheDocument();
});
