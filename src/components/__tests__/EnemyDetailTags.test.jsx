import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnemyDetailView } from '../EnemyDetailView';

jest.mock('../../firebase', () => ({ storage: {} }));
jest.mock('../../utils/storage', () => ({ optimizeImageFile: jest.fn() }));

test('uses the persistent shared tag palette in the bestiary', () => {
  const onUpdate = jest.fn();

  render(
    <EnemyDetailView
      enemy={{
        id: 'wolf',
        name: 'Lobo',
        tags: ['Feroz|#ef4444'],
        abilities: [],
      }}
      enemies={[]}
      onClose={jest.fn()}
      onUpdate={onUpdate}
      onDelete={jest.fn()}
      highlightText={(value) => value}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Editar etiqueta Feroz' }));
  fireEvent.click(screen.getByRole('button', { name: 'Color Zafiro' }));

  expect(screen.getByRole('button', { name: 'Cerrar editor de etiqueta' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Color HEX de la etiqueta' })).toHaveValue('#3b82f6');
  expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
    tags: ['Feroz|#3b82f6'],
  }));
});

test('deletes an empty bestiary tag when its editor loses focus', () => {
  const onUpdate = jest.fn();

  render(
    <EnemyDetailView
      enemy={{
        id: 'wolf',
        name: 'Lobo',
        tags: ['Feroz|#ef4444'],
        abilities: [],
      }}
      enemies={[]}
      onClose={jest.fn()}
      onUpdate={onUpdate}
      onDelete={jest.fn()}
      highlightText={(value) => value}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Editar etiqueta Feroz' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre de etiqueta Feroz' }), {
    target: { value: '' },
  });
  fireEvent.mouseDown(document.body);

  expect(screen.queryByRole('button', { name: 'Editar etiqueta Feroz' })).not.toBeInTheDocument();
  expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ tags: [] }));
});
