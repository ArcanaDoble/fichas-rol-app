import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MasterMenu from '../MasterMenu';

test('retains direct Parry access and the tactical tools after removing the retired tool', () => {
  const onSelect = jest.fn();
  render(<MasterMenu onSelect={onSelect} onBackToMain={jest.fn()} />);
  expect(screen.queryByText('Sistema de Velocidad')).not.toBeInTheDocument();
  expect(screen.getByText('Canvas')).toBeInTheDocument();
  expect(screen.getByText('Tablero')).toBeInTheDocument();
  const parry = screen.getByText('Parry libre');
  fireEvent.click(parry);
  fireEvent.click(parry);
  expect(onSelect.mock.calls).toEqual([['parry-free'], ['parry-free']]);
});
