import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LoadingImage from '../LoadingImage';

test('keeps a new image hidden until it has loaded', () => {
  const { container } = render(
    <div className="relative h-32 w-32">
      <LoadingImage src="https://example.com/new-portrait.webp" alt="Retrato" />
    </div>,
  );

  const image = screen.getByRole('img', { name: 'Retrato' });
  expect(image).toHaveStyle({ opacity: '0' });
  expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();

  fireEvent.load(image);

  expect(image.style.opacity).toBe('');
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});

test('remembers decoded sources so revisiting does not flash a placeholder', () => {
  const source = 'https://example.com/cached-equipment.webp';
  const firstRender = render(<LoadingImage src={source} alt="Equipo" />);
  fireEvent.load(screen.getByRole('img', { name: 'Equipo' }));
  firstRender.unmount();

  const { container } = render(<LoadingImage src={source} alt="Equipo guardado" />);

  expect(screen.getByRole('img', { name: 'Equipo guardado' }).style.opacity).toBe('');
  expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
});

test('hides the previous image while a different source is loading', () => {
  const { rerender } = render(
    <LoadingImage src="https://example.com/first.webp" alt="Objeto" />,
  );
  fireEvent.load(screen.getByRole('img', { name: 'Objeto' }));

  rerender(<LoadingImage src="https://example.com/second.webp" alt="Objeto" />);

  expect(screen.getByRole('img', { name: 'Objeto' })).toHaveStyle({ opacity: '0' });
});
