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

  expect(screen.getByTestId('roguelite-progression-rail')).toBeInTheDocument();
  expect(screen.getAllByTestId(/roguelite-progression-level-/)).toHaveLength(10);
  expect(screen.getByTestId('roguelite-progression-level-4')).toHaveTextContent('Nivel actual');
  expect(screen.getByTestId('roguelite-progression-level-5')).toHaveTextContent('Por desbloquear');
  expect(screen.getByTestId('roguelite-progression-level-4')).toHaveTextContent('Furia máx.');
  expect(screen.queryByRole('button', { name: 'Añadir nivel' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Eliminar nivel/ })).not.toBeInTheDocument();
  expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
});

test('lets the master add, remove and edit progression content', () => {
  const onAddLevel = jest.fn();
  const onRemoveLevel = jest.fn();
  const onUpdateLevel = jest.fn();

  const { container } = render(
    <ProgressionView
      dndClass={{ level: 1, classLevels: [levels[0]], resource: { name: 'Furia' } }}
      onAddLevel={onAddLevel}
      onRemoveLevel={onRemoveLevel}
      onUpdateLevel={onUpdateLevel}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Añadir nivel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar nivel 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar Vida' }));
  fireEvent.click(screen.getAllByTitle('Editar')[0]);
  fireEvent.change(screen.getByDisplayValue('Avance 1'), { target: { value: 'Furia revisada' } });
  fireEvent.blur(screen.getByDisplayValue('Furia revisada'));

  expect(onAddLevel).toHaveBeenCalledTimes(1);
  expect(onRemoveLevel).toHaveBeenCalledWith(0);
  expect(onUpdateLevel).toHaveBeenCalledWith(0, 'maxLife', 9);
  expect(onUpdateLevel).toHaveBeenCalledWith(0, 'title', 'Furia revisada');
  expect(container.querySelector('input[type="number"]')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Eliminar nivel 1' })).toHaveClass('absolute', 'h-10', 'w-10');
  const lifeMetric = container.querySelector('[data-metric-tone="life"]');
  expect(lifeMetric).toHaveClass('from-[#713b43]/[0.14]');
  expect(container.querySelector('[data-metric-tone="movement"]')).toHaveClass('from-[#31586a]/[0.14]');
  expect(container.querySelector('[data-metric-tone="resource"]')).toHaveClass('from-[#523d68]/[0.14]');
  expect(container.querySelector('[data-metric-tone="movement"]')).toHaveClass('lg:flex-col');
  expect(container.querySelector('[data-metric-tone="resource"]')).toHaveClass('min-w-0', 'overflow-hidden');
  expect(lifeMetric.parentElement).toHaveClass('lg:grid-cols-3');
  expect(lifeMetric.parentElement).not.toHaveClass('sm:grid-cols-3');
});
