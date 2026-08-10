import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ProgressionView from '../ProgressionView';

const levels = Array.from({ length: 10 }, (_, index) => ({
  title: index === 3 ? 'Mejora de vida' : `Avance ${index + 1}`,
  description: `Beneficio del nivel ${index + 1}.`,
  maxLife: index < 3 ? 8 : 9,
  movement: index < 3 ? 2 : 3,
  resourceMaximum: index < 4 ? 3 : 4,
}));

test('shows acquired, current and pending levels without player editing controls', () => {
  render(
    <ProgressionView
      dndClass={{ level: 4, classLevels: levels, resource: { name: 'Furia' } }}
      readOnly
    />,
  );

  expect(screen.getByTestId('roguelite-progression-level-1').parentElement).toHaveAttribute('data-progression-layout', 'level-frames');
  expect(screen.getAllByTestId(/roguelite-progression-level-/)).toHaveLength(10);
  expect(screen.getByTestId('roguelite-progression-level-4')).toHaveTextContent('Nivel actual');
  expect(screen.getByTestId('roguelite-progression-level-5')).toHaveTextContent('Por desbloquear');
  expect(screen.getByTestId('roguelite-progression-level-4')).toHaveTextContent('Vida máxima');
  expect(screen.getByTestId('roguelite-progression-level-5')).toHaveTextContent('Furia máximo');
  expect(screen.queryByRole('button', { name: 'Añadir nivel' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Eliminar nivel/ })).not.toBeInTheDocument();
  expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
  expect(screen.getByTestId('roguelite-progression-level-4')).toHaveAttribute('data-level-state', 'current');
  expect(screen.getByTestId('roguelite-progression-level-4').querySelector('[data-effect-target="life.max"]')).toHaveClass('border-l-2', 'min-w-[144px]');
});

test('lets the master add, remove and edit progression content', () => {
  const onAddLevel = jest.fn();
  const onRemoveLevel = jest.fn();
  const onUpdateLevel = jest.fn();

  const { container } = render(
    <ProgressionView
      dndClass={{
        level: 1,
        classLevels: [{
          ...levels[0],
          effects: [{ id: 'life-up', target: 'life.max', operation: 'add', value: 1 }],
        }],
        resource: { name: 'Furia' },
      }}
      onAddLevel={onAddLevel}
      onRemoveLevel={onRemoveLevel}
      onUpdateLevel={onUpdateLevel}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Añadir nivel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar nivel 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Vida máxima' }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir mejora al nivel 1' }));
  fireEvent.click(screen.getAllByTitle('Editar')[0]);
  fireEvent.change(screen.getByDisplayValue('Avance 1'), { target: { value: 'Furia revisada' } });
  fireEvent.blur(screen.getByDisplayValue('Furia revisada'));

  expect(onAddLevel).toHaveBeenCalledTimes(1);
  expect(onRemoveLevel).toHaveBeenCalledWith(0);
  expect(onUpdateLevel).toHaveBeenCalledWith(0, 'effects', [
    expect.objectContaining({ target: 'life.max', operation: 'add', value: 2 }),
  ]);
  expect(onUpdateLevel).toHaveBeenCalledWith(0, 'effects', expect.arrayContaining([
    expect.objectContaining({ target: 'life.max', operation: 'add', value: 1 }),
  ]));
  expect(onUpdateLevel).toHaveBeenCalledWith(0, 'title', 'Furia revisada');
  expect(container.querySelector('input[type="number"]')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Eliminar nivel 1' })).toHaveClass('absolute', 'h-8', 'w-8');
  const lifeEffect = container.querySelector('[data-effect-editor="life.max"]');
  expect(lifeEffect).toHaveClass('border-l-[#d98b92]');
  expect(screen.getByLabelText('Tipo de mejora 1 del nivel 1')).toHaveValue('life.max');
  expect(screen.getByRole('button', { name: 'Eliminar mejora 1 del nivel 1' })).toBeInTheDocument();
});

test('keeps effect deletion aligned and lets the master change the class resource color', () => {
  const onResourceColorChange = jest.fn();

  render(
    <ProgressionView
      dndClass={{
        level: 1,
        classLevels: [{
          title: 'Reserva arcana',
          description: 'Aumenta el recurso.',
          effects: [{ id: 'resource-up', target: 'resource.max', operation: 'add', value: 1 }],
        }],
        resource: { name: 'Maná', color: '#38bdf8' },
      }}
      onResourceColorChange={onResourceColorChange}
    />,
  );

  fireEvent.change(screen.getByLabelText('Color de Maná máximo'), {
    target: { value: '#a78bfa' },
  });

  expect(onResourceColorChange).toHaveBeenCalledWith('#a78bfa');
  expect(screen.getByRole('button', { name: 'Eliminar mejora 1 del nivel 1' }))
    .toHaveClass('row-start-1', 'justify-self-end');
});
