import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LibraryCharacterCard } from '../LibraryCharacterCard';

test('keeps a portrait hidden until the browser reports it as loaded', () => {
  render(
    <LibraryCharacterCard
      item={{ name: 'Bárbaro', image: 'https://example.com/barbarian.webp', level: 1 }}
      onOpen={jest.fn()}
    />,
  );

  const portrait = screen.getByRole('img', { name: 'Bárbaro' });
  expect(portrait).toHaveClass('opacity-0');

  fireEvent.load(portrait);

  expect(portrait).toHaveClass('opacity-90');
  expect(portrait).not.toHaveClass('opacity-0');
});

test('falls back to the neutral portrait surface when an image fails', () => {
  const { container } = render(
    <LibraryCharacterCard
      item={{ name: 'Mago', image: 'https://example.com/missing.webp', level: 1 }}
      onOpen={jest.fn()}
    />,
  );

  fireEvent.error(screen.getByRole('img', { name: 'Mago' }));

  expect(screen.queryByRole('img', { name: 'Mago' })).not.toBeInTheDocument();
  expect(container.querySelector('svg')).toBeInTheDocument();
});
