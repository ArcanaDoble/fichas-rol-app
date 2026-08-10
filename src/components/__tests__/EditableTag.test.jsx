import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import EditableTag from '../EditableTag';

const EditableTagHarness = ({ onCommit = jest.fn() }) => {
  const [name, setName] = useState('Arcano');
  const [color, setColor] = useState('#ef4444');

  return (
    <EditableTag
      name={name}
      color={color}
      onNameChange={setName}
      onColorChange={setColor}
      onCommit={onCommit}
    />
  );
};

test('keeps the palette open while editing text, presets and a custom HEX color', () => {
  const onCommit = jest.fn();
  render(<EditableTagHarness onCommit={onCommit} />);

  fireEvent.click(screen.getByRole('button', { name: 'Editar etiqueta Arcano' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre de etiqueta Arcano' }), {
    target: { value: 'Canalizador' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Color Violeta' }));

  expect(screen.getByRole('textbox', { name: 'Color HEX de la etiqueta' })).toHaveValue('#a78bfa');
  expect(screen.getByRole('button', { name: 'Cerrar editor de etiqueta' })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('textbox', { name: 'Color HEX de la etiqueta' }), {
    target: { value: '#123456' },
  });
  expect(screen.getByRole('textbox', { name: 'Color HEX de la etiqueta' })).toHaveValue('#123456');

  fireEvent.click(screen.getByRole('button', { name: 'Aplicar color de etiqueta' }));
  expect(screen.getByRole('button', { name: 'Editar etiqueta Canalizador' })).toHaveStyle({
    color: '#123456',
  });
  expect(onCommit).toHaveBeenCalledTimes(1);
});

test('renders player tags without editing controls', () => {
  render(<EditableTag name="Solo lectura" color="#38bdf8" readOnly />);

  expect(screen.getByText('Solo lectura')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Editar etiqueta/ })).not.toBeInTheDocument();
});
